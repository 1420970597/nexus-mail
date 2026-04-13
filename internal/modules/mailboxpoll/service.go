package mailboxpoll

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type HealthWriter interface {
	UpdateProviderAccountHealth(ctx context.Context, accountID int64, status, reason, accessToken, refreshToken string, expiresAt *time.Time) error
}

type SyncService struct {
	Refresher TokenRefresher
	Writer    HealthWriter
	Resolver  SecretResolver
	Validator CredentialValidator
	NowFn     func() time.Time
}

func (s SyncService) SyncAccount(ctx context.Context, account AccountConfig) error {
	if s.Writer == nil {
		return fmt.Errorf("health writer 未配置")
	}
	normalized, err := NormalizeAccountConfig(account)
	if err != nil {
		return s.Writer.UpdateProviderAccountHealth(ctx, account.AccountID, "unhealthy", err.Error(), "", "", nil)
	}
	status := EvaluateCredentialHealth(normalized)
	if !status.Healthy {
		return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", status.Reason, "", "", nil)
	}
	if normalized.AuthMode == "oauth2" {
		if s.Refresher == nil {
			return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", "oauth2 refresher 未配置", "", "", nil)
		}
		token, err := s.Refresher.Refresh(ctx, OAuthToken{
			Provider:     normalized.Provider,
			AccessToken:  normalized.AccessToken,
			RefreshToken: normalized.RefreshToken,
		})
		if err != nil {
			return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", err.Error(), "", "", nil)
		}
		return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "healthy", "OAuth2 refresh succeeded", token.AccessToken, token.RefreshToken, &token.ExpiresAt)
	}
	if requiresCredentialValidation(normalized.AuthMode) {
		if normalized.CredentialSecret == "" {
			if normalized.SecretRef == "" {
				return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", "credential_secret / secret_ref 缺失", "", "", nil)
			}
			resolver := s.Resolver
			if resolver == nil {
				resolver = MultiSecretResolver{}
			}
			secret, err := resolver.Resolve(ctx, normalized.SecretRef)
			if err != nil {
				return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", err.Error(), "", "", normalized.TokenExpiresAt)
			}
			normalized.CredentialSecret = secret
		}
		validator := s.Validator
		if validator == nil {
			validator = NetworkCredentialValidator{}
		}
		if err := validator.Validate(ctx, normalized); err != nil {
			return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", err.Error(), "", "", normalized.TokenExpiresAt)
		}
	}
	reason := status.Reason
	if normalized.AuthMode == "bridge_local_credential" {
		endpoint, err := ValidateBridgeEndpoint(normalized)
		if err != nil {
			return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", err.Error(), "", "", nil)
		}
		reason = fmt.Sprintf("bridge ready: %s", endpoint)
	}
	if requiresCredentialValidation(normalized.AuthMode) {
		reason = fmt.Sprintf("%s 凭证登录校验成功", strings.ToUpper(strings.TrimSuffix(normalized.ProtocolMode, "_pull")))
	}
	if normalized.TokenExpiresAt != nil && normalized.TokenExpiresAt.Before(time.Now().UTC()) && strings.EqualFold(normalized.AuthMode, "app_password") {
		reason = "App Password 模式不依赖 token 过期时间"
	}
	return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "healthy", reason, "", "", normalized.TokenExpiresAt)
}

func requiresCredentialValidation(authMode string) bool {
	switch strings.TrimSpace(strings.ToLower(authMode)) {
	case "authorization_code", "app_password", "password", "bridge_local_credential":
		return true
	default:
		return false
	}
}
