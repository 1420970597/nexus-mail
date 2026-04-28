package finance

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

const disputeRefundType = "dispute_refund"

func (r *Repository) EnsureSchema(ctx context.Context) error {
	if r == nil || r.pool == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available_balance BIGINT NOT NULL DEFAULT 0,
  frozen_balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id_created_at
  ON wallet_transactions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS supplier_settlement_ledger (
  supplier_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pending_amount BIGINT NOT NULL DEFAULT 0,
  settled_amount BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS supplier_settlement_entries (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_settlement_entries_supplier_id_created_at
  ON supplier_settlement_entries(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_settlement_entries_supplier_status_id
  ON supplier_settlement_entries(supplier_id, status, id);
CREATE TABLE IF NOT EXISTS supplier_cost_profiles (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL,
  cost_per_success BIGINT NOT NULL DEFAULT 0,
  cost_per_timeout BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, project_key)
);
CREATE INDEX IF NOT EXISTS idx_supplier_cost_profiles_supplier_id_project_key
  ON supplier_cost_profiles(supplier_id, project_key);
CREATE TABLE IF NOT EXISTS order_disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  reason TEXT NOT NULL,
  resolution_type TEXT NOT NULL DEFAULT '',
  resolution_note TEXT NOT NULL DEFAULT '',
  refund_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_order_disputes_supplier_id_created_at
  ON order_disputes(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_disputes_status_updated_at
  ON order_disputes(status, updated_at DESC);
`)
	return err
}

func (r *Repository) SeedDevelopmentData(ctx context.Context, env string) error {
	if r == nil || r.pool == nil || env != "development" {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
INSERT INTO user_wallets (user_id, available_balance, frozen_balance)
SELECT id,
       CASE role
         WHEN 'admin' THEN 500000
         WHEN 'supplier' THEN 100000
         ELSE 300000
       END,
       0
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO supplier_settlement_ledger (supplier_id, pending_amount, settled_amount)
SELECT id, 0, 0
FROM users
WHERE role IN ('supplier', 'admin')
ON CONFLICT (supplier_id) DO NOTHING;

INSERT INTO supplier_cost_profiles (supplier_id, project_key, cost_per_success, cost_per_timeout, currency, status, notes)
SELECT id,
       x.project_key,
       x.cost_per_success,
       x.cost_per_timeout,
       'CNY',
       'active',
       x.notes
FROM users
CROSS JOIN (VALUES
  ('discord', 500, 120, '默认 Discord 成本模型'),
  ('google', 900, 180, '默认 Google 成本模型'),
  ('tiktok', 700, 150, '默认 TikTok 成本模型')
) AS x(project_key, cost_per_success, cost_per_timeout, notes)
WHERE email = 'supplier@nexus-mail.local'
ON CONFLICT (supplier_id, project_key) DO NOTHING;
`)
	return err
}

func (r *Repository) WalletOverview(ctx context.Context, userID int64) (WalletOverview, error) {
	if err := r.ensureWalletRow(ctx, userID); err != nil {
		return WalletOverview{}, err
	}
	var item WalletOverview
	err := r.pool.QueryRow(ctx, `
SELECT u.id, u.email, w.available_balance, w.frozen_balance, COALESCE(s.pending_amount, 0), w.updated_at
FROM users u
JOIN user_wallets w ON w.user_id = u.id
LEFT JOIN supplier_settlement_ledger s ON s.supplier_id = u.id
WHERE u.id = $1
`, userID).Scan(&item.UserID, &item.Email, &item.AvailableBalance, &item.FrozenBalance, &item.PendingSettlement, &item.UpdatedAt)
	return item, err
}

func (r *Repository) WalletTransactions(ctx context.Context, userID int64) ([]WalletTransaction, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, order_id, type, direction, amount, balance_type, note, created_at
FROM wallet_transactions
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 100
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WalletTransaction
	for rows.Next() {
		var item WalletTransaction
		if err := rows.Scan(&item.ID, &item.UserID, &item.OrderID, &item.Type, &item.Direction, &item.Amount, &item.BalanceType, &item.Note, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) TopUpWallet(ctx context.Context, userID int64, amount int64, note string) (WalletOverview, error) {
	if amount <= 0 {
		return WalletOverview{}, fmt.Errorf("充值金额必须大于 0")
	}
	note = strings.TrimSpace(note)
	if note == "" {
		note = "在线充值"
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return WalletOverview{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := ensureWalletRowTx(ctx, tx, userID); err != nil {
		return WalletOverview{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE user_wallets SET available_balance = available_balance + $2, updated_at = NOW() WHERE user_id = $1`, userID, amount); err != nil {
		return WalletOverview{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, order_id, type, direction, amount, balance_type, note) VALUES ($1, 0, 'topup', 'credit', $2, 'available', $3)`, userID, amount, note); err != nil {
		return WalletOverview{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return WalletOverview{}, err
	}
	return r.WalletOverview(ctx, userID)
}

func (r *Repository) SupplierOverview(ctx context.Context, supplierID int64) (WalletOverview, []SupplierSettlementEntry, error) {
	if _, err := r.pool.Exec(ctx, `INSERT INTO supplier_settlement_ledger (supplier_id) VALUES ($1) ON CONFLICT (supplier_id) DO NOTHING`, supplierID); err != nil {
		return WalletOverview{}, nil, err
	}
	var item WalletOverview
	err := r.pool.QueryRow(ctx, `
SELECT u.id, u.email, COALESCE(w.available_balance, 0), COALESCE(w.frozen_balance, 0), s.pending_amount, s.updated_at
FROM users u
JOIN supplier_settlement_ledger s ON s.supplier_id = u.id
LEFT JOIN user_wallets w ON w.user_id = u.id
WHERE u.id = $1
`, supplierID).Scan(&item.UserID, &item.Email, &item.AvailableBalance, &item.FrozenBalance, &item.PendingSettlement, &item.UpdatedAt)
	if err != nil {
		return WalletOverview{}, nil, err
	}
	rows, err := r.pool.Query(ctx, `
SELECT id, supplier_id, order_id, amount, status, note, created_at
FROM supplier_settlement_entries
WHERE supplier_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 100
`, supplierID)
	if err != nil {
		return WalletOverview{}, nil, err
	}
	defer rows.Close()
	var entries []SupplierSettlementEntry
	for rows.Next() {
		var entry SupplierSettlementEntry
		if err := rows.Scan(&entry.ID, &entry.SupplierID, &entry.OrderID, &entry.Amount, &entry.Status, &entry.Note, &entry.CreatedAt); err != nil {
			return WalletOverview{}, nil, err
		}
		entries = append(entries, entry)
	}
	return item, entries, rows.Err()
}

func (r *Repository) AdminAdjustWallet(ctx context.Context, adminID, userID, amount int64, reason string) (WalletOverview, error) {
	if amount == 0 {
		return WalletOverview{}, fmt.Errorf("调账金额不能为 0")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "管理员调账"
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return WalletOverview{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := ensureWalletRowTx(ctx, tx, userID); err != nil {
		return WalletOverview{}, err
	}
	var available int64
	if err := tx.QueryRow(ctx, `SELECT available_balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`, userID).Scan(&available); err != nil {
		return WalletOverview{}, err
	}
	if amount < 0 && available+amount < 0 {
		return WalletOverview{}, fmt.Errorf("余额不足，无法完成扣减")
	}
	if _, err := tx.Exec(ctx, `UPDATE user_wallets SET available_balance = available_balance + $2, updated_at = NOW() WHERE user_id = $1`, userID, amount); err != nil {
		return WalletOverview{}, err
	}
	direction := "credit"
	if amount < 0 {
		direction = "debit"
	}
	note := fmt.Sprintf("%s（admin_id=%d）", reason, adminID)
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, order_id, type, direction, amount, balance_type, note) VALUES ($1, 0, 'admin_adjustment', $2, $3, 'available', $4)`, userID, direction, abs(amount), note); err != nil {
		return WalletOverview{}, err
	}
	if err := recordFinanceAuditTx(ctx, tx, adminID, "admin_wallet_adjustment", fmt.Sprintf("管理员调账 user_id=%d amount=%d", userID, amount)); err != nil {
		return WalletOverview{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return WalletOverview{}, err
	}
	return r.WalletOverview(ctx, userID)
}

func (r *Repository) AdminWalletUsers(ctx context.Context) ([]WalletOverview, error) {
	rows, err := r.pool.Query(ctx, `
SELECT u.id, u.email, COALESCE(w.available_balance, 0), COALESCE(w.frozen_balance, 0), COALESCE(s.pending_amount, 0), COALESCE(w.updated_at, NOW())
FROM users u
LEFT JOIN user_wallets w ON w.user_id = u.id
LEFT JOIN supplier_settlement_ledger s ON s.supplier_id = u.id
ORDER BY u.id ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WalletOverview
	for rows.Next() {
		var item WalletOverview
		if err := rows.Scan(&item.UserID, &item.Email, &item.AvailableBalance, &item.FrozenBalance, &item.PendingSettlement, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListSupplierCostProfiles(ctx context.Context, supplierID int64) ([]SupplierCostProfile, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, supplier_id, project_key, cost_per_success, cost_per_timeout, currency, status, notes, updated_at
FROM supplier_cost_profiles
WHERE supplier_id = $1
ORDER BY project_key ASC
`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SupplierCostProfile
	for rows.Next() {
		var item SupplierCostProfile
		if err := rows.Scan(&item.ID, &item.SupplierID, &item.ProjectKey, &item.CostPerSuccess, &item.CostPerTimeout, &item.Currency, &item.Status, &item.Notes, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpsertSupplierCostProfile(ctx context.Context, supplierID int64, input UpsertSupplierCostProfileInput) (SupplierCostProfile, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return SupplierCostProfile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var projectExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM projects WHERE key = $1 AND is_active = TRUE)`, input.ProjectKey).Scan(&projectExists); err != nil {
		return SupplierCostProfile{}, err
	}
	if !projectExists {
		return SupplierCostProfile{}, fmt.Errorf("project_key 不存在或未启用")
	}
	var item SupplierCostProfile
	err = tx.QueryRow(ctx, `
INSERT INTO supplier_cost_profiles (supplier_id, project_key, cost_per_success, cost_per_timeout, currency, status, notes, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
ON CONFLICT (supplier_id, project_key) DO UPDATE
SET cost_per_success = EXCLUDED.cost_per_success,
    cost_per_timeout = EXCLUDED.cost_per_timeout,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW()
RETURNING id, supplier_id, project_key, cost_per_success, cost_per_timeout, currency, status, notes, updated_at
`, supplierID, input.ProjectKey, input.CostPerSuccess, input.CostPerTimeout, input.Currency, input.Status, input.Notes).Scan(
		&item.ID,
		&item.SupplierID,
		&item.ProjectKey,
		&item.CostPerSuccess,
		&item.CostPerTimeout,
		&item.Currency,
		&item.Status,
		&item.Notes,
		&item.UpdatedAt,
	)
	if err != nil {
		return SupplierCostProfile{}, err
	}
	if err := recordFinanceAuditTx(ctx, tx, supplierID, "update_supplier_cost_profile", fmt.Sprintf("更新供应商成本模型 project_key=%s success=%d timeout=%d status=%s", item.ProjectKey, item.CostPerSuccess, item.CostPerTimeout, item.Status)); err != nil {
		return SupplierCostProfile{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return SupplierCostProfile{}, err
	}
	return item, nil
}

func (r *Repository) SupplierReport(ctx context.Context, supplierID int64, input SupplierReportInput, fromDate, toDate *time.Time) ([]SupplierReportRow, error) {
	rows, err := r.pool.Query(ctx, `
SELECT
  p.key,
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'FINISHED' THEN o.id END) AS finished_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'TIMEOUT' THEN o.id END) AS timeout_orders,
  COUNT(DISTINCT d.order_id) AS disputed_orders,
  COALESCE(SUM(CASE WHEN o.status = 'FINISHED' THEN o.quoted_price ELSE 0 END), 0) AS gross_revenue,
  COALESCE(SUM(CASE
    WHEN o.status = 'FINISHED' THEN cp.cost_per_success
    WHEN o.status = 'TIMEOUT' THEN cp.cost_per_timeout
    ELSE 0
  END), 0) AS modeled_cost,
  COALESCE(SUM(CASE WHEN o.status = 'FINISHED' THEN o.quoted_price ELSE 0 END), 0) -
  COALESCE(SUM(CASE
    WHEN o.status = 'FINISHED' THEN cp.cost_per_success
    WHEN o.status = 'TIMEOUT' THEN cp.cost_per_timeout
    ELSE 0
  END), 0) AS estimated_gross_pnl
FROM activation_orders o
JOIN projects p ON p.id = o.project_id
JOIN resource_domains rd ON rd.id = o.domain_id
LEFT JOIN supplier_cost_profiles cp ON cp.supplier_id = rd.supplier_id AND cp.project_key = p.key AND cp.status = 'active'
LEFT JOIN order_disputes d ON d.order_id = o.id AND d.status IN ('open', 'resolved', 'rejected')
WHERE rd.supplier_id = $1
  AND ($2::date IS NULL OR o.created_at >= $2::date)
  AND ($3::date IS NULL OR o.created_at < ($3::date + interval '1 day'))
GROUP BY p.key
ORDER BY p.key ASC
LIMIT $4
`, supplierID, fromDate, toDate, input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SupplierReportRow
	for rows.Next() {
		var item SupplierReportRow
		if err := rows.Scan(&item.ProjectKey, &item.TotalOrders, &item.FinishedOrders, &item.TimeoutOrders, &item.DisputedOrders, &item.GrossRevenue, &item.ModeledCost, &item.EstimatedGrossPnL); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) SettleSupplierPending(ctx context.Context, adminID, supplierID int64, reason string) (SupplierSettlementPayout, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "管理员确认供应商结算"
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return SupplierSettlementPayout{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var supplierRole string
	if err := tx.QueryRow(ctx, `SELECT role FROM users WHERE id = $1 FOR UPDATE`, supplierID).Scan(&supplierRole); err != nil {
		return SupplierSettlementPayout{}, err
	}
	if supplierRole != "supplier" {
		return SupplierSettlementPayout{}, fmt.Errorf("supplier_id 必须指向供应商用户")
	}
	if _, err := tx.Exec(ctx, `INSERT INTO supplier_settlement_ledger (supplier_id) VALUES ($1) ON CONFLICT (supplier_id) DO NOTHING`, supplierID); err != nil {
		return SupplierSettlementPayout{}, err
	}

	var payout SupplierSettlementPayout
	var pendingAmount int64
	payout.SupplierID = supplierID
	payout.Reason = reason
	if err := tx.QueryRow(ctx, `
SELECT pending_amount, settled_amount, NOW()
FROM supplier_settlement_ledger
WHERE supplier_id = $1
FOR UPDATE
`, supplierID).Scan(&pendingAmount, &payout.SettledBalance, &payout.SettledAt); err != nil {
		return SupplierSettlementPayout{}, err
	}
	if pendingAmount <= 0 {
		return SupplierSettlementPayout{}, fmt.Errorf("供应商暂无待结算金额")
	}
	var pendingEntryAmount int64
	if err := tx.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM supplier_settlement_entries WHERE supplier_id = $1 AND status = 'pending'`, supplierID).Scan(&pendingEntryAmount); err != nil {
		return SupplierSettlementPayout{}, err
	}
	if pendingEntryAmount != pendingAmount {
		return SupplierSettlementPayout{}, fmt.Errorf("供应商待结算账本与流水不一致，请先人工核对")
	}

	if err := tx.QueryRow(ctx, `
WITH updated AS (
  UPDATE supplier_settlement_entries
  SET status = 'settled', note = CASE WHEN note = '' THEN $2 ELSE note || '；' || $2 END
  WHERE supplier_id = $1 AND status = 'pending'
  RETURNING id
)
SELECT COUNT(*) FROM updated
`, supplierID, reason).Scan(&payout.EntryCount); err != nil {
		return SupplierSettlementPayout{}, err
	}
	if payout.EntryCount == 0 {
		return SupplierSettlementPayout{}, fmt.Errorf("供应商暂无可结算流水")
	}
	if _, err := tx.Exec(ctx, `
UPDATE supplier_settlement_ledger
SET pending_amount = 0,
    settled_amount = settled_amount + $2,
    updated_at = NOW()
WHERE supplier_id = $1
`, supplierID, pendingAmount); err != nil {
		return SupplierSettlementPayout{}, err
	}
	payout.SettledAmount = pendingAmount
	payout.PendingBalance = 0
	payout.SettledBalance += pendingAmount
	if err := recordFinanceAuditTx(ctx, tx, adminID, "settle_supplier_pending", fmt.Sprintf("供应商结算 supplier_id=%d amount=%d entries=%d reason=%s", supplierID, payout.SettledAmount, payout.EntryCount, reason)); err != nil {
		return SupplierSettlementPayout{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return SupplierSettlementPayout{}, err
	}
	return payout, nil
}

func (r *Repository) CreateOrderDispute(ctx context.Context, actorID, orderID int64, actorRole, reason string) (OrderDispute, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return OrderDispute{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var item OrderDispute
	var currentStatus string
	err = tx.QueryRow(ctx, `
SELECT o.id, o.user_id, rd.supplier_id, p.key, o.status
FROM activation_orders o
JOIN resource_domains rd ON rd.id = o.domain_id
JOIN projects p ON p.id = o.project_id
WHERE o.id = $1
FOR UPDATE
`, orderID).Scan(&item.OrderID, &item.UserID, &item.SupplierID, &item.ProjectKey, &currentStatus)
	if err != nil {
		return OrderDispute{}, err
	}
	if actorRole == "user" && item.UserID != actorID {
		return OrderDispute{}, fmt.Errorf("仅订单所属用户可发起争议")
	}
	if actorRole == "supplier" && item.SupplierID != actorID {
		return OrderDispute{}, fmt.Errorf("仅订单所属供应商可发起争议")
	}
	if currentStatus != "FINISHED" && currentStatus != "TIMEOUT" {
		return OrderDispute{}, fmt.Errorf("当前订单状态不允许发起争议")
	}
	err = tx.QueryRow(ctx, `
INSERT INTO order_disputes (order_id, supplier_id, user_id, project_key, status, reason, updated_at)
VALUES ($1, $2, $3, $4, 'open', $5, NOW())
ON CONFLICT (order_id) DO UPDATE
SET reason = EXCLUDED.reason,
    status = 'open',
    resolution_type = '',
    resolution_note = '',
    refund_amount = 0,
    resolved_at = NULL,
    updated_at = NOW()
RETURNING id, order_id, project_key, supplier_id, user_id, status, reason, resolution_type, resolution_note, refund_amount, created_at, updated_at, resolved_at
`, item.OrderID, item.SupplierID, item.UserID, item.ProjectKey, reason).Scan(
		&item.ID,
		&item.OrderID,
		&item.ProjectKey,
		&item.SupplierID,
		&item.UserID,
		&item.Status,
		&item.Reason,
		&item.ResolutionType,
		&item.ResolutionNote,
		&item.RefundAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ResolvedAt,
	)
	if err != nil {
		return OrderDispute{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return OrderDispute{}, err
	}
	return item, nil
}

func (r *Repository) ListOrderDisputes(ctx context.Context, supplierID int64, adminView bool) ([]OrderDispute, error) {
	query := `
SELECT id, order_id, project_key, supplier_id, user_id, status, reason, resolution_type, resolution_note, refund_amount, created_at, updated_at, resolved_at
FROM order_disputes`
	var rows pgx.Rows
	var err error
	if adminView {
		query += ` ORDER BY updated_at DESC, id DESC LIMIT 100`
		rows, err = r.pool.Query(ctx, query)
	} else {
		query += ` WHERE supplier_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 100`
		rows, err = r.pool.Query(ctx, query, supplierID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]OrderDispute, 0)
	for rows.Next() {
		var item OrderDispute
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProjectKey, &item.SupplierID, &item.UserID, &item.Status, &item.Reason, &item.ResolutionType, &item.ResolutionNote, &item.RefundAmount, &item.CreatedAt, &item.UpdatedAt, &item.ResolvedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ResolveOrderDispute(ctx context.Context, adminID, disputeID int64, input ResolveOrderDisputeInput) (OrderDispute, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return OrderDispute{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var item OrderDispute
	err = tx.QueryRow(ctx, `
SELECT id, order_id, project_key, supplier_id, user_id, status, reason, resolution_type, resolution_note, refund_amount, created_at, updated_at, resolved_at
FROM order_disputes
WHERE id = $1
FOR UPDATE
`, disputeID).Scan(
		&item.ID,
		&item.OrderID,
		&item.ProjectKey,
		&item.SupplierID,
		&item.UserID,
		&item.Status,
		&item.Reason,
		&item.ResolutionType,
		&item.ResolutionNote,
		&item.RefundAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ResolvedAt,
	)
	if err != nil {
		return OrderDispute{}, err
	}

	if item.Status != "open" {
		return OrderDispute{}, fmt.Errorf("争议单已处理，禁止重复结算")
	}

	if input.Status == "resolved" && input.RefundAmount > 0 {
		if item.RefundAmount > 0 || item.ResolvedAt != nil {
			return OrderDispute{}, fmt.Errorf("争议单已退款，禁止重复退款")
		}
		var quotedPrice int64
		if err := tx.QueryRow(ctx, `SELECT quoted_price FROM activation_orders WHERE id = $1`, item.OrderID).Scan(&quotedPrice); err != nil {
			return OrderDispute{}, err
		}
		if input.RefundAmount > quotedPrice {
			return OrderDispute{}, fmt.Errorf("refund_amount 不能超过订单实付金额")
		}
		if err := ensureWalletRowTx(ctx, tx, item.UserID); err != nil {
			return OrderDispute{}, err
		}
		if _, err := tx.Exec(ctx, `UPDATE user_wallets SET available_balance = available_balance + $2, updated_at = NOW() WHERE user_id = $1`, item.UserID, input.RefundAmount); err != nil {
			return OrderDispute{}, err
		}
		note := fmt.Sprintf("争议单退款（dispute_id=%d admin_id=%d）", item.ID, adminID)
		if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, order_id, type, direction, amount, balance_type, note) VALUES ($1, $2, $3, 'credit', $4, 'available', $5)`, item.UserID, item.OrderID, disputeRefundType, input.RefundAmount, note); err != nil {
			return OrderDispute{}, err
		}
		if _, err := tx.Exec(ctx, `
UPDATE supplier_settlement_ledger
SET pending_amount = GREATEST(pending_amount - $2, 0), updated_at = NOW()
WHERE supplier_id = $1
`, item.SupplierID, input.RefundAmount); err != nil {
			return OrderDispute{}, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO supplier_settlement_entries (supplier_id, order_id, amount, status, note)
VALUES ($1, $2, $3, 'reversed', $4)
`, item.SupplierID, item.OrderID, -input.RefundAmount, note); err != nil {
			return OrderDispute{}, err
		}
	}

	err = tx.QueryRow(ctx, `
UPDATE order_disputes
SET status = $2,
    resolution_type = $3,
    resolution_note = $4,
    refund_amount = $5,
    updated_at = NOW(),
	    resolved_at = CASE WHEN $2 IN ('resolved', 'rejected') THEN NOW() ELSE resolved_at END
WHERE id = $1
RETURNING id, order_id, project_key, supplier_id, user_id, status, reason, resolution_type, resolution_note, refund_amount, created_at, updated_at, resolved_at
`, disputeID, input.Status, input.ResolutionType, input.ResolutionNote, input.RefundAmount).Scan(
		&item.ID,
		&item.OrderID,
		&item.ProjectKey,
		&item.SupplierID,
		&item.UserID,
		&item.Status,
		&item.Reason,
		&item.ResolutionType,
		&item.ResolutionNote,
		&item.RefundAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ResolvedAt,
	)
	if err != nil {
		return OrderDispute{}, err
	}
	if err := recordFinanceAuditTx(ctx, tx, adminID, "resolve_dispute", fmt.Sprintf("处理争议单 dispute_id=%d status=%s resolution_type=%s refund_amount=%d", item.ID, item.Status, item.ResolutionType, item.RefundAmount)); err != nil {
		return OrderDispute{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return OrderDispute{}, err
	}
	return item, nil
}

func (r *Repository) ensureWalletRow(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	return err
}

func ensureWalletRowTx(ctx context.Context, tx pgx.Tx, userID int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	return err
}

func recordFinanceAuditTx(ctx context.Context, tx pgx.Tx, userID int64, action, note string) error {
	action = strings.TrimSpace(strings.ToLower(action))
	note = strings.TrimSpace(note)
	actorType := "admin"
	if action == "update_supplier_cost_profile" {
		actorType = "user"
	}
	_, err := tx.Exec(ctx, `INSERT INTO api_key_audit_logs (user_id, api_key_id, action, actor_type, note) VALUES ($1, NULL, $2, $3, $4)`, userID, action, actorType, note)
	return err
}

func abs(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
