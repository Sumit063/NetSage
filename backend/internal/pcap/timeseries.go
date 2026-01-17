package pcap

import (
	"context"
	"sort"
	"time"

	"netsage/internal/flows"
)

type TimePoint struct {
	Ts    time.Time `json:"ts"`
	Value int64     `json:"value"`
}

type Timeseries struct {
	GranularitySec int         `json:"granularity_sec"`
	PacketsPerSec  []TimePoint `json:"packets_per_sec"`
	BytesPerSec    []TimePoint `json:"bytes_per_sec"`
}

type StreamPoint struct {
	Ts       time.Time `json:"ts"`
	Inbound  int64     `json:"inbound"`
	Outbound int64     `json:"outbound"`
	Total    int64     `json:"total"`
}

type StreamTimeseries struct {
	GranularitySec int           `json:"granularity_sec"`
	PacketsPerSec  []StreamPoint `json:"packets_per_sec"`
	BytesPerSec    []StreamPoint `json:"bytes_per_sec"`
}

func BuildTimeseries(ctx context.Context, path string, granularity time.Duration) (Timeseries, error) {
	if granularity <= 0 {
		granularity = time.Second
	}

	packetSource, file, err := openPacketSource(path)
	if err != nil {
		return Timeseries{}, err
	}
	defer file.Close()

	packetBuckets := make(map[time.Time]int64)
	byteBuckets := make(map[time.Time]int64)

	for packet := range packetSource.Packets() {
		select {
		case <-ctx.Done():
			return Timeseries{}, ctx.Err()
		default:
		}

		if packet == nil {
			continue
		}
		info, ok := parsePacket(packet)
		if !ok {
			continue
		}
		bucket := info.Timestamp.Truncate(granularity)
		packetBuckets[bucket]++
		byteBuckets[bucket] += int64(info.Length)
	}

	packetSeries := bucketSeries(packetBuckets)
	byteSeries := bucketSeries(byteBuckets)

	return Timeseries{
		GranularitySec: int(granularity.Seconds()),
		PacketsPerSec:  packetSeries,
		BytesPerSec:    byteSeries,
	}, nil
}

func BuildStreamTimeseries(
	ctx context.Context,
	path string,
	granularity time.Duration,
	flowKey flows.FlowKey,
	clientIP string,
	clientPort int,
	serverIP string,
	serverPort int,
) (StreamTimeseries, error) {
	if granularity <= 0 {
		granularity = time.Second
	}

	packetSource, file, err := openPacketSource(path)
	if err != nil {
		return StreamTimeseries{}, err
	}
	defer file.Close()

	type bucket struct {
		packetsIn  int64
		packetsOut int64
		bytesIn    int64
		bytesOut   int64
	}

	buckets := make(map[time.Time]*bucket)
	rev := flowKey.Reverse()

	for packet := range packetSource.Packets() {
		select {
		case <-ctx.Done():
			return StreamTimeseries{}, ctx.Err()
		default:
		}

		if packet == nil {
			continue
		}
		info, ok := parsePacket(packet)
		if !ok {
			continue
		}

		key := flows.FlowKey{
			Proto:   info.Proto,
			SrcIP:   info.SrcIP,
			DstIP:   info.DstIP,
			SrcPort: info.SrcPort,
			DstPort: info.DstPort,
		}
		if key != flowKey && key != rev {
			continue
		}

		bucketKey := info.Timestamp.Truncate(granularity)
		entry := buckets[bucketKey]
		if entry == nil {
			entry = &bucket{}
			buckets[bucketKey] = entry
		}

		if info.SrcIP == clientIP && info.SrcPort == clientPort && info.DstIP == serverIP && info.DstPort == serverPort {
			entry.packetsOut++
			entry.bytesOut += int64(info.Length)
		} else if info.SrcIP == serverIP && info.SrcPort == serverPort && info.DstIP == clientIP && info.DstPort == clientPort {
			entry.packetsIn++
			entry.bytesIn += int64(info.Length)
		}
	}

	keys := make([]time.Time, 0, len(buckets))
	for ts := range buckets {
		keys = append(keys, ts)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i].Before(keys[j]) })

	packetSeries := make([]StreamPoint, 0, len(keys))
	byteSeries := make([]StreamPoint, 0, len(keys))
	for _, ts := range keys {
		entry := buckets[ts]
		packetSeries = append(packetSeries, StreamPoint{
			Ts:       ts,
			Inbound:  entry.packetsIn,
			Outbound: entry.packetsOut,
			Total:    entry.packetsIn + entry.packetsOut,
		})
		byteSeries = append(byteSeries, StreamPoint{
			Ts:       ts,
			Inbound:  entry.bytesIn,
			Outbound: entry.bytesOut,
			Total:    entry.bytesIn + entry.bytesOut,
		})
	}

	return StreamTimeseries{
		GranularitySec: int(granularity.Seconds()),
		PacketsPerSec:  packetSeries,
		BytesPerSec:    byteSeries,
	}, nil
}

func bucketSeries(buckets map[time.Time]int64) []TimePoint {
	if len(buckets) == 0 {
		return []TimePoint{}
	}
	keys := make([]time.Time, 0, len(buckets))
	for ts := range buckets {
		keys = append(keys, ts)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i].Before(keys[j]) })

	series := make([]TimePoint, 0, len(keys))
	for _, ts := range keys {
		series = append(series, TimePoint{Ts: ts, Value: buckets[ts]})
	}
	return series
}
