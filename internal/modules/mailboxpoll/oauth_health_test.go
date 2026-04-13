package mailboxpoll

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
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

type stubValidator struct {
	called  bool
	account AccountConfig
	err     error
}

func (s *stubValidator) Validate(_ context.Context, account AccountConfig) error {
	s.called = true
	s.account = account
	return s.err
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

func TestSyncServiceResolvesSecretRefAndValidatesCredential(t *testing.T) {
	t.Setenv("NEXUS_MAIL_SECRET", "app-pass-123")
	writer := &stubHealthWriter{}
	validator := &stubValidator{}
	service := SyncService{Writer: writer, Validator: validator}
	if err := service.SyncAccount(context.Background(), AccountConfig{
		AccountID:    8,
		Provider:     "qq",
		AuthMode:     "app_password",
		ProtocolMode: "imap_pull",
		Identifier:   "qq@example.com",
		Host:         "127.0.0.1",
		Port:         143,
		SecretRef:    "env://NEXUS_MAIL_SECRET",
	}); err != nil {
		t.Fatalf("SyncAccount() error = %v", err)
	}
	if !validator.called {
		t.Fatal("expected credential validator to be called")
	}
	if validator.account.CredentialSecret != "app-pass-123" {
		t.Fatalf("expected resolved secret to be forwarded, got %q", validator.account.CredentialSecret)
	}
	if writer.status != "healthy" {
		t.Fatalf("expected healthy status, got %q", writer.status)
	}
}

func TestSyncServiceMarksMissingResolvedSecretUnhealthy(t *testing.T) {
	writer := &stubHealthWriter{}
	service := SyncService{Writer: writer}
	if err := service.SyncAccount(context.Background(), AccountConfig{
		AccountID:    10,
		Provider:     "qq",
		AuthMode:     "authorization_code",
		ProtocolMode: "imap_pull",
		Identifier:   "qq@example.com",
		Host:         "127.0.0.1",
		Port:         143,
		SecretRef:    "env://MISSING_SECRET_FOR_TEST",
	}); err != nil {
		t.Fatalf("SyncAccount() error = %v", err)
	}
	if writer.status != "unhealthy" {
		t.Fatalf("expected unhealthy status, got %q", writer.status)
	}
	if !strings.Contains(writer.reason, "MISSING_SECRET_FOR_TEST") {
		t.Fatalf("expected missing env reason, got %q", writer.reason)
	}
}

func TestNetworkCredentialValidatorIMAPLogin(t *testing.T) {
	addr, stop := startFakeIMAPServer(t, "mail@example.com", "imap-pass")
	defer stop()
	host, port := splitHostPort(t, addr)
	validator := NetworkCredentialValidator{Timeout: 2 * time.Second}
	if err := validator.Validate(context.Background(), AccountConfig{
		Provider:         "qq",
		AuthMode:         "app_password",
		ProtocolMode:     "imap_pull",
		Identifier:       "mail@example.com",
		Host:             host,
		Port:             port,
		CredentialSecret: "imap-pass",
	}); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestNetworkCredentialValidatorPOP3Login(t *testing.T) {
	addr, stop := startFakePOP3Server(t, "mail@example.com", "pop-pass")
	defer stop()
	host, port := splitHostPort(t, addr)
	validator := NetworkCredentialValidator{Timeout: 2 * time.Second}
	if err := validator.Validate(context.Background(), AccountConfig{
		Provider:         "qq",
		AuthMode:         "authorization_code",
		ProtocolMode:     "pop3_pull",
		Identifier:       "mail@example.com",
		Host:             host,
		Port:             port,
		CredentialSecret: "pop-pass",
	}); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestNetworkCredentialValidatorRejectsBadCredential(t *testing.T) {
	addr, stop := startFakePOP3Server(t, "mail@example.com", "pop-pass")
	defer stop()
	host, port := splitHostPort(t, addr)
	validator := NetworkCredentialValidator{Timeout: 2 * time.Second}
	err := validator.Validate(context.Background(), AccountConfig{
		Provider:         "qq",
		AuthMode:         "password",
		ProtocolMode:     "pop3_pull",
		Identifier:       "mail@example.com",
		Host:             host,
		Port:             port,
		CredentialSecret: "wrong-pass",
	})
	if err == nil || !strings.Contains(err.Error(), "POP3 PASS 失败") {
		t.Fatalf("expected POP3 auth failure, got %v", err)
	}
}

func TestNetworkCredentialValidatorSupportsExplicitTLSDialer(t *testing.T) {
	validator := NetworkCredentialValidator{
		TLSDialer: func(_ context.Context, _, _ string, cfg *tls.Config) (*tls.Conn, error) {
			if cfg == nil || cfg.MinVersion != tls.VersionTLS12 {
				t.Fatal("expected TLS config to be passed")
			}
			return nil, fmt.Errorf("tls dial invoked")
		},
	}
	err := validator.Validate(context.Background(), AccountConfig{
		Provider:         "gmail",
		AuthMode:         "app_password",
		ProtocolMode:     "imap_pull",
		Identifier:       "gmail@example.com",
		Host:             "imap.gmail.com",
		Port:             993,
		CredentialSecret: "app-pass",
	})
	if err == nil || !strings.Contains(err.Error(), "tls dial invoked") {
		t.Fatalf("expected TLS dialer error, got %v", err)
	}
}

func startFakeIMAPServer(t *testing.T, wantUser, wantPassword string) (string, func()) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen IMAP: %v", err)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				_, _ = fmt.Fprint(c, "* OK fake imap ready\r\n")
				reader := bufio.NewReader(c)
				line, err := reader.ReadString('\n')
				if err != nil {
					return
				}
				if !strings.Contains(line, quoteIMAPString(wantUser)) || !strings.Contains(line, quoteIMAPString(wantPassword)) {
					_, _ = fmt.Fprint(c, "A001 NO invalid credentials\r\n")
					return
				}
				_, _ = fmt.Fprint(c, "A001 OK LOGIN completed\r\n")
				_, _ = reader.ReadString('\n')
				_, _ = fmt.Fprint(c, "A002 OK LOGOUT completed\r\n")
			}(conn)
		}
	}()
	return ln.Addr().String(), func() {
		_ = ln.Close()
		<-done
	}
}

