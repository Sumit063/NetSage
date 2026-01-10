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
    Timestamp     time.Time
    Proto         string
    SrcIP         string
    DstIP         string
    SrcPort       int
    DstPort       int
    PayloadLen    int
    Seq           uint32
    TCPFlags      TCPFlags
    MSS           *int
    IsFragment    bool
    TLSSNI        *string
    TLSVersion    *string
    ALPN          *string
    TLSClientHello bool
    TLSServerHello bool
    TLSAlert       bool
    HTTPMethod    *string
    HTTPHost      *string
}

type TCPFlags struct {
    SYN bool
    ACK bool
    FIN bool
    RST bool
}

type SeqState struct {
    ExpectedSeq uint32
    Initialized bool
}

type FlowAgg struct {
    Key           FlowKey
    FirstSeen     time.Time
    LastSeen      time.Time
    SynTime       *time.Time
    SynAckTime    *time.Time
    AckTime       *time.Time
    RTTMs         *float64
    BytesSent     int64
    BytesRecv     int64
    Retransmits   int64
    OutOfOrder    int64
    MSS           *int
    TLSVersion    *string
    TLSSNI        *string
    ALPN          *string
    RSTCount      int64
    FragmentCount int64
    HTTPMethod    *string
    HTTPHost      *string
    HTTPTime      *time.Time
    ThroughputBps *float64

    SawClientHello bool
    SawServerHello bool
    TLSAlert       bool

    RetransSizeCount map[int]int

    seqCache  *SeqCache
    seqStates [2]SeqState
}

func NewFlowAgg(key FlowKey, ts time.Time) *FlowAgg {
    return &FlowAgg{
        Key:       key,
        FirstSeen: ts,
        LastSeen:  ts,
        seqCache:  NewSeqCache(2048, 3*time.Second),
        RetransSizeCount: make(map[int]int),
    }
}

func (f *FlowAgg) Update(pkt PacketInfo, forward bool) {
    f.LastSeen = pkt.Timestamp
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
    }
    if pkt.TLSServerHello {
        f.SawServerHello = true
    }
    if pkt.TLSAlert {
        f.TLSAlert = true
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

    if pkt.PayloadLen > 0 {
        if forward {
            f.BytesSent += int64(pkt.PayloadLen)
        } else {
            f.BytesRecv += int64(pkt.PayloadLen)
        }

        seqKey := SeqKey{Direction: dirIndex, Seq: pkt.Seq, Length: pkt.PayloadLen}
        if f.seqCache.Seen(seqKey, pkt.Timestamp) {
            f.Retransmits++
            f.RetransSizeCount[pkt.PayloadLen]++
        } else {
            f.trackSequence(dirIndex, pkt.Seq, pkt.PayloadLen)
        }
    }

    if pkt.TCPFlags.SYN && !pkt.TCPFlags.ACK {
        if f.SynTime == nil {
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
    }
}
