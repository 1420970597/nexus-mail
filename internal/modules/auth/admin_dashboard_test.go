package auth

import (
	"context"
	"testing"
)

func TestBuildDashboardSummaryAggregatesKeyAdminMetrics(t *testing.T) {
	projects := []DashboardProject{
		{ID: 1, Key: "discord", IsActive: true},
		{ID: 2, Key: "google", IsActive: false},
	}
	orders := []DashboardOrder{
		{ID: 1, UserID: 3, SupplierID: 2, Status: "FINISHED", FinalPrice: 1000},
		{ID: 2, UserID: 3, SupplierID: 2, Status: "TIMEOUT"},
		{ID: 3, UserID: 4, SupplierID: 5, Status: "CANCELED"},
		{ID: 4, UserID: 4, SupplierID: 5, Status: "READY"},
		{ID: 5, UserID: 4, SupplierID: 5, Status: "WAITING_EMAIL"},
	}
	walletUsers := []DashboardWalletUser{
		{UserID: 1, Email: "admin@nexus-mail.local", Role: "admin", PendingSettlement: 0},
		{UserID: 2, Email: "supplier@nexus-mail.local", Role: "supplier", PendingSettlement: 1500},
		{UserID: 3, Email: "user@nexus-mail.local", Role: "user", PendingSettlement: 0},
	}
	disputes := []DashboardDispute{{ID: 1, Status: "open"}, {ID: 2, Status: "resolved"}, {ID: 3, Status: "rejected"}}
	audit := []APIKeyAuditEntry{
		{ID: 1, Action: "create"},
		{ID: 2, Action: "revoke"},
		{ID: 3, Action: "success"},
		{ID: 4, Action: "denied_scope"},
		{ID: 5, Action: "denied_whitelist"},
		{ID: 6, Action: "denied_rate_limit"},
	}

	summary := BuildDashboardSummary(context.Background(), projects, orders, walletUsers, disputes, audit)
	if summary.Users.Total != 3 {
		t.Fatalf("expected 3 users, got %d", summary.Users.Total)
	}
	if summary.Orders.Total != 5 || summary.Orders.Finished != 1 || summary.Orders.Timeout != 1 || summary.Orders.Canceled != 1 || summary.Orders.Ready != 1 || summary.Orders.WaitingEmail != 1 {
		t.Fatalf("unexpected order summary: %#v", summary.Orders)
	}
	if summary.Disputes.Open != 1 || summary.Disputes.Resolved != 1 || summary.Disputes.Rejected != 1 {
		t.Fatalf("unexpected dispute summary: %#v", summary.Disputes)
	}
	if summary.Projects.Active != 1 || summary.Projects.Inactive != 1 {
		t.Fatalf("unexpected project summary: %#v", summary.Projects)
	}
	if summary.Suppliers.Total != 3 {
		t.Fatalf("expected 3 supplier/admin principals, got %d", summary.Suppliers.Total)
	}
	if summary.Audit.DeniedWhitelist != 1 || summary.Audit.DeniedScope != 1 || summary.Audit.DeniedRateLimit != 1 || summary.Audit.Total != 6 {
		t.Fatalf("unexpected audit summary: %#v", summary.Audit)
	}
	if summary.SupplierSettlements.PendingAmount != 1500 {
		t.Fatalf("expected pending settlement 1500, got %d", summary.SupplierSettlements.PendingAmount)
	}
	if summary.Orders.CompletionRateBps != 2000 || summary.Orders.TimeoutRateBps != 2000 || summary.Orders.CancelRateBps != 2000 {
		t.Fatalf("unexpected order rate metrics: %#v", summary.Orders)
	}
	if summary.Orders.GrossRevenue != 1000 || summary.Orders.AverageFinishedOrderValue != 1000 {
		t.Fatalf("unexpected revenue metrics: %#v", summary.Orders)
	}
	if summary.Disputes.DisputeRateBps != 6000 {
		t.Fatalf("unexpected dispute rate: %#v", summary.Disputes)
	}
	if summary.Audit.DeniedTotal != 3 || summary.Audit.DeniedRateBps != 5000 {
		t.Fatalf("unexpected denied audit depth metrics: %#v", summary.Audit)
	}
}

