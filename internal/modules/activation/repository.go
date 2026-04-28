package activation

import (
	"context"
	"fmt"
	"strings"
	"time"

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
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_price BIGINT NOT NULL DEFAULT 0,
  success_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS resource_domains (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT 'global',
  status TEXT NOT NULL DEFAULT 'active',
  catch_all BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS provider_accounts (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'public_mailbox_account',
  auth_mode TEXT NOT NULL DEFAULT 'oauth2',
  protocol_mode TEXT NOT NULL DEFAULT 'imap_pull',
  identifier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 0,
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  credential_secret TEXT NOT NULL DEFAULT '',
  secret_ref TEXT NOT NULL DEFAULT '',
  bridge_endpoint TEXT NOT NULL DEFAULT '',
  bridge_label TEXT NOT NULL DEFAULT '',
  health_status TEXT NOT NULL DEFAULT '',
  health_reason TEXT NOT NULL DEFAULT '',
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mailbox_pool (
  id BIGSERIAL PRIMARY KEY,
  domain_id BIGINT REFERENCES resource_domains(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES provider_accounts(id) ON DELETE CASCADE,
  local_part TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'self_hosted_domain',
  status TEXT NOT NULL DEFAULT 'available',
  project_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS project_offerings (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain_id BIGINT NOT NULL REFERENCES resource_domains(id) ON DELETE RESTRICT,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price BIGINT NOT NULL,
  success_rate DOUBLE PRECISION NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'domain',
  protocol_mode TEXT NOT NULL DEFAULT '',
  UNIQUE(project_id, domain_id, supplier_id, source_type, protocol_mode)
);
CREATE TABLE IF NOT EXISTS activation_orders (
  id BIGSERIAL PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  domain_id BIGINT NOT NULL REFERENCES resource_domains(id) ON DELETE RESTRICT,
  mailbox_id BIGINT NOT NULL REFERENCES mailbox_pool(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  quoted_price BIGINT NOT NULL,
  final_price BIGINT NOT NULL DEFAULT 0,
  extraction_type TEXT NOT NULL DEFAULT 'code',
  extraction_value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_activation_orders_user_id_created_at ON activation_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_orders_status_updated_at ON activation_orders(status, updated_at DESC);
`)
	return err
}

func (r *Repository) SeedDevelopmentData(ctx context.Context, env string) error {
	if env != "development" {
		return nil
	}

	if _, err := r.pool.Exec(ctx, `
INSERT INTO projects (key, name, description, default_price, success_rate, timeout_seconds, is_active)
VALUES
  ('discord', 'Discord 验证', '用于 Discord 邮件验证码接收演示', 1200, 0.96, 300, TRUE),
  ('google', 'Google 验证', '用于 Google 邮件验证码接收演示', 1800, 0.93, 420, TRUE),
  ('tiktok', 'TikTok 验证', '用于 TikTok 邮件验证码接收演示', 1500, 0.91, 360, TRUE)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_price = EXCLUDED.default_price,
    success_rate = EXCLUDED.success_rate,
    timeout_seconds = EXCLUDED.timeout_seconds,
    is_active = EXCLUDED.is_active
`); err != nil {
		return err
	}

	if _, err := r.pool.Exec(ctx, `
WITH supplier AS (
  SELECT id FROM users WHERE email = 'supplier@nexus-mail.local' LIMIT 1
)
INSERT INTO resource_domains (supplier_id, name, region, status, catch_all)
SELECT supplier.id, x.name, x.region, 'active', x.catch_all
FROM supplier,
     (VALUES
       ('mail-demo.one', 'global', TRUE),
       ('otp-nexus.dev', 'global', TRUE)
     ) AS x(name, region, catch_all)
ON CONFLICT (name) DO NOTHING
`); err != nil {
		return err
	}

	if _, err := r.pool.Exec(ctx, `
WITH supplier AS (
  SELECT id FROM users WHERE email = 'supplier@nexus-mail.local' LIMIT 1
)
INSERT INTO provider_accounts (supplier_id, provider, source_type, auth_mode, protocol_mode, identifier, status, host, port, refresh_token, credential_secret, secret_ref, bridge_endpoint, bridge_label)
SELECT supplier.id, x.provider, x.source_type, x.auth_mode, x.protocol_mode, x.identifier, 'active', x.host, x.port, x.refresh_token, x.credential_secret, x.secret_ref, x.bridge_endpoint, x.bridge_label
FROM supplier,
     (VALUES
       ('gmail', 'public_mailbox_account', 'oauth2', 'imap_pull', 'gmail-demo@nexus-mail.local', 'imap.gmail.com', 993, 'gmail-refresh-demo', '', '', '', ''),
       ('outlook', 'public_mailbox_account', 'app_password', 'pop3_pull', 'outlook-demo@nexus-mail.local', 'outlook.office365.com', 995, '', 'outlook-app-password-demo', '', '', ''),
       ('qq', 'public_mailbox_account', 'authorization_code', 'imap_pull', 'qq-demo@nexus-mail.local', 'imap.qq.com', 993, '', '', 'vault://mailbox/qq-demo-auth-code', '', ''),
       ('proton', 'bridge_mailbox', 'bridge_local_credential', 'imap_pull', 'proton-demo@nexus-mail.local', '127.0.0.1', 1143, '', 'bridge-pass-demo', '', '127.0.0.1:1143', 'proton-bridge')
     ) AS x(provider, source_type, auth_mode, protocol_mode, identifier, host, port, refresh_token, credential_secret, secret_ref, bridge_endpoint, bridge_label)
ON CONFLICT DO NOTHING
`); err != nil {
		return err
	}

	if _, err := r.pool.Exec(ctx, `
WITH domains AS (
  SELECT id, name FROM resource_domains WHERE name IN ('mail-demo.one', 'otp-nexus.dev')
)
INSERT INTO mailbox_pool (domain_id, local_part, address, source_type, status, project_key)
SELECT domains.id, x.local_part, x.local_part || '@' || domains.name, 'domain', 'available', x.project_key
FROM domains
JOIN (VALUES
  ('discord', 'discord-01'),
  ('discord', 'discord-02'),
  ('google', 'google-01'),
  ('google', 'google-02'),
  ('tiktok', 'tiktok-01'),
  ('tiktok', 'tiktok-02')
) AS x(project_key, local_part) ON TRUE
ON CONFLICT (address) DO NOTHING
`); err != nil {
		return err
	}

	if _, err := r.pool.Exec(ctx, `
WITH supplier AS (
  SELECT id FROM users WHERE email = 'supplier@nexus-mail.local' LIMIT 1
),
projects_cte AS (
  SELECT id, key, default_price, success_rate FROM projects
),
domains AS (
  SELECT id, name FROM resource_domains WHERE name IN ('mail-demo.one', 'otp-nexus.dev')
)
INSERT INTO project_offerings (project_id, domain_id, supplier_id, price, success_rate, priority, source_type, protocol_mode)
SELECT p.id, d.id, supplier.id,
       CASE p.key WHEN 'google' THEN 1800 WHEN 'tiktok' THEN 1500 ELSE 1200 END,
       p.success_rate,
       CASE d.name WHEN 'mail-demo.one' THEN 10 ELSE 20 END,
       'domain',
       ''
FROM supplier, projects_cte p, domains d
ON CONFLICT (project_id, domain_id, supplier_id, source_type, protocol_mode) DO UPDATE
SET price = EXCLUDED.price,
    success_rate = EXCLUDED.success_rate,
    priority = EXCLUDED.priority
`); err != nil {
		return err
	}

	return nil
}

func (r *Repository) ListProjects(ctx context.Context) ([]Project, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, key, name, description, default_price, success_rate, timeout_seconds, is_active, created_at
FROM projects
WHERE is_active = TRUE
ORDER BY id ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Project
	for rows.Next() {
		var item Project
		if err := rows.Scan(&item.ID, &item.Key, &item.Name, &item.Description, &item.DefaultPrice, &item.SuccessRate, &item.TimeoutSeconds, &item.IsActive, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListAllProjects(ctx context.Context) ([]Project, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, key, name, description, default_price, success_rate, timeout_seconds, is_active, created_at
FROM projects
ORDER BY id ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Project
	for rows.Next() {
		var item Project
		if err := rows.Scan(&item.ID, &item.Key, &item.Name, &item.Description, &item.DefaultPrice, &item.SuccessRate, &item.TimeoutSeconds, &item.IsActive, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListProjectOfferings(ctx context.Context) ([]ProjectOffering, error) {
	rows, err := r.pool.Query(ctx, `
SELECT
  po.id,
  po.project_id,
  p.key,
  p.name,
  po.domain_id,
  d.name,
  po.supplier_id,
  po.price,
  COUNT(m.id) FILTER (WHERE m.status = 'available' AND m.project_key = p.key AND m.source_type = po.source_type) AS stock,
  po.success_rate,
  po.priority,
  po.source_type,
  po.protocol_mode
FROM project_offerings po
JOIN projects p ON p.id = po.project_id AND p.is_active = TRUE
JOIN resource_domains d ON d.id = po.domain_id AND d.status = 'active'
LEFT JOIN mailbox_pool m ON m.domain_id = po.domain_id
GROUP BY po.id, po.project_id, p.key, p.name, po.domain_id, d.name, po.supplier_id, po.price, po.success_rate, po.priority, po.source_type, po.protocol_mode
ORDER BY po.project_id ASC, po.priority ASC, po.id ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ProjectOffering
	for rows.Next() {
		var item ProjectOffering
		if err := rows.Scan(&item.ID, &item.ProjectID, &item.ProjectKey, &item.ProjectName, &item.DomainID, &item.DomainName, &item.SupplierID, &item.Price, &item.Stock, &item.SuccessRate, &item.Priority, &item.SourceType, &item.ProtocolMode); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateActivationOrder(ctx context.Context, userID int64, input CreateActivationOrderInput) (ActivationOrder, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ActivationOrder{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var project Project
	if err := tx.QueryRow(ctx, `
SELECT id, key, name, description, default_price, success_rate, timeout_seconds, is_active, created_at
FROM projects
WHERE key = $1 AND is_active = TRUE
`, strings.ToLower(strings.TrimSpace(input.ProjectKey))).Scan(&project.ID, &project.Key, &project.Name, &project.Description, &project.DefaultPrice, &project.SuccessRate, &project.TimeoutSeconds, &project.IsActive, &project.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return ActivationOrder{}, fmt.Errorf("项目不存在")
		}
		return ActivationOrder{}, err
	}

	domainID := input.DomainID
	if domainID == 0 {
		if err := tx.QueryRow(ctx, `
SELECT po.domain_id
FROM project_offerings po
JOIN resource_domains d ON d.id = po.domain_id AND d.status = 'active'
WHERE po.project_id = $1
  AND EXISTS (
    SELECT 1
    FROM mailbox_pool m
    WHERE m.domain_id = po.domain_id
      AND m.project_key = $2
      AND m.status = 'available'
      AND m.source_type = po.source_type
  )
ORDER BY po.priority ASC, po.id ASC
LIMIT 1
`, project.ID, project.Key).Scan(&domainID); err != nil {
			if err == pgx.ErrNoRows {
				return ActivationOrder{}, fmt.Errorf("库存不足")
			}
			return ActivationOrder{}, err
		}
	}

	var offering ProjectOffering
	if err := tx.QueryRow(ctx, `
SELECT po.id, po.project_id, p.key, p.name, po.domain_id, d.name, po.supplier_id, po.price,
       COUNT(m.id) FILTER (WHERE m.status = 'available' AND m.project_key = p.key AND m.source_type = po.source_type) AS stock,
       po.success_rate, po.priority, po.source_type, po.protocol_mode
FROM project_offerings po
JOIN projects p ON p.id = po.project_id
JOIN resource_domains d ON d.id = po.domain_id
LEFT JOIN mailbox_pool m ON m.domain_id = po.domain_id
WHERE po.project_id = $1 AND po.domain_id = $2
GROUP BY po.id, po.project_id, p.key, p.name, po.domain_id, d.name, po.supplier_id, po.price, po.success_rate, po.priority, po.source_type, po.protocol_mode
`, project.ID, domainID).Scan(&offering.ID, &offering.ProjectID, &offering.ProjectKey, &offering.ProjectName, &offering.DomainID, &offering.DomainName, &offering.SupplierID, &offering.Price, &offering.Stock, &offering.SuccessRate, &offering.Priority, &offering.SourceType, &offering.ProtocolMode); err != nil {
		if err == pgx.ErrNoRows {
			return ActivationOrder{}, fmt.Errorf("库存不足")
		}
		return ActivationOrder{}, err
	}
	if offering.Stock <= 0 {
		return ActivationOrder{}, fmt.Errorf("库存不足")
	}
	if err := moveWalletBalanceTx(ctx, tx, userID, -offering.Price, offering.Price); err != nil {
		return ActivationOrder{}, err
	}

	var mailbox Mailbox
	if err := tx.QueryRow(ctx, `
WITH candidate AS (
  SELECT m.id, m.domain_id, COALESCE(m.account_id, 0) AS account_id, m.local_part, m.address, m.source_type, m.status, m.project_key, m.created_at
  FROM mailbox_pool m
  JOIN resource_domains d ON d.id = m.domain_id
  WHERE m.project_key = $1
    AND m.domain_id = $2
    AND m.status = 'available'
    AND m.source_type = $3
    AND d.supplier_id = $4
    AND d.status = 'active'
    AND ($3 = 'domain' OR EXISTS (
      SELECT 1
      FROM provider_accounts pa
      WHERE pa.id = m.account_id
        AND pa.supplier_id = $4
        AND pa.status = 'active'
        AND ($5 = '' OR pa.protocol_mode = $5)
    ))
  ORDER BY m.id ASC
  FOR UPDATE OF m SKIP LOCKED
  LIMIT 1
), claimed AS (
  UPDATE mailbox_pool m
  SET status = 'allocated'
  FROM candidate
  WHERE m.id = candidate.id
  RETURNING m.id, m.domain_id, COALESCE(m.account_id, 0) AS account_id, m.local_part, m.address, m.source_type, m.status, m.project_key, m.created_at
)
SELECT id, domain_id, account_id, local_part, address, source_type, status, project_key, created_at
FROM claimed
`, offering.ProjectKey, offering.DomainID, offering.SourceType, offering.SupplierID, offering.ProtocolMode).Scan(&mailbox.ID, &mailbox.DomainID, &mailbox.AccountID, &mailbox.LocalPart, &mailbox.Address, &mailbox.SourceType, &mailbox.Status, &mailbox.ProjectKey, &mailbox.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return ActivationOrder{}, fmt.Errorf("库存不足")
		}
		return ActivationOrder{}, err
	}

	orderNo := fmt.Sprintf("ACT-%d", time.Now().UnixNano())
	expiresAt := time.Now().UTC().Add(time.Duration(project.TimeoutSeconds) * time.Second)
	var order ActivationOrder
	if err := tx.QueryRow(ctx, `
INSERT INTO activation_orders (
  order_no, user_id, project_id, domain_id, mailbox_id, status,
  quoted_price, final_price, extraction_type, extraction_value, expires_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'code', '', $8)
RETURNING id, order_no, user_id, project_id, domain_id, mailbox_id, status,
          quoted_price, final_price, extraction_type, extraction_value,
          created_at, updated_at, expires_at, canceled_at
`, orderNo, userID, project.ID, offering.DomainID, mailbox.ID, OrderStatusAllocated, offering.Price, expiresAt).Scan(&order.ID, &order.OrderNo, &order.UserID, &order.ProjectID, &order.DomainID, &order.MailboxID, &order.Status, &order.QuotedPrice, &order.FinalPrice, &order.ExtractionType, &order.ExtractionValue, &order.CreatedAt, &order.UpdatedAt, &order.ExpiresAt, &order.CanceledAt); err != nil {
		return ActivationOrder{}, err
	}
	order.ProjectKey = project.Key
	order.ProjectName = project.Name
	order.DomainName = offering.DomainName
	order.EmailAddress = mailbox.Address
	if err := addWalletTransactionTx(ctx, tx, userID, order.ID, "freeze", "debit", offering.Price, "available", "创建订单冻结余额"); err != nil {
		return ActivationOrder{}, err
	}
	if err := addWalletTransactionTx(ctx, tx, userID, order.ID, "freeze", "credit", offering.Price, "frozen", "创建订单转入冻结余额"); err != nil {
		return ActivationOrder{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ActivationOrder{}, err
	}
	return order, nil
}

func (r *Repository) ListActivationOrdersByUser(ctx context.Context, userID int64) ([]ActivationOrder, error) {
	rows, err := r.pool.Query(ctx, `
SELECT
  o.id, o.order_no, o.user_id, o.project_id, p.key, p.name, o.domain_id,
  COALESCE(d.name, ''), o.mailbox_id, m.address, o.status, o.quoted_price,
  o.final_price, o.extraction_type, o.extraction_value,
  o.created_at, o.updated_at, o.expires_at, o.canceled_at
FROM activation_orders o
JOIN projects p ON p.id = o.project_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
JOIN mailbox_pool m ON m.id = o.mailbox_id
WHERE o.user_id = $1
ORDER BY o.created_at DESC, o.id DESC
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ActivationOrder
	for rows.Next() {
		var item ActivationOrder
		if err := rows.Scan(&item.ID, &item.OrderNo, &item.UserID, &item.ProjectID, &item.ProjectKey, &item.ProjectName, &item.DomainID, &item.DomainName, &item.MailboxID, &item.EmailAddress, &item.Status, &item.QuotedPrice, &item.FinalPrice, &item.ExtractionType, &item.ExtractionValue, &item.CreatedAt, &item.UpdatedAt, &item.ExpiresAt, &item.CanceledAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) GetActivationOrderForUser(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	var item ActivationOrder
	err := r.pool.QueryRow(ctx, `
SELECT
  o.id, o.order_no, o.user_id, o.project_id, p.key, p.name, o.domain_id,
  COALESCE(d.name, ''), o.mailbox_id, m.address, o.status, o.quoted_price,
  o.final_price, o.extraction_type, o.extraction_value,
  o.created_at, o.updated_at, o.expires_at, o.canceled_at
FROM activation_orders o
JOIN projects p ON p.id = o.project_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
JOIN mailbox_pool m ON m.id = o.mailbox_id
WHERE o.user_id = $1 AND o.id = $2
`, userID, orderID).Scan(&item.ID, &item.OrderNo, &item.UserID, &item.ProjectID, &item.ProjectKey, &item.ProjectName, &item.DomainID, &item.DomainName, &item.MailboxID, &item.EmailAddress, &item.Status, &item.QuotedPrice, &item.FinalPrice, &item.ExtractionType, &item.ExtractionValue, &item.CreatedAt, &item.UpdatedAt, &item.ExpiresAt, &item.CanceledAt)
	return item, err
}

func (r *Repository) TouchActivationOrderPolling(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	var item ActivationOrder
	err := r.pool.QueryRow(ctx, `
SELECT
  o.id, o.order_no, o.user_id, o.project_id, p.key, p.name, o.domain_id,
  COALESCE(d.name, ''), o.mailbox_id, m.address, o.status, o.quoted_price,
  o.final_price, o.extraction_type, o.extraction_value,
  o.created_at, NOW(), o.expires_at, o.canceled_at
FROM activation_orders o
JOIN projects p ON p.id = o.project_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
JOIN mailbox_pool m ON m.id = o.mailbox_id
WHERE o.user_id = $1 AND o.id = $2
`, userID, orderID).Scan(&item.ID, &item.OrderNo, &item.UserID, &item.ProjectID, &item.ProjectKey, &item.ProjectName, &item.DomainID, &item.DomainName, &item.MailboxID, &item.EmailAddress, &item.Status, &item.QuotedPrice, &item.FinalPrice, &item.ExtractionType, &item.ExtractionValue, &item.CreatedAt, &item.UpdatedAt, &item.ExpiresAt, &item.CanceledAt)
	if err != nil {
		return ActivationOrder{}, err
	}
	_, _ = r.pool.Exec(ctx, `UPDATE activation_orders SET updated_at = NOW() WHERE id = $1`, orderID)
	return item, nil
}

func (r *Repository) CancelActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ActivationOrder{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var order ActivationOrder
	if err := tx.QueryRow(ctx, `
SELECT id, order_no, user_id, project_id, domain_id, mailbox_id, status, quoted_price, final_price, extraction_type, extraction_value, created_at, updated_at, expires_at, canceled_at
FROM activation_orders
WHERE id = $1 AND user_id = $2
FOR UPDATE
`, orderID, userID).Scan(&order.ID, &order.OrderNo, &order.UserID, &order.ProjectID, &order.DomainID, &order.MailboxID, &order.Status, &order.QuotedPrice, &order.FinalPrice, &order.ExtractionType, &order.ExtractionValue, &order.CreatedAt, &order.UpdatedAt, &order.ExpiresAt, &order.CanceledAt); err != nil {
		return ActivationOrder{}, err
	}
	if isTerminalOrderStatus(order.Status) {
		return ActivationOrder{}, fmt.Errorf("订单已结束，无法取消")
	}
	if _, err := tx.Exec(ctx, `UPDATE activation_orders SET status = $2, canceled_at = NOW(), updated_at = NOW() WHERE id = $1`, orderID, OrderStatusCanceled); err != nil {
		return ActivationOrder{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE mailbox_pool SET status = 'available' WHERE id = $1`, order.MailboxID); err != nil {
		return ActivationOrder{}, err
	}
	if err := moveWalletBalanceTx(ctx, tx, userID, order.QuotedPrice, -order.QuotedPrice); err != nil {
		return ActivationOrder{}, err
	}
	if err := addWalletTransactionTx(ctx, tx, userID, order.ID, "cancel_refund", "credit", order.QuotedPrice, "available", "取消订单退回可用余额"); err != nil {
		return ActivationOrder{}, err
	}
	if err := addWalletTransactionTx(ctx, tx, userID, order.ID, "cancel_refund", "debit", order.QuotedPrice, "frozen", "取消订单释放冻结余额"); err != nil {
		return ActivationOrder{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ActivationOrder{}, err
	}
	return r.GetActivationOrderForUser(ctx, userID, orderID)
}

func (r *Repository) FinishActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ActivationOrder{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var orderIDDB, orderUserID, mailboxID, quotedPrice, supplierID int64
	var status string
	err = tx.QueryRow(ctx, `
SELECT o.id, o.user_id, o.mailbox_id, o.quoted_price, o.status, COALESCE(pa.supplier_id, d.supplier_id, 0)
FROM activation_orders o
JOIN mailbox_pool m ON m.id = o.mailbox_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
LEFT JOIN provider_accounts pa ON pa.id = m.account_id
WHERE o.id = $1 AND o.user_id = $2
FOR UPDATE
`, orderID, userID).Scan(&orderIDDB, &orderUserID, &mailboxID, &quotedPrice, &status, &supplierID)
	if err != nil {
		return ActivationOrder{}, err
	}
	if status != OrderStatusReady {
		return ActivationOrder{}, fmt.Errorf("当前订单状态不允许完成")
	}
	if _, err := tx.Exec(ctx, `UPDATE activation_orders SET status = $2, final_price = quoted_price, updated_at = NOW() WHERE id = $1`, orderID, OrderStatusFinished); err != nil {
		return ActivationOrder{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE mailbox_pool SET status = 'used' WHERE id = $1`, mailboxID); err != nil {
		return ActivationOrder{}, err
	}
	if err := moveWalletBalanceTx(ctx, tx, userID, 0, -quotedPrice); err != nil {
		return ActivationOrder{}, err
	}
	if err := addWalletTransactionTx(ctx, tx, userID, orderID, "order_finish", "debit", quotedPrice, "frozen", "订单完成扣除冻结余额"); err != nil {
		return ActivationOrder{}, err
	}
	if supplierID > 0 {
		if _, err := tx.Exec(ctx, `INSERT INTO supplier_settlement_ledger (supplier_id, pending_amount, settled_amount, updated_at) VALUES ($1, $2, 0, NOW()) ON CONFLICT (supplier_id) DO UPDATE SET pending_amount = supplier_settlement_ledger.pending_amount + EXCLUDED.pending_amount, updated_at = NOW()`, supplierID, quotedPrice); err != nil {
			return ActivationOrder{}, err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO supplier_settlement_entries (supplier_id, order_id, amount, status, note) VALUES ($1, $2, $3, 'pending', '订单完成待结算')`, supplierID, orderID, quotedPrice); err != nil {
			return ActivationOrder{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return ActivationOrder{}, err
	}
	return r.GetActivationOrderForUser(ctx, userID, orderID)
}

func (r *Repository) SubmitActivationResult(ctx context.Context, supplierID, orderID int64, input SubmitActivationResultInput) (ActivationOrder, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ActivationOrder{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var order ActivationOrder
	var currentStatus string
	var orderSupplierID int64
	err = tx.QueryRow(ctx, `
SELECT o.id, o.order_no, o.user_id, o.project_id, p.key, p.name, o.domain_id,
       COALESCE(d.name, ''), o.mailbox_id, m.address, o.status, o.quoted_price,
       o.final_price, o.extraction_type, o.extraction_value,
       o.created_at, o.updated_at, o.expires_at, o.canceled_at,
       COALESCE(pa.supplier_id, d.supplier_id, 0)
FROM activation_orders o
JOIN projects p ON p.id = o.project_id
JOIN mailbox_pool m ON m.id = o.mailbox_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
LEFT JOIN provider_accounts pa ON pa.id = m.account_id
WHERE o.id = $1
FOR UPDATE
`, orderID).Scan(&order.ID, &order.OrderNo, &order.UserID, &order.ProjectID, &order.ProjectKey, &order.ProjectName, &order.DomainID, &order.DomainName, &order.MailboxID, &order.EmailAddress, &currentStatus, &order.QuotedPrice, &order.FinalPrice, &order.ExtractionType, &order.ExtractionValue, &order.CreatedAt, &order.UpdatedAt, &order.ExpiresAt, &order.CanceledAt, &orderSupplierID)
	if err != nil {
		return ActivationOrder{}, err
	}
	if supplierID != orderSupplierID {
		return ActivationOrder{}, fmt.Errorf("无权回填该订单")
	}
	if isTerminalOrderStatus(currentStatus) {
		return ActivationOrder{}, fmt.Errorf("订单已结束")
	}
	nextStatus := OrderStatusReady
	if strings.TrimSpace(input.ExtractionValue) == "" {
		nextStatus = OrderStatusWaitingEmail
	}
	if _, err := tx.Exec(ctx, `UPDATE activation_orders SET status = $2, extraction_type = $3, extraction_value = $4, final_price = CASE WHEN $2 = $5 THEN quoted_price ELSE final_price END, updated_at = NOW() WHERE id = $1`, orderID, nextStatus, input.ExtractionType, input.ExtractionValue, OrderStatusFinished); err != nil {
		return ActivationOrder{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ActivationOrder{}, err
	}
	return r.GetActivationOrderForUser(ctx, order.UserID, orderID)
}

func (r *Repository) ListSupplierResources(ctx context.Context, supplierID int64) (map[string]any, error) {
	domains, err := r.queryDomains(ctx, supplierID)
	if err != nil {
		return nil, err
	}
	accounts, err := r.QueryProviderAccounts(ctx, supplierID)
	if err != nil {
		return nil, err
	}
	mailboxes, err := r.queryMailboxes(ctx, supplierID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"domains": domains, "accounts": accounts, "mailboxes": mailboxes}, nil
}

func (r *Repository) ListAllSupplierResources(ctx context.Context) (map[string]any, error) {
	domains, err := r.queryDomains(ctx, 0)
	if err != nil {
		return nil, err
	}
	accounts, err := r.QueryProviderAccounts(ctx, 0)
	if err != nil {
		return nil, err
	}
	mailboxes, err := r.queryMailboxes(ctx, 0)
	if err != nil {
		return nil, err
	}
	return map[string]any{"domains": domains, "accounts": accounts, "mailboxes": mailboxes}, nil
}

func (r *Repository) UpdateProject(ctx context.Context, projectID int64, input UpdateProjectInput) (Project, error) {
	var item Project
	err := r.pool.QueryRow(ctx, `
UPDATE projects
SET name = $2,
    description = $3,
    default_price = $4,
    success_rate = $5,
    timeout_seconds = $6,
    is_active = $7
WHERE id = $1
RETURNING id, key, name, description, default_price, success_rate, timeout_seconds, is_active, created_at
`, projectID, input.Name, input.Description, input.DefaultPrice, input.SuccessRate, input.TimeoutSeconds, input.IsActive).Scan(&item.ID, &item.Key, &item.Name, &item.Description, &item.DefaultPrice, &item.SuccessRate, &item.TimeoutSeconds, &item.IsActive, &item.CreatedAt)
	return item, err
}

func (r *Repository) CreateDomain(ctx context.Context, supplierID int64, input CreateDomainInput) (Domain, error) {
	var item Domain
	err := r.pool.QueryRow(ctx, `
INSERT INTO resource_domains (supplier_id, name, region, status, catch_all)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, supplier_id, name, region, status, catch_all, created_at
`, supplierID, input.Name, input.Region, input.Status, input.CatchAll).Scan(&item.ID, &item.SupplierID, &item.Name, &item.Region, &item.Status, &item.CatchAll, &item.CreatedAt)
	return item, err
}

func (r *Repository) CreateProviderAccount(ctx context.Context, supplierID int64, input CreateProviderAccountInput) (ProviderAccount, error) {
	var item ProviderAccount
	err := r.pool.QueryRow(ctx, `
INSERT INTO provider_accounts (supplier_id, provider, source_type, auth_mode, protocol_mode, identifier, status, host, port, access_token, refresh_token, credential_secret, secret_ref, bridge_endpoint, bridge_label, health_status, health_reason, token_expires_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '', '', NULL, NOW())
RETURNING id, supplier_id, provider, source_type, auth_mode, protocol_mode, identifier, status, host, port, access_token, refresh_token, credential_secret, secret_ref, bridge_endpoint, bridge_label, health_status, health_reason, token_expires_at, created_at, updated_at
`, supplierID, input.Provider, input.SourceType, input.AuthMode, input.ProtocolMode, input.Identifier, input.Status, input.Host, input.Port, input.AccessToken, input.RefreshToken, input.CredentialSecret, input.SecretRef, input.BridgeEndpoint, input.BridgeLabel).Scan(&item.ID, &item.SupplierID, &item.Provider, &item.SourceType, &item.AuthMode, &item.ProtocolMode, &item.Identifier, &item.Status, &item.Host, &item.Port, &item.AccessToken, &item.RefreshToken, &item.CredentialSecret, &item.SecretRef, &item.BridgeEndpoint, &item.BridgeLabel, &item.HealthStatus, &item.HealthReason, &item.TokenExpiresAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repository) CreateMailbox(ctx context.Context, supplierID int64, input CreateMailboxInput) (Mailbox, error) {
	if input.DomainID == 0 && input.AccountID == 0 {
		return Mailbox{}, fmt.Errorf("domain_id 与 account_id 至少填写一项")
	}
	var item Mailbox
	err := r.pool.QueryRow(ctx, `
INSERT INTO mailbox_pool (domain_id, account_id, local_part, address, source_type, status, project_key)
VALUES (NULLIF($1, 0), NULLIF($2, 0), $3, $4, $5, $6, $7)
RETURNING id, COALESCE(domain_id, 0), COALESCE(account_id, 0), local_part, address, source_type, status, project_key, '', created_at
`, input.DomainID, input.AccountID, input.LocalPart, input.Address, input.SourceType, input.Status, input.ProjectKey).Scan(&item.ID, &item.DomainID, &item.AccountID, &item.LocalPart, &item.Address, &item.SourceType, &item.Status, &item.ProjectKey, &item.Provider, &item.CreatedAt)
	return item, err
}

func (r *Repository) ExpireStaleActivationOrders(ctx context.Context, now time.Time) (int64, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, mailbox_id, quoted_price
FROM activation_orders
WHERE status IN ($1, $2) AND expires_at <= $3
FOR UPDATE
`, OrderStatusAllocated, OrderStatusWaitingEmail, now.UTC())
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var expired []struct {
		orderID   int64
		userID    int64
		mailboxID int64
		price     int64
	}
	for rows.Next() {
		var item struct {
			orderID   int64
			userID    int64
			mailboxID int64
			price     int64
		}
		if err := rows.Scan(&item.orderID, &item.userID, &item.mailboxID, &item.price); err != nil {
			return 0, err
		}
		expired = append(expired, item)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, order := range expired {
		tx, err := r.pool.Begin(ctx)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `UPDATE activation_orders SET status = $2, updated_at = NOW() WHERE id = $1`, order.orderID, OrderStatusTimeout); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if _, err := tx.Exec(ctx, `UPDATE mailbox_pool SET status = 'available' WHERE id = $1`, order.mailboxID); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := moveWalletBalanceTx(ctx, tx, order.userID, order.price, -order.price); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := addWalletTransactionTx(ctx, tx, order.userID, order.orderID, "timeout_refund", "credit", order.price, "available", "超时退回可用余额"); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := addWalletTransactionTx(ctx, tx, order.userID, order.orderID, "timeout_refund", "debit", order.price, "frozen", "超时释放冻结余额"); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := tx.Commit(ctx); err != nil {
			return 0, err
		}
	}
	return int64(len(expired)), nil
}

func (r *Repository) FinalizeReadyActivationOrders(ctx context.Context, now time.Time, finalizeAfter time.Duration) (int64, error) {
	rows, err := r.pool.Query(ctx, `
SELECT o.id, o.user_id, o.mailbox_id, o.quoted_price, COALESCE(pa.supplier_id, d.supplier_id, 0)
FROM activation_orders o
JOIN mailbox_pool m ON m.id = o.mailbox_id
LEFT JOIN resource_domains d ON d.id = o.domain_id
LEFT JOIN provider_accounts pa ON pa.id = m.account_id
WHERE o.status = $1 AND o.updated_at <= $2
FOR UPDATE
`, OrderStatusReady, now.UTC().Add(-finalizeAfter))
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var ready []struct {
		orderID    int64
		userID     int64
		mailboxID  int64
		quoted     int64
		supplierID int64
	}
	for rows.Next() {
		var item struct {
			orderID    int64
			userID     int64
			mailboxID  int64
			quoted     int64
			supplierID int64
		}
		if err := rows.Scan(&item.orderID, &item.userID, &item.mailboxID, &item.quoted, &item.supplierID); err != nil {
			return 0, err
		}
		ready = append(ready, item)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, order := range ready {
		tx, err := r.pool.Begin(ctx)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(ctx, `UPDATE activation_orders SET status = $2, final_price = CASE WHEN final_price = 0 THEN quoted_price ELSE final_price END, updated_at = NOW() WHERE id = $1`, order.orderID, OrderStatusFinished); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if _, err := tx.Exec(ctx, `UPDATE mailbox_pool SET status = 'used' WHERE id = $1`, order.mailboxID); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := moveWalletBalanceTx(ctx, tx, order.userID, 0, -order.quoted); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if err := addWalletTransactionTx(ctx, tx, order.userID, order.orderID, "auto_finish", "debit", order.quoted, "frozen", "自动完结扣除冻结余额"); err != nil {
			_ = tx.Rollback(ctx)
			return 0, err
		}
		if order.supplierID > 0 {
			if _, err := tx.Exec(ctx, `INSERT INTO supplier_settlement_ledger (supplier_id, pending_amount, settled_amount, updated_at) VALUES ($1, $2, 0, NOW()) ON CONFLICT (supplier_id) DO UPDATE SET pending_amount = supplier_settlement_ledger.pending_amount + EXCLUDED.pending_amount, updated_at = NOW()`, order.supplierID, order.quoted); err != nil {
				_ = tx.Rollback(ctx)
				return 0, err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO supplier_settlement_entries (supplier_id, order_id, amount, status, note) VALUES ($1, $2, $3, 'pending', '系统自动完结待结算')`, order.supplierID, order.orderID, order.quoted); err != nil {
				_ = tx.Rollback(ctx)
				return 0, err
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return 0, err
		}
	}
	return int64(len(ready)), nil
}

func (r *Repository) queryDomains(ctx context.Context, supplierID int64) ([]Domain, error) {
	query := `SELECT id, supplier_id, name, region, status, catch_all, created_at FROM resource_domains`
	var rows pgx.Rows
	var err error
	if supplierID > 0 {
		query += ` WHERE supplier_id = $1 ORDER BY id ASC`
		rows, err = r.pool.Query(ctx, query, supplierID)
	} else {
		query += ` ORDER BY id ASC`
		rows, err = r.pool.Query(ctx, query)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Domain
	for rows.Next() {
		var item Domain
		if err := rows.Scan(&item.ID, &item.SupplierID, &item.Name, &item.Region, &item.Status, &item.CatchAll, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) QueryProviderAccounts(ctx context.Context, supplierID int64) ([]ProviderAccount, error) {
	query := `SELECT id, supplier_id, provider, source_type, auth_mode, protocol_mode, identifier, status, host, port, access_token, refresh_token, credential_secret, secret_ref, bridge_endpoint, bridge_label, health_status, health_reason, token_expires_at, created_at, updated_at FROM provider_accounts`
	var rows pgx.Rows
	var err error
	if supplierID > 0 {
		query += ` WHERE supplier_id = $1 ORDER BY id ASC`
		rows, err = r.pool.Query(ctx, query, supplierID)
	} else {
		query += ` ORDER BY id ASC`
		rows, err = r.pool.Query(ctx, query)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ProviderAccount
	for rows.Next() {
		var item ProviderAccount
		if err := rows.Scan(&item.ID, &item.SupplierID, &item.Provider, &item.SourceType, &item.AuthMode, &item.ProtocolMode, &item.Identifier, &item.Status, &item.Host, &item.Port, &item.AccessToken, &item.RefreshToken, &item.CredentialSecret, &item.SecretRef, &item.BridgeEndpoint, &item.BridgeLabel, &item.HealthStatus, &item.HealthReason, &item.TokenExpiresAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListActiveProviderAccounts(ctx context.Context) ([]ProviderAccount, error) {
	items, err := r.QueryProviderAccounts(ctx, 0)
	if err != nil {
		return nil, err
	}
	active := make([]ProviderAccount, 0, len(items))
	for _, item := range items {
		if item.Status == "active" {
			active = append(active, item)
		}
	}
	return active, nil
}

func (r *Repository) UpdateProviderAccountHealth(ctx context.Context, accountID int64, input ProviderAccountHealthUpdate) error {
	_, err := r.pool.Exec(ctx, `
UPDATE provider_accounts
SET health_status = $2,
    health_reason = $3,
    access_token = CASE WHEN $4 = '' THEN access_token ELSE $4 END,
    refresh_token = CASE WHEN $5 = '' THEN refresh_token ELSE $5 END,
    token_expires_at = $6,
    updated_at = NOW()
WHERE id = $1
`, accountID, input.Status, input.Reason, input.AccessToken, input.RefreshToken, input.TokenExpiresAt)
	return err
}

func (r *Repository) queryMailboxes(ctx context.Context, supplierID int64) ([]Mailbox, error) {
	query := `
SELECT m.id, COALESCE(m.domain_id, 0), COALESCE(m.account_id, 0), m.local_part, m.address, m.source_type, m.status, m.project_key, COALESCE(a.provider, ''), m.created_at
FROM mailbox_pool m
LEFT JOIN provider_accounts a ON a.id = m.account_id
LEFT JOIN resource_domains d ON d.id = m.domain_id`
	var rows pgx.Rows
	var err error
	if supplierID > 0 {
		query += ` WHERE (a.supplier_id = $1 OR d.supplier_id = $1) ORDER BY m.id ASC`
		rows, err = r.pool.Query(ctx, query, supplierID)
	} else {
		query += ` ORDER BY m.id ASC`
		rows, err = r.pool.Query(ctx, query)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Mailbox
	for rows.Next() {
		var item Mailbox
		if err := rows.Scan(&item.ID, &item.DomainID, &item.AccountID, &item.LocalPart, &item.Address, &item.SourceType, &item.Status, &item.ProjectKey, &item.Provider, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func moveWalletBalanceTx(ctx context.Context, tx pgx.Tx, userID int64, availableDelta, frozenDelta int64) error {
	if _, err := tx.Exec(ctx, `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return err
	}
	var available, frozen int64
	if err := tx.QueryRow(ctx, `SELECT available_balance, frozen_balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`, userID).Scan(&available, &frozen); err != nil {
		return err
	}
	if available+availableDelta < 0 {
		return fmt.Errorf("余额不足")
	}
	if frozen+frozenDelta < 0 {
		return fmt.Errorf("冻结余额不足")
	}
	_, err := tx.Exec(ctx, `UPDATE user_wallets SET available_balance = available_balance + $2, frozen_balance = frozen_balance + $3, updated_at = NOW() WHERE user_id = $1`, userID, availableDelta, frozenDelta)
	return err
}

func addWalletTransactionTx(ctx context.Context, tx pgx.Tx, userID, orderID int64, txType, direction string, amount int64, balanceType, note string) error {
	_, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, order_id, type, direction, amount, balance_type, note) VALUES ($1, $2, $3, $4, $5, $6, $7)`, userID, orderID, txType, direction, amount, balanceType, note)
	return err
}
