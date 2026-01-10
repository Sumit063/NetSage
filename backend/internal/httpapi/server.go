package httpapi

import (
    "net/http"
    "time"

    "netsage/internal/ai"
    "netsage/internal/auth"
    "netsage/internal/config"
    "netsage/internal/db"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/cors"
    "log/slog"
)

type Server struct {
    cfg      config.Config
    store    *db.Store
    tokenMgr auth.TokenManager
    aiClient *ai.Client
    logger   *slog.Logger
}

func NewServer(cfg config.Config, store *db.Store, logger *slog.Logger, aiClient *ai.Client) *Server {
    return &Server{
        cfg:      cfg,
        store:    store,
        tokenMgr: auth.TokenManager{Secret: cfg.JWTSecret, TTL: 24 * time.Hour},
        aiClient: aiClient,
        logger:   logger,
    }
}

func (s *Server) Routes() http.Handler {
    r := chi.NewRouter()
    r.Use(RequestIDMiddleware(s.logger))
    r.Use(LoggerMiddleware(s.logger))
    r.Use(cors.Handler(cors.Options{
        AllowedOrigins: []string{"*"},
        AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
        MaxAge:         300,
    }))

    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
    })

    r.Route("/api", func(r chi.Router) {
        r.Post("/auth/register", s.handleRegister)
        r.Post("/auth/login", s.handleLogin)
        r.With(AuthMiddleware(s.tokenMgr)).Get("/me", s.handleMe)

        r.Group(func(r chi.Router) {
            r.Use(AuthMiddleware(s.tokenMgr))
            r.Post("/pcaps/upload", s.handleUploadPCAP)
            r.Get("/pcaps", s.handleListPCAPs)
            r.Get("/pcaps/{id}", s.handleGetPCAP)
            r.Get("/pcaps/{id}/jobs", s.handleListJobsForPCAP)
            r.Get("/jobs/{id}", s.handleGetJob)
            r.Get("/pcaps/{id}/flows", s.handleListFlows)
            r.Get("/flows/{id}", s.handleGetFlow)
            r.Get("/pcaps/{id}/issues", s.handleListIssues)
            r.Get("/pcaps/{id}/stats", s.handleGetStats)
            r.Get("/pcaps/{id}/summary", s.handleGetSummary)
            r.Post("/issues/{id}/explain", s.handleExplainIssue)
            r.Post("/flows/{id}/cert-inspect", s.handleCertInspect)
        })
    })

    return r
}
