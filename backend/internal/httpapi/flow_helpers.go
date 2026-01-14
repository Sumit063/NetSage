package httpapi

import "netsage/internal/db"

func normalizeFlowEndpoints(flow *db.Flow) {
	if flow.ClientIP == "" {
		flow.ClientIP = flow.SrcIP
	}
	if flow.ClientPort == 0 {
		flow.ClientPort = flow.SrcPort
	}
	if flow.ServerIP == "" {
		flow.ServerIP = flow.DstIP
	}
	if flow.ServerPort == 0 {
		flow.ServerPort = flow.DstPort
	}
}
