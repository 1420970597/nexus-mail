package auth

import (
	"context"
	"fmt"
	"strings"
)

func (s *Service) CreateAPIKey(ctx context.Context, userID int64, input CreateAPIKeyInput) (APIKey, string, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return APIKey{}, "", fmt.Errorf("API Key 存储尚未初始化")
	}
	input.Name = strings.TrimSpace(input.Name)
	scopes, err := validateScopes(input.Scopes)
	if err != nil {
		return APIKey{}, "", err
	}
	input.Scopes = scopes
	whitelist, err := normalizeWhitelist(input.Whitelist)
	if err != nil {
		return APIKey{}, "", err
	}
	input.Whitelist = whitelist
	if input.Name == "" {
		return APIKey{}, "", fmt.Errorf("API Key 名称不能为空")
	}
	return repo.CreateAPIKey(ctx, userID, input.Name, input.Scopes, input.Whitelist)
}

func (s *Service) ListAPIKeys(ctx context.Context, userID int64) ([]APIKey, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return nil, fmt.Errorf("API Key 存储尚未初始化")
	}
	return repo.ListAPIKeys(ctx, userID)
}

func (s *Service) UpdateAPIKeyWhitelist(ctx context.Context, userID, id int64, input UpdateAPIKeyWhitelistInput) (APIKey, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return APIKey{}, fmt.Errorf("API Key 存储尚未初始化")
	}
	if id <= 0 {
		return APIKey{}, fmt.Errorf("API Key ID 无效")
	}
	whitelist, err := normalizeWhitelist(input.Whitelist)
	if err != nil {
		return APIKey{}, err
	}
	return repo.UpdateAPIKeyWhitelist(ctx, userID, id, whitelist)
}

func (s *Service) RevokeAPIKey(ctx context.Context, userID, id int64) (APIKey, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return APIKey{}, fmt.Errorf("API Key 存储尚未初始化")
	}
	if id <= 0 {
		return APIKey{}, fmt.Errorf("API Key ID 无效")
	}
	return repo.RevokeAPIKey(ctx, userID, id)
}

func (s *Service) ListAPIKeyAudit(ctx context.Context, userID int64) ([]APIKeyAuditEntry, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return nil, fmt.Errorf("API Key 存储尚未初始化")
	}
	return repo.ListAPIKeyAudit(ctx, userID)
}

func (s *Service) ListAdminAudit(ctx context.Context, filter AdminAuditFilter) ([]APIKeyAuditEntry, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return nil, fmt.Errorf("API Key 存储尚未初始化")
	}
	filter.ActorType = strings.TrimSpace(strings.ToLower(filter.ActorType))
	filter.Action = strings.TrimSpace(strings.ToLower(filter.Action))
	if filter.UserID != nil && *filter.UserID <= 0 {
		return nil, fmt.Errorf("user_id 无效")
	}
	if filter.APIKeyID != nil && *filter.APIKeyID <= 0 {
		return nil, fmt.Errorf("api_key_id 无效")
	}
	if filter.ActorType != "" {
		switch filter.ActorType {
		case "user", "system", "admin":
		default:
			return nil, fmt.Errorf("actor_type 仅支持 user、system 或 admin")
		}
	}
	if filter.Action != "" {
		switch filter.Action {
		case "create", "update_whitelist", "update_risk_rule", "admin_wallet_adjustment", "update_supplier_cost_profile", "settle_supplier_pending", "resolve_dispute", "revoke", "success", "denied_invalid", "denied_scope", "denied_whitelist", "denied_rate_limit", "rate_limit_backend_error":
		default:
			return nil, fmt.Errorf("action 不受支持")
		}
	}
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}
	return repo.ListAdminAudit(ctx, filter)
}
