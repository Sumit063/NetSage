package triage

import (
	"sort"
	"text/template"
	"time"

	"netsage/internal/flows"
)

func Evaluate(flowsMap map[flows.FlowKey]*flows.FlowAgg, rules []Rule) ([]Finding, error) {
	keys := make([]flows.FlowKey, 0, len(flowsMap))
	for key := range flowsMap {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].Proto != keys[j].Proto {
			return keys[i].Proto < keys[j].Proto
		}
		if keys[i].SrcIP != keys[j].SrcIP {
			return keys[i].SrcIP < keys[j].SrcIP
		}
		if keys[i].DstIP != keys[j].DstIP {
			return keys[i].DstIP < keys[j].DstIP
		}
		if keys[i].SrcPort != keys[j].SrcPort {
			return keys[i].SrcPort < keys[j].SrcPort
		}
		return keys[i].DstPort < keys[j].DstPort
	})

	rulesSorted := append([]Rule(nil), rules...)
	sort.Slice(rulesSorted, func(i, j int) bool {
		return rulesSorted[i].ID < rulesSorted[j].ID
	})

	findings := make([]Finding, 0)
	for _, key := range keys {
		flow := flowsMap[key]
		metrics := MetricsSnapshot(flow)

		for _, rule := range rulesSorted {
			if !rule.Conditions.Evaluate(metrics) {
				continue
			}

			severity := rule.Severity.Apply(metrics)
			summary, err := renderSummary(rule.Summary, metrics)
			if err != nil {
				return nil, err
			}

			start, end := evidenceRange(rule.IssueType, flow)
			finding := Finding{
				IssueType:   rule.IssueType,
				Severity:    severity,
				Title:       rule.Title,
				Summary:     summary,
				PrimaryFlow: flow,
				EvidenceList: []Evidence{
					{
						Flow:             flow,
						PacketStartIndex: start,
						PacketEndIndex:   end,
						Metrics:          metrics,
					},
				},
			}
			findings = append(findings, finding)
		}
	}

	return findings, nil
}

func (g ConditionGroup) Evaluate(metrics map[string]interface{}) bool {
	if g.Metric != "" {
		return evaluateCondition(g, metrics)
	}
	if len(g.All) > 0 {
		for _, child := range g.All {
			if !child.Evaluate(metrics) {
				return false
			}
		}
		return true
	}
	if len(g.Any) > 0 {
		for _, child := range g.Any {
			if child.Evaluate(metrics) {
				return true
			}
		}
		return false
	}
	return false
}

func (s SeverityRule) Apply(metrics map[string]interface{}) int {
	severity := s.Base
	for _, step := range s.Steps {
		if step.When.Evaluate(metrics) && step.Severity > severity {
			severity = step.Severity
		}
	}
	if severity < 1 {
		return 1
	}
	if severity > 5 {
		return 5
	}
	return severity
}

func MetricsSnapshot(flow *flows.FlowAgg) map[string]interface{} {
	clientIP, clientPort, serverIP, serverPort := flow.ClientServer()
	snapshot := map[string]interface{}{
		"protocol":                flow.Key.Proto,
		"client_ip":               clientIP,
		"client_port":             clientPort,
		"server_ip":               serverIP,
		"server_port":             serverPort,
		"packet_count":            flow.PacketCount,
		"bytes_client_to_server":  flow.BytesClientToServer,
		"bytes_server_to_client":  flow.BytesServerToClient,
		"tcp_syn_retransmissions": flow.SynRetransmits,
		"tcp_retransmissions":     flow.Retransmits,
		"out_of_order":            flow.OutOfOrder,
		"dup_acks":                flow.DupAcks,
		"tls_client_hello_seen":   flow.SawClientHello,
		"tls_server_hello_seen":   flow.SawServerHello,
		"tls_alert_seen":          flow.TLSAlert,
		"tls_alert_code":          flow.TLSAlertCode,
		"app_bytes":               flow.AppBytes,
	}
	if flow.DurationMs != nil {
		snapshot["duration_ms"] = *flow.DurationMs
	}
	if flow.TCPStreamID != nil {
		snapshot["tcp_stream"] = *flow.TCPStreamID
	}
	if flow.FirstPayloadTime != nil {
		snapshot["first_payload_ts"] = flow.FirstPayloadTime.UTC().Format(time.RFC3339Nano)
	}
	if flow.LastPayloadTime != nil {
		snapshot["last_payload_ts"] = flow.LastPayloadTime.UTC().Format(time.RFC3339Nano)
	}
	if flow.RTTMs != nil {
		snapshot["handshake_rtt_ms_estimate"] = *flow.RTTMs
	}
	if flow.TLSAlertCode != nil {
		snapshot["tls_alert_code"] = *flow.TLSAlertCode
	}
	return snapshot
}

