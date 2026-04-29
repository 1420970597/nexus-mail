package finance

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
)

func TestSupplierCostProfilesEndpointRequiresSupplierRoleAndReturnsProfiles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{costProfiles: []SupplierCostProfile{{ID: 1, SupplierID: 7, ProjectKey: "discord", CostPerSuccess: 500, CostPerTimeout: 120, Currency: "CNY", Status: "active"}}}
	service := NewService(repo)
	handler := NewHandler(service, true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 7, Email: "supplier@nexus-mail.local", Role: auth.RoleSupplier}))
	handler.RegisterRoutes(secure)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/supplier/cost-profiles", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var payload struct {
		Items []SupplierCostProfile `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].ProjectKey != "discord" {
		t.Fatalf("unexpected payload: %#v", payload.Items)
	}
}

func TestSupplierCostProfilesEndpointRejectsRegularUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&stubRepo{}), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 2, Email: "user@nexus-mail.local", Role: auth.RoleUser}))
	handler.RegisterRoutes(secure)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/supplier/cost-profiles", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSupplierCostProfilesEndpointRejectsAdminWrites(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&stubRepo{}), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 1, Email: "admin@nexus-mail.local", Role: auth.RoleAdmin}))
	handler.RegisterRoutes(secure)

	body, _ := json.Marshal(UpsertSupplierCostProfileInput{ProjectKey: "discord", CostPerSuccess: 1, CostPerTimeout: 1})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/supplier/cost-profiles", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSupplierReportsEndpointAppliesFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 7, Email: "supplier@nexus-mail.local", Role: auth.RoleSupplier}))
	handler.RegisterRoutes(secure)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/supplier/reports?from=2026-04-01&to=2026-04-28&limit=500", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.userID != 7 || repo.reportInput.From != "2026-04-01" || repo.reportInput.To != "2026-04-28" || repo.reportInput.Limit != 200 {
		t.Fatalf("unexpected report input: supplier=%d input=%#v", repo.userID, repo.reportInput)
	}
}
func TestSupplierReportsEndpointRejectsInvalidFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 7, Email: "supplier@nexus-mail.local", Role: auth.RoleSupplier}))
	handler.RegisterRoutes(secure)

	for _, tc := range []struct {
		name         string
		target       string
		wantFragment string
	}{
		{name: "invalid from date", target: "/api/v1/supplier/reports?from=2026/04/01", wantFragment: "from 必须使用 YYYY-MM-DD 格式"},
		{name: "invalid to date", target: "/api/v1/supplier/reports?to=2026/04/28", wantFragment: "to 必须使用 YYYY-MM-DD 格式"},
		{name: "from after to", target: "/api/v1/supplier/reports?from=2026-04-28&to=2026-04-01", wantFragment: "from 不能晚于 to"},
		{name: "non integer limit", target: "/api/v1/supplier/reports?limit=abc", wantFragment: "limit 必须为整数"},
		{name: "negative limit", target: "/api/v1/supplier/reports?limit=-1", wantFragment: "limit 不能为负数"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.target, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("%s: expected 400, got %d: %s", tc.target, w.Code, w.Body.String())
			}
			if !strings.Contains(w.Body.String(), tc.wantFragment) {
				t.Fatalf("%s: expected body to contain %q, got %s", tc.target, tc.wantFragment, w.Body.String())
			}
		})
	}
}

func TestSupplierReportsEndpointRejectsRegularUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&stubRepo{}), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 2, Email: "user@nexus-mail.local", Role: auth.RoleUser}))
	handler.RegisterRoutes(secure)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/supplier/reports", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSupplierReportsEndpointLimitBoundaries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 7, Email: "supplier@nexus-mail.local", Role: auth.RoleSupplier}))
	handler.RegisterRoutes(secure)

	for _, tc := range []struct {
		name      string
		target    string
		wantLimit int
	}{
		{name: "blank uses default", target: "/api/v1/supplier/reports?limit=%20%20", wantLimit: 100},
		{name: "empty uses default", target: "/api/v1/supplier/reports?limit=", wantLimit: 100},
		{name: "zero uses default", target: "/api/v1/supplier/reports?limit=0", wantLimit: 100},
		{name: "one stays one", target: "/api/v1/supplier/reports?limit=1", wantLimit: 1},
		{name: "trimmed max stays max", target: "/api/v1/supplier/reports?limit=%20%20200%20", wantLimit: 200},
		{name: "above max is capped", target: "/api/v1/supplier/reports?limit=201", wantLimit: 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.target, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Fatalf("%s: expected 200, got %d: %s", tc.target, w.Code, w.Body.String())
			}
			if repo.reportInput.Limit != tc.wantLimit {
				t.Fatalf("%s: expected limit %d, got %d", tc.target, tc.wantLimit, repo.reportInput.Limit)
			}
		})
	}
}

func TestCreateDisputeEndpointCreatesDisputeForOrder(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{dispute: OrderDispute{ID: 3, OrderID: 10, Status: "open", Reason: "验证码错误"}}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 2, Email: "user@nexus-mail.local", Role: auth.RoleUser}))
	handler.RegisterRoutes(secure)

	body, _ := json.Marshal(CreateOrderDisputeInput{Reason: "  验证码错误  "})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/disputes/10", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if repo.disputeActorID != 2 || repo.disputeOrderID != 10 || repo.disputeActorRole != "user" || repo.disputeReason != "验证码错误" {
		t.Fatalf("unexpected dispute call: %#v", repo)
	}
}

func TestSupplierDisputesEndpointForwardsFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{disputes: []OrderDispute{{ID: 4, SupplierID: 7, Status: "resolved"}}}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 7, Email: "supplier@nexus-mail.local", Role: auth.RoleSupplier}))
	handler.RegisterRoutes(secure)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/supplier/disputes?status=resolved&limit=3", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.disputeListSupplierID != 7 || repo.disputeListAdminView || repo.disputeFilter.Status != "resolved" || repo.disputeFilter.Limit != 3 {
		t.Fatalf("unexpected dispute filter: supplier=%d admin=%v filter=%#v", repo.disputeListSupplierID, repo.disputeListAdminView, repo.disputeFilter)
	}
}

func TestAdminDisputesEndpointRejectsInvalidFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&stubRepo{}), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 9, Email: "admin@nexus-mail.local", Role: auth.RoleAdmin}))
	handler.RegisterRoutes(secure)

	for _, target := range []string{
		"/api/v1/admin/disputes?status=deleted",
		"/api/v1/admin/disputes?limit=-1",
		"/api/v1/admin/disputes?limit=abc",
	} {
		req := httptest.NewRequest(http.MethodGet, target, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("%s: expected 400, got %d: %s", target, w.Code, w.Body.String())
		}
	}
}

func TestAdminSettleSupplierPendingEndpointReturnsPayout(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 9, Email: "admin@nexus-mail.local", Role: auth.RoleAdmin}))
	handler.RegisterRoutes(secure)

	body, _ := json.Marshal(SettleSupplierPendingInput{SupplierID: 7, Reason: "  月度结算  ", ConfirmationPhrase: "确认结算"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/supplier-settlements", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var payload struct {
		Payout SupplierSettlementPayout `json:"payout"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Payout.SupplierID != 7 || payload.Payout.SettledAmount != 1200 {
		t.Fatalf("unexpected payout: %#v", payload.Payout)
	}
	if repo.adminID != 9 || repo.userID != 7 || repo.note != "月度结算" {
		t.Fatalf("unexpected repo call: %#v", repo)
	}
}

func TestResolveDisputeEndpointReturnsUpdatedDispute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubRepo{dispute: OrderDispute{ID: 8, Status: "resolved", ResolutionType: "refund", RefundAmount: 200}}
	handler := NewHandler(NewService(repo), true)
	r := gin.New()
	secure := r.Group("/api/v1")
	secure.Use(mockAuth(auth.User{ID: 9, Email: "admin@nexus-mail.local", Role: auth.RoleAdmin}))
	handler.RegisterRoutes(secure)

	body, _ := json.Marshal(ResolveOrderDisputeInput{Status: "resolved", ResolutionType: "refund", ResolutionNote: "退款处理", RefundAmount: 200})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/disputes/8/resolve", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.adminID != 9 || repo.resolveDisputeID != 8 || repo.resolveDisputeData.RefundAmount != 200 {
		t.Fatalf("unexpected resolve call: %#v", repo)
	}
}

func mockAuth(user auth.User) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("currentUser", user)
		c.Next()
	}
}
