package risk

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

func (r *Repository) EnsureSchema(ctx context.Context) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS risk_rules (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (threshold > 0),
  CHECK (window_minutes > 0 AND window_minutes <= 1440),
  CHECK (severity IN ('high', 'medium', 'low'))
);
CREATE INDEX IF NOT EXISTS idx_risk_rules_enabled_severity ON risk_rules(enabled, severity);
CREATE TABLE IF NOT EXISTS sender_blacklist (
  id BIGSERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (match_type IN ('email', 'domain'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sender_blacklist_match_pattern ON sender_blacklist(match_type, pattern);
CREATE INDEX IF NOT EXISTS idx_sender_blacklist_enabled_match_type ON sender_blacklist(enabled, match_type);
`)
	return err
}

func (r *Repository) SeedDefaults(ctx context.Context) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
INSERT INTO risk_rules (key, enabled, threshold, window_minutes, severity, description)
VALUES
  ('high_cancel', true, 5, 60, 'medium', '同一用户在窗口期内取消订单次数过高'),
  ('high_timeout', true, 5, 60, 'medium', '同一用户在窗口期内超时订单次数过高'),
  ('api_denied_rate', true, 10, 15, 'high', 'API Key 鉴权拒绝或限流事件过多'),
  ('sender_blacklist', true, 1, 1440, 'high', '入站邮件命中发件人黑名单')
ON CONFLICT (key) DO NOTHING;
`)
	return err
}

func (r *Repository) ListRules(ctx context.Context) ([]Rule, error) {
	rows, err := r.pool.Query(ctx, `
SELECT key, enabled, threshold, window_minutes, severity, description, updated_at
FROM risk_rules
ORDER BY key ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Rule, 0)
	for rows.Next() {
		var item Rule
		if err := rows.Scan(&item.Key, &item.Enabled, &item.Threshold, &item.WindowMinutes, &item.Severity, &item.Description, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpsertRules(ctx context.Context, adminID int64, input []UpsertRuleInput) ([]Rule, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, item := range input {
		if _, err := tx.Exec(ctx, `
INSERT INTO risk_rules (key, enabled, threshold, window_minutes, severity, description, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
ON CONFLICT (key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  threshold = EXCLUDED.threshold,
  window_minutes = EXCLUDED.window_minutes,
  severity = EXCLUDED.severity,
  description = EXCLUDED.description,
  updated_at = NOW()
`, item.Key, item.Enabled, item.Threshold, item.WindowMinutes, item.Severity, item.Description); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note)
VALUES ($1, NULL, 'update_risk_rule', 'admin', $2)
`, adminID, "更新风控规则 "+item.Key); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.ListRules(ctx)
}

func (r *Repository) ListSenderBlacklist(ctx context.Context) ([]SenderBlacklistEntry, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, pattern, match_type, enabled, note, created_at, updated_at
FROM sender_blacklist
ORDER BY updated_at DESC, id DESC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]SenderBlacklistEntry, 0)
	for rows.Next() {
		var item SenderBlacklistEntry
		if err := rows.Scan(&item.ID, &item.Pattern, &item.MatchType, &item.Enabled, &item.Note, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpsertSenderBlacklist(ctx context.Context, adminID int64, input []SenderBlacklistInput) ([]SenderBlacklistEntry, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, item := range input {
		if _, err := tx.Exec(ctx, `
INSERT INTO sender_blacklist (pattern, match_type, enabled, note, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (match_type, pattern) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  note = EXCLUDED.note,
  updated_at = NOW()
`, item.Pattern, item.MatchType, item.Enabled, item.Note); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note)
VALUES ($1, NULL, 'update_sender_blacklist', 'admin', $2)
`, adminID, "更新发件人黑名单 "+item.MatchType+":"+item.Pattern); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.ListSenderBlacklist(ctx)
}

func (r *Repository) RecordSenderBlacklistHit(ctx context.Context, sender, pattern string) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note)
VALUES (COALESCE((SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1), (SELECT id FROM users ORDER BY id ASC LIMIT 1)), NULL, 'sender_blacklist_hit', 'system', $1)
`, "mail_from="+sender+" pattern="+pattern)
	return err
}
