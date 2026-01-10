//go:build integration

package integration

import (
    "context"
    "database/sql"
    "os"
    "path/filepath"
    "runtime"
    "testing"
    "time"

    "netsage/internal/analysis"
    "netsage/internal/db"
    "netsage/internal/pcap/testutil"

    _ "github.com/jackc/pgx/v5/stdlib"
    "github.com/pressly/goose/v3"
)

func TestPcapJobEndToEnd(t *testing.T) {
    dbURL := os.Getenv("NETSAGE_TEST_DATABASE_URL")
    if dbURL == "" {
        t.Skip("NETSAGE_TEST_DATABASE_URL not set")
    }

    sqlDB, err := sql.Open("pgx", dbURL)
    if err != nil {
        t.Fatalf("open db: %v", err)
    }
    defer sqlDB.Close()

    if err := goose.SetDialect("postgres"); err != nil {
        t.Fatalf("set dialect: %v", err)
    }

    _, filename, _, _ := runtime.Caller(0)
    migrationsDir := filepath.Join(filepath.Dir(filename), "..", "..", "migrations")
    if err := goose.Up(sqlDB, migrationsDir); err != nil {
        t.Fatalf("migrate: %v", err)
    }

    store, err := db.Open(dbURL, true)
    if err != nil {
        t.Fatalf("gorm open: %v", err)
    }

    user := db.User{Email: "test+" + time.Now().Format("150405.000000000") + "@example.com", PasswordHash: "hash"}
    if err := store.DB.Create(&user).Error; err != nil {
        t.Fatalf("create user: %v", err)
    }

    dir := t.TempDir()
    pcapPath := filepath.Join(dir, "sample.pcap")
    if err := testutil.GenerateSamplePCAP(pcapPath); err != nil {
        t.Fatalf("generate pcap: %v", err)
    }

    pcapRecord := db.Pcap{UserID: user.ID, Filename: "sample.pcap", StoragePath: pcapPath}
    if err := store.DB.Create(&pcapRecord).Error; err != nil {
        t.Fatalf("create pcap: %v", err)
    }

    job := db.Job{UserID: user.ID, PcapID: pcapRecord.ID, Status: "queued"}
    if err := store.DB.Create(&job).Error; err != nil {
        t.Fatalf("create job: %v", err)
    }

    if err := analysis.ProcessJob(context.Background(), store.DB, job, pcapRecord, user, nil); err != nil {
        t.Fatalf("process job: %v", err)
    }

    var flowCount int64
    if err := store.DB.Model(&db.Flow{}).Where("pcap_id = ?", pcapRecord.ID).Count(&flowCount).Error; err != nil {
        t.Fatalf("count flows: %v", err)
    }
    if flowCount == 0 {
        t.Fatalf("expected flows, got 0")
    }

    var issueCount int64
    if err := store.DB.Model(&db.Issue{}).Where("pcap_id = ?", pcapRecord.ID).Count(&issueCount).Error; err != nil {
        t.Fatalf("count issues: %v", err)
    }

    if issueCount == 0 {
        t.Fatalf("expected issues, got 0")
    }
}
