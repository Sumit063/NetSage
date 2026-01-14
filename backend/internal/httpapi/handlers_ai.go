package httpapi

import (
	"encoding/json"
	"errors"
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

	var evidence []db.IssueEvidence
	if err := s.store.DB.Where("issue_id = ?", issue.ID).Find(&evidence).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	metrics := map[string]interface{}{}
	if issue.PrimaryFlowID != nil {
		for _, ev := range evidence {
			if ev.FlowID == *issue.PrimaryFlowID {
				metrics = decodeMetrics(ev.MetricsJSON)
				break
			}
		}
	}
	if len(metrics) == 0 && len(evidence) > 0 {
		metrics = decodeMetrics(evidence[0].MetricsJSON)
	}

	summary := ai.TriageSummary{
		IssueType: issue.IssueType,
		Metrics:   metrics,
	}

	hash, err := ai.HashSummary(summary)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "hash failed"})
		return
	}

	var existing db.AIExplanation
	if err := s.store.DB.Where("issue_id = ? AND user_id = ? AND prompt_hash = ?", issue.ID, user.ID, hash).
		First(&existing).Error; err == nil {
		explanation, err := decodeAIExplanation(existing.ResponseText)
		if err == nil {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"issue_id":    issue.ID,
				"model":       existing.Model,
				"response":    explanation,
				"prompt_hash": hash,
				"shared":      summary,
				"cached":      true,
				"valid":       true,
			})
			return
		}
	}

	explanation, model, err := s.aiClient.Explain(r.Context(), hash, summary)
	if err != nil {
		fallback := deterministicExplanation(issue.Summary)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"issue_id":    issue.ID,
			"model":       model,
			"response":    fallback,
			"prompt_hash": hash,
			"shared":      summary,
			"cached":      false,
			"valid":       false,
		})
		return
	}

	encoded, err := json.Marshal(explanation)
	if err == nil {
		explanationRecord := db.AIExplanation{
			IssueID:      issue.ID,
			UserID:       user.ID,
			PromptHash:   hash,
			Model:        model,
			ResponseText: string(encoded),
		}
		_ = s.store.DB.Create(&explanationRecord).Error
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"issue_id":    issue.ID,
		"model":       model,
		"response":    explanation,
		"prompt_hash": hash,
		"shared":      summary,
		"cached":      false,
		"valid":       true,
	})
}

func decodeAIExplanation(raw string) (ai.Explanation, error) {
	var exp ai.Explanation
	if err := json.Unmarshal([]byte(raw), &exp); err != nil {
		return ai.Explanation{}, err
	}
	if exp.Explanation == "" {
		return ai.Explanation{}, errors.New("missing explanation")
	}
	if exp.PossibleCauses == nil {
		exp.PossibleCauses = []string{}
	}
	if exp.NextSteps == nil {
		exp.NextSteps = []string{}
	}
	return exp, nil
}

func deterministicExplanation(summary string) ai.Explanation {
	return ai.Explanation{
		Explanation:    summary,
		PossibleCauses: []string{},
		NextSteps:      []string{},
	}
}
