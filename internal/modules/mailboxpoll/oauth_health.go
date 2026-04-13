package mailboxpoll

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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

type ProviderOAuthConfig struct {
	ClientID     string
	ClientSecret string
	TokenURL     string
	Scope        string
}

type HTTPOAuthRefresher struct {
	Client      *http.Client
	ProviderCfg map[string]ProviderOAuthConfig
}

func NewHTTPOAuthRefresher(providerCfg map[string]ProviderOAuthConfig) HTTPOAuthRefresher {
	return HTTPOAuthRefresher{
		Client:      &http.Client{Timeout: 10 * time.Second},
		ProviderCfg: providerCfg,
	}
}

func (r HTTPOAuthRefresher) Refresh(ctx context.Context, token OAuthToken) (OAuthToken, error) {
	provider := strings.TrimSpace(strings.ToLower(token.Provider))
	if provider == "outlook" {
		provider = "microsoft"
	}
	if provider == "" {
		return OAuthToken{}, fmt.Errorf("provider 不能为空")
	}
	if token.RefreshToken == "" {
		return OAuthToken{}, fmt.Errorf("refresh_token 不能为空")
	}
	cfg, ok := r.ProviderCfg[provider]
	if !ok {
		return OAuthToken{}, fmt.Errorf("当前 provider 尚未支持 OAuth2 刷新: %s", provider)
	}
	if cfg.ClientID == "" || cfg.ClientSecret == "" || cfg.TokenURL == "" {
		return OAuthToken{}, fmt.Errorf("provider %s OAuth2 配置不完整", provider)
	}
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("refresh_token", token.RefreshToken)
	form.Set("grant_type", "refresh_token")
	if cfg.Scope != "" {
		form.Set("scope", cfg.Scope)
	}
	client := r.Client
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return OAuthToken{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		return OAuthToken{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return OAuthToken{}, fmt.Errorf("oauth refresh failed: status=%d", resp.StatusCode)
	}
	var payload struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		TokenType    string `json:"token_type"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return OAuthToken{}, fmt.Errorf("decode refresh response: %w", err)
	}
	if payload.AccessToken == "" {
		return OAuthToken{}, fmt.Errorf("oauth refresh missing access_token")
	}
	refreshToken := token.RefreshToken
	if payload.RefreshToken != "" {
		refreshToken = payload.RefreshToken
	}
	expiresAt := time.Now().UTC().Add(1 * time.Hour)
	if payload.ExpiresIn > 0 {
		expiresAt = time.Now().UTC().Add(time.Duration(payload.ExpiresIn) * time.Second)
	}
	return OAuthToken{
		AccessToken:  payload.AccessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
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
	if provider == "outlook" {
		provider = "microsoft"
	}
	if provider == "" {
		return HealthStatus{Healthy: false, Reason: "provider 不能为空"}
	}
	if mode == "" {
		return HealthStatus{Provider: provider, Healthy: false, Reason: "auth_mode 不能为空"}
	}
	switch mode {
	case "oauth2":
		if strings.TrimSpace(account.RefreshToken) == "" {
			return HealthStatus{Provider: provider, Mode: mode, Healthy: false, Reason: "refresh_token 缺失"}
		}
		return HealthStatus{Provider: provider, Mode: mode, Healthy: true, Reason: "OAuth2 refresh_token 可用"}
	case "authorization_code", "app_password", "password":
		return HealthStatus{Provider: provider, Mode: mode, Healthy: true, Reason: "账号凭证配置格式有效"}
	case "bridge_local_credential":
		if provider != "proton" {
			return HealthStatus{Provider: provider, Mode: mode, Healthy: false, Reason: "bridge 仅支持 proton"}
		}
		if _, err := ValidateBridgeEndpoint(account); err != nil {
			return HealthStatus{Provider: provider, Mode: mode, Healthy: false, Reason: err.Error()}
		}
		return HealthStatus{Provider: provider, Mode: mode, Healthy: true, Reason: "Proton Bridge 配置有效"}
	default:
		return HealthStatus{Provider: provider, Mode: mode, Healthy: false, Reason: "未知 auth_mode"}
	}
}
