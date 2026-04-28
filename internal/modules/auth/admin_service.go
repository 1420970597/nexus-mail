package auth

import (
	"context"
	"fmt"
	"time"
)

func (s *Service) ListAllUsers(ctx context.Context) ([]User, error) {
	if s.apiKeyRepo != nil {
		items, err := s.apiKeyRepo.ListAllUsers(ctx)
		if err == nil {
			return items, nil
		}
	}
	if s.authRepo != nil {
		userRepo, ok := s.authRepo.(interface {
			ListAllUsers(context.Context) ([]User, error)
		})
		if ok {
			return userRepo.ListAllUsers(ctx)
		}
	}
	return nil, fmt.Errorf("用户存储尚未初始化")
}

func (s *Service) BuildAdminOverview(
	ctx context.Context,
	projects []DashboardProject,
	orders []DashboardOrder,
	walletUsers []DashboardWalletUser,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
) map[string]any {
	summary := BuildDashboardSummary(ctx, projects, orders, walletUsers, disputes, audit)
	recentAudit := latestAuditEntries(audit, 5)
	users := make([]User, 0, len(walletUsers))
	for _, wallet := range walletUsers {
		users = append(users, User{ID: wallet.UserID, Email: wallet.Email, Role: Role(wallet.Role)})
	}
	return map[string]any{
		"generated_at": time.Now().UTC(),
		"summary":      summary,
		"suppliers":    BuildAdminSupplierSummaries(users, walletUsers),
		"recent_audit": recentAudit,
	}
}

func (s *Service) BuildAdminRisk(
	ctx context.Context,
	orders []DashboardOrder,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
) map[string]any {
	summary, signals := BuildRiskSignals(ctx, orders, disputes, audit)
	return map[string]any{
		"summary": summary,
		"signals": signals,
	}
}

func (s *Service) BuildAdminRiskWithRules(
	ctx context.Context,
	orders []DashboardOrder,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
	rules []RiskRuleConfig,
) map[string]any {
	summary, signals := BuildRiskSignalsWithRules(ctx, orders, disputes, audit, rules)
	return map[string]any{
		"summary": summary,
		"signals": signals,
	}
}
