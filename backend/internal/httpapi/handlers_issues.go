package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"netsage/internal/db"

	"gorm.io/gorm"
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

	var job db.Job
	jobIDParam := r.URL.Query().Get("job_id")
	if jobIDParam != "" {
		if parsed, err := strconv.Atoi(jobIDParam); err == nil {
			if err := s.store.DB.Where("id = ? AND user_id = ?", parsed, user.ID).First(&job).Error; err != nil {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "job not found"})
				return
			}
		}
	} else {
		_ = s.store.DB.Where("pcap_id = ? AND user_id = ?", pcapID, user.ID).Order("created_at desc").First(&job).Error
	}

	q := s.store.DB.Where("pcap_id = ? AND user_id = ?", pcapID, user.ID)
	if job.ID != 0 {
		q = q.Where("job_id = ?", job.ID)
	}

	if severity := r.URL.Query().Get("severity"); severity != "" {
		if parsed, err := strconv.Atoi(severity); err == nil {
			q = q.Where("severity = ?", parsed)
		}
	}
	if typ := r.URL.Query().Get("issue_type"); typ != "" {
		q = q.Where("issue_type = ?", typ)
	}
	if flowID := r.URL.Query().Get("flow_id"); flowID != "" {
		if parsed, err := strconv.Atoi(flowID); err == nil {
			q = q.Where("primary_flow_id = ?", parsed)
		}
	}

	var issues []db.Issue
	if err := q.Order("severity desc, created_at desc").Find(&issues).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	writeJSON(w, http.StatusOK, buildIssueListResponse(issues, s.store.DB))
}

func (s *Server) handleListIssuesForJob(w http.ResponseWriter, r *http.Request) {
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

	q := s.store.DB.Where("job_id = ? AND user_id = ?", job.ID, user.ID)
	if severity := r.URL.Query().Get("severity"); severity != "" {
		if parsed, err := strconv.Atoi(severity); err == nil {
			q = q.Where("severity = ?", parsed)
		}
	}
	if typ := r.URL.Query().Get("issue_type"); typ != "" {
		q = q.Where("issue_type = ?", typ)
	}
	if flowID := r.URL.Query().Get("flow_id"); flowID != "" {
		if parsed, err := strconv.Atoi(flowID); err == nil {
			q = q.Where("primary_flow_id = ?", parsed)
		}
	}

	var issues []db.Issue
	if err := q.Order("severity desc, created_at desc").Find(&issues).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	writeJSON(w, http.StatusOK, buildIssueListResponse(issues, s.store.DB))
}

func (s *Server) handleGetIssue(w http.ResponseWriter, r *http.Request) {
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

	flowMap := loadFlowEndpoints(evidence, s.store.DB)

	type evidenceItem struct {
		FlowID           uint                   `json:"flow_id"`
		PacketStartIndex int                    `json:"packet_start_index"`
		PacketEndIndex   int                    `json:"packet_end_index"`
		Metrics          map[string]interface{} `json:"metrics"`
		Flow             *flowEndpoint          `json:"flow,omitempty"`
	}

	responseEvidence := make([]evidenceItem, 0, len(evidence))
	for _, ev := range evidence {
		metrics := decodeMetrics(ev.MetricsJSON)
		responseEvidence = append(responseEvidence, evidenceItem{
			FlowID:           ev.FlowID,
			PacketStartIndex: ev.PacketStartIndex,
			PacketEndIndex:   ev.PacketEndIndex,
			Metrics:          metrics,
			Flow:             flowMap[ev.FlowID],
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"issue":    issue,
		"evidence": responseEvidence,
	})
}

type flowEndpoint struct {
	ID         uint   `json:"id"`
	Protocol   string `json:"protocol"`
	ClientIP   string `json:"client_ip"`
	ClientPort int    `json:"client_port"`
	ServerIP   string `json:"server_ip"`
	ServerPort int    `json:"server_port"`
	TCPStream  *int   `json:"tcp_stream,omitempty"`
}

func buildIssueListResponse(issues []db.Issue, gdb *gorm.DB) []map[string]interface{} {
	if len(issues) == 0 {
		return []map[string]interface{}{}
	}

	flowIDs := make([]uint, 0, len(issues))
	for _, issue := range issues {
		if issue.PrimaryFlowID != nil {
			flowIDs = append(flowIDs, *issue.PrimaryFlowID)
		}
	}

	flowMap := loadFlowEndpointsByIDs(flowIDs, gdb)
	response := make([]map[string]interface{}, 0, len(issues))
	for _, issue := range issues {
		item := map[string]interface{}{
			"id":              issue.ID,
			"pcap_id":         issue.PcapID,
			"job_id":          issue.JobID,
			"issue_type":      issue.IssueType,
			"severity":        issue.Severity,
			"title":           issue.Title,
			"summary":         issue.Summary,
			"primary_flow_id": issue.PrimaryFlowID,
			"created_at":      issue.CreatedAt,
		}
		if issue.PrimaryFlowID != nil {
			if flow, ok := flowMap[*issue.PrimaryFlowID]; ok {
				item["primary_flow"] = flow
			}
		}
		response = append(response, item)
	}

	return response
}

func loadFlowEndpoints(evidence []db.IssueEvidence, gdb *gorm.DB) map[uint]*flowEndpoint {
	flowIDs := make([]uint, 0, len(evidence))
	seen := make(map[uint]struct{})
	for _, ev := range evidence {
		if _, ok := seen[ev.FlowID]; ok {
			continue
		}
		seen[ev.FlowID] = struct{}{}
		flowIDs = append(flowIDs, ev.FlowID)
	}
	return loadFlowEndpointsByIDs(flowIDs, gdb)
}

func loadFlowEndpointsByIDs(flowIDs []uint, gdb *gorm.DB) map[uint]*flowEndpoint {
	if len(flowIDs) == 0 {
		return map[uint]*flowEndpoint{}
	}
	var flows []db.Flow
	if err := gdb.Where("id IN ?", flowIDs).Find(&flows).Error; err != nil {
		return map[uint]*flowEndpoint{}
	}
	flowMap := make(map[uint]*flowEndpoint, len(flows))
	for _, flow := range flows {
		normalizeFlowEndpoints(&flow)
		flowMap[flow.ID] = &flowEndpoint{
			ID:         flow.ID,
			Protocol:   flow.Proto,
			ClientIP:   flow.ClientIP,
			ClientPort: flow.ClientPort,
			ServerIP:   flow.ServerIP,
			ServerPort: flow.ServerPort,
			TCPStream:  flow.TCPStream,
		}
	}
	return flowMap
}

func decodeMetrics(raw string) map[string]interface{} {
	if raw == "" {
		return map[string]interface{}{}
	}
	var metrics map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &metrics); err != nil {
		return map[string]interface{}{}
	}
	return metrics
}
