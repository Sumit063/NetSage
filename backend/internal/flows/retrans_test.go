package flows

import (
    "testing"
    "time"
)

func TestRetransmissionDetection(t *testing.T) {
    key := FlowKey{Proto: "TCP", SrcIP: "1.1.1.1", DstIP: "2.2.2.2", SrcPort: 1000, DstPort: 80}
    flow := NewFlowAgg(key, time.Now())

    ts := time.Now()
    pkt := PacketInfo{
        Timestamp:  ts,
        Proto:      "TCP",
        SrcIP:      "1.1.1.1",
        DstIP:      "2.2.2.2",
        SrcPort:    1000,
        DstPort:    80,
        PayloadLen: 200,
        Seq:        42,
    }

    flow.Update(pkt, true)
    flow.Update(PacketInfo{Timestamp: ts.Add(1 * time.Second), Proto: pkt.Proto, SrcIP: pkt.SrcIP, DstIP: pkt.DstIP, SrcPort: pkt.SrcPort, DstPort: pkt.DstPort, PayloadLen: pkt.PayloadLen, Seq: pkt.Seq}, true)

    if flow.Retransmits != 1 {
        t.Fatalf("expected 1 retransmit, got %d", flow.Retransmits)
    }
    if flow.RetransSizeCount[200] != 1 {
        t.Fatalf("expected retrans count for 200 to be 1, got %d", flow.RetransSizeCount[200])
    }
}
