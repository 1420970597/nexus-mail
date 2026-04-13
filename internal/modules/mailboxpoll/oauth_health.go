package mailboxpoll

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type OAuthToken struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	Provider     string
}

type TokenRefresher interface {
	Refresh(ctx context.Context, token OAuthToken) (OAuthToken, error)
}

type StaticRefresher struct{}

func (StaticRefresher) Refresh(_ context.Context, token OAuthToken) (OAuthToken, error) {
	provider := strings.TrimSpace(strings.ToLower(token.Provider))
	if provider == "" {
		return OAuthToken{}, fmt.Errorf("provider 不能为空")
	}
	if token.RefreshToken == "" {
		return OAuthToken{}, fmt.Errorf("refresh_token 不能为空")
	}
	if provider != "gmail" && provider != "outlook" && provider != "microsoft" {
		return OAuthToken{}, fmt.Errorf("当前 provider 尚未支持 OAuth2 刷新: %s", provider)
	}
	return OAuthToken{
		AccessToken:  "refreshed-token",
		RefreshToken: token.RefreshToken,
		ExpiresAt:    time.Now().UTC().Add(1 * time.Hour),
		Provider:     provider,
	}, nil
}

type HealthStatus struct {
	Provider string
	Mode     string
	Healthy  bool
	Reason   string
}

func EvaluateCredentialHealth(account AccountConfig) HealthStatus {
	mode := strings.TrimSpace(strings.ToLower(account.AuthMode))
	provider := strings.TrimSpace(strings.ToLower(account.Provider))
	if provider == "" {
		return HealthStatus{Healthy: false, Reason: "provider 不能为空"}
	}
	if mode == "" {
		return HealthStatus{Provider: provider, Healthy: false, Reason: "auth_mode 不能为空"}
	}
	switch mode {
	case "oauth2", "authorization_code", "app_password", "bridge_local_credential", "password":
		return HealthStatus{Provider: provider, Mode: mode, Healthy: true, Reason: "配置格式有效"}
	default:
		return HealthStatus{Provider: provider, Mode: mode, Healthy: false, Reason: "未知 auth_mode"}
	}
}
