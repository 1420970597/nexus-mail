package auth

import "time"

type APIKey struct {
	ID         int64      `json:"id"`
	UserID     int64      `json:"user_id"`
	Name       string     `json:"name"`
	KeyPreview string     `json:"key_preview"`
	Scopes     []string   `json:"scopes"`
	Whitelist  []string   `json:"whitelist"`
	Status     string     `json:"status"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type APIKeyAuditEntry struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	APIKeyID  *int64    `json:"api_key_id,omitempty"`
	Action    string    `json:"action"`
	ActorType string    `json:"actor_type"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateAPIKeyInput struct {
	Name      string   `json:"name"`
	Scopes    []string `json:"scopes"`
	Whitelist []string `json:"whitelist"`
}

type APIKeyAuthOutcome string

const (
	APIKeyAuthOutcomeSuccess         APIKeyAuthOutcome = "success"
	APIKeyAuthOutcomeDeniedInvalid   APIKeyAuthOutcome = "denied_invalid"
	APIKeyAuthOutcomeDeniedWhitelist APIKeyAuthOutcome = "denied_whitelist"
	APIKeyAuthOutcomeDeniedScope     APIKeyAuthOutcome = "denied_scope"
)

type APIKeyAuthAuditEvent struct {
	APIKeyID   *int64
	UserID     *int64
	KeyPreview string
	ClientIP   string
	Scope      string
	Outcome    APIKeyAuthOutcome
	Note       string
}
