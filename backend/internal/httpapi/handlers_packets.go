package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"netsage/internal/db"
	"netsage/internal/flows"
	"netsage/internal/pcap"
)

func (s *Server) handleListPacketsForJob(w http.ResponseWriter, r *http.Request) {
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

	limit := 500
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 2000 {
			limit = parsed
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	query := r.URL.Query()
	filter := pcap.ParsePacketFilter(query.Get("filter"))
	if srcIP := query.Get("src_ip"); srcIP != "" {
		filter.SrcIP = srcIP
	}
	if dstIP := query.Get("dst_ip"); dstIP != "" {
		filter.DstIP = dstIP
	}
	if srcPort := query.Get("src_port"); srcPort != "" {
		if parsed, err := strconv.Atoi(srcPort); err == nil {
			filter.SrcPort = &parsed
		}
	}
	if dstPort := query.Get("dst_port"); dstPort != "" {
		if parsed, err := strconv.Atoi(dstPort); err == nil {
			filter.DstPort = &parsed
		}
	}
	if port := query.Get("port"); port != "" {
		if parsed, err := strconv.Atoi(port); err == nil {
			filter.Port = &parsed
		}
	}
	if proto := query.Get("proto"); proto != "" {
		filter.Proto = strings.ToUpper(proto)
	}
	if sni := query.Get("sni"); sni != "" {
		filter.SNI = strings.ToLower(sni)
	}
	if stream := query.Get("stream"); stream != "" {
		if parsed, err := strconv.Atoi(stream); err == nil {
			filter.StreamID = &parsed
		}
	}
	if flags := query.Get("flags"); flags != "" {
		filter.Flags = pcap.ParseFlags(flags)
	}
	if pair := query.Get("pair"); pair != "" {
		filter.Pair = pair == "1" || strings.EqualFold(pair, "true")
	}

	var flowRows []db.Flow
	if err := s.store.DB.Select("id, proto, src_ip, dst_ip, src_port, dst_port, client_ip, client_port, server_ip, server_port, tcp_stream").
		Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID).
		Find(&flowRows).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "flow lookup error"})
		return
	}
	flowIndex := make(pcap.FlowIndex, len(flowRows)*2)
	for _, flow := range flowRows {
		key := flows.FlowKey{
			Proto:   flow.Proto,
			SrcIP:   flow.SrcIP,
			DstIP:   flow.DstIP,
			SrcPort: flow.SrcPort,
			DstPort: flow.DstPort,
		}
		meta := pcap.FlowMeta{
			StreamID:   flow.TCPStream,
			ClientIP:   flow.ClientIP,
			ClientPort: flow.ClientPort,
			ServerIP:   flow.ServerIP,
			ServerPort: flow.ServerPort,
		}
		flowIndex[key] = meta
		flowIndex[key.Reverse()] = meta
	}

	packets, totalCount, err := pcap.ListPackets(r.Context(), pcapRecord.StoragePath, limit, offset, filter, flowIndex)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "packet parse error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"packets":     packets,
		"total_count": totalCount,
	})
}
