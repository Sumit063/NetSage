package observability

import (
    "crypto/rand"
    "encoding/hex"
    "log/slog"
    "os"
)

func NewLogger() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{})
    return slog.New(handler)
}

func NewRequestID() string {
    buf := make([]byte, 8)
    if _, err := rand.Read(buf); err != nil {
        return "unknown"
    }
    return hex.EncodeToString(buf)
}
