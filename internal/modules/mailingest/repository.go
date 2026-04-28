package mailingest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) EnsureSchema(ctx context.Context) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS inbound_messages (
  id TEXT PRIMARY KEY,
  mail_from TEXT NOT NULL,
  rcpt_to JSONB NOT NULL,
  helo TEXT NOT NULL DEFAULT '',
  remote_ip TEXT NOT NULL DEFAULT '',
  stored_at TIMESTAMPTZ NOT NULL,
  raw_path TEXT NOT NULL,
  metadata_path TEXT NOT NULL,
  raw_object_key TEXT NOT NULL DEFAULT '',
  metadata_object_key TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL,
  parse_status TEXT NOT NULL DEFAULT 'queued',
  parse_attempts INTEGER NOT NULL DEFAULT 0,
  extraction_type TEXT NOT NULL DEFAULT '',
  extraction_value TEXT NOT NULL DEFAULT '',
  matched_order_id BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS raw_object_key TEXT NOT NULL DEFAULT '';
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS metadata_object_key TEXT NOT NULL DEFAULT '';
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS extraction_type TEXT NOT NULL DEFAULT '';
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS extraction_value TEXT NOT NULL DEFAULT '';
ALTER TABLE inbound_messages ADD COLUMN IF NOT EXISTS matched_order_id BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_inbound_messages_parse_status_created_at
  ON inbound_messages(parse_status, created_at ASC);
`)
	return err
}

func (r *Repository) SaveMessage(ctx context.Context, item PersistedMessage) error {
	if r == nil || r.pool == nil {
		return nil
	}
	rcptTo, err := json.Marshal(item.RcptTo)
	if err != nil {
		return fmt.Errorf("marshal rcpt_to: %w", err)
	}
	_, err = r.pool.Exec(ctx, `
INSERT INTO inbound_messages (
  id, mail_from, rcpt_to, helo, remote_ip, stored_at, raw_path, metadata_path, raw_object_key, metadata_object_key, size_bytes, parse_status, parse_attempts, extraction_type, extraction_value, matched_order_id, created_at, updated_at
) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, 'queued', 0, '', '', 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET mail_from = EXCLUDED.mail_from,
    rcpt_to = EXCLUDED.rcpt_to,
    helo = EXCLUDED.helo,
    remote_ip = EXCLUDED.remote_ip,
    stored_at = EXCLUDED.stored_at,
    raw_path = EXCLUDED.raw_path,
    metadata_path = EXCLUDED.metadata_path,
    raw_object_key = EXCLUDED.raw_object_key,
    metadata_object_key = EXCLUDED.metadata_object_key,
    size_bytes = EXCLUDED.size_bytes,
    updated_at = NOW()
`, item.ID, item.MailFrom, string(rcptTo), item.Helo, item.RemoteIP, item.StoredAt, item.RawPath, item.MetadataPath, item.RawObjectKey, item.MetadataObjectKey, item.SizeBytes)
	if err != nil {
		return fmt.Errorf("save inbound message: %w", err)
	}
	return nil
}

func (r *Repository) MarkMessageParsed(ctx context.Context, messageID, status, extractionType, extractionValue string, matchedOrderID int64) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
UPDATE inbound_messages
SET parse_status = $2,
    parse_attempts = parse_attempts + 1,
    extraction_type = $3,
    extraction_value = $4,
    matched_order_id = $5,
    updated_at = NOW()
WHERE id = $1
`, messageID, status, extractionType, extractionValue, matchedOrderID)
	if err != nil {
		return fmt.Errorf("mark inbound message parsed: %w", err)
	}
	return nil
}

func (r *Repository) ApplyActivationResultByAddress(ctx context.Context, recipient, extractionType, extractionValue string) (int64, error) {
	if r == nil || r.pool == nil {
		return 0, nil
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin activation result tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var orderID int64
	err = tx.QueryRow(ctx, `
SELECT o.id
FROM activation_orders o
JOIN mailbox_pool m ON m.id = o.mailbox_id
WHERE m.address = $1
  AND o.status IN ('ALLOCATED', 'WAITING_EMAIL')
  AND COALESCE(o.extraction_value, '') = ''
ORDER BY o.created_at DESC
LIMIT 1
FOR UPDATE
`, recipient).Scan(&orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("find activation order by address: %w", err)
	}
	if _, err := tx.Exec(ctx, `
UPDATE activation_orders
SET status = 'READY',
    extraction_type = $2,
    extraction_value = $3,
    updated_at = NOW()
WHERE id = $1
`, orderID, extractionType, extractionValue); err != nil {
		return 0, fmt.Errorf("update activation order result: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit activation result tx: %w", err)
	}
	return orderID, nil
}
