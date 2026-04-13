package config

import (
	"os"
	"testing"
)

func TestLoadValidatesRequiredConfig(t *testing.T) {
	t.Setenv("APP_PORT", "8080")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("REDIS_URL", "redis://example")
	t.Setenv("JWT_SECRET", "super-secret-value")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load, got error: %v", err)
	}
	if cfg.AppPort != "8080" {
		t.Fatalf("expected app port 8080, got %s", cfg.AppPort)
	}
	if cfg.MailIngestSpoolDir != "/tmp/nexus-mail-ingest" {
		t.Fatalf("expected default spool dir, got %s", cfg.MailIngestSpoolDir)
	}
}

func TestLoadRejectsWeakSecret(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("REDIS_URL", "redis://example")
	t.Setenv("JWT_SECRET", "change-me")

	_, err := Load()
	if err == nil {
		t.Fatal("expected validation error for weak secret")
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
