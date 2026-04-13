package finance

import (
	"context"
	"errors"
	"testing"
)

type stubRepo struct {
	wallet         WalletOverview
	transactions   []WalletTransaction
	settlements    []SupplierSettlementEntry
	users          []WalletOverview
	amount         int64
	note           string
	userID         int64
	adminID        int64
	adjustUserID   int64
	adjustAmount   int64
	adjustReason   string
	walletErr      error
	transactionErr error
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

func (s *stubRepo) SupplierOverview(context.Context, int64) (WalletOverview, []SupplierSettlementEntry, error) {
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
