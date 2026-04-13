package finance

import (
	"context"
	"fmt"
	"strings"
)

type repository interface {
	WalletOverview(ctx context.Context, userID int64) (WalletOverview, error)
	WalletTransactions(ctx context.Context, userID int64) ([]WalletTransaction, error)
	TopUpWallet(ctx context.Context, userID int64, amount int64, note string) (WalletOverview, error)
	SupplierOverview(ctx context.Context, supplierID int64) (WalletOverview, []SupplierSettlementEntry, error)
	AdminAdjustWallet(ctx context.Context, adminID, userID, amount int64, reason string) (WalletOverview, error)
	AdminWalletUsers(ctx context.Context) ([]WalletOverview, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service { return &Service{repo: repo} }

func (s *Service) WalletOverview(ctx context.Context, userID int64) (WalletOverview, error) {
	return s.repo.WalletOverview(ctx, userID)
}

func (s *Service) WalletTransactions(ctx context.Context, userID int64) ([]WalletTransaction, error) {
	return s.repo.WalletTransactions(ctx, userID)
}

func (s *Service) TopUpWallet(ctx context.Context, userID int64, input TopUpInput) (WalletOverview, error) {
	input.Note = strings.TrimSpace(input.Note)
	if input.Amount <= 0 {
		return WalletOverview{}, fmt.Errorf("充值金额必须大于 0")
	}
	return s.repo.TopUpWallet(ctx, userID, input.Amount, input.Note)
}

func (s *Service) SupplierOverview(ctx context.Context, supplierID int64) (WalletOverview, []SupplierSettlementEntry, error) {
	return s.repo.SupplierOverview(ctx, supplierID)
}

func (s *Service) AdminAdjustWallet(ctx context.Context, adminID int64, input AdminAdjustmentInput) (WalletOverview, error) {
	input.Reason = strings.TrimSpace(input.Reason)
	if input.UserID <= 0 {
		return WalletOverview{}, fmt.Errorf("user_id 无效")
	}
	if input.Amount == 0 {
		return WalletOverview{}, fmt.Errorf("调账金额不能为 0")
	}
	return s.repo.AdminAdjustWallet(ctx, adminID, input.UserID, input.Amount, input.Reason)
}

func (s *Service) AdminWalletUsers(ctx context.Context) ([]WalletOverview, error) {
	return s.repo.AdminWalletUsers(ctx)
}
