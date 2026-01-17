package flows

import (
	"time"
)

type FlowKey struct {
	Proto   string
	SrcIP   string
	DstIP   string
	SrcPort int
	DstPort int
}

func (k FlowKey) Reverse() FlowKey {
	return FlowKey{
		Proto:   k.Proto,
		SrcIP:   k.DstIP,
		DstIP:   k.SrcIP,
		SrcPort: k.DstPort,
		DstPort: k.SrcPort,
	}
}

type PacketInfo struct {
	Timestamp      time.Time
	Proto          string
	SrcIP          string
	DstIP          string
	SrcPort        int
	DstPort        int
	Length         int
	PayloadLen     int
	Seq            uint32
	Ack            uint32
	Window         uint16
	TCPFlags       TCPFlags
	MSS            *int
	IsFragment     bool
	TLSSNI         *string
	TLSVersion     *string
	ALPN           *string
	TLSClientHello bool
	TLSServerHello bool
	TLSAlert       bool
	TLSAlertCode   *int
	HTTPMethod     *string
	HTTPHost       *string
}

type TCPFlags struct {
	SYN bool
	ACK bool
	FIN bool
	RST bool
	PSH bool
	URG bool
}

type SeqState struct {
	ExpectedSeq uint32
	Initialized bool
}

type FlowAgg struct {
	Key                 FlowKey
	FirstSeen           time.Time
	LastSeen            time.Time
	SynTime             *time.Time
	SynAckTime          *time.Time
	AckTime             *time.Time
	RTTMs               *float64
	BytesSent           int64
	BytesRecv           int64
	BytesClientToServer int64
	BytesServerToClient int64
	PacketCount         int64
	AppBytes            int64
	FirstPayloadTime    *time.Time
	LastPayloadTime     *time.Time
	DurationMs          *float64
	Retransmits         int64
	SynRetransmits      int64
	OutOfOrder          int64
	DupAcks             int64
	MSS                 *int
	TLSVersion          *string
	TLSSNI              *string
	ALPN                *string
	RSTCount            int64
	FragmentCount       int64
	HTTPMethod          *string
	HTTPHost            *string
	HTTPTime            *time.Time
	ThroughputBps       *float64
	TLSAlertCode        *int
	TCPStreamID         *int

	SawClientHello bool
	SawServerHello bool
	TLSAlert       bool

	RetransSizeCount map[int]int

	seqCache              *SeqCache
	seqStates             [2]SeqState
	lastAck               [2]uint32
	lastAckSet            [2]bool
	synIndexes            [2][]int
	synRetransIndexes     []int
	retransIndexes        []int
	dupAckIndexes         []int
	tlsClientHelloIndexes []int
	tlsServerHelloIndexes []int
	tlsAlertIndexes       []int
	clientDir             int
	clientDirKnown        bool
}

func NewFlowAgg(key FlowKey, ts time.Time) *FlowAgg {
	return &FlowAgg{
		Key:              key,
		FirstSeen:        ts,
		LastSeen:         ts,
		seqCache:         NewSeqCache(2048, 3*time.Second),
		RetransSizeCount: make(map[int]int),
	}
}

