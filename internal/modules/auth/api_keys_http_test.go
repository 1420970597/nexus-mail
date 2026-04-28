package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestAPIKeysEndpointsRequireAuthAndSupportLifecycle(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &apiKeyStubRepo{
		items:      []APIKey{{ID: 1, Name: "默认密钥", KeyPreview: "nmx_abcd...1234", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.1"}, Status: "active"}},
		audit:      []APIKeyAuditEntry{{ID: 9, Action: "create", ActorType: "user", Note: "创建 API Key"}},
		created:    APIKey{ID: 2, Name: "新密钥", KeyPreview: "nmx_efgh...5678", Scopes: []string{"finance:write"}, Whitelist: []string{"10.0.0.0/24"}, Status: "active"},
		plaintext:  "nmx_plaintext_key",
		revokeItem: APIKey{ID: 1, Name: "默认密钥", Status: "revoked"},
	}
	service := NewService(nil, repo, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	api := r.Group("/api/v1/auth")
	handler.RegisterRoutes(api)

	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	accessToken, err := service.issueToken(User{ID: 7, Email: "user@nexus-mail.local", Role: RoleUser}, sessionID)
	if err != nil {
		t.Fatalf("issue access token: %v", err)
	}

	t.Run("list api keys", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/api-keys", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("create api key", func(t *testing.T) {
		body, _ := json.Marshal(CreateAPIKeyInput{Name: "  新密钥  ", Scopes: []string{"finance:write"}, Whitelist: []string{"10.0.0.0/24"}})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/api-keys", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
		var payload struct {
			Plaintext string `json:"plaintext_key"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode create response: %v", err)
		}
		if payload.Plaintext != "nmx_plaintext_key" {
			t.Fatalf("unexpected plaintext key: %#v", payload)
		}
	})

	t.Run("list audit", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/api-keys/audit", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("revoke key", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/api-keys/1/revoke", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})
}

func TestAuthRequiredAcceptsAPIKeyForScopedRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "runtime", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.1"}, Status: "active"}}
	service := NewService(nil, repo, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	r.GET("/secure", handler.AuthRequiredForAPIKeyScope("activation:read"), func(c *gin.Context) {
		user := c.MustGet("currentUser").(User)
		key := c.MustGet("currentAPIKey").(APIKey)
		c.JSON(http.StatusOK, gin.H{"user_id": user.ID, "api_key_id": key.ID})
	})

	req := httptest.NewRequest(http.MethodGet, "/secure", nil)
	req.Header.Set("X-API-Key", "nmx_runtime")
	req.Header.Set("X-Forwarded-For", "8.8.8.8")
	req.RemoteAddr = "127.0.0.1:23456"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthRequiredRejectsAPIKeyOutsideWhitelist(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "runtime", Scopes: []string{"activation:read"}, Whitelist: []string{"10.0.0.0/24"}, Status: "active"}}
	service := NewService(nil, repo, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	r.GET("/secure", handler.AuthRequiredForAPIKeyScope("activation:read"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/secure", nil)
	req.Header.Set("X-API-Key", "nmx_runtime")
	req.RemoteAddr = "127.0.0.1:23456"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}
