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
	ListSupplierCostProfiles(ctx context.Context, supplierID int64) ([]SupplierCostProfile, error)
	UpsertSupplierCostProfile(ctx context.Context, supplierID int64, input UpsertSupplierCostProfileInput) (SupplierCostProfile, error)
	SupplierReport(ctx context.Context, supplierID int64) ([]SupplierReportRow, error)
	CreateOrderDispute(ctx context.Context, actorID, orderID int64, actorRole, reason string) (OrderDispute, error)
	ListOrderDisputes(ctx context.Context, supplierID int64, adminView bool) ([]OrderDispute, error)
	ResolveOrderDispute(ctx context.Context, adminID, disputeID int64, input ResolveOrderDisputeInput) (OrderDispute, error)
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

func (s *Service) ListSupplierCostProfiles(ctx context.Context, supplierID int64) ([]SupplierCostProfile, error) {
	return s.repo.ListSupplierCostProfiles(ctx, supplierID)
}

func (s *Service) UpsertSupplierCostProfile(ctx context.Context, supplierID int64, input UpsertSupplierCostProfileInput) (SupplierCostProfile, error) {
	input.ProjectKey = strings.TrimSpace(strings.ToLower(input.ProjectKey))
	input.Currency = strings.TrimSpace(strings.ToUpper(input.Currency))
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	input.Notes = strings.TrimSpace(input.Notes)
	if input.ProjectKey == "" {
		return SupplierCostProfile{}, fmt.Errorf("project_key 不能为空")
	}
	if input.CostPerSuccess < 0 || input.CostPerTimeout < 0 {
		return SupplierCostProfile{}, fmt.Errorf("成本金额不能为负数")
	}
	if input.Currency == "" {
		input.Currency = "CNY"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	return s.repo.UpsertSupplierCostProfile(ctx, supplierID, input)
}

func (s *Service) SupplierReport(ctx context.Context, supplierID int64) ([]SupplierReportRow, error) {
	return s.repo.SupplierReport(ctx, supplierID)
}

func (s *Service) CreateOrderDispute(ctx context.Context, actorID, orderID int64, actorRole, reason string) (OrderDispute, error) {
	reason = strings.TrimSpace(reason)
	actorRole = strings.TrimSpace(strings.ToLower(actorRole))
	if orderID <= 0 {
		return OrderDispute{}, fmt.Errorf("order_id 无效")
	}
	if reason == "" {
		return OrderDispute{}, fmt.Errorf("争议原因不能为空")
	}
	return s.repo.CreateOrderDispute(ctx, actorID, orderID, actorRole, reason)
}

func (s *Service) ListOrderDisputes(ctx context.Context, supplierID int64, adminView bool) ([]OrderDispute, error) {
	return s.repo.ListOrderDisputes(ctx, supplierID, adminView)
}

func (s *Service) ResolveOrderDispute(ctx context.Context, adminID, disputeID int64, input ResolveOrderDisputeInput) (OrderDispute, error) {
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	input.ResolutionType = strings.TrimSpace(strings.ToLower(input.ResolutionType))
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	if disputeID <= 0 {
		return OrderDispute{}, fmt.Errorf("争议单 ID 无效")
	}
	if input.Status != "resolved" && input.Status != "rejected" {
		return OrderDispute{}, fmt.Errorf("status 仅支持 resolved 或 rejected")
	}
	if input.Status == "resolved" && input.ResolutionType == "" {
		input.ResolutionType = "manual_adjustment"
	}
	if input.RefundAmount < 0 {
		return OrderDispute{}, fmt.Errorf("refund_amount 不能为负数")
	}
	return s.repo.ResolveOrderDispute(ctx, adminID, disputeID, input)
}
