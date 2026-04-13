package mailingest

import (
	"context"
	"encoding/json"
	"fmt"

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
  size_bytes INTEGER NOT NULL,
  parse_status TEXT NOT NULL DEFAULT 'queued',
  parse_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  id, mail_from, rcpt_to, helo, remote_ip, stored_at, raw_path, metadata_path, size_bytes, parse_status, parse_attempts, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued', 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET mail_from = EXCLUDED.mail_from,
    rcpt_to = EXCLUDED.rcpt_to,
    helo = EXCLUDED.helo,
    remote_ip = EXCLUDED.remote_ip,
    stored_at = EXCLUDED.stored_at,
    raw_path = EXCLUDED.raw_path,
    metadata_path = EXCLUDED.metadata_path,
    size_bytes = EXCLUDED.size_bytes,
    updated_at = NOW()
`, item.ID, item.MailFrom, rcptTo, item.Helo, item.RemoteIP, item.StoredAt, item.RawPath, item.MetadataPath, item.SizeBytes)
	if err != nil {
		return fmt.Errorf("save inbound message: %w", err)
	}
	return nil
}
