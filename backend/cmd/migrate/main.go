package main

import (
    "database/sql"
    "log"
    "os"

    _ "github.com/jackc/pgx/v5/stdlib"
    "github.com/pressly/goose/v3"
)

func main() {
    dbURL := getenv("NETSAGE_DATABASE_URL", "postgres://netsage:netsage@db:5432/netsage?sslmode=disable")
    migrationsDir := getenv("NETSAGE_MIGRATIONS_DIR", "./migrations")

    db, err := sql.Open("pgx", dbURL)
    if err != nil {
        log.Fatalf("open db: %v", err)
    }
    defer db.Close()

    if err := goose.SetDialect("postgres"); err != nil {
        log.Fatalf("set dialect: %v", err)
    }

    if err := goose.Up(db, migrationsDir); err != nil {
        log.Fatalf("goose up: %v", err)
    }

    log.Println("migrations applied")
}

func getenv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
