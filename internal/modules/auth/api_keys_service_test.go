package auth

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	redis "github.com/redis/go-redis/v9"
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
	updatedWhitelistID   int64
	updatedWhitelistUID  int64
	updatedWhitelist     []string
	updateWhitelistItem  APIKey
	updateWhitelistErr   error
	validatedKey         string
	validatedItem        APIKey
	validateErr          error
	auditAuthErr         error
	lastAuditEvent       APIKeyAuthAuditEvent
	lastAdminAuditFilter *AdminAuditFilter
	users                []User
	listUsersFn          func(context.Context) ([]User, error)
	rateLimitExceeded    bool
	rateLimitErr         error
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

func (s *apiKeyStubRepo) UpdateAPIKeyWhitelist(_ context.Context, userID, id int64, whitelist []string) (APIKey, error) {
	s.updatedWhitelistUID = userID
	s.updatedWhitelistID = id
	s.updatedWhitelist = whitelist
	if s.updateWhitelistErr != nil {
		return APIKey{}, s.updateWhitelistErr
	}
	return s.updateWhitelistItem, nil
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

func (s *apiKeyStubRepo) Allow(context.Context, string, int, time.Duration) (bool, error) {
	if s.rateLimitErr != nil {
		return false, s.rateLimitErr
	}
	return !s.rateLimitExceeded, nil
}

func (s *apiKeyStubRepo) ListAllUsers(ctx context.Context) ([]User, error) {
	if s.listUsersFn != nil {
		return s.listUsersFn(ctx)
	}
	return s.users, nil
}

func TestRedisAPIKeyRateLimiterAllowsLimitThenBlocksAndResetsByWindow(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	limiter := NewRedisAPIKeyRateLimiter(client, "test:nexus:api-key")
	ctx := context.Background()

	for i := 0; i < 2; i++ {
		allowed, err := limiter.Allow(ctx, "nmx_preview", 2, time.Minute)
		if err != nil {
			t.Fatalf("Allow(%d) error = %v", i+1, err)
		}
		if !allowed {
			t.Fatalf("Allow(%d) expected true", i+1)
		}
	}

	allowed, err := limiter.Allow(ctx, "nmx_preview", 2, time.Minute)
	if err != nil {
		t.Fatalf("Allow over limit error = %v", err)
	}
	if allowed {
		t.Fatal("expected third request in same window to be rate limited")
	}

	server.FastForward(time.Minute)
	allowed, err = limiter.Allow(ctx, "nmx_preview", 2, time.Minute)
	if err != nil {
		t.Fatalf("Allow after reset error = %v", err)
	}
	if !allowed {
		t.Fatal("expected request after Redis key expiry to be allowed")
	}
}

func TestRedisAPIKeyRateLimiterFailsOpenWhenClientMissingOrInvalidLimit(t *testing.T) {
	limiter := NewRedisAPIKeyRateLimiter(nil, "test:nexus:api-key")
	allowed, err := limiter.Allow(context.Background(), "nmx_preview", 0, time.Minute)
	if err != nil {
		t.Fatalf("Allow with invalid limit error = %v", err)
	}
	if !allowed {
		t.Fatal("expected invalid limiter configuration to fail open")
	}
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

func TestCreateAPIKeyRejectsTooManyWhitelistEntries(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	whitelist := make([]string, 0, maxAPIKeyWhitelistEntries+1)
	for i := 0; i <= maxAPIKeyWhitelistEntries; i++ {
		whitelist = append(whitelist, fmt.Sprintf("10.0.0.%d", i+1))
	}
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "x", Whitelist: whitelist})
	if err == nil || err.Error() != "IP 白名单最多支持 64 条" {
		t.Fatalf("expected whitelist limit error, got %v", err)
	}
}

func TestCreateAPIKeyDefaultsEmptyScopesToActivationRead(t *testing.T) {
	repo := &apiKeyStubRepo{created: APIKey{ID: 1, Name: "默认密钥"}, plaintext: "nmx_test"}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 7, CreateAPIKeyInput{Name: "默认密钥"})
	if err != nil {
		t.Fatalf("CreateAPIKey() error = %v", err)
	}
	if len(repo.createdScopes) != 1 || repo.createdScopes[0] != "activation:read" {
		t.Fatalf("expected default activation:read scope, got %#v", repo.createdScopes)
	}
}

func TestCreateAPIKeyRejectsOnlyBlankScopes(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "x", Scopes: []string{" ", "\t"}})
	if err == nil || err.Error() != "API Key scopes 不能全为空" {
		t.Fatalf("expected blank scopes validation error, got %v", err)
	}
}

func TestCreateAPIKeyRejectsEmptyName(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, _, err := service.CreateAPIKey(context.Background(), 1, CreateAPIKeyInput{Name: "   "})
	if err == nil {
		t.Fatal("expected empty name validation error")
	}
}

