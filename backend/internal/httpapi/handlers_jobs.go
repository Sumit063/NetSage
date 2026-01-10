package httpapi

import (
    "net/http"
    "strconv"

    "netsage/internal/db"
)

func (s *Server) handleListJobsForPCAP(w http.ResponseWriter, r *http.Request) {
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

    var jobs []db.Job
    if err := s.store.DB.Where("pcap_id = ? AND user_id = ?", id, user.ID).Order("created_at desc").Find(&jobs).Error; err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
        return
    }

    writeJSON(w, http.StatusOK, jobs)
}

func (s *Server) handleGetJob(w http.ResponseWriter, r *http.Request) {
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

    var job db.Job
    if err := s.store.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&job).Error; err != nil {
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
        return
    }

    writeJSON(w, http.StatusOK, job)
}
