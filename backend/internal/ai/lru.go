package ai

import (
    "container/list"
    "sync"
    "time"
)

type cacheEntry struct {
    key       string
    value     string
    expiresAt time.Time
}

type LRUCache struct {
    mu       sync.Mutex
    capacity int
    ttl      time.Duration
    items    map[string]*list.Element
    order    *list.List
}

func NewLRUCache(capacity int, ttl time.Duration) *LRUCache {
    return &LRUCache{
        capacity: capacity,
        ttl:      ttl,
        items:    make(map[string]*list.Element),
        order:    list.New(),
    }
}

func (c *LRUCache) Get(key string) (string, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()

    elem, ok := c.items[key]
    if !ok {
        return "", false
    }

    entry := elem.Value.(cacheEntry)
    if time.Now().After(entry.expiresAt) {
        c.order.Remove(elem)
        delete(c.items, key)
        return "", false
    }

    c.order.MoveToFront(elem)
    return entry.value, true
}

func (c *LRUCache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()

    if elem, ok := c.items[key]; ok {
        c.order.MoveToFront(elem)
        elem.Value = cacheEntry{key: key, value: value, expiresAt: time.Now().Add(c.ttl)}
        return
    }

    entry := cacheEntry{key: key, value: value, expiresAt: time.Now().Add(c.ttl)}
    elem := c.order.PushFront(entry)
    c.items[key] = elem

    if c.order.Len() > c.capacity {
        last := c.order.Back()
        if last != nil {
            c.order.Remove(last)
            old := last.Value.(cacheEntry)
            delete(c.items, old.key)
        }
    }
}
