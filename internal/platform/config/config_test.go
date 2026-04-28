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
	if cfg.MailParseQueue != "mail.parse.raw" {
		t.Fatalf("expected default parse queue, got %s", cfg.MailParseQueue)
	}
	if cfg.RedisPoolSize != 20 {
		t.Fatalf("expected default redis pool size 20, got %d", cfg.RedisPoolSize)
	}
	if cfg.RedisDialTimeout <= 0 || cfg.RedisReadTimeout <= 0 || cfg.RedisWriteTimeout <= 0 || cfg.APIKeyRateLimitTimeout <= 0 {
		t.Fatalf("expected positive redis/API key timeouts, got %#v", cfg)
	}
	if cfg.MinIOEndpoint != "minio:9000" {
		t.Fatalf("expected default minio endpoint, got %s", cfg.MinIOEndpoint)
	}
	if cfg.MinIORawBucket != "nexus-mail-raw" {
		t.Fatalf("expected default minio raw bucket, got %s", cfg.MinIORawBucket)
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

func TestLoadAcceptsRedisOperationalOverrides(t *testing.T) {
	t.Setenv("APP_PORT", "8080")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("REDIS_URL", "redis://example")
	t.Setenv("JWT_SECRET", "super-secret-value")
	t.Setenv("REDIS_POOL_SIZE", "32")
	t.Setenv("REDIS_DIAL_TIMEOUT_MS", "700")
	t.Setenv("REDIS_READ_TIMEOUT_MS", "300")
	t.Setenv("REDIS_WRITE_TIMEOUT_MS", "350")
	t.Setenv("API_KEY_RATE_LIMIT_TIMEOUT_MS", "80")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load, got error: %v", err)
	}
	if cfg.RedisPoolSize != 32 || cfg.RedisDialTimeout.Milliseconds() != 700 || cfg.RedisReadTimeout.Milliseconds() != 300 || cfg.RedisWriteTimeout.Milliseconds() != 350 || cfg.APIKeyRateLimitTimeout.Milliseconds() != 80 {
		t.Fatalf("unexpected redis operational overrides: %#v", cfg)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