func TestUpdateAPIKeyWhitelistNormalizesPayload(t *testing.T) {
	repo := &apiKeyStubRepo{updateWhitelistItem: APIKey{ID: 12, Name: "runtime", Whitelist: []string{"10.0.0.0/24", "172.18.0.1"}, Status: "active"}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	item, err := service.UpdateAPIKeyWhitelist(context.Background(), 7, 12, UpdateAPIKeyWhitelistInput{Whitelist: []string{" 172.18.0.1 ", "10.0.0.8/24", "172.18.0.1"}})
	if err != nil {
		t.Fatalf("UpdateAPIKeyWhitelist() error = %v", err)
	}
	if item.ID != 12 {
		t.Fatalf("unexpected item: %#v", item)
	}
	if repo.updatedWhitelistUID != 7 || repo.updatedWhitelistID != 12 {
		t.Fatalf("unexpected update identifiers: %#v", repo)
	}
	if len(repo.updatedWhitelist) != 2 || repo.updatedWhitelist[0] != "10.0.0.0/24" || repo.updatedWhitelist[1] != "172.18.0.1" {
		t.Fatalf("unexpected normalized whitelist: %#v", repo.updatedWhitelist)
	}
}

func TestUpdateAPIKeyWhitelistRejectsInvalidIDAndWhitelist(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	if _, err := service.UpdateAPIKeyWhitelist(context.Background(), 1, 0, UpdateAPIKeyWhitelistInput{Whitelist: []string{"127.0.0.1"}}); err == nil || err.Error() != "API Key ID 无效" {
		t.Fatalf("expected invalid id error, got %v", err)
	}
	if _, err := service.UpdateAPIKeyWhitelist(context.Background(), 1, 1, UpdateAPIKeyWhitelistInput{Whitelist: []string{"not-an-ip"}}); err == nil || err.Error() != "IP 白名单仅支持合法 IP 或 CIDR" {
		t.Fatalf("expected invalid whitelist error, got %v", err)
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

func TestAuthenticateAPIKeyRejectsWhenRuntimeRateLimitExceededAndRecordsAudit(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "cron", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.1"}, Status: "active"}, rateLimitExceeded: true}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	service.SetAPIKeyRateLimiter(repo)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if err == nil || err.Error() != "API Key 请求过于频繁" {
		t.Fatalf("expected rate limit rejection, got %v", err)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeDeniedRateLimit {
		t.Fatalf("expected denied-rate-limit audit, got %#v", repo.lastAuditEvent)
	}
}

func TestAuthenticateAPIKeyRecordsSanitizedAuditWhenRateLimiterBackendFails(t *testing.T) {
	repo := &apiKeyStubRepo{validatedItem: APIKey{ID: 9, UserID: 7, Name: "cron", KeyPreview: "nmx_safe...test", Scopes: []string{"activation:read"}, Whitelist: []string{"127.0.0.1"}, Status: "active"}, rateLimitErr: errors.New("dial tcp redis.internal:6379: connection refused")}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	service.SetAPIKeyRateLimiter(repo)
	_, _, err := service.AuthenticateAPIKey(context.Background(), "nmx_key", "127.0.0.1", "activation:read")
	if !errors.Is(err, ErrAPIKeyRateLimiterFailed) {
		t.Fatalf("expected sanitized rate limiter failure, got %v", err)
	}
	if repo.lastAuditEvent.Outcome != APIKeyAuthOutcomeRateLimitBackendError {
		t.Fatalf("expected rate-limit-backend-error audit, got %#v", repo.lastAuditEvent)
	}
	if repo.lastAuditEvent.Note != ErrAPIKeyRateLimiterFailed.Error() {
		t.Fatalf("expected sanitized note, got %q", repo.lastAuditEvent.Note)
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
	if err == nil || err.Error() != "actor_type 仅支持 user、system 或 admin" {
		t.Fatalf("expected invalid actor_type error, got %v", err)
	}
}

func TestListAdminAuditAcceptsRateLimitDenialAction(t *testing.T) {
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 2, Action: "denied_rate_limit"}}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	items, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{Action: " DENIED_RATE_LIMIT "})
	if err != nil {
		t.Fatalf("ListAdminAudit() error = %v", err)
	}
	if len(items) != 1 || items[0].Action != "denied_rate_limit" {
		t.Fatalf("unexpected items: %#v", items)
	}
	if repo.lastAdminAuditFilter == nil || repo.lastAdminAuditFilter.Action != "denied_rate_limit" {
		t.Fatalf("expected denied_rate_limit filter to be forwarded, got %#v", repo.lastAdminAuditFilter)
	}
}

func TestListAdminAuditAcceptsRateLimitBackendErrorAction(t *testing.T) {
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 4, Action: "rate_limit_backend_error"}}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	items, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{Action: " RATE_LIMIT_BACKEND_ERROR "})
	if err != nil {
		t.Fatalf("ListAdminAudit() error = %v", err)
	}
	if len(items) != 1 || items[0].Action != "rate_limit_backend_error" {
		t.Fatalf("unexpected items: %#v", items)
	}
	if repo.lastAdminAuditFilter == nil || repo.lastAdminAuditFilter.Action != "rate_limit_backend_error" {
		t.Fatalf("expected rate_limit_backend_error filter to be forwarded, got %#v", repo.lastAdminAuditFilter)
	}
}

func TestListAdminAuditAcceptsFinanceOperationActions(t *testing.T) {
	repo := &apiKeyStubRepo{audit: []APIKeyAuditEntry{{ID: 3, Action: "resolve_dispute"}}}
	service := NewService(nil, repo, "secret", time.Hour, 24*time.Hour)
	for _, action := range []string{"admin_wallet_adjustment", "update_supplier_cost_profile", "resolve_dispute"} {
		items, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{Action: " " + action + " "})
		if err != nil {
			t.Fatalf("ListAdminAudit(%s) error = %v", action, err)
		}
		if len(items) != 1 {
			t.Fatalf("expected audit items for %s, got %#v", action, items)
		}
		if repo.lastAdminAuditFilter == nil || repo.lastAdminAuditFilter.Action != action {
			t.Fatalf("expected %s filter to be forwarded, got %#v", action, repo.lastAdminAuditFilter)
		}
	}
}

func TestListAdminAuditRejectsUnsupportedAction(t *testing.T) {
	service := NewService(nil, &apiKeyStubRepo{}, "secret", time.Hour, 24*time.Hour)
	_, err := service.ListAdminAudit(context.Background(), AdminAuditFilter{Action: "drop_table"})
	if err == nil || err.Error() != "action 不受支持" {
		t.Fatalf("expected invalid action error, got %v", err)
	}
}
