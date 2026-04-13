package mailboxpoll

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type stubHealthWriter struct {
	accountID      int64
	status         string
	reason         string
	accessToken    string
	refreshToken   string
	tokenExpiresAt *time.Time
}

func (s *stubHealthWriter) UpdateProviderAccountHealth(_ context.Context, accountID int64, status, reason, accessToken, refreshToken string, expiresAt *time.Time) error {
	s.accountID = accountID
	s.status = status
	s.reason = reason
	s.accessToken = accessToken
	s.refreshToken = refreshToken
	s.tokenExpiresAt = expiresAt
	return nil
}

func TestHTTPOAuthRefresherRefreshesSupportedProvider(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm() error = %v", err)
		}
		if got := r.Form.Get("refresh_token"); got != "rtok" {
			t.Fatalf("expected refresh token rtok, got %q", got)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token":  "new-token",
			"refresh_token": "new-refresh",
			"expires_in":    1800,
		})
	}))
	defer server.Close()

	refresher := NewHTTPOAuthRefresher(map[string]ProviderOAuthConfig{
		"gmail": {ClientID: "cid", ClientSecret: "secret", TokenURL: server.URL},
	})
	result, err := refresher.Refresh(context.Background(), OAuthToken{Provider: "gmail", RefreshToken: "rtok"})
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if result.AccessToken != "new-token" {
		t.Fatalf("expected refreshed token, got %q", result.AccessToken)
	}
	if result.RefreshToken != "new-refresh" {
		t.Fatalf("expected rotated refresh token, got %q", result.RefreshToken)
	}
}

func TestHTTPOAuthRefresherRejectsUnsupportedProvider(t *testing.T) {
	_, err := NewHTTPOAuthRefresher(nil).Refresh(context.Background(), OAuthToken{Provider: "qq", RefreshToken: "rtok"})
	if err == nil {
		t.Fatal("expected unsupported provider error")
	}
}

func TestEvaluateCredentialHealthValidatesMode(t *testing.T) {
	status := EvaluateCredentialHealth(AccountConfig{Provider: "outlook", AuthMode: "oauth2", ProtocolMode: "imap_pull", Identifier: "x", RefreshToken: "rtok"})
	if !status.Healthy {
		t.Fatalf("expected healthy status, got %#v", status)
	}
	status = EvaluateCredentialHealth(AccountConfig{Provider: "outlook", AuthMode: "unknown", ProtocolMode: "imap_pull", Identifier: "x"})
	if status.Healthy {
		t.Fatalf("expected unhealthy status for unknown mode, got %#v", status)
	}
}

func TestEvaluateCredentialHealthRequiresCredentialSecretForAppPassword(t *testing.T) {
	status := EvaluateCredentialHealth(AccountConfig{Provider: "qq", AuthMode: "app_password", ProtocolMode: "imap_pull", Identifier: "x"})
	if status.Healthy {
		t.Fatalf("expected unhealthy status without credential secret, got %#v", status)
	}
	status = EvaluateCredentialHealth(AccountConfig{Provider: "qq", AuthMode: "app_password", ProtocolMode: "imap_pull", Identifier: "x", CredentialSecret: "abc123"})
	if !status.Healthy {
		t.Fatalf("expected healthy status with credential secret, got %#v", status)
	}
}

func TestValidateBridgeEndpointForProton(t *testing.T) {
	endpoint, err := ValidateBridgeEndpoint(AccountConfig{Provider: "proton", AuthMode: "bridge_local_credential", ProtocolMode: "imap_pull", Identifier: "acc", Host: "127.0.0.1", Port: 1143})
	if err != nil {
		t.Fatalf("ValidateBridgeEndpoint() error = %v", err)
	}
	if endpoint != "127.0.0.1:1143" {
		t.Fatalf("expected proton bridge endpoint, got %q", endpoint)
	}
}

func TestSyncServiceRefreshesOAuthAndPersistsHealth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token": "new-token",
			"expires_in":   3600,
		})
	}))
	defer server.Close()
	writer := &stubHealthWriter{}
	service := SyncService{
		Refresher: NewHTTPOAuthRefresher(map[string]ProviderOAuthConfig{
			"gmail": {ClientID: "cid", ClientSecret: "secret", TokenURL: server.URL},
		}),
		Writer: writer,
	}
	if err := service.SyncAccount(context.Background(), AccountConfig{
		AccountID:    7,
		Provider:     "gmail",
		AuthMode:     "oauth2",
		ProtocolMode: "imap_pull",
		Identifier:   "gmail-demo@nexus-mail.local",
		RefreshToken: "rtok",
	}); err != nil {
		t.Fatalf("SyncAccount() error = %v", err)
	}
	if writer.status != "healthy" {
		t.Fatalf("expected healthy status, got %q", writer.status)
	}
	if writer.accessToken != "new-token" {
		t.Fatalf("expected persisted access token, got %q", writer.accessToken)
	}
}

func TestSyncServiceMarksBridgeHealthy(t *testing.T) {
	writer := &stubHealthWriter{}
	service := SyncService{Writer: writer}
	if err := service.SyncAccount(context.Background(), AccountConfig{
		AccountID:      9,
		Provider:       "proton",
		AuthMode:       "bridge_local_credential",
		ProtocolMode:   "imap_pull",
		Identifier:     "proton-demo@nexus-mail.local",
		Host:           "127.0.0.1",
		Port:           1143,
		BridgeEndpoint: "127.0.0.1:1143",
	}); err != nil {
		t.Fatalf("SyncAccount() error = %v", err)
	}
	if writer.status != "healthy" {
		t.Fatalf("expected bridge account healthy, got %q", writer.status)
	}
	if writer.reason == "" {
		t.Fatal("expected bridge health reason")
	}
}
