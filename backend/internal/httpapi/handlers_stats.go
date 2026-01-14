package httpapi

import (
	"net/http"
	"strconv"

	"netsage/internal/db"
)

func (s *Server) handleGetStats(w http.ResponseWriter, r *http.Request) {
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

	var stats db.PcapStats
	if err := s.store.DB.Where("pcap_id = ? AND user_id = ?", pcapID, user.ID).First(&stats).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

func (s *Server) handleGetSummary(w http.ResponseWriter, r *http.Request) {
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

	var totalFlows int64
	var tcpFlows int64
	var udpFlows int64
	var tcpStreams int64
	var highIssues int64
	var medIssues int64
	var lowIssues int64

	var job db.Job
	_ = s.store.DB.Where("pcap_id = ? AND user_id = ?", pcapID, user.ID).Order("created_at desc").First(&job).Error

	s.store.DB.Model(&db.Flow{}).Where("pcap_id = ? AND user_id = ?", pcapID, user.ID).Count(&totalFlows)
	s.store.DB.Model(&db.Flow{}).Where("pcap_id = ? AND user_id = ? AND proto = ?", pcapID, user.ID, "TCP").Count(&tcpFlows)
	s.store.DB.Model(&db.Flow{}).Where("pcap_id = ? AND user_id = ? AND proto = ?", pcapID, user.ID, "UDP").Count(&udpFlows)
	s.store.DB.Model(&db.Flow{}).Where("pcap_id = ? AND user_id = ? AND tcp_stream IS NOT NULL", pcapID, user.ID).Distinct("tcp_stream").Count(&tcpStreams)
	issuesQuery := s.store.DB.Model(&db.Issue{}).Where("pcap_id = ? AND user_id = ?", pcapID, user.ID)
	if job.ID != 0 {
		issuesQuery = issuesQuery.Where("job_id = ?", job.ID)
	}
	issuesQuery.Where("severity >= ?", 4).Count(&highIssues)
	issuesQuery.Where("severity IN ?", []int{2, 3}).Count(&medIssues)
	issuesQuery.Where("severity = ?", 1).Count(&lowIssues)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total_flows":  totalFlows,
		"tcp_flows":    tcpFlows,
		"udp_flows":    udpFlows,
		"stream_count": totalFlows,
		"tcp_streams":  tcpStreams,
		"issues": map[string]int64{
			"HIGH": highIssues,
			"MED":  medIssues,
			"LOW":  lowIssues,
		},
	})
}
