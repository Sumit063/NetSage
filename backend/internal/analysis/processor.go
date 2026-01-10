package analysis

import (
    "context"

    "netsage/internal/db"
    "netsage/internal/flows"
    "netsage/internal/issues"
    "netsage/internal/pcap"

    "gorm.io/gorm"
)

type ProgressFunc func(progress float64)

func ProcessJob(ctx context.Context, gdb *gorm.DB, job db.Job, pcapRecord db.Pcap, user db.User, onProgress ProgressFunc) error {
    if err := gdb.WithContext(ctx).Where("pcap_id = ?", pcapRecord.ID).Delete(&db.Issue{}).Error; err != nil {
        return err
    }
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

    flowRecords := make([]db.Flow, 0, len(result.Flows))
    flowIndex := make(map[flows.FlowKey]*db.Flow)

    for _, agg := range result.Flows {
        record := db.Flow{
            PcapID:        pcapRecord.ID,
            UserID:        user.ID,
            Proto:         agg.Key.Proto,
            SrcIP:         agg.Key.SrcIP,
            DstIP:         agg.Key.DstIP,
            SrcPort:       agg.Key.SrcPort,
            DstPort:       agg.Key.DstPort,
            FirstSeen:     agg.FirstSeen,
            LastSeen:      agg.LastSeen,
            SynTime:       agg.SynTime,
            SynAckTime:    agg.SynAckTime,
            AckTime:       agg.AckTime,
            RTTMs:         agg.RTTMs,
            BytesSent:     agg.BytesSent,
            BytesRecv:     agg.BytesRecv,
            Retransmits:   agg.Retransmits,
            OutOfOrder:    agg.OutOfOrder,
            MSS:           agg.MSS,
            TLSVersion:    agg.TLSVersion,
            TLSSNI:        agg.TLSSNI,
            ALPN:          agg.ALPN,
            RSTCount:      agg.RSTCount,
            FragmentCount: agg.FragmentCount,
            ThroughputBps: agg.ThroughputBps,
            HTTPMethod:    agg.HTTPMethod,
            HTTPHost:      agg.HTTPHost,
            HTTPTime:      agg.HTTPTime,
        }
        flowRecords = append(flowRecords, record)
        flowIndex[agg.Key] = &flowRecords[len(flowRecords)-1]
    }

    if len(flowRecords) > 0 {
        if err := gdb.WithContext(ctx).CreateInBatches(&flowRecords, 200).Error; err != nil {
            return err
        }
    }

    findings := issues.Evaluate(result.Flows, result.RTTHistogram)
    issueRecords := make([]db.Issue, 0, len(findings))
    for _, finding := range findings {
        var flowID *uint
        if finding.Flow != nil {
            if flowRecord, ok := flowIndex[finding.Flow.Key]; ok {
                flowID = &flowRecord.ID
            }
        }
        issueRecords = append(issueRecords, db.Issue{
            PcapID:       pcapRecord.ID,
            UserID:       user.ID,
            FlowID:       flowID,
            Severity:     finding.Severity,
            Type:         finding.Type,
            Title:        finding.Title,
            Description:  finding.Description,
            EvidenceJSON: issues.EvidenceJSON(finding.Evidence),
        })
    }

    if len(issueRecords) > 0 {
        if err := gdb.WithContext(ctx).CreateInBatches(&issueRecords, 200).Error; err != nil {
            return err
        }
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
