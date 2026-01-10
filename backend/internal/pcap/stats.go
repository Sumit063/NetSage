package pcap

import (
    "encoding/json"
    "fmt"

    "netsage/internal/flows"
)

type Stats struct {
    TopTalkers   []flows.TopKItem `json:"top_talkers"`
    TopFlows     []flows.TopKItem `json:"top_flows"`
    RTTBuckets   []float64        `json:"rtt_buckets"`
    RTTCounts    []int64          `json:"rtt_counts"`
    RTTQuantiles map[string]float64 `json:"rtt_quantiles"`
}

func BuildStats(flowMap map[flows.FlowKey]*flows.FlowAgg, hist *flows.Histogram) Stats {
    talkerBytes := make(map[string]float64)
    topTalkers := flows.NewTopK(5)
    topFlows := flows.NewTopK(5)

    for _, flow := range flowMap {
        total := float64(flow.BytesSent + flow.BytesRecv)
        if total == 0 {
            continue
        }

        talkerBytes[flow.Key.SrcIP] += float64(flow.BytesSent)
        talkerBytes[flow.Key.DstIP] += float64(flow.BytesRecv)

        key := fmt.Sprintf("%s:%d -> %s:%d (%s)", flow.Key.SrcIP, flow.Key.SrcPort, flow.Key.DstIP, flow.Key.DstPort, flow.Key.Proto)
        topFlows.Add(flows.TopKItem{Key: key, Value: total})
    }

    for ip, bytes := range talkerBytes {
        topTalkers.Add(flows.TopKItem{Key: ip, Value: bytes})
    }

    stats := Stats{
        TopTalkers: topTalkers.ItemsDesc(),
        TopFlows:   topFlows.ItemsDesc(),
        RTTBuckets: hist.Buckets,
        RTTCounts:  hist.Counts,
        RTTQuantiles: map[string]float64{
            "p50": hist.Quantile(0.50),
            "p95": hist.Quantile(0.95),
            "p99": hist.Quantile(0.99),
        },
    }

    return stats
}

func (s Stats) JSON() (string, string, string) {
    topTalkers, _ := json.Marshal(s.TopTalkers)
    topFlows, _ := json.Marshal(s.TopFlows)
    hist, _ := json.Marshal(map[string]interface{}{
        "buckets":   s.RTTBuckets,
        "counts":    s.RTTCounts,
        "quantiles": s.RTTQuantiles,
    })
    return string(topTalkers), string(topFlows), string(hist)
}
