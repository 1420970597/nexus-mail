package mailboxpoll

import (
	"context"
	"testing"
)

func TestStaticRefresherRejectsUnsupportedProvider(t *testing.T) {
	_, err := (StaticRefresher{}).Refresh(context.Background(), OAuthToken{Provider: "qq", RefreshToken: "rtok"})
	if err == nil {
		t.Fatal("expected unsupported provider error")
	}
}

func TestStaticRefresherRefreshesSupportedProvider(t *testing.T) {
	result, err := (StaticRefresher{}).Refresh(context.Background(), OAuthToken{Provider: "gmail", RefreshToken: "rtok"})
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if result.AccessToken == "" {
		t.Fatal("expected refreshed access token")
	}
}

func TestEvaluateCredentialHealthValidatesMode(t *testing.T) {
	status := EvaluateCredentialHealth(AccountConfig{Provider: "outlook", AuthMode: "oauth2"})
	if !status.Healthy {
		t.Fatalf("expected healthy status, got %#v", status)
	}
	status = EvaluateCredentialHealth(AccountConfig{Provider: "outlook", AuthMode: "unknown"})
	if status.Healthy {
		t.Fatalf("expected unhealthy status for unknown mode, got %#v", status)
	}
}
