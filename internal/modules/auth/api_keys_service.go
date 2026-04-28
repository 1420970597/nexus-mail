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
