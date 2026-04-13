package mailboxpoll

import (
	"context"
	"strings"
	"testing"
)

func TestNormalizeAccountConfigRequiresProviderAndIdentifier(t *testing.T) {
	_, err := NormalizeAccountConfig(AccountConfig{ProtocolMode: "imap_pull"})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestNormalizeAccountConfigDefaultsBridgeHost(t *testing.T) {
	account, err := NormalizeAccountConfig(AccountConfig{Provider: "ProtonMail", Identifier: "acc-1", AuthMode: "bridge_local_credential", ProtocolMode: "imap_pull"})
	if err != nil {
		t.Fatalf("NormalizeAccountConfig() error = %v", err)
	}
	if account.Provider != "proton" {
		t.Fatalf("expected proton provider, got %q", account.Provider)
	}
	if account.BridgeEndpoint != "127.0.0.1:1143" {
		t.Fatalf("expected default bridge endpoint, got %q", account.BridgeEndpoint)
	}
}

func TestLoginIdentityPrefersUsername(t *testing.T) {
	account := AccountConfig{Identifier: "fallback@example.com", Username: " explicit-user "}
	if got := account.LoginIdentity(); got != "explicit-user" {
		t.Fatalf("expected trimmed username, got %q", got)
	}
}

func TestIMAPPollerValidatesNormalizedConfig(t *testing.T) {
	_, err := (IMAPPoller{}).Poll(context.Background(), AccountConfig{Provider: "custom-imap", Identifier: "acc-1", ProtocolMode: "imap_pull"})
	if err == nil || !strings.Contains(err.Error(), "credential_secret") {
		t.Fatalf("expected credential validation error, got %v", err)
	}
}

func TestPOP3PollerRejectsUnknownProtocol(t *testing.T) {
	_, err := (POP3Poller{}).Poll(context.Background(), AccountConfig{Provider: "qq", Identifier: "acc-2", ProtocolMode: "smtp_inbound"})
	if err == nil {
		t.Fatal("expected unsupported protocol error")
	}
}
