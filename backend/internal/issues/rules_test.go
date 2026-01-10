package issues

import (
    "testing"
    "time"

    "netsage/internal/flows"
)

func TestRulesEmitFindings(t *testing.T) {
    key := flows.FlowKey{Proto: "TCP", SrcIP: "10.0.0.1", DstIP: "10.0.0.2", SrcPort: 1000, DstPort: 443}
    flow := flows.NewFlowAgg(key, time.Now())
    flow.SawClientHello = true
    flow.SawServerHello = false
    flow.RSTCount = 2
    flow.Retransmits = 55
    flow.TLSAlert = true

    flowMap := map[flows.FlowKey]*flows.FlowAgg{key: flow}
    findings := Evaluate(flowMap, flows.NewRTTHistogram())

    if len(findings) == 0 {
        t.Fatalf("expected findings, got none")
    }

    foundTLS := false
    for _, f := range findings {
        if f.Type == "tls_handshake_failure" {
            foundTLS = true
            break
        }
    }

    if !foundTLS {
        t.Fatalf("expected tls_handshake_failure finding")
    }
}
