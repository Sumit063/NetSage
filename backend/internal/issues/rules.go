package issues

import (
    "encoding/json"

    "netsage/internal/flows"
)

type Finding struct {
    Flow        *flows.FlowAgg
    Severity    string
    Type        string
    Title       string
    Description string
    Evidence    map[string]interface{}
}

func Evaluate(flowsMap map[flows.FlowKey]*flows.FlowAgg, hist *flows.Histogram) []Finding {
    findings := []Finding{}

    for _, flow := range flowsMap {
        if flow.SawClientHello && !flow.SawServerHello && (flow.RSTCount > 0 || flow.TLSAlert) {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "HIGH",
                Type:        "tls_handshake_failure",
                Title:       "TLS handshake appears to fail",
                Description: "ClientHello observed without ServerHello and a reset/alert occurred.",
                Evidence: map[string]interface{}{
                    "rst_count": flow.RSTCount,
                    "tls_alert": flow.TLSAlert,
                },
            })
        }

        if flow.RSTCount >= 3 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "HIGH",
                Type:        "repeated_resets",
                Title:       "Repeated TCP resets",
                Description: "Multiple RSTs suggest forced connection termination.",
                Evidence: map[string]interface{}{
                    "rst_count": flow.RSTCount,
                },
            })
        }

        if flow.Retransmits >= 50 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "HIGH",
                Type:        "extreme_retransmissions",
                Title:       "Extreme retransmissions",
                Description: "High retransmission count indicates severe loss or instability.",
                Evidence: map[string]interface{}{
                    "retransmits": flow.Retransmits,
                },
            })
        } else if flow.Retransmits >= 10 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "MED",
                Type:        "retransmissions",
                Title:       "Elevated retransmissions",
                Description: "Retransmissions indicate packet loss or congestion.",
                Evidence: map[string]interface{}{
                    "retransmits": flow.Retransmits,
                },
            })
        }

        if flow.OutOfOrder >= 20 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "MED",
                Type:        "out_of_order",
                Title:       "Out-of-order delivery",
                Description: "Out-of-order packets suggest reordering or multipath effects.",
                Evidence: map[string]interface{}{
                    "out_of_order": flow.OutOfOrder,
                },
            })
        }

        if flow.FragmentCount >= 10 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "MED",
                Type:        "fragmentation",
                Title:       "Frequent IP fragmentation",
                Description: "Fragmentation can indicate MTU issues or path problems.",
                Evidence: map[string]interface{}{
                    "fragment_count": flow.FragmentCount,
                },
            })
        }

        if flow.RTTMs != nil && *flow.RTTMs >= 200 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "MED",
                Type:        "high_rtt",
                Title:       "High RTT",
                Description: "Handshake RTT exceeds expected thresholds.",
                Evidence: map[string]interface{}{
                    "rtt_ms": *flow.RTTMs,
                },
            })
        }

        if flow.MSS != nil && *flow.MSS < 1000 {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "LOW",
                Type:        "low_mss",
                Title:       "Low TCP MSS",
                Description: "Low MSS can indicate tunnel overhead or MTU constraints.",
                Evidence: map[string]interface{}{
                    "mss": *flow.MSS,
                },
            })
        }

        if flow.TLSVersion != nil && (*flow.TLSVersion == "TLS1.0" || *flow.TLSVersion == "TLS1.1") {
            findings = append(findings, Finding{
                Flow:        flow,
                Severity:    "LOW",
                Type:        "legacy_tls",
                Title:       "Legacy TLS version",
                Description: "Older TLS versions reduce security posture.",
                Evidence: map[string]interface{}{
                    "tls_version": *flow.TLSVersion,
                },
            })
        }

        if flow.Retransmits >= 10 && len(flow.RetransSizeCount) > 0 {
            maxLen, maxCount := maxRetrans(flow.RetransSizeCount)
            if maxCount >= 5 {
                evidence := map[string]interface{}{
                    "retransmits":      flow.Retransmits,
                    "dominant_len":     maxLen,
                    "dominant_len_cnt": maxCount,
                }
                if flow.MSS != nil {
                    evidence["mss"] = *flow.MSS
                }

                findings = append(findings, Finding{
                    Flow:        flow,
                    Severity:    "MED",
                    Type:        "pmtud_suspected",
                    Title:       "Possible PMTUD blackhole",
                    Description: "Repeated retransmissions around a consistent payload size hint at MTU blackholing.",
                    Evidence:    evidence,
                })
            }
        }
    }

    if hist != nil {
        p95 := hist.Quantile(0.95)
        if p95 >= 200 {
            findings = append(findings, Finding{
                Flow:        nil,
                Severity:    "MED",
                Type:        "pcap_high_rtt_p95",
                Title:       "High p95 RTT across capture",
                Description: "Overall RTT distribution is elevated.",
                Evidence: map[string]interface{}{
                    "p95_rtt_ms": p95,
                },
            })
        }
    }

    return findings
}

func maxRetrans(counts map[int]int) (int, int) {
    maxLen := 0
    maxCount := 0
    for length, count := range counts {
        if count > maxCount {
            maxCount = count
            maxLen = length
        }
    }
    return maxLen, maxCount
}

func EvidenceJSON(evidence map[string]interface{}) string {
    if evidence == nil {
        evidence = map[string]interface{}{}
    }
    data, err := json.Marshal(evidence)
    if err != nil {
        return "{}"
    }
    return string(data)
}
