package flows

import (
    "container/list"
    "time"
)

type SeqKey struct {
    Direction int
    Seq       uint32
    Length    int
}

type seqEntry struct {
    key      SeqKey
    lastSeen time.Time
}

type SeqCache struct {
    capacity int
    ttl      time.Duration
    items    map[SeqKey]*list.Element
    order    *list.List
}

func NewSeqCache(capacity int, ttl time.Duration) *SeqCache {
    return &SeqCache{
        capacity: capacity,
        ttl:      ttl,
        items:    make(map[SeqKey]*list.Element),
        order:    list.New(),
    }
}

func (c *SeqCache) Seen(key SeqKey, ts time.Time) bool {
    if elem, ok := c.items[key]; ok {
        entry := elem.Value.(seqEntry)
        if ts.Sub(entry.lastSeen) <= c.ttl {
            entry.lastSeen = ts
            elem.Value = entry
            c.order.MoveToFront(elem)
            return true
        }
        entry.lastSeen = ts
        elem.Value = entry
        c.order.MoveToFront(elem)
        return false
    }

    elem := c.order.PushFront(seqEntry{key: key, lastSeen: ts})
    c.items[key] = elem

    if c.order.Len() > c.capacity {
        last := c.order.Back()
        if last != nil {
            c.order.Remove(last)
            old := last.Value.(seqEntry)
            delete(c.items, old.key)
        }
    }
    return false
}
