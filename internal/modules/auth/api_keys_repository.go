package auth

import "context"

type apiKeyRepository interface {
	CreateAPIKey(ctx context.Context, userID int64, name string, scopes []string, whitelist []string) (APIKey, string, error)
	ListAPIKeys(ctx context.Context, userID int64) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, userID int64, id int64) (APIKey, error)
	ListAPIKeyAudit(ctx context.Context, userID int64) ([]APIKeyAuditEntry, error)
}
