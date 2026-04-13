package finance

import (
	"context"
	"fmt"
	"strings"

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

func (r *Repository) ensureWalletRow(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	return err
}

func ensureWalletRowTx(ctx context.Context, tx pgx.Tx, userID int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	return err
}

func abs(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
