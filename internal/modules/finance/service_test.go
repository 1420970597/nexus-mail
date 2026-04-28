package finance

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type stubRepo struct {
	wallet                WalletOverview
	transactions          []WalletTransaction
	settlements           []SupplierSettlementEntry
	users                 []WalletOverview
	costProfiles          []SupplierCostProfile
	reportInput           SupplierReportInput
	reportFromDate        *time.Time
	reportToDate          *time.Time
	disputes              []OrderDispute
	dispute               OrderDispute
	amount                int64
	note                  string
	userID                int64
	adminID               int64
	adjustUserID          int64
	adjustAmount          int64
	adjustReason          string
	costProfileInput      UpsertSupplierCostProfileInput
	disputeActorID        int64
	disputeOrderID        int64
	disputeActorRole      string
	disputeReason         string
	disputeFilter         OrderDisputeFilter
	disputeListSupplierID int64
	disputeListAdminView  bool
	resolveDisputeID      int64
	resolveDisputeData    ResolveOrderDisputeInput
	walletErr             error
	transactionErr        error
}

func (s *stubRepo) WalletOverview(context.Context, int64) (WalletOverview, error) {
	return s.wallet, s.walletErr
}

func (s *stubRepo) WalletTransactions(context.Context, int64) ([]WalletTransaction, error) {
	return s.transactions, s.transactionErr
}

func (s *stubRepo) TopUpWallet(_ context.Context, userID int64, amount int64, note string) (WalletOverview, error) {
	s.userID = userID
	s.amount = amount
	s.note = note
	return s.wallet, s.walletErr
}

func (s *stubRepo) SupplierOverview(_ context.Context, supplierID int64) (WalletOverview, []SupplierSettlementEntry, error) {
	s.userID = supplierID
	return s.wallet, s.settlements, s.walletErr
}

func (s *stubRepo) AdminAdjustWallet(_ context.Context, adminID, userID, amount int64, reason string) (WalletOverview, error) {
	s.adminID = adminID
	s.adjustUserID = userID
	s.adjustAmount = amount
	s.adjustReason = reason
	return s.wallet, s.walletErr
}

func (s *stubRepo) AdminWalletUsers(context.Context) ([]WalletOverview, error) {
	return s.users, s.walletErr
}

func (s *stubRepo) ListSupplierCostProfiles(_ context.Context, supplierID int64) ([]SupplierCostProfile, error) {
	s.userID = supplierID
	return s.costProfiles, s.walletErr
}

func (s *stubRepo) UpsertSupplierCostProfile(_ context.Context, supplierID int64, input UpsertSupplierCostProfileInput) (SupplierCostProfile, error) {
	s.userID = supplierID
	s.costProfileInput = input
	if s.walletErr != nil {
		return SupplierCostProfile{}, s.walletErr
	}
	return SupplierCostProfile{SupplierID: supplierID, ProjectKey: input.ProjectKey, Currency: input.Currency, Status: input.Status}, nil
}
func (s *stubRepo) SupplierReport(_ context.Context, supplierID int64, input SupplierReportInput, fromDate, toDate *time.Time) ([]SupplierReportRow, error) {
	s.userID = supplierID
	s.reportInput = input
	s.reportFromDate = fromDate
	s.reportToDate = toDate
	return []SupplierReportRow{{ProjectKey: "discord", TotalOrders: 3}}, s.walletErr
}

func (s *stubRepo) SettleSupplierPending(_ context.Context, adminID, supplierID int64, reason string) (SupplierSettlementPayout, error) {
	s.adminID = adminID
	s.userID = supplierID
	s.note = reason
	if s.walletErr != nil {
		return SupplierSettlementPayout{}, s.walletErr
	}
	return SupplierSettlementPayout{SupplierID: supplierID, SettledAmount: 1200, Reason: reason}, nil
}

func (s *stubRepo) CreateOrderDispute(_ context.Context, actorID, orderID int64, actorRole, reason string) (OrderDispute, error) {
	s.disputeActorID = actorID
	s.disputeOrderID = orderID
	s.disputeActorRole = actorRole
	s.disputeReason = reason
	if s.walletErr != nil {
		return OrderDispute{}, s.walletErr
	}
	return s.dispute, nil
}

func (s *stubRepo) ListOrderDisputes(_ context.Context, supplierID int64, adminView bool, filter OrderDisputeFilter) ([]OrderDispute, error) {
	s.disputeListSupplierID = supplierID
	s.disputeListAdminView = adminView
	s.disputeFilter = filter
	return s.disputes, s.walletErr
}

func (s *stubRepo) ResolveOrderDispute(_ context.Context, adminID, disputeID int64, input ResolveOrderDisputeInput) (OrderDispute, error) {
	s.adminID = adminID
	s.resolveDisputeID = disputeID
	s.resolveDisputeData = input
	if s.walletErr != nil {
		return OrderDispute{}, s.walletErr
	}
	return s.dispute, nil
}

