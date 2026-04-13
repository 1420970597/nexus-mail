package mailboxpoll

import (
	"context"
	"fmt"
	"strings"
)

type AccountConfig struct {
	Provider     string
	SourceType   string
	AuthMode     string
	ProtocolMode string
	Identifier   string
	Host         string
	Port         int
	Username     string
	SecretRef    string
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
	if account.Provider == "" || account.Identifier == "" {
		return AccountConfig{}, fmt.Errorf("provider 与 identifier 不能为空")
	}
	if account.ProtocolMode == "" {
		return AccountConfig{}, fmt.Errorf("protocol_mode 不能为空")
	}
	if account.ProtocolMode != "imap_pull" && account.ProtocolMode != "pop3_pull" {
		return AccountConfig{}, fmt.Errorf("暂不支持的协议模式: %s", account.ProtocolMode)
	}
	return account, nil
}
