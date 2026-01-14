package analysis

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"sync"
	"time"

	"netsage/internal/db"
	"netsage/internal/flows"
	"netsage/internal/pcap"
	"netsage/internal/triage"

	"gorm.io/gorm"
)

type ProgressFunc func(progress float64)

var (
	rulesOnce  sync.Once
	rulesCache []triage.Rule
	rulesErr   error
)

func loadRules() ([]triage.Rule, error) {
	rulesOnce.Do(func() {
		rulesCache, rulesErr = triage.LoadRules()
	})
	return rulesCache, rulesErr
}

type tcpStreamEntry struct {
	key        flows.FlowKey
	clientIP   string
	clientPort int
	serverIP   string
	serverPort int
	start      time.Time
}

func assignTCPStreams(flowsMap map[flows.FlowKey]*flows.FlowAgg) map[flows.FlowKey]int {
	entries := make([]tcpStreamEntry, 0)
	for key, flow := range flowsMap {
		if flow.Key.Proto != "TCP" {
			continue
		}
		clientIP, clientPort, serverIP, serverPort := flow.ClientServer()
		entries = append(entries, tcpStreamEntry{
			key:        key,
			clientIP:   clientIP,
			clientPort: clientPort,
			serverIP:   serverIP,
			serverPort: serverPort,
			start:      flow.FirstSeen,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		if !entries[i].start.Equal(entries[j].start) {
			return entries[i].start.Before(entries[j].start)
		}
		if entries[i].clientIP != entries[j].clientIP {
			return strings.Compare(entries[i].clientIP, entries[j].clientIP) < 0
		}
		if entries[i].clientPort != entries[j].clientPort {
			return entries[i].clientPort < entries[j].clientPort
		}
		if entries[i].serverIP != entries[j].serverIP {
			return strings.Compare(entries[i].serverIP, entries[j].serverIP) < 0
		}
		if entries[i].serverPort != entries[j].serverPort {
			return entries[i].serverPort < entries[j].serverPort
		}
		return entries[i].key.SrcIP < entries[j].key.SrcIP
	})

	streamMap := make(map[flows.FlowKey]int, len(entries))
	for idx, entry := range entries {
		streamID := idx
		streamMap[entry.key] = streamID
		if flow, ok := flowsMap[entry.key]; ok {
			flow.TCPStreamID = &streamID
		}
	}
	return streamMap
}

func ProcessJob(ctx context.Context, gdb *gorm.DB, job db.Job, pcapRecord db.Pcap, user db.User, onProgress ProgressFunc) error {
	if err := gdb.WithContext(ctx).Where("pcap_id = ?", pcapRecord.ID).Delete(&db.Flow{}).Error; err != nil {
		return err
	}
	if err := gdb.WithContext(ctx).Where("pcap_id = ?", pcapRecord.ID).Delete(&db.PcapStats{}).Error; err != nil {
		return err
	}

	lastProgress := float64(-1)
	result, err := pcap.AnalyzeFile(ctx, pcapRecord.StoragePath, func(bytesRead, total int64) {
		if total == 0 {
			return
		}
		progress := float64(bytesRead) / float64(total) * 100
		if progress-lastProgress >= 1.0 || progress == 100 {
			if onProgress != nil {
				onProgress(progress)
			}
			lastProgress = progress
		}
	})
	if err != nil {
		return err
	}

	streamMap := assignTCPStreams(result.Flows)

	flowRecords := make([]db.Flow, 0, len(result.Flows))
	flowIndex := make(map[flows.FlowKey]*db.Flow)

	for _, agg := range result.Flows {
		clientIP, clientPort, serverIP, serverPort := agg.ClientServer()
		record := db.Flow{
			PcapID:              pcapRecord.ID,
			UserID:              user.ID,
			Proto:               agg.Key.Proto,
			SrcIP:               agg.Key.SrcIP,
			DstIP:               agg.Key.DstIP,
			SrcPort:             agg.Key.SrcPort,
			DstPort:             agg.Key.DstPort,
			ClientIP:            clientIP,
			ClientPort:          clientPort,
			ServerIP:            serverIP,
			ServerPort:          serverPort,
			StartTS:             agg.FirstSeen,
			EndTS:               agg.LastSeen,
			SynTime:             agg.SynTime,
			SynAckTime:          agg.SynAckTime,
			AckTime:             agg.AckTime,
			RTTMs:               agg.RTTMs,
			BytesSent:           agg.BytesSent,
			BytesRecv:           agg.BytesRecv,
			BytesClientToServer: agg.BytesClientToServer,
			BytesServerToClient: agg.BytesServerToClient,
			PacketCount:         agg.PacketCount,
			Retransmits:         agg.Retransmits,
			SynRetransmits:      agg.SynRetransmits,
			OutOfOrder:          agg.OutOfOrder,
			DupAcks:             agg.DupAcks,
			FirstPayloadTime:    agg.FirstPayloadTime,
			LastPayloadTime:     agg.LastPayloadTime,
			DurationMs:          agg.DurationMs,
			AppBytes:            agg.AppBytes,
			MSS:                 agg.MSS,
			TLSVersion:          agg.TLSVersion,
			TLSSNI:              agg.TLSSNI,
			ALPN:                agg.ALPN,
			TLSClientHello:      agg.SawClientHello,
			TLSServerHello:      agg.SawServerHello,
			TLSAlert:            agg.TLSAlert,
			TLSAlertCode:        agg.TLSAlertCode,
			RSTCount:            agg.RSTCount,
			FragmentCount:       agg.FragmentCount,
			ThroughputBps:       agg.ThroughputBps,
			HTTPMethod:          agg.HTTPMethod,
			HTTPHost:            agg.HTTPHost,
			HTTPTime:            agg.HTTPTime,
		}
		if streamID, ok := streamMap[agg.Key]; ok {
			id := streamID
			record.TCPStream = &id
		}
		flowRecords = append(flowRecords, record)
		flowIndex[agg.Key] = &flowRecords[len(flowRecords)-1]
	}

	if len(flowRecords) > 0 {
		if err := gdb.WithContext(ctx).CreateInBatches(&flowRecords, 200).Error; err != nil {
			return err
		}
	}

	rules, err := loadRules()
	if err != nil {
		return err
	}
	findings, err := triage.Evaluate(result.Flows, rules)
	if err != nil {
		return err
	}

	tx := gdb.WithContext(ctx).Begin()
	if err := tx.Where("job_id = ?", job.ID).Delete(&db.Issue{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	for _, finding := range findings {
		var primaryFlowID *uint
		if finding.PrimaryFlow != nil {
			if flowRecord, ok := flowIndex[finding.PrimaryFlow.Key]; ok {
				primaryFlowID = &flowRecord.ID
			}
		}

		issue := db.Issue{
			PcapID:        pcapRecord.ID,
			JobID:         &job.ID,
			UserID:        user.ID,
			PrimaryFlowID: primaryFlowID,
			Severity:      finding.Severity,
			IssueType:     string(finding.IssueType),
			Title:         finding.Title,
			Summary:       finding.Summary,
		}
		if err := tx.Create(&issue).Error; err != nil {
			tx.Rollback()
			return err
		}

		for _, evidence := range finding.EvidenceList {
			if evidence.Flow == nil {
				continue
			}
			flowRecord, ok := flowIndex[evidence.Flow.Key]
			if !ok {
				continue
			}
			metricsJSON, err := json.Marshal(evidence.Metrics)
			if err != nil {
				tx.Rollback()
				return err
			}
			ev := db.IssueEvidence{
				IssueID:          issue.ID,
				FlowID:           flowRecord.ID,
				PacketStartIndex: evidence.PacketStartIndex,
				PacketEndIndex:   evidence.PacketEndIndex,
				MetricsJSON:      string(metricsJSON),
			}
			if err := tx.Create(&ev).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}

	stats := pcap.BuildStats(result.Flows, result.RTTHistogram)
	talkersJSON, flowsJSON, histJSON := stats.JSON()

	statsRecord := db.PcapStats{
		PcapID:           pcapRecord.ID,
		UserID:           user.ID,
		TopTalkersJSON:   talkersJSON,
		TopFlowsJSON:     flowsJSON,
		RTTHistogramJSON: histJSON,
	}

	if err := gdb.WithContext(ctx).Create(&statsRecord).Error; err != nil {
		return err
	}

	return nil
}
