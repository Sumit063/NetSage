package triage

import (
	"testing"
	"time"

	"netsage/internal/flows"
)

func TestEvaluateRules(t *testing.T) {
	rules, err := LoadRules()
	if err != nil {
		t.Fatalf("load rules: %v", err)
	}

	key := flows.FlowKey{Proto: "TCP", SrcIP: "10.0.0.1", DstIP: "10.0.0.2", SrcPort: 1234, DstPort: 443}
	flow := flows.NewFlowAgg(key, time.Now())
	flow.PacketCount = 10
	duration := 3000.0
	rtt := 650.0
	flow.DurationMs = &duration
	flow.RTTMs = &rtt
	flow.Retransmits = 5

	findings, err := Evaluate(map[flows.FlowKey]*flows.FlowAgg{key: flow}, rules)
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	if len(findings) == 0 {
		t.Fatalf("expected findings, got none")
	}

	foundLatency := false
	foundRetrans := false
	for _, finding := range findings {
		switch finding.IssueType {
		case IssueLatency:
			foundLatency = true
		case IssueRetransmission:
			foundRetrans = true
		}
	}

	if !foundLatency {
		t.Fatalf("expected latency issue")
	}
	if !foundRetrans {
		t.Fatalf("expected retransmission issue")
	}
}