func renderSummary(tpl string, metrics map[string]interface{}) (string, error) {
	tmpl, err := template.New("summary").Option("missingkey=zero").Parse(tpl)
	if err != nil {
		return "", err
	}
	var out string
	builder := &stringBuilder{buf: make([]byte, 0, 128)}
	if err := tmpl.Execute(builder, metrics); err != nil {
		return "", err
	}
	out = builder.String()
	return out, nil
}

func evidenceRange(issueType IssueType, flow *flows.FlowAgg) (int, int) {
	switch issueType {
	case IssueRetransmission:
		indexes := append([]int{}, flow.SynRetransmissionIndexes()...)
		indexes = append(indexes, flow.RetransmissionIndexes()...)
		indexes = append(indexes, flow.DupAckIndexes()...)
		return rangeFromIndexes(indexes, int(flow.PacketCount))
	case IssueTLSHandshakeFailure:
		indexes := append([]int{}, flow.TLSClientHelloIndexes()...)
		indexes = append(indexes, flow.TLSAlertIndexes()...)
		return rangeFromIndexes(indexes, int(flow.PacketCount))
	default:
		return rangeFromIndexes(nil, int(flow.PacketCount))
	}
}

func rangeFromIndexes(indexes []int, fallbackEnd int) (int, int) {
	if len(indexes) == 0 {
		if fallbackEnd <= 0 {
			return 0, 0
		}
		return 1, fallbackEnd
	}
	sort.Ints(indexes)
	start := indexes[0]
	end := indexes[len(indexes)-1]
	if start < 1 {
		start = 1
	}
	if end < start {
		end = start
	}
	return start, end
}

func evaluateCondition(cond ConditionGroup, metrics map[string]interface{}) bool {
	value, ok := metrics[cond.Metric]
	if !ok {
		return false
	}
	switch v := value.(type) {
	case bool:
		want, ok := toBool(cond.Value)
		if !ok {
			return false
		}
		return compareBool(cond.Op, v, want)
	case string:
		want, ok := cond.Value.(string)
		if !ok {
			return false
		}
		return compareString(cond.Op, v, want)
	default:
		num, ok := toFloat64(value)
		if !ok {
			return false
		}
		want, ok := toFloat64(cond.Value)
		if !ok {
			return false
		}
		return compareNumber(cond.Op, num, want)
	}
}

func compareBool(op string, value, want bool) bool {
	switch op {
	case "eq":
		return value == want
	case "neq":
		return value != want
	default:
		return false
	}
}

func compareString(op, value, want string) bool {
	switch op {
	case "eq":
		return value == want
	case "neq":
		return value != want
	default:
		return false
	}
}

func compareNumber(op string, value, want float64) bool {
	switch op {
	case "gt":
		return value > want
	case "gte":
		return value >= want
	case "lt":
		return value < want
	case "lte":
		return value <= want
	case "eq":
		return value == want
	case "neq":
		return value != want
	default:
		return false
	}
}

func toBool(v interface{}) (bool, bool) {
	if b, ok := v.(bool); ok {
		return b, true
	}
	return false, false
}

func toFloat64(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case int:
		return float64(n), true
	case int8:
		return float64(n), true
	case int16:
		return float64(n), true
	case int32:
		return float64(n), true
	case int64:
		return float64(n), true
	case uint:
		return float64(n), true
	case uint8:
		return float64(n), true
	case uint16:
		return float64(n), true
	case uint32:
		return float64(n), true
	case uint64:
		return float64(n), true
	case float32:
		return float64(n), true
	case float64:
		return n, true
	default:
		return 0, false
	}
}

type stringBuilder struct {
	buf []byte
}

func (b *stringBuilder) Write(p []byte) (int, error) {
	b.buf = append(b.buf, p...)
	return len(p), nil
}

func (b *stringBuilder) String() string {
	return string(b.buf)
}
