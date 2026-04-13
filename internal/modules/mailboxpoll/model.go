package mailboxpoll

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type AccountConfig struct {
	AccountID      int64
	Provider       string
	SourceType     string
	AuthMode       string
	ProtocolMode   string
	Identifier     string
	Host           string
	Port           int
	Username       string
	SecretRef      string
	AccessToken    string
	RefreshToken   string
	TokenExpiresAt *time.Time
	BridgeEndpoint string
	BridgeLabel    string
}

type PollResult struct {
	Provider   string
	Protocol   string
	AccountRef string
	MessageIDs []string
}

type Poller interface {
	Poll(ctx context.Context, account AccountConfig) (PollResult, error)
}

func NormalizeAccountConfig(account AccountConfig) (AccountConfig, error) {
	account.Provider = strings.TrimSpace(strings.ToLower(account.Provider))
	account.SourceType = strings.TrimSpace(strings.ToLower(account.SourceType))
	account.AuthMode = strings.TrimSpace(strings.ToLower(account.AuthMode))
	account.ProtocolMode = strings.TrimSpace(strings.ToLower(account.ProtocolMode))
	account.Identifier = strings.TrimSpace(account.Identifier)
	account.Host = strings.TrimSpace(strings.ToLower(account.Host))
	account.Username = strings.TrimSpace(account.Username)
	account.AccessToken = strings.TrimSpace(account.AccessToken)
	account.RefreshToken = strings.TrimSpace(account.RefreshToken)
	account.BridgeEndpoint = strings.TrimSpace(strings.ToLower(account.BridgeEndpoint))
	account.BridgeLabel = strings.TrimSpace(account.BridgeLabel)
	if account.Provider == "protonmail" {
		account.Provider = "proton"
	}
	if account.Provider == "" || account.Identifier == "" {
		return AccountConfig{}, fmt.Errorf("provider 与 identifier 不能为空")
	}
	if account.ProtocolMode == "" {
		return AccountConfig{}, fmt.Errorf("protocol_mode 不能为空")
	}
	if account.ProtocolMode != "imap_pull" && account.ProtocolMode != "pop3_pull" {
		return AccountConfig{}, fmt.Errorf("暂不支持的协议模式: %s", account.ProtocolMode)
	}
	if account.AuthMode == "bridge_local_credential" {
		if account.Provider != "proton" {
			return AccountConfig{}, fmt.Errorf("当前 bridge_local_credential 仅支持 proton")
		}
		if account.Host == "" {
			account.Host = "127.0.0.1"
		}
		if account.Port == 0 {
			account.Port = 1143
		}
		if account.BridgeEndpoint == "" {
			account.BridgeEndpoint = fmt.Sprintf("%s:%d", account.Host, account.Port)
		}
	}
	return account, nil
}
