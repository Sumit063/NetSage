package pcap

import (
	"context"
	"fmt"
	"strings"
	"time"

	"netsage/internal/flows"
)

type PacketMeta struct {
	Index          int            `json:"index"`
	Timestamp      time.Time      `json:"timestamp"`
	Protocol       string         `json:"protocol"`
	SrcIP          string         `json:"src_ip"`
	DstIP          string         `json:"dst_ip"`
	SrcPort        int            `json:"src_port"`
	DstPort        int            `json:"dst_port"`
	Length         int            `json:"length"`
	Info           string         `json:"info"`
	ErrorTags      []string       `json:"error_tags,omitempty"`
	TCPFlags       flows.TCPFlags `json:"tcp_flags"`
	Seq            uint32         `json:"seq"`
	Ack            uint32         `json:"ack"`
	Window         uint16         `json:"window"`
	StreamID       *int           `json:"stream_id,omitempty"`
	TLSClientHello bool           `json:"tls_client_hello"`
	TLSServerHello bool           `json:"tls_server_hello"`
	TLSAlert       bool           `json:"tls_alert"`
	TLSAlertCode   *int           `json:"tls_alert_code,omitempty"`
	TLSSNI         *string        `json:"tls_sni,omitempty"`
	HTTPMethod     *string        `json:"http_method,omitempty"`
	HTTPHost       *string        `json:"http_host,omitempty"`
}

type FlowMeta struct {
	StreamID   *int
	ClientIP   string
	ClientPort int
	ServerIP   string
	ServerPort int
}

type FlowIndex map[flows.FlowKey]FlowMeta

type flowTrackerKey struct {
	Proto      string
	ClientIP   string
	ServerIP   string
	ClientPort int
	ServerPort int
}

type packetTracker struct {
	seqCache   *flows.SeqCache
	lastAck    [2]uint32
	lastAckSet [2]bool
	synSeen    [2]int
}

func newPacketTracker() *packetTracker {
	return &packetTracker{
		seqCache: flows.NewSeqCache(2048, 3*time.Second),
	}
}

func (t *packetTracker) tagsForPacket(info flows.PacketInfo, dir int) []string {
	tags := make([]string, 0, 2)

	if info.TLSAlert {
		tags = append(tags, "tls_alert")
	}
	if strings.ToUpper(info.Proto) == "TCP" {
		if info.TCPFlags.RST {
			tags = append(tags, "rst")
		}
		if info.TCPFlags.SYN && !info.TCPFlags.ACK {
			t.synSeen[dir]++
			if t.synSeen[dir] > 1 {
				tags = append(tags, "syn_retransmission")
			}
		}
		if info.PayloadLen > 0 {
			key := flows.SeqKey{Direction: dir, Seq: info.Seq, Length: info.PayloadLen}
			if t.seqCache.Seen(key, info.Timestamp) {
				tags = append(tags, "retransmission")
			}
		}
		if info.TCPFlags.ACK && info.PayloadLen == 0 && !info.TCPFlags.SYN {
			if t.lastAckSet[dir] && info.Ack == t.lastAck[dir] {
				tags = append(tags, "dup_ack")
			}
			t.lastAck[dir] = info.Ack
			t.lastAckSet[dir] = true
		}
	}
	return tags
}

type PacketFilter struct {
	IP       string
	SrcIP    string
	DstIP    string
	Port     *int
	SrcPort  *int
	DstPort  *int
	Proto    string
	SNI      string
	StreamID *int
	Flags    []string
	Pair     bool
}

func ParsePacketFilter(raw string) PacketFilter {
	filter := PacketFilter{}
	if raw == "" {
		return filter
	}
	parts := strings.Fields(raw)
	for _, part := range parts {
		if !strings.Contains(part, ":") {
			continue
		}
		key, value, _ := strings.Cut(part, ":")
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		switch key {
		case "ip":
			filter.IP = value
		case "src":
			filter.SrcIP = value
		case "dst":
			filter.DstIP = value
		case "port":
			var port int
			if _, err := fmt.Sscanf(value, "%d", &port); err == nil {
				filter.Port = &port
			}
		case "src_port":
			var port int
			if _, err := fmt.Sscanf(value, "%d", &port); err == nil {
				filter.SrcPort = &port
			}
		case "dst_port":
			var port int
			if _, err := fmt.Sscanf(value, "%d", &port); err == nil {
				filter.DstPort = &port
			}
		case "proto":
			filter.Proto = strings.ToUpper(value)
		case "sni":
			filter.SNI = strings.ToLower(value)
		case "stream":
			var stream int
			if _, err := fmt.Sscanf(value, "%d", &stream); err == nil {
				filter.StreamID = &stream
			}
		case "flags":
			filter.Flags = parseFlags(value)
		case "pair":
			filter.Pair = value == "1" || strings.EqualFold(value, "true")
		}
	}
	return filter
}

