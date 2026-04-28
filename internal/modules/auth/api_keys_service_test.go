package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

type apiKeyStubRepo struct {
	items            []APIKey
	audit            []APIKeyAuditEntry
	created          APIKey
	plaintext        string
	createErr        error
	revokeItem       APIKey
	revokeErr        error
	createdName      string
	createdUID       int64
	createdScopes    []string
	createdWhitelist []string
	revokedID        int64
	revokedUID       int64
}

func (s *apiKeyStubRepo) CreateAPIKey(_ context.Context, userID int64, name string, scopes []string, whitelist []string) (APIKey, string, error) {
	s.createdUID = userID
	s.createdName = name
	s.createdScopes = scopes
	s.createdWhitelist = whitelist
	if s.createErr != nil {
		return APIKey{}, "", s.createErr
	}
	return s.created, s.plaintext, nil
}

func (s *apiKeyStubRepo) ListAPIKeys(context.Context, int64) ([]APIKey, error) {
	return s.items, nil
}

func (s *apiKeyStubRepo) RevokeAPIKey(_ context.Context, userID, id int64) (APIKey, error) {
	s.revokedUID = userID
	s.revokedID = id
	if s.revokeErr != nil {
		return APIKey{}, s.revokeErr
	}
	return s.revokeItem, nil
}

func (s *apiKeyStubRepo) ListAPIKeyAudit(context.Context, int64) ([]APIKeyAuditEntry, error) {
	return s.audit, nil
}

func TestCreateAPIKeyNormalizesNameScopesAndWhitelist(t *testing.T) {
	repo := &apiKeyStubRepo{created: APIKey{ID: 1, Name: "默认密钥"}, plaintext: "nmx_test"}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 7, CreateAPIKeyInput{
		Name:      "  默认密钥  ",
		Scopes:    []string{" activation:read ", "activation:read", "finance:write"},
		Whitelist: []string{" 127.0.0.1 ", "127.0.0.1", "10.0.0.8/24"},
	})
	if err != nil {
		t.Fatalf("CreateAPIKey() error = %v", err)
	}
	if repo.createdUID != 7 || repo.createdName != "默认密钥" {
		t.Fatalf("unexpected create payload: %#v", repo)
	}
	if len(repo.createdScopes) != 2 || repo.createdScopes[0] != "activation:read" || repo.createdScopes[1] != "finance:write" {
		t.Fatalf("unexpected scopes: %#v", repo.createdScopes)
	}
	if len(repo.createdWhitelist) != 2 || repo.createdWhitelist[0] != "10.0.0.0/24" || repo.createdWhitelist[1] != "127.0.0.1" {
		t.Fatalf("unexpected whitelist: %#v", repo.createdWhitelist)
	}
}

func TestCreateAPIKeyRejectsUnknownScope(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "x", Scopes: []string{"unknown:scope"}})
	if err == nil || err.Error() != "存在不支持的 scope: unknown:scope" {
		t.Fatalf("expected invalid scope error, got %v", err)
	}
}

func TestCreateAPIKeyRejectsInvalidWhitelist(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "x", Whitelist: []string{"not-an-ip"}})
	if err == nil || err.Error() != "IP 白名单仅支持合法 IP 或 CIDR" {
		t.Fatalf("expected invalid whitelist error, got %v", err)
	}
}

func TestCreateAPIKeyRejectsEmptyName(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "   "})
	if err == nil {
		t.Fatal("expected empty name validation error")
	}
}

func TestRevokeAPIKeyRejectsInvalidID(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, err := service.RevokeAPIKey(context.Background(), 1, 0)
	if err == nil {
		t.Fatal("expected invalid id error")
	}
}

func TestCreateAPIKeyReturnsRepositoryError(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{createErr: errors.New("boom")}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "x"})
	if err == nil || err.Error() != "boom" {
		t.Fatalf("expected repo error, got %v", err)
	}
}
