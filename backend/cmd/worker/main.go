package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "netsage/internal/analysis"
    "netsage/internal/config"
    "netsage/internal/db"
    "netsage/internal/jobs"
    "netsage/internal/observability"
)

func main() {
    cfg := config.Load()
    logger := observability.NewLogger()

    store, err := db.Open(cfg.DatabaseURL, cfg.Env != "prod")
    if err != nil {
        log.Fatalf("db open: %v", err)
    }

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-stop
        cancel()
    }()

    logger.Info("worker started")

    for {
        select {
        case <-ctx.Done():
            logger.Info("worker stopped")
            return
        default:
        }

        claimed, err := jobs.ClaimNext(ctx, store.DB)
        if err != nil {
            logger.Error("claim job failed", "err", err)
            time.Sleep(2 * time.Second)
            continue
        }
        if claimed == nil {
            time.Sleep(2 * time.Second)
            continue
        }

        if err := processJob(ctx, store, claimed); err != nil {
            logger.Error("job failed", "job_id", claimed.Job.ID, "err", err)
            _ = jobs.MarkError(ctx, store.DB, claimed.Job.ID, err.Error())
        }
    }
}

func processJob(ctx context.Context, store *db.Store, claimed *jobs.ClaimedJob) error {
    lastProgress := float64(-1)
    err := analysis.ProcessJob(ctx, store.DB, claimed.Job, claimed.Pcap, claimed.User, func(progress float64) {
        if progress-lastProgress >= 1.0 || progress == 100 {
            _ = jobs.UpdateProgress(ctx, store.DB, claimed.Job.ID, progress)
            lastProgress = progress
        }
    })
    if err != nil {
        return err
    }

    return jobs.MarkDone(ctx, store.DB, claimed.Job.ID)
}
