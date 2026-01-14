package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"netsage/internal/db"
)

func (s *Server) handleListFlows(w http.ResponseWriter, r *http.Request) {
	user, ok := getUser(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	pcapID, err := strconv.Atoi(chiURLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	q := s.store.DB.Where("pcap_id = ? AND user_id = ?", pcapID, user.ID)

	if proto := r.URL.Query().Get("proto"); proto != "" {
		q = q.Where("proto = ?", proto)
	}
	if protocol := r.URL.Query().Get("protocol"); protocol != "" {
		q = q.Where("proto = ?", protocol)
	}
	if clientIP := strings.TrimSpace(r.URL.Query().Get("client_ip")); clientIP != "" {
		q = q.Where("client_ip ILIKE ?", "%"+clientIP+"%")
	}
	if serverIP := strings.TrimSpace(r.URL.Query().Get("server_ip")); serverIP != "" {
		q = q.Where("server_ip ILIKE ?", "%"+serverIP+"%")
	}
	if port := r.URL.Query().Get("port"); port != "" {
		if parsed, err := strconv.Atoi(port); err == nil {
			q = q.Where("client_port = ? OR server_port = ?", parsed, parsed)
		}
	}
	if stream := r.URL.Query().Get("tcp_stream"); stream != "" {
		if parsed, err := strconv.Atoi(stream); err == nil {
			q = q.Where("tcp_stream = ?", parsed)
		}
	}
	if stream := r.URL.Query().Get("stream"); stream != "" {
		if parsed, err := strconv.Atoi(stream); err == nil {
			q = q.Where("tcp_stream = ?", parsed)
		}
	}
	if srcIP := r.URL.Query().Get("src_ip"); srcIP != "" {
		q = q.Where("src_ip = ?", srcIP)
	}
	if dstIP := r.URL.Query().Get("dst_ip"); dstIP != "" {
		q = q.Where("dst_ip = ?", dstIP)
	}

	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var flows []db.Flow
	if err := q.Order("bytes_sent + bytes_recv desc").Limit(limit).Offset(offset).Find(&flows).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	for i := range flows {
		normalizeFlowEndpoints(&flows[i])
	}

	writeJSON(w, http.StatusOK, flows)
}

func (s *Server) handleGetFlow(w http.ResponseWriter, r *http.Request) {
	user, ok := getUser(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	id, err := strconv.Atoi(chiURLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	var flow db.Flow
	if err := s.store.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&flow).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	normalizeFlowEndpoints(&flow)
	writeJSON(w, http.StatusOK, flow)
}

func (s *Server) handleListFlowsForJob(w http.ResponseWriter, r *http.Request) {
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

	q := s.store.DB.Where("pcap_id = ? AND user_id = ?", job.PcapID, user.ID)

	if proto := r.URL.Query().Get("proto"); proto != "" {
		q = q.Where("proto = ?", proto)
	}
	if protocol := r.URL.Query().Get("protocol"); protocol != "" {
		q = q.Where("proto = ?", protocol)
	}
	if clientIP := strings.TrimSpace(r.URL.Query().Get("client_ip")); clientIP != "" {
		q = q.Where("client_ip ILIKE ?", "%"+clientIP+"%")
	}
	if serverIP := strings.TrimSpace(r.URL.Query().Get("server_ip")); serverIP != "" {
		q = q.Where("server_ip ILIKE ?", "%"+serverIP+"%")
	}
	if port := r.URL.Query().Get("port"); port != "" {
		if parsed, err := strconv.Atoi(port); err == nil {
			q = q.Where("client_port = ? OR server_port = ?", parsed, parsed)
		}
	}
	if stream := r.URL.Query().Get("tcp_stream"); stream != "" {
		if parsed, err := strconv.Atoi(stream); err == nil {
			q = q.Where("tcp_stream = ?", parsed)
		}
	}
	if stream := r.URL.Query().Get("stream"); stream != "" {
		if parsed, err := strconv.Atoi(stream); err == nil {
			q = q.Where("tcp_stream = ?", parsed)
		}
	}

	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var flows []db.Flow
	if err := q.Order("bytes_sent + bytes_recv desc").Limit(limit).Offset(offset).Find(&flows).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	for i := range flows {
		normalizeFlowEndpoints(&flows[i])
	}

	writeJSON(w, http.StatusOK, flows)
}
