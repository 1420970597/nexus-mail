package mailingest

import "testing"

func TestExtractResultPrefersCode(t *testing.T) {
	type_, value := ExtractResult([]byte("Subject: code\r\n\r\nYour OTP is 654321. Visit https://example.com later"))
	if type_ != "code" || value != "654321" {
		t.Fatalf("expected code 654321, got %q %q", type_, value)
	}
}

func TestExtractResultFallsBackToLink(t *testing.T) {
	type_, value := ExtractResult([]byte("Click here: https://example.com/magic-login?token=abc"))
	if type_ != "link" || value != "https://example.com/magic-login?token=abc" {
		t.Fatalf("expected link result, got %q %q", type_, value)
	}
}
