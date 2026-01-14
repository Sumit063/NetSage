package pcap

import (
	"bufio"
	"context"
	"io"
	"os"

	"netsage/internal/flows"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcapgo"
)

type Result struct {
	Flows          map[flows.FlowKey]*flows.FlowAgg
	RTTHistogram   *flows.Histogram
	PacketCount    int64
	BytesProcessed int64
}

type ProgressFunc func(bytesRead, totalBytes int64)

func AnalyzeFile(ctx context.Context, path string, onProgress ProgressFunc) (*Result, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}

	progress := &progressReader{r: file}
	buffered := bufio.NewReader(progress)
	magic, err := buffered.Peek(4)
	if err != nil {
		return nil, err
	}

	var packetSource *gopacket.PacketSource
	if isPcapngMagic(magic) {
		ngReader, err := pcapgo.NewNgReader(buffered, pcapgo.DefaultNgReaderOptions)
		if err != nil {
			return nil, err
		}
		packetSource = gopacket.NewPacketSource(ngReader, ngReader.LinkType())
	} else {
		reader, err := pcapgo.NewReader(buffered)
		if err != nil {
			return nil, err
		}
		packetSource = gopacket.NewPacketSource(reader, reader.LinkType())
	}

	result := &Result{
		Flows:        make(map[flows.FlowKey]*flows.FlowAgg),
		RTTHistogram: flows.NewRTTHistogram(),
	}

	packetsSinceUpdate := int64(0)

	for packet := range packetSource.Packets() {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		if packet == nil {
			continue
		}

		pktInfo, ok := parsePacket(packet)
		if !ok {
			continue
		}

		key := flows.FlowKey{
			Proto:   pktInfo.Proto,
			SrcIP:   pktInfo.SrcIP,
			DstIP:   pktInfo.DstIP,
			SrcPort: pktInfo.SrcPort,
			DstPort: pktInfo.DstPort,
		}
		rev := key.Reverse()

		flow, forward := result.Flows[key], true
		if flow == nil {
			if revFlow, ok := result.Flows[rev]; ok {
				flow = revFlow
				forward = false
			} else {
				flow = flows.NewFlowAgg(key, pktInfo.Timestamp)
				result.Flows[key] = flow
			}
		}

		flow.Update(pktInfo, forward)

		result.PacketCount++
		packetsSinceUpdate++

		if packetsSinceUpdate%1000 == 0 && onProgress != nil {
			onProgress(progress.bytesRead, stat.Size())
		}
	}

	result.BytesProcessed = progress.bytesRead
	if onProgress != nil {
		onProgress(progress.bytesRead, stat.Size())
	}

	for _, flow := range result.Flows {
		flow.Finalize()
		if flow.RTTMs != nil {
			result.RTTHistogram.Add(*flow.RTTMs)
		}
	}

	return result, nil
}

type progressReader struct {
	r         io.Reader
	bytesRead int64
}

func (p *progressReader) Read(buf []byte) (int, error) {
	n, err := p.r.Read(buf)
	p.bytesRead += int64(n)
	return n, err
}

func isPcapngMagic(magic []byte) bool {
	return len(magic) >= 4 && magic[0] == 0x0a && magic[1] == 0x0d && magic[2] == 0x0d && magic[3] == 0x0a
}

func parsePacket(packet gopacket.Packet) (flows.PacketInfo, bool) {
	info := flows.PacketInfo{}
	if packet.NetworkLayer() == nil {
		return info, false
	}

	ts := packet.Metadata().Timestamp
	info.Timestamp = ts

	var srcIP, dstIP string
	isFragment := false

	if ip4Layer := packet.Layer(layers.LayerTypeIPv4); ip4Layer != nil {
		ip4 := ip4Layer.(*layers.IPv4)
		srcIP = ip4.SrcIP.String()
		dstIP = ip4.DstIP.String()
		if ip4.Flags&layers.IPv4MoreFragments != 0 || ip4.FragOffset > 0 {
			isFragment = true
		}
	} else if ip6Layer := packet.Layer(layers.LayerTypeIPv6); ip6Layer != nil {
		ip6 := ip6Layer.(*layers.IPv6)
		srcIP = ip6.SrcIP.String()
		dstIP = ip6.DstIP.String()
	} else {
		return info, false
	}

	info.SrcIP = srcIP
	info.DstIP = dstIP
	info.IsFragment = isFragment

	if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
		tcp := tcpLayer.(*layers.TCP)
		info.Proto = "TCP"
		info.SrcPort = int(tcp.SrcPort)
		info.DstPort = int(tcp.DstPort)
		info.PayloadLen = len(tcp.Payload)
		info.Seq = tcp.Seq
		info.Ack = tcp.Ack
		info.TCPFlags = flows.TCPFlags{SYN: tcp.SYN, ACK: tcp.ACK, FIN: tcp.FIN, RST: tcp.RST}

		if tcp.SYN {
			for _, opt := range tcp.Options {
				if opt.OptionType == layers.TCPOptionKindMSS && len(opt.OptionData) == 2 {
					mss := int(opt.OptionData[0])<<8 | int(opt.OptionData[1])
					info.MSS = &mss
				}
			}
		}

		if len(tcp.Payload) > 0 {
			sni, version, alpn, clientHello, serverHello, alert, alertCode := parseTLS(tcp.Payload)
			info.TLSSNI = sni
			info.TLSVersion = version
			info.ALPN = alpn
			info.TLSClientHello = clientHello
			info.TLSServerHello = serverHello
			info.TLSAlert = alert
			info.TLSAlertCode = alertCode

			method, host := parseHTTP(tcp.Payload)
			info.HTTPMethod = method
			info.HTTPHost = host
		}

		return info, true
	}

	if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
		udp := udpLayer.(*layers.UDP)
		info.Proto = "UDP"
		info.SrcPort = int(udp.SrcPort)
		info.DstPort = int(udp.DstPort)
		info.PayloadLen = len(udp.Payload)
		return info, true
	}

	return info, false
}

func parseTLS(payload []byte) (*string, *string, *string, bool, bool, bool, *int) {
	info := tlsInfo{payload: payload}
	return info.Parse()
}

func parseHTTP(payload []byte) (*string, *string) {
	info := httpInfo{payload: payload}
	return info.Parse()
}
