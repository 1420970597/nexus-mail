package finance

import (
	"context"
	"fmt"
	"strings"
	"time"
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
	SupplierReport(ctx context.Context, supplierID int64, input SupplierReportInput, fromDate, toDate *time.Time) ([]SupplierReportRow, error)
	SettleSupplierPending(ctx context.Context, adminID, supplierID int64, reason string) (SupplierSettlementPayout, error)
	CreateOrderDispute(ctx context.Context, actorID, orderID int64, actorRole, reason string) (OrderDispute, error)
	ListOrderDisputes(ctx context.Context, supplierID int64, adminView bool, filter OrderDisputeFilter) ([]OrderDispute, error)
	ResolveOrderDispute(ctx context.Context, adminID, disputeID int64, input ResolveOrderDisputeInput) (OrderDispute, error)
}

const (
	adminWalletAdjustmentConfirmationPhrase = "确认调账"
	supplierSettlementConfirmationPhrase    = "确认结算"
)

type Service struct {
	repo repository
}

type ValidationError struct {
	Message string
}

func (e ValidationError) Error() string { return e.Message }

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
	input.ConfirmationPhrase = strings.TrimSpace(input.ConfirmationPhrase)
	if input.UserID <= 0 {
		return WalletOverview{}, fmt.Errorf("user_id 无效")
	}
	if input.Amount == 0 {
		return WalletOverview{}, fmt.Errorf("调账金额不能为 0")
	}
	if input.ConfirmationPhrase != adminWalletAdjustmentConfirmationPhrase {
		return WalletOverview{}, fmt.Errorf("confirmation_phrase 必须为 %s", adminWalletAdjustmentConfirmationPhrase)
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
	if len(input.ProjectKey) > 64 {
		return SupplierCostProfile{}, fmt.Errorf("project_key 长度不能超过 64")
	}
	if input.CostPerSuccess < 0 || input.CostPerTimeout < 0 {
		return SupplierCostProfile{}, fmt.Errorf("成本金额不能为负数")
	}
	if input.Currency == "" {
		input.Currency = "CNY"
	}
	if len(input.Currency) != 3 {
		return SupplierCostProfile{}, fmt.Errorf("currency 必须为 3 位币种代码")
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.Status != "active" && input.Status != "inactive" {
		return SupplierCostProfile{}, fmt.Errorf("status 仅支持 active 或 inactive")
	}
	if len(input.Notes) > 500 {
		return SupplierCostProfile{}, fmt.Errorf("notes 长度不能超过 500")
	}
	return s.repo.UpsertSupplierCostProfile(ctx, supplierID, input)
}

func (s *Service) SupplierReport(ctx context.Context, supplierID int64, input SupplierReportInput) ([]SupplierReportRow, error) {
	input.From = strings.TrimSpace(input.From)
	input.To = strings.TrimSpace(input.To)
	if input.Limit < 0 {
		return nil, ValidationError{Message: "limit 不能为负数"}
	}
	if input.Limit <= 0 {
		input.Limit = 100
	}
	if input.Limit > 200 {
		input.Limit = 200
	}
	if input.From != "" {
		if _, err := time.Parse("2006-01-02", input.From); err != nil {
			return nil, ValidationError{Message: "from 必须使用 YYYY-MM-DD 格式"}
		}
	}
	if input.To != "" {
		if _, err := time.Parse("2006-01-02", input.To); err != nil {
			return nil, ValidationError{Message: "to 必须使用 YYYY-MM-DD 格式"}
		}
	}
	if input.From != "" && input.To != "" {
		from, _ := time.Parse("2006-01-02", input.From)
		to, _ := time.Parse("2006-01-02", input.To)
		if from.After(to) {
			return nil, ValidationError{Message: "from 不能晚于 to"}
		}
	}
	fromDate := (*time.Time)(nil)
	toDate := (*time.Time)(nil)
	if input.From != "" {
		parsed, _ := time.Parse("2006-01-02", input.From)
		fromDate = &parsed
	}
	if input.To != "" {
		parsed, _ := time.Parse("2006-01-02", input.To)
		toDate = &parsed
	}
	return s.repo.SupplierReport(ctx, supplierID, input, fromDate, toDate)
}

func (s *Service) SettleSupplierPending(ctx context.Context, adminID int64, input SettleSupplierPendingInput) (SupplierSettlementPayout, error) {
	input.Reason = strings.TrimSpace(input.Reason)
	input.ConfirmationPhrase = strings.TrimSpace(input.ConfirmationPhrase)
	if input.SupplierID <= 0 {
		return SupplierSettlementPayout{}, fmt.Errorf("supplier_id 无效")
	}
	if input.ConfirmationPhrase != supplierSettlementConfirmationPhrase {
		return SupplierSettlementPayout{}, fmt.Errorf("confirmation_phrase 必须为 %s", supplierSettlementConfirmationPhrase)
	}
	if input.Reason == "" {
		input.Reason = "管理员确认供应商结算"
	}
	return s.repo.SettleSupplierPending(ctx, adminID, input.SupplierID, input.Reason)
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

func (s *Service) ListOrderDisputes(ctx context.Context, supplierID int64, adminView bool, filter OrderDisputeFilter) ([]OrderDispute, error) {
	filter.Status = strings.TrimSpace(strings.ToLower(filter.Status))
	if filter.Status != "" && filter.Status != "open" && filter.Status != "resolved" && filter.Status != "rejected" {
		return nil, ValidationError{Message: "status 仅支持 open、resolved 或 rejected"}
	}
	if filter.Limit < 0 {
		return nil, ValidationError{Message: "limit 不能为负数"}
	}
	if filter.Limit <= 0 {
		filter.Limit = 100
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}
	return s.repo.ListOrderDisputes(ctx, supplierID, adminView, filter)
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
	if input.Status == "resolved" && input.RefundAmount > 0 && input.ResolutionType != "refund" {
		return OrderDispute{}, fmt.Errorf("退款处理时 resolution_type 必须为 refund")
	}
	if input.Status == "rejected" && input.RefundAmount != 0 {
		return OrderDispute{}, fmt.Errorf("驳回争议时 refund_amount 必须为 0")
	}
	if input.RefundAmount < 0 {
		return OrderDispute{}, fmt.Errorf("refund_amount 不能为负数")
	}
	return s.repo.ResolveOrderDispute(ctx, adminID, disputeID, input)
}
