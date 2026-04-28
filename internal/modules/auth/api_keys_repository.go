package auth

import "context"

type apiKeyRepository interface {
	CreateAPIKey(ctx context.Context, userID int64, name string, scopes []string, whitelist []string) (APIKey, string, error)
	ListAPIKeys(ctx context.Context, userID int64) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, userID, id int64) (APIKey, error)
	ListAPIKeyAudit(ctx context.Context, userID int64) ([]APIKeyAuditEntry, error)
	ListAdminAudit(ctx context.Context, filter AdminAuditFilter) ([]APIKeyAuditEntry, error)
	ValidateAPIKey(ctx context.Context, key string) (APIKey, error)
	RecordAPIKeyAuthAudit(ctx context.Context, event APIKeyAuthAuditEvent) error
	ListAllUsers(ctx context.Context) ([]User, error)
}
