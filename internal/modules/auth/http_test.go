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

func TestRefreshIssuesNewAccessTokenAndRevokesPreviousRefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := NewService(nil, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	api := r.Group("/api/v1/auth")
	handler.RegisterRoutes(api)

	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	refreshToken, _, err := service.issueRefreshToken(User{ID: 9, Email: "admin@nexus-mail.local", Role: RoleAdmin}, sessionID)
	if err != nil {
		t.Fatalf("issue refresh token: %v", err)
	}

	body, _ := json.Marshal(gin.H{"refresh_token": refreshToken})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var session Session
	if err := json.Unmarshal(w.Body.Bytes(), &session); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if session.Token == "" {
		t.Fatal("expected access token in refresh response")
	}
	if session.RefreshToken == "" {
		t.Fatal("expected refresh token rotation in refresh response")
	}
	if session.RefreshToken == refreshToken {
		t.Fatal("expected rotated refresh token to differ from previous token")
	}
	if _, err := service.ParseToken(req.Context(), session.Token); err != nil {
		t.Fatalf("parse access token: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondW := httptest.NewRecorder()
	r.ServeHTTP(secondW, secondReq)
	if secondW.Code != http.StatusUnauthorized {
		t.Fatalf("expected revoked refresh token to return 401, got %d: %s", secondW.Code, secondW.Body.String())
	}
}

func TestLogoutRevokesRefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := NewService(nil, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	api := r.Group("/api/v1/auth")
	handler.RegisterRoutes(api)

	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	refreshToken, _, err := service.issueRefreshToken(User{ID: 2, Email: "user@nexus-mail.local", Role: RoleUser}, sessionID)
	if err != nil {
		t.Fatalf("issue refresh token: %v", err)
	}

	body, _ := json.Marshal(gin.H{"refresh_token": refreshToken})
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewReader(body))
	logoutReq.Header.Set("Content-Type", "application/json")
	logoutW := httptest.NewRecorder()
	r.ServeHTTP(logoutW, logoutReq)
	if logoutW.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", logoutW.Code, logoutW.Body.String())
	}

	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(body))
	refreshReq.Header.Set("Content-Type", "application/json")
	refreshW := httptest.NewRecorder()
	r.ServeHTTP(refreshW, refreshReq)
	if refreshW.Code != http.StatusUnauthorized {
		t.Fatalf("expected revoked token after logout, got %d: %s", refreshW.Code, refreshW.Body.String())
	}
}

func TestMenuReturnsRoleSpecificEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := NewService(nil, "test-secret", time.Hour, 24*time.Hour)
	handler := NewHandler(service)
	r := gin.New()
	api := r.Group("/api/v1/auth")
	handler.RegisterRoutes(api)

	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	accessToken, err := service.issueToken(User{ID: 7, Email: "supplier@nexus-mail.local", Role: RoleSupplier}, sessionID)
	if err != nil {
		t.Fatalf("issue access token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/menu", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var payload struct {
		Items []struct {
			Key  string `json:"key"`
			Path string `json:"path"`
		} `json:"items"`
		Role        Role         `json:"role"`
		Permissions []Permission `json:"permissions"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode menu response: %v", err)
	}
	if payload.Role != RoleSupplier {
		t.Fatalf("expected supplier role, got %s", payload.Role)
	}

	expectedPaths := map[string]bool{
		"/":                     false,
		"/balance":              false,
		"/api-keys":             false,
		"/settings":             false,
		"/supplier/domains":     false,
		"/supplier/resources":   false,
		"/supplier/settlements": false,
	}
	for _, item := range payload.Items {
		if _, ok := expectedPaths[item.Path]; ok {
			expectedPaths[item.Path] = true
		}
	}
	for path, found := range expectedPaths {
		if !found {
			t.Fatalf("expected menu path %s in supplier menu, got %#v", path, payload.Items)
		}
	}
	if len(payload.Permissions) == 0 {
		t.Fatal("expected permissions in menu response")
	}
}
