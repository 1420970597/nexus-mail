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
	reason := status.Reason
	if normalized.AuthMode == "bridge_local_credential" {
		endpoint, err := ValidateBridgeEndpoint(normalized)
		if err != nil {
			return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "unhealthy", err.Error(), "", "", nil)
		}
		reason = fmt.Sprintf("bridge ready: %s", endpoint)
	}
	if normalized.TokenExpiresAt != nil && normalized.TokenExpiresAt.Before(time.Now().UTC()) && strings.EqualFold(normalized.AuthMode, "app_password") {
		reason = "App Password 模式不依赖 token 过期时间"
	}
	return s.Writer.UpdateProviderAccountHealth(ctx, normalized.AccountID, "healthy", reason, "", "", normalized.TokenExpiresAt)
}
