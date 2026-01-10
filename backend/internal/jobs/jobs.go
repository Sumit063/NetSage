package jobs

import (
    "context"
    "time"

    "netsage/internal/db"

    "gorm.io/gorm"
)

const (
    StatusQueued  = "queued"
    StatusRunning = "running"
    StatusDone    = "done"
    StatusError   = "error"
)

type ClaimedJob struct {
    Job   db.Job
    Pcap  db.Pcap
    User  db.User
}

func Enqueue(ctx context.Context, gdb *gorm.DB, userID, pcapID uint) (*db.Job, error) {
    job := &db.Job{
        UserID: userID,
        PcapID: pcapID,
        Status: StatusQueued,
    }
    if err := gdb.WithContext(ctx).Create(job).Error; err != nil {
        return nil, err
    }
    return job, nil
}

func ClaimNext(ctx context.Context, gdb *gorm.DB) (*ClaimedJob, error) {
    tx := gdb.WithContext(ctx).Begin()
    if tx.Error != nil {
        return nil, tx.Error
    }

    var job db.Job
    if err := tx.Raw(`
        SELECT * FROM jobs
        WHERE status = ?
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    `, StatusQueued).Scan(&job).Error; err != nil {
        tx.Rollback()
        return nil, err
    }
    if job.ID == 0 {
        tx.Rollback()
        return nil, nil
    }

    now := time.Now()
    if err := tx.Model(&db.Job{}).Where("id = ?", job.ID).
        Updates(map[string]interface{}{"status": StatusRunning, "started_at": now}).Error; err != nil {
        tx.Rollback()
        return nil, err
    }

    var pcap db.Pcap
    if err := tx.First(&pcap, job.PcapID).Error; err != nil {
        tx.Rollback()
        return nil, err
    }

    var user db.User
    if err := tx.First(&user, job.UserID).Error; err != nil {
        tx.Rollback()
        return nil, err
    }

    if err := tx.Commit().Error; err != nil {
        return nil, err
    }

    return &ClaimedJob{Job: job, Pcap: pcap, User: user}, nil
}

func UpdateProgress(ctx context.Context, gdb *gorm.DB, jobID uint, progress float64) error {
    return gdb.WithContext(ctx).Model(&db.Job{}).Where("id = ?", jobID).Update("progress", progress).Error
}

func MarkDone(ctx context.Context, gdb *gorm.DB, jobID uint) error {
    now := time.Now()
    return gdb.WithContext(ctx).Model(&db.Job{}).Where("id = ?", jobID).
        Updates(map[string]interface{}{"status": StatusDone, "finished_at": now, "progress": 100.0}).Error
}

func MarkError(ctx context.Context, gdb *gorm.DB, jobID uint, msg string) error {
    now := time.Now()
    return gdb.WithContext(ctx).Model(&db.Job{}).Where("id = ?", jobID).
        Updates(map[string]interface{}{"status": StatusError, "finished_at": now, "error": msg}).Error
}
