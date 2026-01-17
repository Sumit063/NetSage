package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"netsage/internal/db"
	"netsage/internal/flows"
	"netsage/internal/pcap"
)

func (s *Server) handleGetFlowTimeseries(w http.ResponseWriter, r *http.Request) {
	user, ok := getUser(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	flowID, err := strconv.Atoi(chiURLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}

	var flow db.Flow
	if err := s.store.DB.Where("id = ? AND user_id = ?", flowID, user.ID).First(&flow).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	var pcapRecord db.Pcap
	if err := s.store.DB.Where("id = ? AND user_id = ?", flow.PcapID, user.ID).First(&pcapRecord).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pcap not found"})
		return
	}

	granularity := time.Second
	if g := r.URL.Query().Get("granularity"); g != "" {
		if parsed, err := strconv.Atoi(g); err == nil && parsed > 0 && parsed <= 60 {
			granularity = time.Duration(parsed) * time.Second
		}
	}

	clientIP := flow.ClientIP
	clientPort := flow.ClientPort
	serverIP := flow.ServerIP
	serverPort := flow.ServerPort
	if clientIP == "" || serverIP == "" {
		clientIP = flow.SrcIP
		clientPort = flow.SrcPort
		serverIP = flow.DstIP
		serverPort = flow.DstPort
	}

	flowKey := flows.FlowKey{
		Proto:   flow.Proto,
		SrcIP:   flow.SrcIP,
		DstIP:   flow.DstIP,
		SrcPort: flow.SrcPort,
		DstPort: flow.DstPort,
	}

	series, err := pcap.BuildStreamTimeseries(
		r.Context(),
		pcapRecord.StoragePath,
		granularity,
		flowKey,
		clientIP,
		clientPort,
		serverIP,
		serverPort,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "timeseries error"})
		return
	}

	writeJSON(w, http.StatusOK, series)
}
