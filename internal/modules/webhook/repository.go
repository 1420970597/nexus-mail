package webhook

import (
	"context"

	"github.com/jackc/pgx/v5"
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
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  signing_secret_ciphertext TEXT NOT NULL DEFAULT '',
  secret_preview TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS signing_secret_ciphertext TEXT NOT NULL DEFAULT '';
ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS secret_preview TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'webhook_endpoints' AND column_name = 'signing_secret'
  ) THEN
    ALTER TABLE webhook_endpoints ALTER COLUMN signing_secret DROP NOT NULL;
    UPDATE webhook_endpoints
    SET secret_preview = LEFT(signing_secret, 10) || '…' || RIGHT(signing_secret, 4)
    WHERE secret_preview = '' AND signing_secret IS NOT NULL AND length(signing_secret) > 14;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id_created_at
  ON webhook_endpoints(user_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  endpoint_id BIGINT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS locked_by TEXT NOT NULL DEFAULT '';
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next_attempt
  ON webhook_deliveries(status, next_attempt_at, id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_expires_at
  ON webhook_deliveries(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_created_at
  ON webhook_deliveries(endpoint_id, created_at DESC, id DESC);
`)
	return err
}

func (r *Repository) ListEndpoints(ctx context.Context, userID int64, limit int) ([]WebhookEndpoint, error) {
	if limit <= 0 || limit > maxEndpointListLimit {
		limit = defaultEndpointListLimit
	}
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, url, events, status, signing_secret_ciphertext, secret_preview, created_at, updated_at
FROM webhook_endpoints
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT $2
`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]WebhookEndpoint, 0)
	for rows.Next() {
		var item WebhookEndpoint
		if err := rows.Scan(&item.ID, &item.UserID, &item.URL, &item.Events, &item.Status, &item.SecretCiphertext, &item.SecretPreview, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateEndpoint(ctx context.Context, input CreateEndpointRecord) (WebhookEndpoint, error) {
	var item WebhookEndpoint
	err := r.pool.QueryRow(ctx, `
INSERT INTO webhook_endpoints (user_id, url, events, status, signing_secret_ciphertext, secret_preview)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, user_id, url, events, status, signing_secret_ciphertext, secret_preview, created_at, updated_at
`, input.UserID, input.URL, input.Events, input.Status, input.SecretCiphertext, input.SecretPreview).Scan(&item.ID, &item.UserID, &item.URL, &item.Events, &item.Status, &item.SecretCiphertext, &item.SecretPreview, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repository) GetEndpoint(ctx context.Context, userID, endpointID int64) (WebhookEndpoint, error) {
	var item WebhookEndpoint
	err := r.pool.QueryRow(ctx, `
SELECT id, user_id, url, events, status, signing_secret_ciphertext, secret_preview, created_at, updated_at
FROM webhook_endpoints
WHERE user_id = $1 AND id = $2
`, userID, endpointID).Scan(&item.ID, &item.UserID, &item.URL, &item.Events, &item.Status, &item.SecretCiphertext, &item.SecretPreview, &item.CreatedAt, &item.UpdatedAt)
	if err == pgx.ErrNoRows {
		return WebhookEndpoint{}, ErrEndpointNotFound
	}
	return item, err
}

func (r *Repository) CreateDelivery(ctx context.Context, input CreateDeliveryRecord) (WebhookDelivery, error) {
	var item WebhookDelivery
	err := r.pool.QueryRow(ctx, `
INSERT INTO webhook_deliveries (endpoint_id, user_id, event_type, payload, status, attempt_count, next_attempt_at, expires_at)
VALUES ($1, $2, $3, $4::jsonb, 'pending', 0, NOW(), NOW() + ($5::text)::interval)
RETURNING id, endpoint_id, user_id, event_type, payload::text, status, attempt_count, next_attempt_at, locked_at, locked_by, expires_at, last_error, created_at, updated_at
`, input.EndpointID, input.UserID, input.EventType, input.Payload, defaultDeliveryRetention.String()).Scan(&item.ID, &item.EndpointID, &item.UserID, &item.EventType, &item.Payload, &item.Status, &item.AttemptCount, &item.NextAttemptAt, &item.LockedAt, &item.LockedBy, &item.ExpiresAt, &item.LastError, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}
