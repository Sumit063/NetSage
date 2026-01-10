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

type IssueSummary struct {
    IssueID     uint                   `json:"issue_id"`
    Severity    string                 `json:"severity"`
    Type        string                 `json:"type"`
    Title       string                 `json:"title"`
    Description string                 `json:"description"`
    Evidence    map[string]interface{} `json:"evidence"`
    Flow        map[string]interface{} `json:"flow"`
}

func HashSummary(summary IssueSummary) (string, error) {
    payload, err := json.Marshal(summary)
    if err != nil {
        return "", err
    }
    sum := sha256.Sum256(payload)
    return hex.EncodeToString(sum[:]), nil
}

func (c *Client) Explain(ctx context.Context, hash string, summary IssueSummary) (string, string, error) {
    if cached, ok := c.cache.Get(hash); ok {
        return cached, c.model, nil
    }

    if !c.enabled {
        return "AI disabled by configuration.", c.model, nil
    }
    if c.apiKey == "" {
        return "AI API key not configured.", c.model, nil
    }

    prompt, err := buildPrompt(summary)
    if err != nil {
        return "", c.model, err
    }

    reqBody := map[string]interface{}{
        "model": c.model,
        "messages": []map[string]string{
            {"role": "system", "content": "You are a senior network analyst. Provide a concise diagnosis, likely causes, and next steps."},
            {"role": "user", "content": prompt},
        },
        "temperature": 0.2,
        "max_tokens": 400,
    }

    bodyBytes, err := json.Marshal(reqBody)
    if err != nil {
        return "", c.model, err
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
    if err != nil {
        return "", c.model, err
    }
    req.Header.Set("Authorization", "Bearer "+c.apiKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return "", c.model, err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 300 {
        return "", c.model, errors.New("ai request failed")
    }

    var parsed struct {
        Choices []struct {
            Message struct {
                Content string `json:"content"`
            } `json:"message"`
        } `json:"choices"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
        return "", c.model, err
    }
    if len(parsed.Choices) == 0 {
        return "", c.model, errors.New("ai response empty")
    }

    answer := parsed.Choices[0].Message.Content
    c.cache.Set(hash, answer)
    return answer, c.model, nil
}

func buildPrompt(summary IssueSummary) (string, error) {
    payload, err := json.MarshalIndent(summary, "", "  ")
    if err != nil {
        return "", err
    }
    return "Analyze this sanitized network issue JSON (no payloads). Provide: 1) summary, 2) likely causes, 3) next steps, 4) confidence.\n\n" + string(payload), nil
}
