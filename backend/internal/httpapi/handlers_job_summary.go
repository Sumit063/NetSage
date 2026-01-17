package httpapi

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"netsage/internal/db"
	"netsage/internal/pcap"
)

type jobSummarySource struct {
	IP      string `json:"ip"`
	Packets int64  `json:"packets"`
	Bytes   int64  `json:"bytes"`
}

type jobSummaryConversation struct {
	FlowID     uint      `json:"flow_id"`
	ClientIP   string    `json:"client_ip"`
	ClientPort int       `json:"client_port"`
	ServerIP   string    `json:"server_ip"`
	ServerPort int       `json:"server_port"`
	Protocol   string    `json:"protocol"`
	Packets    int64     `json:"packets"`
	Bytes      int64     `json:"bytes"`
	FirstTS    time.Time `json:"first_ts"`
	LastTS     time.Time `json:"last_ts"`
	DurationMs float64   `json:"duration_ms"`
}

type jobSummaryPort struct {
	Port    int   `json:"port"`
	Packets int64 `json:"packets"`
}

type jobSummaryTotals struct {
	TotalPackets int64 `json:"total_packets"`
	TotalBytes   int64 `json:"total_bytes"`
	TotalStreams int64 `json:"total_streams"`
	TCPStreams   int64 `json:"tcp_streams"`
	UDPStreams   int64 `json:"udp_streams"`
}

func (s *Server) handleGetJobSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := getUser(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	jobID, err := strconv.Atoi(chiURLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	var job db.Job
	if err := s.store.DB.Where("id = ? AND user_id = ?", jobID, user.ID).First(&job).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	var pcapRecord db.Pcap
	if err := s.store.DB.Where("id = ? AND user_id = ?", job.PcapID, user.ID).First(&pcapRecord).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pcap not found"})
		return
	}

	var sources []jobSummarySource
	s.store.DB.Model(&db.Flow{}).
		Select("src_ip as ip, SUM(packet_count) as packets, SUM(bytes_client_to_server + bytes_server_to_client) as bytes").
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Group("src_ip").
		Order("packets desc").
		Limit(10).
		Scan(&sources)

	var destinations []jobSummarySource
	s.store.DB.Model(&db.Flow{}).
		Select("dst_ip as ip, SUM(packet_count) as packets, SUM(bytes_client_to_server + bytes_server_to_client) as bytes").
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Group("dst_ip").
		Order("packets desc").
		Limit(10).
		Scan(&destinations)

	type conversationRow struct {
		FlowID     uint
		ClientIP   string
		ClientPort int
		ServerIP   string
		ServerPort int
		Protocol   string
		Packets    int64
		Bytes      int64
		FirstTS    time.Time
		LastTS     time.Time
	}
	var convoRows []conversationRow
	s.store.DB.Model(&db.Flow{}).
		Select(`id as flow_id, client_ip, client_port, server_ip, server_port, proto,
			packet_count as packets,
			bytes_client_to_server + bytes_server_to_client as bytes,
			first_seen as first_ts,
			last_seen as last_ts`).
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Order("packets desc").
		Limit(25).
		Scan(&convoRows)

	conversations := make([]jobSummaryConversation, 0, len(convoRows))
	for _, row := range convoRows {
		duration := row.LastTS.Sub(row.FirstTS).Seconds() * 1000
		conversations = append(conversations, jobSummaryConversation{
			FlowID:     row.FlowID,
			ClientIP:   row.ClientIP,
			ClientPort: row.ClientPort,
			ServerIP:   row.ServerIP,
			ServerPort: row.ServerPort,
			Protocol:   strings.ToUpper(row.Protocol),
			Packets:    row.Packets,
			Bytes:      row.Bytes,
			FirstTS:    row.FirstTS,
			LastTS:     row.LastTS,
			DurationMs: duration,
		})
	}

	var flowRows []db.Flow
	if err := s.store.DB.Select("id, proto, packet_count, bytes_client_to_server, bytes_server_to_client, server_port, tls_client_hello, tls_server_hello, tls_alert, http_method").
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Find(&flowRows).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "flow stats error"})
		return
	}

	protocolCounts := make(map[string]int64)
	streamCounts := make(map[string]int64)
	appProtocols := make(map[string]int64)
	var totalPackets int64
	var totalBytes int64

	for _, flow := range flowRows {
		proto := strings.ToUpper(flow.Proto)
		if proto == "" {
			proto = "OTHER"
		}
		totalPackets += flow.PacketCount
		totalBytes += flow.BytesClientToServer + flow.BytesServerToClient
		protocolCounts[proto] += flow.PacketCount
		streamCounts[proto]++

		if proto == "UDP" && flow.ServerPort == 443 {
			appProtocols["Likely QUIC"]++
		}
		if proto == "TCP" && flow.ServerPort == 21 {
			appProtocols["Likely FTP"]++
		}
		if proto == "TCP" && (flow.HTTPMethod != nil || flow.ServerPort == 80 || flow.ServerPort == 8080) {
			appProtocols["Likely HTTP"]++
		}
		if proto == "TCP" && (flow.TLSClientHello || flow.TLSServerHello || flow.TLSAlert || flow.ServerPort == 443) {
			appProtocols["Likely TLS"]++
		}
	}

	totals := jobSummaryTotals{
		TotalPackets: totalPackets,
		TotalBytes:   totalBytes,
		TotalStreams: int64(len(flowRows)),
		TCPStreams:   streamCounts["TCP"],
		UDPStreams:   streamCounts["UDP"],
	}

	var ports []jobSummaryPort
	s.store.DB.Model(&db.Flow{}).
		Select("server_port as port, SUM(packet_count) as packets").
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Where("server_port > 0").
		Group("server_port").
		Order("packets desc").
		Limit(10).
		Scan(&ports)
	sort.Slice(ports, func(i, j int) bool {
		return ports[i].Packets > ports[j].Packets
	})

	timeseries, err := pcap.BuildTimeseries(r.Context(), pcapRecord.StoragePath, time.Second)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "timeseries error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"top_sources":       sources,
		"top_destinations":  destinations,
		"top_conversations": conversations,
		"protocol_counts":   protocolCounts,
		"top_ports":         ports,
		"stream_counts":     streamCounts,
		"app_protocols":     appProtocols,
		"totals":            totals,
		"timeseries":        timeseries,
	})
}
