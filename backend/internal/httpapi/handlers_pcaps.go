package httpapi

import (
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
    "time"

    "netsage/internal/db"
    "netsage/internal/jobs"
)

func (s *Server) handleUploadPCAP(w http.ResponseWriter, r *http.Request) {
    user, ok := getUser(r.Context())
    if !ok {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
        return
    }

    maxBytes := s.cfg.MaxUploadMB * 1024 * 1024
    r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

    if err := r.ParseMultipartForm(maxBytes); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid multipart"})
        return
    }

    file, header, err := r.FormFile("pcap")
    if err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pcap file required"})
        return
    }
    defer file.Close()

    if err := os.MkdirAll(s.cfg.UploadDir, 0o755); err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "upload dir error"})
        return
    }

    safeName := strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + filepath.Base(header.Filename)
    storagePath := filepath.Join(s.cfg.UploadDir, safeName)

    out, err := os.Create(storagePath)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "save failed"})
        return
    }
    defer out.Close()

    if _, err := io.Copy(out, file); err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "save failed"})
        return
    }

    pcap := db.Pcap{
        UserID:      user.ID,
        Filename:    header.Filename,
        StoragePath: storagePath,
    }
    if err := s.store.DB.Create(&pcap).Error; err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
        return
    }

    job, err := jobs.Enqueue(r.Context(), s.store.DB, user.ID, pcap.ID)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "job enqueue failed"})
        return
    }

    writeJSON(w, http.StatusOK, map[string]interface{}{
        "pcap_id": pcap.ID,
        "job_id":  job.ID,
    })
}

func (s *Server) handleListPCAPs(w http.ResponseWriter, r *http.Request) {
    user, ok := getUser(r.Context())
    if !ok {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
        return
    }

    var pcaps []db.Pcap
    if err := s.store.DB.Where("user_id = ?", user.ID).Order("uploaded_at desc").Find(&pcaps).Error; err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
        return
    }

    writeJSON(w, http.StatusOK, pcaps)
}

func (s *Server) handleGetPCAP(w http.ResponseWriter, r *http.Request) {
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

    var pcap db.Pcap
    if err := s.store.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&pcap).Error; err != nil {
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
        return
    }

    var jobCount int64
    s.store.DB.Model(&db.Job{}).Where("pcap_id = ?", pcap.ID).Count(&jobCount)

    writeJSON(w, http.StatusOK, map[string]interface{}{
        "pcap":      pcap,
        "job_count": jobCount,
    })
}