func (f PacketFilter) Matches(info flows.PacketInfo, streamID *int) bool {
	if f.IP != "" && info.SrcIP != f.IP && info.DstIP != f.IP {
		return false
	}
	if f.Pair && f.SrcIP != "" && f.DstIP != "" {
		if !((info.SrcIP == f.SrcIP && info.DstIP == f.DstIP) || (info.SrcIP == f.DstIP && info.DstIP == f.SrcIP)) {
			return false
		}
	} else {
		if f.SrcIP != "" && info.SrcIP != f.SrcIP {
			return false
		}
		if f.DstIP != "" && info.DstIP != f.DstIP {
			return false
		}
	}
	if f.Port != nil && info.SrcPort != *f.Port && info.DstPort != *f.Port {
		return false
	}
	if f.Pair && f.SrcPort != nil && f.DstPort != nil {
		if !((info.SrcPort == *f.SrcPort && info.DstPort == *f.DstPort) || (info.SrcPort == *f.DstPort && info.DstPort == *f.SrcPort)) {
			return false
		}
	} else {
		if f.SrcPort != nil && info.SrcPort != *f.SrcPort {
			return false
		}
		if f.DstPort != nil && info.DstPort != *f.DstPort {
			return false
		}
	}
	if f.Proto != "" && strings.ToUpper(info.Proto) != f.Proto {
		return false
	}
	if f.SNI != "" {
		if info.TLSSNI == nil || !strings.Contains(strings.ToLower(*info.TLSSNI), f.SNI) {
			return false
		}
	}
	if f.StreamID != nil {
		if streamID == nil || *streamID != *f.StreamID {
			return false
		}
	}
	if len(f.Flags) > 0 {
		if strings.ToUpper(info.Proto) != "TCP" {
			return false
		}
		for _, flag := range f.Flags {
			if !hasFlag(info.TCPFlags, flag) {
				return false
			}
		}
	}
	return true
}

func ListPackets(ctx context.Context, path string, limit, offset int, filter PacketFilter, flowIndex FlowIndex) ([]PacketMeta, int, error) {
	if limit <= 0 {
		limit = 500
	}
	packetSource, file, err := openPacketSource(path)
	if err != nil {
		return nil, 0, err
	}
	defer file.Close()

	results := make([]PacketMeta, 0, limit)
	matched := 0
	index := 0
	trackers := make(map[flowTrackerKey]*packetTracker)

	for packet := range packetSource.Packets() {
		select {
		case <-ctx.Done():
			return nil, 0, ctx.Err()
		default:
		}

		if packet == nil {
			continue
		}
		index++

		info, ok := parsePacket(packet)
		if !ok {
			continue
		}

		var streamID *int
		var meta FlowMeta
		hasMeta := false
		if len(flowIndex) > 0 {
			key := flows.FlowKey{
				Proto:   info.Proto,
				SrcIP:   info.SrcIP,
				DstIP:   info.DstIP,
				SrcPort: info.SrcPort,
				DstPort: info.DstPort,
			}
			if stored, ok := flowIndex[key]; ok {
				meta = stored
				hasMeta = true
				streamID = meta.StreamID
			}
		}

		tracker, dir := resolvePacketTracker(info, meta, hasMeta, trackers)
		errorTags := tracker.tagsForPacket(info, dir)

		if !filter.Matches(info, streamID) {
			continue
		}

		matched++
		if matched <= offset {
			continue
		}
		if len(results) >= limit {
			continue
		}

		results = append(results, PacketMeta{
			Index:          index,
			Timestamp:      info.Timestamp,
			Protocol:       info.Proto,
			SrcIP:          info.SrcIP,
			DstIP:          info.DstIP,
			SrcPort:        info.SrcPort,
			DstPort:        info.DstPort,
			Length:         info.Length,
			Info:           buildPacketInfo(info),
			ErrorTags:      errorTags,
			TCPFlags:       info.TCPFlags,
			Seq:            info.Seq,
			Ack:            info.Ack,
			Window:         info.Window,
			StreamID:       streamID,
			TLSClientHello: info.TLSClientHello,
			TLSServerHello: info.TLSServerHello,
			TLSAlert:       info.TLSAlert,
			TLSAlertCode:   info.TLSAlertCode,
			TLSSNI:         info.TLSSNI,
			HTTPMethod:     info.HTTPMethod,
			HTTPHost:       info.HTTPHost,
		})
	}

	return results, matched, nil
}

