package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "netsage/internal/ai"
    "netsage/internal/config"
    "netsage/internal/db"
    "netsage/internal/httpapi"
    "netsage/internal/observability"
)

func main() {
    cfg := config.Load()
    logger := observability.NewLogger()

    store, err := db.Open(cfg.DatabaseURL, cfg.Env != "prod")
    if err != nil {
        log.Fatalf("db open: %v", err)
    }

    aiClient := ai.NewClient(cfg)
    srv := httpapi.NewServer(cfg, store, logger, aiClient)

    httpServer := &http.Server{
        Addr:              cfg.HTTPAddr,
        Handler:           srv.Routes(),
        ReadHeaderTimeout: 10 * time.Second,
    }

    go func() {
        logger.Info("api listening", "addr", cfg.HTTPAddr)
        if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Error("http server error", "err", err)
        }
    }()

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    _ = httpServer.Shutdown(ctx)
}
