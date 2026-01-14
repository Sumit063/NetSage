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

func TestSynRetransmissions(t *testing.T) {
	key := FlowKey{Proto: "TCP", SrcIP: "192.168.0.1", DstIP: "192.168.0.2", SrcPort: 5000, DstPort: 443}
	flow := NewFlowAgg(key, time.Now())

	ts := time.Now()
	syn := PacketInfo{
		Timestamp: ts,
		Proto:     "TCP",
		SrcIP:     "192.168.0.1",
		DstIP:     "192.168.0.2",
		SrcPort:   5000,
		DstPort:   443,
		Seq:       100,
		TCPFlags:  TCPFlags{SYN: true},
	}
	flow.Update(syn, true)
	flow.Update(PacketInfo{
		Timestamp: ts.Add(5 * time.Millisecond),
		Proto:     syn.Proto,
		SrcIP:     syn.SrcIP,
		DstIP:     syn.DstIP,
		SrcPort:   syn.SrcPort,
		DstPort:   syn.DstPort,
		Seq:       syn.Seq,
		TCPFlags:  TCPFlags{SYN: true},
	}, true)

	flow.Finalize()

	if flow.SynRetransmits != 1 {
		t.Fatalf("expected 1 syn retransmit, got %d", flow.SynRetransmits)
	}
}
