package auth

import (
	"testing"
	"time"
)

func TestAuthRequiredParsesTrimmedBearerTokenValue(t *testing.T) {
	service := NewService(nil, nil, "super-secret-value", 3600*time.Second, 7200*time.Second)
	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	accessToken, err := service.issueToken(User{ID: 7, Email: "supplier@nexus-mail.local", Role: RoleSupplier}, sessionID)
	if err != nil {
		t.Fatalf("issue access token: %v", err)
	}
	parsed, _, err := service.parseTokenClaimsByType(nil, accessToken, "access")
	if err != nil {
		t.Fatalf("parse raw token: %v", err)
	}
	if parsed.Email != "supplier@nexus-mail.local" {
		t.Fatalf("unexpected raw parse result: %#v", parsed)
	}

	trimmed := "Bearer " + accessToken
	parsed2, _, err := service.parseTokenClaimsByType(nil, trimmed[len("Bearer "):], "access")
	if err != nil {
		t.Fatalf("parse trimmed token: %v", err)
	}
	if parsed2.Email != "supplier@nexus-mail.local" {
		t.Fatalf("unexpected trimmed parse result: %#v", parsed2)
	}
}
