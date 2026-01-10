package testutil

import (
    "os"
    "time"

    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcapgo"
)

func GenerateSamplePCAP(path string) error {
    file, err := os.Create(path)
    if err != nil {
        return err
    }
    defer file.Close()

    writer := pcapgo.NewWriter(file)
    if err := writer.WriteFileHeader(65535, layers.LinkTypeEthernet); err != nil {
        return err
    }

    clientMAC := []byte{0x00, 0x0c, 0x29, 0xaa, 0xbb, 0xcc}
    serverMAC := []byte{0x00, 0x0c, 0x29, 0xdd, 0xee, 0xff}

    clientIP := []byte{10, 0, 0, 1}
    serverIP := []byte{10, 0, 0, 2}

    base := time.Now()

    seqClient := uint32(1000)
    seqServer := uint32(2000)

    mss := 900
    if err := writeTCPPacket(writer, base, clientMAC, serverMAC, clientIP, serverIP, 12345, 80, seqClient, 0, true, false, nil, &mss); err != nil {
        return err
    }

    if err := writeTCPPacket(writer, base.Add(10*time.Millisecond), serverMAC, clientMAC, serverIP, clientIP, 80, 12345, seqServer, seqClient+1, true, true, nil, nil); err != nil {
        return err
    }

    if err := writeTCPPacket(writer, base.Add(20*time.Millisecond), clientMAC, serverMAC, clientIP, serverIP, 12345, 80, seqClient+1, seqServer+1, false, true, nil, nil); err != nil {
        return err
    }

    httpPayload := []byte("GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: netsage\r\n\r\n")
    if err := writeTCPPacket(writer, base.Add(40*time.Millisecond), clientMAC, serverMAC, clientIP, serverIP, 12345, 80, seqClient+1, seqServer+1, false, true, httpPayload, nil); err != nil {
        return err
    }

    return nil
}

func writeTCPPacket(writer *pcapgo.Writer, ts time.Time, srcMAC, dstMAC, srcIP, dstIP []byte, srcPort, dstPort int, seq, ack uint32, syn, ackFlag bool, payload []byte, mss *int) error {
    eth := layers.Ethernet{
        SrcMAC:       srcMAC,
        DstMAC:       dstMAC,
        EthernetType: layers.EthernetTypeIPv4,
    }

    ip := layers.IPv4{
        Version:  4,
        IHL:      5,
        TTL:      64,
        Protocol: layers.IPProtocolTCP,
        SrcIP:    srcIP,
        DstIP:    dstIP,
    }

    tcp := layers.TCP{
        SrcPort: layers.TCPPort(srcPort),
        DstPort: layers.TCPPort(dstPort),
        Seq:     seq,
        Ack:     ack,
        SYN:     syn,
        ACK:     ackFlag,
        Window:  14600,
    }
    if syn && mss != nil {
        tcp.Options = append(tcp.Options, layers.TCPOption{
            OptionType:   layers.TCPOptionKindMSS,
            OptionLength: 4,
            OptionData:   []byte{byte(*mss >> 8), byte(*mss & 0xff)},
        })
    }
    tcp.SetNetworkLayerForChecksum(&ip)

    buf := gopacket.NewSerializeBuffer()
    opts := gopacket.SerializeOptions{ComputeChecksums: true, FixLengths: true}
    if err := gopacket.SerializeLayers(buf, opts, &eth, &ip, &tcp, gopacket.Payload(payload)); err != nil {
        return err
    }

    return writer.WritePacket(gopacket.CaptureInfo{
        Timestamp:     ts,
        CaptureLength: len(buf.Bytes()),
        Length:        len(buf.Bytes()),
    }, buf.Bytes())
}
