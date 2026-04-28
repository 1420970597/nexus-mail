package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type adminDataStub struct {
	orders   []DashboardOrder
	projects []DashboardProject
	wallets  []DashboardWalletUser
	disputes []DashboardDispute
	audit    []APIKeyAuditEntry
	listErr  error
}

func TestBuildAdminOverviewPayloadUsesDashboardAggregates(t *testing.T) {
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 21, UserID: 7, Action: "success", ActorType: "system", Note: "scope=activation:read"}}}
	repo.users = []User{
		{ID: 1, Email: "admin@nexus-mail.local", Role: RoleAdmin},
		{ID: 2, Email: "supplier@nexus-mail.local", Role: RoleSupplier},
		{ID: 3, Email: "user@nexus-mail.local", Role: RoleUser},
	}
	service := NewService(nil, repo, "test-secret", time.Hour, 24*time.Hour)
	payload := service.BuildAdminOverview(context.Background(),
		[]DashboardProject{{ID: 1, Key: "discord", Name: "Discord", IsActive: true}},
		[]DashboardOrder{{ID: 1, UserID: 3, Status: "TIMEOUT"}, {ID: 2, UserID: 3, Status: "FINISHED", FinalPrice: 1200}},
		[]DashboardWalletUser{{UserID: 2, Email: "supplier@nexus-mail.local", Role: "supplier", PendingSettlement: 1500}},
		[]DashboardDispute{{ID: 9, Status: "open"}},
		repo.audit,
	)
	summary, ok := payload["summary"].(DashboardSummary)
	if !ok {
		t.Fatalf("expected dashboard summary in payload, got %#v", payload)
	}
	if summary.Orders.Total != 2 || summary.Orders.Timeout != 1 || summary.Disputes.Open != 1 {
		t.Fatalf("unexpected summary: %#v", summary)
	}
	if summary.Orders.GrossRevenue != 1200 || summary.Orders.AverageFinishedOrderValue != 1200 || summary.Orders.CompletionRateBps != 5000 {
		t.Fatalf("expected final_price backed revenue metrics, got %#v", summary.Orders)
	}
}

func TestBuildAdminRiskPayloadUsesRiskSignals(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "test-secret", time.Hour, 24*time.Hour)
	payload := service.BuildAdminRisk(context.Background(),
		[]DashboardOrder{{ID: 1, UserID: 3, Status: "TIMEOUT"}, {ID: 2, UserID: 3, Status: "TIMEOUT"}, {ID: 3, UserID: 3, Status: "FINISHED"}},
		[]DashboardDispute{{ID: 11, Status: "open"}},
		[]APIKeyAuditEntry{{ID: 1, Action: "denied_whitelist", ActorType: "system", Note: "blocked"}},
	)
	signals, ok := payload["signals"].([]RiskSignal)
	if !ok || len(signals) == 0 {
		t.Fatalf("expected signals payload, got %#v", payload)
	}
	if signals[0].Severity != "high" {
		t.Fatalf("expected first signal to be high severity, got %#v", signals[0])
	}
}

func TestAdminAuditEndpointRemainsAdminOnlyAndAppliesFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 21, UserID: 7, Action: "success", ActorType: "system", Note: "scope=activation:read"}}}
	service := NewService(nil, repo, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	r.GET("/api/v1/admin/audit", handler.authRequired(), RequireRoles(RoleAdmin), handler.AdminAudit)

	adminSessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate admin token id: %v", err)
	}
	adminToken, err := service.issueToken(User{ID: 9, Email: "admin@nexus-mail.local", Role: RoleAdmin}, adminSessionID)
	if err != nil {
		t.Fatalf("issue admin token: %v", err)
	}
	userSessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate user token id: %v", err)
	}
	userToken, err := service.issueToken(User{ID: 7, Email: "user@nexus-mail.local", Role: RoleUser}, userSessionID)
	if err != nil {
		t.Fatalf("issue user token: %v", err)
	}

	t.Run("admin can query audit", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit?user_id=7&action=SUCCESS&actor_type=SYSTEM&limit=500", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
		if repo.lastAdminAuditFilter == nil {
			t.Fatal("expected admin filter to be forwarded")
		}
		if repo.lastAdminAuditFilter.UserID == nil || *repo.lastAdminAuditFilter.UserID != 7 || repo.lastAdminAuditFilter.Action != "success" || repo.lastAdminAuditFilter.ActorType != "system" || repo.lastAdminAuditFilter.Limit != 200 {
			t.Fatalf("unexpected filter: %#v", repo.lastAdminAuditFilter)
		}
	})

	t.Run("regular user forbidden", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("invalid user id rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit?user_id=abc", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("invalid limit rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit?limit=0", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
		}
	})
}