func TestTopUpWalletValidatesAmountAndTrimsNote(t *testing.T) {
	repo := &stubRepo{wallet: WalletOverview{UserID: 7}}
	service := NewService(repo)
	wallet, err := service.TopUpWallet(context.Background(), 7, TopUpInput{Amount: 1200, Note: "  在线充值  "})
	if err != nil {
		t.Fatalf("TopUpWallet() error = %v", err)
	}
	if wallet.UserID != 7 {
		t.Fatalf("expected wallet for user 7, got %#v", wallet)
	}
	if repo.amount != 1200 || repo.note != "在线充值" {
		t.Fatalf("expected repo call with trimmed note, got amount=%d note=%q", repo.amount, repo.note)
	}
}

func TestTopUpWalletRejectsNonPositiveAmount(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.TopUpWallet(context.Background(), 7, TopUpInput{Amount: 0})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestAdminAdjustWalletValidatesInput(t *testing.T) {
	service := NewService(&stubRepo{})
	if _, err := service.AdminAdjustWallet(context.Background(), 1, AdminAdjustmentInput{UserID: 0, Amount: 100, Reason: "x"}); err == nil {
		t.Fatal("expected invalid user_id error")
	}
	if _, err := service.AdminAdjustWallet(context.Background(), 1, AdminAdjustmentInput{UserID: 7, Amount: 0, Reason: "x"}); err == nil {
		t.Fatal("expected zero amount error")
	}
}

func TestAdminAdjustWalletPassesTrimmedReason(t *testing.T) {
	repo := &stubRepo{wallet: WalletOverview{UserID: 8}}
	service := NewService(repo)
	_, err := service.AdminAdjustWallet(context.Background(), 99, AdminAdjustmentInput{UserID: 8, Amount: -300, Reason: "  dispute refund  "})
	if err != nil {
		t.Fatalf("AdminAdjustWallet() error = %v", err)
	}
	if repo.adminID != 99 || repo.adjustUserID != 8 || repo.adjustAmount != -300 || repo.adjustReason != "dispute refund" {
		t.Fatalf("unexpected repo call: %#v", repo)
	}
}

func TestWalletOverviewPropagatesRepositoryError(t *testing.T) {
	service := NewService(&stubRepo{walletErr: errors.New("boom")})
	_, err := service.WalletOverview(context.Background(), 5)
	if err == nil || err.Error() != "boom" {
		t.Fatalf("expected propagated error, got %v", err)
	}
}

func TestUpsertSupplierCostProfileNormalizesInput(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	_, err := service.UpsertSupplierCostProfile(context.Background(), 12, UpsertSupplierCostProfileInput{
		ProjectKey:     "  DISCORD ",
		CostPerSuccess: 500,
		CostPerTimeout: 100,
		Currency:       " cny ",
		Status:         " ACTIVE ",
		Notes:          "  note  ",
	})
	if err != nil {
		t.Fatalf("UpsertSupplierCostProfile() error = %v", err)
	}
	if repo.costProfileInput.ProjectKey != "discord" || repo.costProfileInput.Currency != "CNY" || repo.costProfileInput.Status != "active" || repo.costProfileInput.Notes != "note" {
		t.Fatalf("unexpected normalized input: %#v", repo.costProfileInput)
	}
}

func TestUpsertSupplierCostProfileRejectsInvalidStatusCurrencyAndOversizedNotes(t *testing.T) {
	service := NewService(&stubRepo{})
	cases := []struct {
		name  string
		input UpsertSupplierCostProfileInput
	}{
		{name: "bad status", input: UpsertSupplierCostProfileInput{ProjectKey: "discord", CostPerSuccess: 1, CostPerTimeout: 1, Currency: "CNY", Status: "deleted"}},
		{name: "bad currency", input: UpsertSupplierCostProfileInput{ProjectKey: "discord", CostPerSuccess: 1, CostPerTimeout: 1, Currency: "CNY1", Status: "active"}},
		{name: "long notes", input: UpsertSupplierCostProfileInput{ProjectKey: "discord", CostPerSuccess: 1, CostPerTimeout: 1, Currency: "CNY", Status: "active", Notes: strings.Repeat("x", 501)}},
		{name: "long project key", input: UpsertSupplierCostProfileInput{ProjectKey: strings.Repeat("a", 65), CostPerSuccess: 1, CostPerTimeout: 1, Currency: "CNY", Status: "active"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := service.UpsertSupplierCostProfile(context.Background(), 12, tc.input); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func TestUpsertSupplierCostProfileAllowsInactiveStatus(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	_, err := service.UpsertSupplierCostProfile(context.Background(), 12, UpsertSupplierCostProfileInput{ProjectKey: "discord", CostPerSuccess: 1, CostPerTimeout: 1, Currency: "USD", Status: "inactive"})
	if err != nil {
		t.Fatalf("UpsertSupplierCostProfile() error = %v", err)
	}
	if repo.costProfileInput.Status != "inactive" || repo.costProfileInput.Currency != "USD" {
		t.Fatalf("unexpected normalized input: %#v", repo.costProfileInput)
	}
}

func TestSettleSupplierPendingValidatesSupplierID(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.SettleSupplierPending(context.Background(), 9, SettleSupplierPendingInput{SupplierID: 0, Reason: "x"})
	if err == nil {
		t.Fatal("expected invalid supplier_id error")
	}
}

func TestSettleSupplierPendingDefaultsAndTrimsReason(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	payout, err := service.SettleSupplierPending(context.Background(), 9, SettleSupplierPendingInput{SupplierID: 7, Reason: "  月度结算  "})
	if err != nil {
		t.Fatalf("SettleSupplierPending() error = %v", err)
	}
	if payout.SupplierID != 7 || payout.SettledAmount != 1200 {
		t.Fatalf("unexpected payout: %#v", payout)
	}
	if repo.adminID != 9 || repo.userID != 7 || repo.note != "月度结算" {
		t.Fatalf("unexpected repo call: admin=%d supplier=%d reason=%q", repo.adminID, repo.userID, repo.note)
	}
}

func TestCreateOrderDisputeValidatesReason(t *testing.T) {
	service := NewService(&stubRepo{})
	if _, err := service.CreateOrderDispute(context.Background(), 1, 0, "user", "x"); err == nil {
		t.Fatal("expected invalid order id error")
	}
	if _, err := service.CreateOrderDispute(context.Background(), 1, 10, "user", "   "); err == nil {
		t.Fatal("expected empty reason error")
	}
}

func TestCreateOrderDisputePassesNormalizedValues(t *testing.T) {
	repo := &stubRepo{dispute: OrderDispute{ID: 3, OrderID: 10}}
	service := NewService(repo)
	_, err := service.CreateOrderDispute(context.Background(), 7, 10, " Supplier ", "  验证码错误 ")
	if err != nil {
		t.Fatalf("CreateOrderDispute() error = %v", err)
	}
	if repo.disputeActorID != 7 || repo.disputeOrderID != 10 || repo.disputeActorRole != "supplier" || repo.disputeReason != "验证码错误" {
		t.Fatalf("unexpected dispute repo call: %#v", repo)
	}
}

func TestListOrderDisputesNormalizesFilters(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	_, err := service.ListOrderDisputes(context.Background(), 7, false, OrderDisputeFilter{Status: " OPEN ", Limit: 500})
	if err != nil {
		t.Fatalf("ListOrderDisputes() error = %v", err)
	}
	if repo.disputeListSupplierID != 7 || repo.disputeListAdminView || repo.disputeFilter.Status != "open" || repo.disputeFilter.Limit != 200 {
		t.Fatalf("unexpected dispute filter: supplier=%d admin=%v filter=%#v", repo.disputeListSupplierID, repo.disputeListAdminView, repo.disputeFilter)
	}
}

func TestListOrderDisputesRejectsUnsupportedStatus(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.ListOrderDisputes(context.Background(), 7, false, OrderDisputeFilter{Status: "deleted"})
	if err == nil {
		t.Fatal("expected unsupported status validation error")
	}
}

func TestListOrderDisputesRejectsInvalidLimit(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.ListOrderDisputes(context.Background(), 7, false, OrderDisputeFilter{Limit: -1})
	if err == nil {
		t.Fatal("expected invalid limit validation error")
	}
}

func TestResolveOrderDisputeDefaultsResolutionType(t *testing.T) {
	repo := &stubRepo{dispute: OrderDispute{ID: 8}}
	service := NewService(repo)
	_, err := service.ResolveOrderDispute(context.Background(), 9, 8, ResolveOrderDisputeInput{Status: " RESOLVED ", ResolutionNote: "人工确认"})
	if err != nil {
		t.Fatalf("ResolveOrderDispute() error = %v", err)
	}
	if repo.resolveDisputeID != 8 || repo.resolveDisputeData.Status != "resolved" || repo.resolveDisputeData.ResolutionType != "manual_adjustment" {
		t.Fatalf("unexpected resolve repo call: %#v", repo.resolveDisputeData)
	}
}

func TestResolveOrderDisputeRejectsRefundAmountWhenRejected(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.ResolveOrderDispute(context.Background(), 9, 8, ResolveOrderDisputeInput{Status: "rejected", RefundAmount: 1})
	if err == nil {
		t.Fatal("expected rejected dispute refund validation error")
	}
}

func TestResolveOrderDisputeRequiresRefundTypeWhenRefunding(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.ResolveOrderDispute(context.Background(), 9, 8, ResolveOrderDisputeInput{Status: "resolved", ResolutionType: "manual_adjustment", RefundAmount: 100})
	if err == nil {
		t.Fatal("expected refund resolution_type validation error")
	}
}

func TestResolveOrderDisputeAllowsNormalizedRefundType(t *testing.T) {
	repo := &stubRepo{dispute: OrderDispute{ID: 8}}
	service := NewService(repo)
	_, err := service.ResolveOrderDispute(context.Background(), 9, 8, ResolveOrderDisputeInput{Status: "resolved", ResolutionType: " REFUND ", RefundAmount: 100})
	if err != nil {
		t.Fatalf("ResolveOrderDispute() error = %v", err)
	}
	if repo.resolveDisputeData.ResolutionType != "refund" || repo.resolveDisputeData.RefundAmount != 100 {
		t.Fatalf("expected normalized refund type to pass through, got %#v", repo.resolveDisputeData)
	}
}
