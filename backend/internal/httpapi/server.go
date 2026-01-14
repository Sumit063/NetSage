package httpapi

import (
	"net/http"
	"strings"
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
		AllowedOrigins: parseAllowedOrigins(s.cfg.CORSOrigins),
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Origin"},
		MaxAge:         300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "ok"
		status := "ok"
		statusCode := http.StatusOK
		if sqlDB, err := s.store.DB.DB(); err != nil {
			dbStatus = "error"
			status = "error"
			statusCode = http.StatusServiceUnavailable
		} else if err := sqlDB.PingContext(r.Context()); err != nil {
			dbStatus = "error"
			status = "error"
			statusCode = http.StatusServiceUnavailable
		}
		writeJSON(w, statusCode, map[string]string{"status": status, "db": dbStatus})
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
			r.Delete("/pcaps/{id}", s.handleDeletePCAP)
			r.Get("/pcaps/{id}/jobs", s.handleListJobsForPCAP)
			r.Get("/jobs/{id}", s.handleGetJob)
			r.Get("/pcaps/{id}/flows", s.handleListFlows)
			r.Get("/jobs/{id}/flows", s.handleListFlowsForJob)
			r.Get("/flows/{id}", s.handleGetFlow)
			r.Get("/pcaps/{id}/issues", s.handleListIssues)
			r.Get("/jobs/{id}/issues", s.handleListIssuesForJob)
			r.Get("/issues/{id}", s.handleGetIssue)
			r.Get("/pcaps/{id}/stats", s.handleGetStats)
			r.Get("/pcaps/{id}/summary", s.handleGetSummary)
			r.Post("/issues/{id}/explain", s.handleExplainIssue)
			r.Post("/flows/{id}/cert-inspect", s.handleCertInspect)
		})
	})

	return r
}

func parseAllowedOrigins(raw string) []string {
	if raw == "" {
		return []string{"http://localhost:5173"}
	}
	if raw == "*" {
		return []string{"*"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	if len(origins) == 0 {
		return []string{"http://localhost:5173"}
	}
	return origins
}