func (f *FlowAgg) Update(pkt PacketInfo, forward bool) {
	f.LastSeen = pkt.Timestamp
	f.PacketCount++
	packetIndex := int(f.PacketCount)

	if pkt.IsFragment {
		f.FragmentCount++
	}

	if pkt.TCPFlags.RST {
		f.RSTCount++
	}

	if pkt.MSS != nil && f.MSS == nil {
		f.MSS = pkt.MSS
	}

	if pkt.TLSSNI != nil && f.TLSSNI == nil {
		f.TLSSNI = pkt.TLSSNI
	}
	if pkt.TLSVersion != nil && f.TLSVersion == nil {
		f.TLSVersion = pkt.TLSVersion
	}
	if pkt.ALPN != nil && f.ALPN == nil {
		f.ALPN = pkt.ALPN
	}
	if pkt.TLSClientHello {
		f.SawClientHello = true
		f.tlsClientHelloIndexes = append(f.tlsClientHelloIndexes, packetIndex)
	}
	if pkt.TLSServerHello {
		f.SawServerHello = true
		f.tlsServerHelloIndexes = append(f.tlsServerHelloIndexes, packetIndex)
	}
	if pkt.TLSAlert {
		f.TLSAlert = true
		if pkt.TLSAlertCode != nil && f.TLSAlertCode == nil {
			f.TLSAlertCode = pkt.TLSAlertCode
		}
		f.tlsAlertIndexes = append(f.tlsAlertIndexes, packetIndex)
	}

	if pkt.HTTPMethod != nil && f.HTTPMethod == nil {
		f.HTTPMethod = pkt.HTTPMethod
	}
	if pkt.HTTPHost != nil && f.HTTPHost == nil {
		f.HTTPHost = pkt.HTTPHost
	}
	if pkt.HTTPMethod != nil && f.HTTPTime == nil {
		f.HTTPTime = &pkt.Timestamp
	}

	dirIndex := 0
	if !forward {
		dirIndex = 1
	}
	if !f.clientDirKnown && f.PacketCount == 1 {
		f.clientDir = dirIndex
		f.clientDirKnown = true
	}

	if pkt.PayloadLen > 0 {
		f.AppBytes += int64(pkt.PayloadLen)
		if f.FirstPayloadTime == nil {
			ts := pkt.Timestamp
			f.FirstPayloadTime = &ts
		}
		ts := pkt.Timestamp
		f.LastPayloadTime = &ts

		if forward {
			f.BytesSent += int64(pkt.PayloadLen)
		} else {
			f.BytesRecv += int64(pkt.PayloadLen)
		}

		seqKey := SeqKey{Direction: dirIndex, Seq: pkt.Seq, Length: pkt.PayloadLen}
		if f.seqCache.Seen(seqKey, pkt.Timestamp) {
			f.Retransmits++
			f.RetransSizeCount[pkt.PayloadLen]++
			f.retransIndexes = append(f.retransIndexes, packetIndex)
		} else {
			f.trackSequence(dirIndex, pkt.Seq, pkt.PayloadLen)
		}
	}

	if pkt.TCPFlags.SYN && !pkt.TCPFlags.ACK {
		f.synIndexes[dirIndex] = append(f.synIndexes[dirIndex], packetIndex)
		if f.SynTime == nil {
			f.clientDir = dirIndex
			f.clientDirKnown = true
			ts := pkt.Timestamp
			f.SynTime = &ts
		}
	}

	if pkt.TCPFlags.SYN && pkt.TCPFlags.ACK {
		if f.SynAckTime == nil {
			ts := pkt.Timestamp
			f.SynAckTime = &ts
			f.updateRTT()
		}
	}

	if pkt.TCPFlags.ACK && !pkt.TCPFlags.SYN {
		if f.AckTime == nil && f.SynAckTime != nil {
			ts := pkt.Timestamp
			f.AckTime = &ts
		}
	}

	if pkt.TCPFlags.ACK && pkt.PayloadLen == 0 && !pkt.TCPFlags.SYN {
		if f.lastAckSet[dirIndex] && pkt.Ack == f.lastAck[dirIndex] {
			f.DupAcks++
			f.dupAckIndexes = append(f.dupAckIndexes, packetIndex)
		}
		f.lastAck[dirIndex] = pkt.Ack
		f.lastAckSet[dirIndex] = true
	}
}

func (f *FlowAgg) trackSequence(direction int, seq uint32, payloadLen int) {
	state := &f.seqStates[direction]
	if !state.Initialized {
		state.ExpectedSeq = seq + uint32(payloadLen)
		state.Initialized = true
		return
	}

	expected := state.ExpectedSeq
	if seq != expected {
		f.OutOfOrder++
	}
	if seq >= expected {
		state.ExpectedSeq = seq + uint32(payloadLen)
	}
}

func (f *FlowAgg) updateRTT() {
	if f.SynTime != nil && f.SynAckTime != nil {
		delta := f.SynAckTime.Sub(*f.SynTime).Seconds() * 1000
		f.RTTMs = &delta
	}
}

func (f *FlowAgg) Finalize() {
	duration := f.LastSeen.Sub(f.FirstSeen).Seconds()
	if duration > 0 {
		bps := float64(f.BytesSent+f.BytesRecv) / duration
		f.ThroughputBps = &bps
		ms := duration * 1000
		f.DurationMs = &ms
	}
	if !f.clientDirKnown {
		f.clientDir = 0
		f.clientDirKnown = true
	}
	if f.clientDir == 0 {
		f.BytesClientToServer = f.BytesSent
		f.BytesServerToClient = f.BytesRecv
	} else {
		f.BytesClientToServer = f.BytesRecv
		f.BytesServerToClient = f.BytesSent
	}
	if synCount := len(f.synIndexes[f.clientDir]); synCount > 1 {
		f.SynRetransmits = int64(synCount - 1)
		f.synRetransIndexes = append(f.synRetransIndexes, f.synIndexes[f.clientDir][1:]...)
	}
}

func (f *FlowAgg) ClientServer() (string, int, string, int) {
	if !f.clientDirKnown {
		return f.Key.SrcIP, f.Key.SrcPort, f.Key.DstIP, f.Key.DstPort
	}
	if f.clientDir == 0 {
		return f.Key.SrcIP, f.Key.SrcPort, f.Key.DstIP, f.Key.DstPort
	}
	return f.Key.DstIP, f.Key.DstPort, f.Key.SrcIP, f.Key.SrcPort
}

func (f *FlowAgg) SynRetransmissionIndexes() []int {
	return append([]int(nil), f.synRetransIndexes...)
}

func (f *FlowAgg) RetransmissionIndexes() []int {
	return append([]int(nil), f.retransIndexes...)
}

func (f *FlowAgg) DupAckIndexes() []int {
	return append([]int(nil), f.dupAckIndexes...)
}

func (f *FlowAgg) TLSClientHelloIndexes() []int {
	return append([]int(nil), f.tlsClientHelloIndexes...)
}

func (f *FlowAgg) TLSServerHelloIndexes() []int {
	return append([]int(nil), f.tlsServerHelloIndexes...)
}

func (f *FlowAgg) TLSAlertIndexes() []int {
	return append([]int(nil), f.tlsAlertIndexes...)
}
