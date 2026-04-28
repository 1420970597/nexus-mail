package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (r *Repository) CreateAPIKey(ctx context.Context, userID int64, name string, scopes []string, whitelist []string) (APIKey, string, error) {
	plaintext, hash, preview, err := generateAPIKeyPlaintext()
	if err != nil {
		return APIKey{}, "", err
	}
	var item APIKey
	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		return APIKey{}, "", err
	}
	whitelistJSON, err := json.Marshal(whitelist)
	if err != nil {
		return APIKey{}, "", err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return APIKey{}, "", err
	}
	defer tx.Rollback(ctx)
	err = tx.QueryRow(ctx, `
INSERT INTO api_keys (user_id, name, key_hash, key_preview, scopes, whitelist, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'active', NOW(), NOW())
RETURNING id, user_id, name, key_preview, scopes, whitelist, status, last_used_at, created_at, updated_at
`, userID, name, hash, preview, string(scopesJSON), string(whitelistJSON)).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.KeyPreview,
		&item.Scopes,
		&item.Whitelist,
		&item.Status,
		&item.LastUsedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return APIKey{}, "", err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note) VALUES ($1, $2, 'create', 'user', $3)`, userID, item.ID, fmt.Sprintf("创建 API Key %s", item.Name)); err != nil {
		return APIKey{}, "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return APIKey{}, "", err
	}
	return item, plaintext, nil
}

func (r *Repository) ListAPIKeys(ctx context.Context, userID int64) ([]APIKey, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, name, key_preview, scopes, whitelist, status, last_used_at, created_at, updated_at
FROM api_keys
WHERE user_id = $1
ORDER BY updated_at DESC, id DESC
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]APIKey, 0)
	for rows.Next() {
		var item APIKey
		if err := rows.Scan(&item.ID, &item.UserID, &item.Name, &item.KeyPreview, &item.Scopes, &item.Whitelist, &item.Status, &item.LastUsedAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateAPIKeyWhitelist(ctx context.Context, userID int64, id int64, whitelist []string) (APIKey, error) {
	var item APIKey
	whitelistJSON, err := json.Marshal(whitelist)
	if err != nil {
		return APIKey{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return APIKey{}, err
	}
	defer tx.Rollback(ctx)
	err = tx.QueryRow(ctx, `
UPDATE api_keys
SET whitelist = $3::jsonb, updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'active'
RETURNING id, user_id, name, key_preview, scopes, whitelist, status, last_used_at, created_at, updated_at
`, id, userID, string(whitelistJSON)).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.KeyPreview,
		&item.Scopes,
		&item.Whitelist,
		&item.Status,
		&item.LastUsedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return APIKey{}, fmt.Errorf("API Key 不存在或已撤销")
		}
		return APIKey{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note) VALUES ($1, $2, 'update_whitelist', 'user', $3)`, userID, item.ID, fmt.Sprintf("更新 API Key %s IP 白名单为 %s", item.Name, strings.Join(item.Whitelist, ","))); err != nil {
		return APIKey{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return APIKey{}, err
	}
	return item, nil
}

