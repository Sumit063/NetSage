package flows

import (
    "container/heap"
    "sort"
)

type TopKItem struct {
    Key   string  `json:"key"`
    Value float64 `json:"value"`
}

type topKHeap []TopKItem

func (h topKHeap) Len() int           { return len(h) }
func (h topKHeap) Less(i, j int) bool { return h[i].Value < h[j].Value }
func (h topKHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *topKHeap) Push(x interface{}) {
    *h = append(*h, x.(TopKItem))
}

func (h *topKHeap) Pop() interface{} {
    old := *h
    n := len(old)
    item := old[n-1]
    *h = old[:n-1]
    return item
}

type TopK struct {
    k    int
    heap topKHeap
}

func NewTopK(k int) *TopK {
    return &TopK{k: k}
}

func (t *TopK) Add(item TopKItem) {
    if t.k <= 0 {
        return
    }

    if t.heap.Len() < t.k {
        heap.Push(&t.heap, item)
        return
    }

    if t.heap[0].Value < item.Value {
        heap.Pop(&t.heap)
        heap.Push(&t.heap, item)
    }
}

func (t *TopK) ItemsDesc() []TopKItem {
    items := make([]TopKItem, len(t.heap))
    copy(items, t.heap)
    sort.Slice(items, func(i, j int) bool {
        return items[i].Value > items[j].Value
    })
    return items
}
