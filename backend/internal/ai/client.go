package ai

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"netsage/internal/config"
)

type Client struct {
	enabled bool
	baseURL string
	apiKey  string
	model   string
	timeout time.Duration
	cache   *LRUCache
	client  *http.Client
}

func NewClient(cfg config.Config) *Client {
	return &Client{
		enabled: cfg.AIEnabled,
		baseURL: cfg.AIBaseURL,
		apiKey:  cfg.AIAPIKey,
		model:   cfg.AIModel,
		timeout: time.Duration(cfg.AITimeoutSec) * time.Second,
		cache:   NewLRUCache(200, 30*time.Minute),
		client:  &http.Client{Timeout: time.Duration(cfg.AITimeoutSec) * time.Second},
	}
}

type TriageSummary struct {
	IssueType string                 `json:"issue_type"`
	Metrics   map[string]interface{} `json:"metrics"`
}

type Explanation struct {
	Explanation    string   `json:"explanation"`
	PossibleCauses []string `json:"possible_causes"`
	NextSteps      []string `json:"next_steps"`
}

func HashSummary(summary TriageSummary) (string, error) {
	payload, err := json.Marshal(summary)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:]), nil
}

func (c *Client) Explain(ctx context.Context, hash string, summary TriageSummary) (Explanation, string, error) {
	if cached, ok := c.cache.Get(hash); ok {
		explanation, err := decodeExplanation(cached)
		if err == nil {
			return explanation, c.model, nil
		}
	}

	if !c.enabled {
		return Explanation{}, c.model, errors.New("ai disabled")
	}
	if c.apiKey == "" {
		return Explanation{}, c.model, errors.New("ai api key missing")
	}

	prompt, err := buildPrompt(summary)
	if err != nil {
		return Explanation{}, c.model, err
	}

	reqBody := map[string]interface{}{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are a senior network analyst. Return JSON only with keys: explanation, possible_causes, next_steps. Use only the provided metrics and never invent facts."},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.2,
		"max_tokens":  400,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return Explanation{}, c.model, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return Explanation{}, c.model, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return Explanation{}, c.model, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return Explanation{}, c.model, errors.New("ai request failed")
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return Explanation{}, c.model, err
	}
	if len(parsed.Choices) == 0 {
		return Explanation{}, c.model, errors.New("ai response empty")
	}

	answer := parsed.Choices[0].Message.Content
	explanation, err := decodeExplanation(answer)
	if err != nil {
		return Explanation{}, c.model, err
	}

	if encoded, err := json.Marshal(explanation); err == nil {
		c.cache.Set(hash, string(encoded))
	}
	return explanation, c.model, nil
}

func buildPrompt(summary TriageSummary) (string, error) {
	payload, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		return "", err
	}
	return "Return JSON only with keys: explanation, possible_causes, next_steps. Use only the metrics in this JSON. Do not add new facts.\n\n" + string(payload), nil
}

func decodeExplanation(raw string) (Explanation, error) {
	var exp Explanation
	if err := json.Unmarshal([]byte(raw), &exp); err != nil {
		return Explanation{}, err
	}
	if exp.Explanation == "" {
		return Explanation{}, errors.New("missing explanation")
	}
	if exp.PossibleCauses == nil {
		exp.PossibleCauses = []string{}
	}
	if exp.NextSteps == nil {
		exp.NextSteps = []string{}
	}
	return exp, nil
}
