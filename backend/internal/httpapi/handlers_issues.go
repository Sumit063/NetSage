package httpapi

import (
    "net/http"
    "strconv"

    "netsage/internal/db"
)

func (s *Server) handleListIssues(w http.ResponseWriter, r *http.Request) {
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

    if severity := r.URL.Query().Get("severity"); severity != "" {
        q = q.Where("severity = ?", severity)
    }
    if typ := r.URL.Query().Get("type"); typ != "" {
        q = q.Where("type = ?", typ)
    }
    if flowID := r.URL.Query().Get("flow_id"); flowID != "" {
        if parsed, err := strconv.Atoi(flowID); err == nil {
            q = q.Where("flow_id = ?", parsed)
        }
    }

    var issues []db.Issue
    if err := q.Order("created_at desc").Find(&issues).Error; err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
        return
    }

    writeJSON(w, http.StatusOK, issues)
}