func (r *Repository) RevokeAPIKey(ctx context.Context, userID int64, id int64) (APIKey, error) {
	var item APIKey
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return APIKey{}, err
	}
	defer tx.Rollback(ctx)
	err = tx.QueryRow(ctx, `
UPDATE api_keys
SET status = 'revoked', updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'active'
RETURNING id, user_id, name, key_preview, scopes, whitelist, status, last_used_at, created_at, updated_at
`, id, userID).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.KeyPreview,
		&item.Scopes,
		&item.Whitelist,
		&item.Status,
		&item.LastUsedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return APIKey{}, fmt.Errorf("API Key 不存在或已撤销")
		}
		return APIKey{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note) VALUES ($1, $2, 'revoke', 'user', $3)`, userID, item.ID, fmt.Sprintf("撤销 API Key %s", item.Name)); err != nil {
		return APIKey{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return APIKey{}, err
	}
	return item, nil
}

func (r *Repository) ListAPIKeyAudit(ctx context.Context, userID int64) ([]APIKeyAuditEntry, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, api_key_id, action, actor_type, note, created_at
FROM api_key_audit_logs
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 100
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]APIKeyAuditEntry, 0)
	for rows.Next() {
		var item APIKeyAuditEntry
		if err := rows.Scan(&item.ID, &item.UserID, &item.APIKeyID, &item.Action, &item.ActorType, &item.Note, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListAdminAudit(ctx context.Context, filter AdminAuditFilter) ([]APIKeyAuditEntry, error) {
	conditions := make([]string, 0, 4)
	args := make([]any, 0, 5)
	argPos := 1
	if filter.UserID != nil {
		conditions = append(conditions, "user_id = $"+strconv.Itoa(argPos))
		args = append(args, *filter.UserID)
		argPos++
	}
	if filter.APIKeyID != nil {
		conditions = append(conditions, "api_key_id = $"+strconv.Itoa(argPos))
		args = append(args, *filter.APIKeyID)
		argPos++
	}
	if filter.ActorType != "" {
		conditions = append(conditions, "actor_type = $"+strconv.Itoa(argPos))
		args = append(args, filter.ActorType)
		argPos++
	}
	if filter.Action != "" {
		conditions = append(conditions, "action = $"+strconv.Itoa(argPos))
		args = append(args, filter.Action)
		argPos++
	}
	query := `
SELECT id, user_id, api_key_id, action, actor_type, note, created_at
FROM api_key_audit_logs`
	if len(conditions) > 0 {
		query += "\nWHERE " + strings.Join(conditions, " AND ")
	}
	query += "\nORDER BY created_at DESC, id DESC\nLIMIT $" + strconv.Itoa(argPos)
	args = append(args, filter.Limit)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]APIKeyAuditEntry, 0)
	for rows.Next() {
		var item APIKeyAuditEntry
		if err := rows.Scan(&item.ID, &item.UserID, &item.APIKeyID, &item.Action, &item.ActorType, &item.Note, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ValidateAPIKey(ctx context.Context, key string) (APIKey, error) {
	return r.validateAPIKey(ctx, key)
}

func (r *Repository) RecordAPIKeyAuthAudit(ctx context.Context, event APIKeyAuthAuditEvent) error {
	if r == nil || r.pool == nil {
		return nil
	}
	var apiKeyID any
	if event.APIKeyID != nil {
		apiKeyID = *event.APIKeyID
	}
	var userID any
	if event.UserID != nil {
		userID = *event.UserID
	}
	_, err := r.pool.Exec(ctx, `
INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note)
VALUES ($1, $2, $3, 'system', $4)
`, userID, apiKeyID, string(event.Outcome), buildAPIKeyAuditNote(event))
	return err
}

func buildAPIKeyAuditNote(event APIKeyAuthAuditEvent) string {
	parts := make([]string, 0, 4)
	if event.Scope != "" {
		parts = append(parts, "scope="+event.Scope)
	}
	if event.ClientIP != "" {
		parts = append(parts, "ip="+event.ClientIP)
	}
	if event.KeyPreview != "" {
		parts = append(parts, "key="+event.KeyPreview)
	}
	if event.Note != "" {
		parts = append(parts, event.Note)
	}
	return strings.Join(parts, " | ")
}

func (r *Repository) validateAPIKey(ctx context.Context, key string) (APIKey, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return APIKey{}, fmt.Errorf("缺少 API Key")
	}
	digest := sha256.Sum256([]byte(key))
	hash := hex.EncodeToString(digest[:])
	var item APIKey
	err := r.pool.QueryRow(ctx, `
UPDATE api_keys
SET last_used_at = NOW(), updated_at = NOW()
WHERE key_hash = $1 AND status = 'active'
RETURNING id, user_id, name, key_preview, scopes, whitelist, status, last_used_at, created_at, updated_at
`, hash).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.KeyPreview,
		&item.Scopes,
		&item.Whitelist,
		&item.Status,
		&item.LastUsedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return APIKey{}, fmt.Errorf("API Key 无效")
		}
		return APIKey{}, err
	}
	return item, nil
}
