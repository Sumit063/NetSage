package httpapi

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"

    "netsage/internal/db"
    "netsage/internal/pcap"
)

func (s *Server) handleCertInspect(w http.ResponseWriter, r *http.Request) {
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

    host := ""
    if flow.TLSSNI != nil {
        host = strings.TrimSpace(*flow.TLSSNI)
    }
    if host == "" {
        host = strings.TrimSpace(r.URL.Query().Get("host"))
    }
    if host == "" {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "host required (no SNI in flow)"})
        return
    }

    port := flow.DstPort
    if p := r.URL.Query().Get("port"); p != "" {
        if parsed, err := strconv.Atoi(p); err == nil {
            port = parsed
        }
    }
    if port == 0 {
        port = 443
    }

    report, err := pcap.InspectCert(r.Context(), host, port)
    if err != nil {
        writeJSON(w, http.StatusBadGateway, map[string]string{"error": "cert inspect failed"})
        return
    }

    if len(report.Issues) > 0 {
        severity := "MED"
        if report.Expired || !report.HostnameValid || report.SelfSigned {
            severity = "HIGH"
        } else if report.WeakSignatureAlgo {
            severity = "LOW"
        }

        evidenceBytes, _ := json.Marshal(report)
        issue := db.Issue{
            PcapID:       flow.PcapID,
            UserID:       user.ID,
            FlowID:       &flow.ID,
            Severity:     severity,
            Type:         "cert_inspection",
            Title:        "TLS certificate inspection findings",
            Description:  "Active certificate inspection found potential issues.",
            EvidenceJSON: string(evidenceBytes),
        }
        _ = s.store.DB.Create(&issue).Error
    }

    writeJSON(w, http.StatusOK, report)
}
