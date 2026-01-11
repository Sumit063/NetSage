package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"netsage/internal/ai"
	"netsage/internal/db"
)

func (s *Server) handleExplainIssue(w http.ResponseWriter, r *http.Request) {
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

	var issue db.Issue
	if err := s.store.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&issue).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	var flow db.Flow
	if issue.FlowID != nil {
		_ = s.store.DB.Where("id = ? AND user_id = ?", *issue.FlowID, user.ID).First(&flow).Error
	}

	evidence := map[string]interface{}{}
	_ = json.Unmarshal([]byte(issue.EvidenceJSON), &evidence)

	flowInfo := map[string]interface{}{}
	if flow.ID != 0 {
		flowInfo["proto"] = flow.Proto
		flowInfo["src_ip"] = flow.SrcIP
		flowInfo["dst_ip"] = flow.DstIP
		flowInfo["src_port"] = flow.SrcPort
		flowInfo["dst_port"] = flow.DstPort
		flowInfo["rtt_ms"] = flow.RTTMs
		flowInfo["retransmits"] = flow.Retransmits
		flowInfo["out_of_order"] = flow.OutOfOrder
		flowInfo["mss"] = flow.MSS
		flowInfo["tls_version"] = flow.TLSVersion
		flowInfo["tls_sni"] = flow.TLSSNI
		flowInfo["alpn"] = flow.ALPN
		flowInfo["tls_client_hello"] = flow.TLSClientHello
		flowInfo["tls_server_hello"] = flow.TLSServerHello
		flowInfo["tls_alert"] = flow.TLSAlert
		flowInfo["rst_count"] = flow.RSTCount
		flowInfo["fragment_count"] = flow.FragmentCount
		flowInfo["throughput_bps"] = flow.ThroughputBps
	}

	summary := ai.IssueSummary{
		IssueID:     issue.ID,
		Severity:    issue.Severity,
		Type:        issue.Type,
		Title:       issue.Title,
		Description: issue.Description,
		Evidence:    evidence,
		Flow:        flowInfo,
	}

	hash, err := ai.HashSummary(summary)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "hash failed"})
		return
	}

	var existing db.AIExplanation
	if err := s.store.DB.Where("issue_id = ? AND user_id = ? AND prompt_hash = ?", issue.ID, user.ID, hash).
		First(&existing).Error; err == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"issue_id":    issue.ID,
			"model":       existing.Model,
			"response":    existing.ResponseText,
			"prompt_hash": hash,
			"shared":      summary,
			"cached":      true,
		})
		return
	}

	answer, model, err := s.aiClient.Explain(r.Context(), hash, summary)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "ai request failed"})
		return
	}

	explanation := db.AIExplanation{
		IssueID:      issue.ID,
		UserID:       user.ID,
		PromptHash:   hash,
		Model:        model,
		ResponseText: answer,
	}
	_ = s.store.DB.Create(&explanation).Error

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"issue_id":    issue.ID,
		"model":       model,
		"response":    answer,
		"prompt_hash": hash,
		"shared":      summary,
		"cached":      false,
	})
}
