package httpapi

import (
    "net/http"
    "strconv"

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

    writeJSON(w, http.StatusOK, flow)
}
