package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/1420970597/nexus-mail/internal/app/bootstrap"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/modules/finance"
)

func TestHealthz(t *testing.T) {
	r := NewRouter(testApp())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var payload map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json: %v", err)
	}
	if payload["status"] != "ok" {
		t.Fatalf("expected status ok, got %q", payload["status"])
	}
}

func TestPing(t *testing.T) {
	r := NewRouter(testApp())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/system/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func testApp() *bootstrap.App {
	return &bootstrap.App{
		AuthService:    auth.NewService(nil, nil, "test-secret", time.Hour, 24*time.Hour),
		FinanceService: finance.NewService(nil),
	}
}