func startFakePOP3Server(t *testing.T, wantUser, wantPassword string) (string, func()) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen POP3: %v", err)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				reader := bufio.NewReader(c)
				_, _ = fmt.Fprint(c, "+OK fake pop3 ready\r\n")
				userLine, err := reader.ReadString('\n')
				if err != nil {
					return
				}
				if strings.TrimSpace(userLine) != "USER "+wantUser {
					_, _ = fmt.Fprint(c, "-ERR bad user\r\n")
					return
				}
				_, _ = fmt.Fprint(c, "+OK user accepted\r\n")
				passLine, err := reader.ReadString('\n')
				if err != nil {
					return
				}
				if strings.TrimSpace(passLine) != "PASS "+wantPassword {
					_, _ = fmt.Fprint(c, "-ERR invalid pass\r\n")
					return
				}
				_, _ = fmt.Fprint(c, "+OK maildrop ready\r\n")
				_, _ = reader.ReadString('\n')
				_, _ = fmt.Fprint(c, "+OK goodbye\r\n")
			}(conn)
		}
	}()
	return ln.Addr().String(), func() {
		_ = ln.Close()
		<-done
	}
}

func splitHostPort(t *testing.T, addr string) (string, int) {
	t.Helper()
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		t.Fatalf("SplitHostPort(%q): %v", addr, err)
	}
	port, err := net.LookupPort("tcp", portStr)
	if err != nil {
		t.Fatalf("LookupPort(%q): %v", portStr, err)
	}
	return host, port
}
