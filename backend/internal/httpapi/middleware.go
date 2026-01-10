package httpapi

import (
    "context"
    "log/slog"
    "net/http"
    "strings"

    "netsage/internal/auth"
    "netsage/internal/observability"
)

type ctxKey int

const (
    ctxKeyUser ctxKey = iota
    ctxKeyRequestID
)

type AuthUser struct {
    ID    uint
    Email string
}

func withUser(ctx context.Context, user AuthUser) context.Context {
    return context.WithValue(ctx, ctxKeyUser, user)
}

func getUser(ctx context.Context) (AuthUser, bool) {
    user, ok := ctx.Value(ctxKeyUser).(AuthUser)
    return user, ok
}

func withRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, ctxKeyRequestID, id)
}

func getRequestID(ctx context.Context) string {
    if v := ctx.Value(ctxKeyRequestID); v != nil {
        if s, ok := v.(string); ok {
            return s
        }
    }
    return ""
}

func RequestIDMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            rid := r.Header.Get("X-Request-ID")
            if rid == "" {
                rid = observability.NewRequestID()
            }
            ctx := withRequestID(r.Context(), rid)
            w.Header().Set("X-Request-ID", rid)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func AuthMiddleware(tm auth.TokenManager) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, "missing auth", http.StatusUnauthorized)
                return
            }
            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
                http.Error(w, "invalid auth", http.StatusUnauthorized)
                return
            }

            claims, err := tm.ParseToken(parts[1])
            if err != nil {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }

            user := AuthUser{ID: claims.UserID, Email: claims.Email}
            ctx := withUser(r.Context(), user)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func LoggerMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            rid := getRequestID(r.Context())
            logger.Info("request", "method", r.Method, "path", r.URL.Path, "request_id", rid)
            next.ServeHTTP(w, r)
        })
    }
}
