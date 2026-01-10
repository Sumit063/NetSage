package flows

import (
    "testing"
    "time"
)

func TestFlowAggDirectionBytes(t *testing.T) {
    key := FlowKey{Proto: "TCP", SrcIP: "10.0.0.1", DstIP: "10.0.0.2", SrcPort: 1234, DstPort: 80}
    flow := NewFlowAgg(key, time.Now())

    pkt1 := PacketInfo{
        Timestamp:  time.Now(),
        Proto:      "TCP",
        SrcIP:      "10.0.0.1",
        DstIP:      "10.0.0.2",
        SrcPort:    1234,
        DstPort:    80,
        PayloadLen: 120,
        Seq:        1,
    }
    flow.Update(pkt1, true)

    pkt2 := PacketInfo{
        Timestamp:  time.Now().Add(10 * time.Millisecond),
        Proto:      "TCP",
        SrcIP:      "10.0.0.2",
        DstIP:      "10.0.0.1",
        SrcPort:    80,
        DstPort:    1234,
        PayloadLen: 80,
        Seq:        1,
    }
    flow.Update(pkt2, false)

    if flow.BytesSent != 120 {
        t.Fatalf("expected bytes sent 120, got %d", flow.BytesSent)
    }
    if flow.BytesRecv != 80 {
        t.Fatalf("expected bytes recv 80, got %d", flow.BytesRecv)
    }
}
