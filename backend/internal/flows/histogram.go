package flows

import "sort"

type Histogram struct {
    Buckets []float64
    Counts  []int64
}

func NewRTTHistogram() *Histogram {
    buckets := []float64{1, 5, 10, 20, 50, 100, 200, 500, 1000}
    counts := make([]int64, len(buckets)+1)
    return &Histogram{Buckets: buckets, Counts: counts}
}

func (h *Histogram) Add(valueMs float64) {
    idx := sort.SearchFloat64s(h.Buckets, valueMs)
    h.Counts[idx]++
}

func (h *Histogram) Quantile(q float64) float64 {
    if q <= 0 {
        return 0
    }
    total := int64(0)
    for _, c := range h.Counts {
        total += c
    }
    if total == 0 {
        return 0
    }

    target := int64(float64(total) * q)
    if target == 0 {
        target = 1
    }

    cum := int64(0)
    for i, c := range h.Counts {
        cum += c
        if cum >= target {
            if i < len(h.Buckets) {
                return h.Buckets[i]
            }
            return h.Buckets[len(h.Buckets)-1]
        }
    }
    return h.Buckets[len(h.Buckets)-1]
}
