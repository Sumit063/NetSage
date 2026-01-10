package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Env          string
	HTTPAddr     string
	DatabaseURL  string
	JWTSecret    string
	UploadDir    string
	MaxUploadMB  int64
	CORSOrigins  string
	AIEnabled    bool
	AIBaseURL    string
	AIAPIKey     string
	AIModel      string
	AITimeoutSec int
}

func Load() Config {
	return Config{
		Env:          getEnv("NETSAGE_ENV", "dev"),
		HTTPAddr:     getEnv("NETSAGE_HTTP_ADDR", ":8080"),
		DatabaseURL:  getEnv("NETSAGE_DATABASE_URL", "postgres://netsage:netsage@db:5432/netsage?sslmode=disable"),
		JWTSecret:    getEnv("NETSAGE_JWT_SECRET", "change-me"),
		UploadDir:    getEnv("NETSAGE_UPLOAD_DIR", "./uploads"),
		MaxUploadMB:  getEnvInt64("NETSAGE_MAX_UPLOAD_MB", 100),
		CORSOrigins:  getEnv("NETSAGE_CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		AIEnabled:    getEnvBool("NETSAGE_AI_ENABLED", true),
		AIBaseURL:    getEnv("NETSAGE_AI_BASE_URL", "https://api.openai.com/v1"),
		AIAPIKey:     getEnv("NETSAGE_AI_API_KEY", ""),
		AIModel:      getEnv("NETSAGE_AI_MODEL", "gpt-4o-mini"),
		AITimeoutSec: getEnvInt("NETSAGE_AI_TIMEOUT_SEC", 25),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			return parsed
		}
	}
	return fallback
}

func DefaultTimeout() time.Duration {
	return 15 * time.Second
}