func TestBuildDashboardSummaryHandlesZeroAndFractionalRates(t *testing.T) {
	var empty DashboardSummary
	empty = BuildDashboardSummary(context.Background(), nil, nil, nil, []DashboardDispute{{ID: 1, Status: "open"}}, nil)
	if empty.Orders.CompletionRateBps != 0 || empty.Disputes.DisputeRateBps != 0 || empty.Audit.DeniedRateBps != 0 {
		t.Fatalf("expected zero rates without denominators, got %#v", empty)
	}

	summary := BuildDashboardSummary(context.Background(), nil,
		[]DashboardOrder{
			{ID: 1, Status: "FINISHED", FinalPrice: 100},
			{ID: 2, Status: "TIMEOUT"},
			{ID: 3, Status: "READY"},
		},
		nil,
		[]DashboardDispute{{ID: 2, Status: "open"}},
		[]APIKeyAuditEntry{{ID: 1, Action: "denied_scope"}, {ID: 2, Action: "success"}, {ID: 3, Action: "success"}},
	)
	if summary.Orders.CompletionRateBps != 3333 || summary.Orders.TimeoutRateBps != 3333 || summary.Disputes.DisputeRateBps != 3333 {
		t.Fatalf("unexpected fractional rates: %#v", summary)
	}
	if summary.Audit.DeniedRateBps != 3333 || summary.Audit.DeniedTotal != 1 {
		t.Fatalf("unexpected fractional audit rates: %#v", summary.Audit)
	}
}

func TestBuildRiskSignalsAppliesConfiguredRuleThresholdsAndDisabledRules(t *testing.T) {
	orders := []DashboardOrder{
		{ID: 1, UserID: 3, Status: "TIMEOUT"},
		{ID: 2, UserID: 3, Status: "TIMEOUT"},
		{ID: 3, UserID: 4, Status: "CANCELED"},
	}
	audit := []APIKeyAuditEntry{
		{ID: 1, Action: "denied_rate_limit"},
		{ID: 2, Action: "denied_rate_limit"},
	}
	rules := []RiskRuleConfig{
		{Key: "high_timeout", Enabled: true, Threshold: 2, Severity: "high"},
		{Key: "api_denied_rate", Enabled: false, Threshold: 1, Severity: "high"},
		{Key: "high_cancel", Enabled: true, Threshold: 2, Severity: "medium"},
	}

	summary, signals := BuildRiskSignalsWithRules(context.Background(), orders, nil, audit, rules)
	if summary.DeniedRateLimit != 2 {
		t.Fatalf("expected raw denied rate-limit counter to remain visible, got %#v", summary)
	}
	if summary.HighRiskSignalCount != 1 || summary.MediumRiskSignalCount != 0 {
		t.Fatalf("expected only the high-timeout signal to be counted, got summary=%#v signals=%#v", summary, signals)
	}
	if len(signals) != 1 || signals[0].Title != "超时订单需要关注" || signals[0].Severity != "high" || signals[0].Count != 2 {
		t.Fatalf("unexpected configured risk signals: %#v", signals)
	}
}

func TestBuildRiskSignalsRanksHighAndMediumSignals(t *testing.T) {
	orders := []DashboardOrder{
		{ID: 1, UserID: 3, SupplierID: 2, Status: "TIMEOUT"},
		{ID: 2, UserID: 3, SupplierID: 2, Status: "TIMEOUT"},
		{ID: 3, UserID: 3, SupplierID: 2, Status: "FINISHED"},
		{ID: 4, UserID: 4, SupplierID: 2, Status: "CANCELED"},
		{ID: 5, UserID: 4, SupplierID: 2, Status: "CANCELED"},
		{ID: 6, UserID: 4, SupplierID: 2, Status: "READY"},
	}
	disputes := []DashboardDispute{{ID: 1, Status: "open"}}
	audit := []APIKeyAuditEntry{{ID: 1, Action: "denied_whitelist"}, {ID: 2, Action: "denied_scope"}, {ID: 3, Action: "denied_invalid"}, {ID: 4, Action: "denied_rate_limit"}}

	summary, signals := BuildRiskSignals(context.Background(), orders, disputes, audit)
	if summary.OpenDisputes != 1 || summary.TimeoutOrders != 2 || summary.CanceledOrders != 2 {
		t.Fatalf("unexpected risk summary counters: %#v", summary)
	}
	if summary.DeniedWhitelist != 1 || summary.DeniedScope != 1 || summary.DeniedInvalid != 1 || summary.DeniedRateLimit != 1 {
		t.Fatalf("unexpected auth risk counters: %#v", summary)
	}
	if len(signals) == 0 {
		t.Fatal("expected non-empty signals")
	}
	if signals[0].Severity != "high" {
		t.Fatalf("expected highest ranked signal to be high severity, got %#v", signals[0])
	}
	if summary.HighRiskSignalCount == 0 || summary.MediumRiskSignalCount == 0 {
		t.Fatalf("expected both high and medium signals, got %#v", summary)
	}
}