func resolvePacketTracker(info flows.PacketInfo, meta FlowMeta, hasMeta bool, trackers map[flowTrackerKey]*packetTracker) (*packetTracker, int) {
	if hasMeta && meta.ClientIP != "" {
		key := flowTrackerKey{
			Proto:      info.Proto,
			ClientIP:   meta.ClientIP,
			ClientPort: meta.ClientPort,
			ServerIP:   meta.ServerIP,
			ServerPort: meta.ServerPort,
		}
		dir := 0
		if info.SrcIP == meta.ServerIP && info.SrcPort == meta.ServerPort {
			dir = 1
		}
		tracker := trackers[key]
		if tracker == nil {
			tracker = newPacketTracker()
			trackers[key] = tracker
		}
		return tracker, dir
	}

	key := flowTrackerKey{
		Proto:      info.Proto,
		ClientIP:   info.SrcIP,
		ClientPort: info.SrcPort,
		ServerIP:   info.DstIP,
		ServerPort: info.DstPort,
	}
	if tracker, ok := trackers[key]; ok {
		return tracker, 0
	}
	rev := flowTrackerKey{
		Proto:      info.Proto,
		ClientIP:   info.DstIP,
		ClientPort: info.DstPort,
		ServerIP:   info.SrcIP,
		ServerPort: info.SrcPort,
	}
	if tracker, ok := trackers[rev]; ok {
		return tracker, 1
	}
	tracker := newPacketTracker()
	trackers[key] = tracker
	return tracker, 0
}

func parseFlags(value string) []string {
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '|' || r == ' '
	})
	flags := make([]string, 0, len(parts))
	for _, part := range parts {
		flag := strings.ToUpper(strings.TrimSpace(part))
		if flag == "" {
			continue
		}
		flags = append(flags, flag)
	}
	return flags
}

func hasFlag(flags flows.TCPFlags, name string) bool {
	switch strings.ToUpper(name) {
	case "SYN":
		return flags.SYN
	case "ACK":
		return flags.ACK
	case "FIN":
		return flags.FIN
	case "RST":
		return flags.RST
	case "PSH":
		return flags.PSH
	case "URG":
		return flags.URG
	default:
		return false
	}
}

func ParseFlags(value string) []string {
	return parseFlags(value)
}

func buildPacketInfo(info flows.PacketInfo) string {
	if info.TLSClientHello {
		return "TLS ClientHello"
	}
	if info.TLSServerHello {
		return "TLS ServerHello"
	}
	if info.TLSAlert {
		if info.TLSAlertCode != nil {
			return fmt.Sprintf("TLS Alert (%d)", *info.TLSAlertCode)
		}
		return "TLS Alert"
	}
	if info.HTTPMethod != nil {
		if info.HTTPHost != nil {
			return fmt.Sprintf("HTTP %s %s", *info.HTTPMethod, *info.HTTPHost)
		}
		return fmt.Sprintf("HTTP %s", *info.HTTPMethod)
	}
	if info.TCPFlags.SYN && info.TCPFlags.ACK {
		return "SYN, ACK"
	}
	if info.TCPFlags.SYN {
		return "SYN"
	}
	if info.TCPFlags.FIN {
		return "FIN"
	}
	if info.TCPFlags.RST {
		return "RST"
	}
	if info.TCPFlags.ACK {
		return "ACK"
	}
	if info.Proto == "UDP" {
		return "UDP"
	}
	return "TCP segment"
}
