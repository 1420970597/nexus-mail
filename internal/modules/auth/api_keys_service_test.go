package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

type apiKeyStubRepo struct {
	items                []APIKey
	audit                []APIKeyAuditEntry
	created              APIKey
	plaintext            string
	createErr            error
	revokeItem           APIKey
	revokeErr            error
	createdName          string
	createdUID           int64
	createdScopes        []string
	createdWhitelist     []string
	revokedID            int64
	revokedUID           int64
	validatedKey         string
	validatedItem        APIKey
	validateErr          error
	auditAuthErr         error
	lastAuditEvent       APIKeyAuthAuditEvent
	lastAdminAuditFilter *AdminAuditFilter
	users                []User
	listUsersFn          func(context.Context) ([]User, error)
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

func (s *apiKeyStubRepo) ListAdminAudit(_ context.Context, filter AdminAuditFilter) ([]APIKeyAuditEntry, error) {
	copyFilter := filter
	s.lastAdminAuditFilter = &copyFilter
	return s.audit, nil
}

func (s *apiKeyStubRepo) ValidateAPIKey(_ context.Context, key string) (APIKey, error) {
	s.validatedKey = key
	if s.validateErr != nil {
		return APIKey{}, s.validateErr
	}
	return s.validatedItem, nil
}

func (s *apiKeyStubRepo) RecordAPIKeyAuthAudit(_ context.Context, event APIKeyAuthAuditEvent) error {
	s.lastAuditEvent = event
	return s.auditAuthErr
}

func (s *apiKeyStubRepo) ListAllUsers(ctx context.Context) ([]User, error) {
	if s.listUsersFn != nil {
		return s.listUsersFn(ctx)
	}
	return s.users, nil
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

func TestAuthenticateAPIKeyAcceptsValidWhitelistedScope(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "cron", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.1"}, Status: "active"}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	user, key, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if err != nil {
		t.Fatalf("AuthenticateAPIKey() error = %v", err)
	}
	if repo.validatedKey != "nmx_key" {
		t.Fatalf("expected repo to validate exact key, got %q", repo.validatedKey)
	}
	if user.ID != 7 || user.Role != RoleUser {
		t.Fatalf("unexpected user: %#v", user)
	}
	if key.ID != 9 {
		t.Fatalf("unexpected key: %#v", key)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeSuccess {
		t.Fatalf("expected success audit, got %#v", repo.lastAuditEvent)
	}
}

func TestAuthenticateAPIKeyRejectsMissingScopeAndRecordsAudit(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "cron", Scopes: []string{"activation:read"}, Status: "active"}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "finance:write")
	if err == nil || err.Error() != "API Key 无权限访问该接口" {
		t.Fatalf("expected scope rejection, got %v", err)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeDeniedScope {
		t.Fatalf("expected denied-scope audit, got %#v", repo.lastAuditEvent)
	}
}

func TestAuthenticateAPIKeyRejectsNonWhitelistedIPAndRecordsAudit(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "cron", Scopes: []string{"activation:read"}, Whitelist: []string{"10.0.0.0/24"}, Status: "active"}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if err == nil || err.Error() != "当前 IP 不在 API Key 白名单内" {
		t.Fatalf("expected whitelist rejection, got %v", err)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeDeniedWhitelist {
		t.Fatalf("expected denied-whitelist audit, got %#v", repo.lastAuditEvent)
	}
}

func TestAuthenticateAPIKeyAcceptsIPv4AddressAgainstIPv4CIDRStoredAsCanonicalNetwork(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 10, UserID: 7, Name: "cidr", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.0/24"}, Status: "active"}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if err != nil {
		t.Fatalf("expected IPv4 CIDR whitelist to allow 127.0.0.1, got %v", err)
	}
}

func TestAuthenticateAPIKeyPropagatesValidationFailureAndRecordsAudit(t *testing.T) {
	repo := &apiKeyStubRepo{validateErr: errors.New("API Key 无效")}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if err == nil || err.Error() != "API Key 无效" {
		t.Fatalf("expected validation failure, got %v", err)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeDeniedInvalid {
		t.Fatalf("expected invalid-key audit, got %#v", repo.lastAuditEvent)
	}
}

func TestListAdminAuditNormalizesFilterAndCapsLimit(t *testing.T) {
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 1, Action: "success"}}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	userID := int64(7)
	apiKeyID := int64(11)
	items, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{
		UserID:    &userID,
		APIKeyID:  &apiKeyID,
		ActorType: " SYSTEM ",
		Action:    " SUCCESS ",
		Limit:     999,
	})
	if err != nil {
		t.Fatalf("ListAdminAudit() error = %v", err)
	}
	if len(items) != 1 || items[0].ID != 1 {
		t.Fatalf("unexpected items: %#v", items)
	}
	if repo.lastAdminAuditFilter == nil {
		t.Fatal("expected repo filter to be captured")
	}
	if repo.lastAdminAuditFilter.ActorType != "system" || repo.lastAdminAuditFilter.Action != "success" || repo.lastAdminAuditFilter.Limit != 200 {
		t.Fatalf("unexpected normalized filter: %#v", repo.lastAdminAuditFilter)
	}
}

func TestListAdminAuditRejectsUnsupportedActorType(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{ActorType: "robot"})
	if err == nil || err.Error() != "actor_type 仅支持 user 或 system" {
		t.Fatalf("expected invalid actor_type error, got %v", err)
	}
}

func TestListAdminAuditRejectsUnsupportedAction(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{Action: "drop_table"})
	if err == nil || err.Error() != "action 不受支持" {
		t.Fatalf("expected invalid action error, got %v", err)
	}
}
