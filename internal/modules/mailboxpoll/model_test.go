package mailboxpoll

import (
	"context"
	"testing"
)

func TestNormalizeAccountConfigRequiresProviderAndIdentifier(t *testing.T) {
	_, err := NormalizeAccountConfig(AccountConfig{ProtocolMode: "imap_pull"})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestIMAPPollerReturnsNormalizedResult(t *testing.T) {
	result, err := (IMAPPoller{}).Poll(context.Background(), AccountConfig{Provider: "Outlook", Identifier: "acc-1", ProtocolMode: "imap_pull"})
	if err != nil {
		t.Fatalf("Poll() error = %v", err)
	}
	if result.Provider != "outlook" {
		t.Fatalf("expected normalized provider outlook, got %q", result.Provider)
	}
}

func TestPOP3PollerRejectsUnknownProtocol(t *testing.T) {
	_, err := (POP3Poller{}).Poll(context.Background(), AccountConfig{Provider: "qq", Identifier: "acc-2", ProtocolMode: "smtp_inbound"})
	if err == nil {
		t.Fatal("expected unsupported protocol error")
	}
}
