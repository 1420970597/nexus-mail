package mailboxpoll

import (
	"fmt"
	"net"
	"strings"
)

func ValidateBridgeEndpoint(account AccountConfig) (string, error) {
	normalized, err := NormalizeAccountConfig(account)
	if err != nil {
		return "", err
	}
	if normalized.AuthMode != "bridge_local_credential" {
		return "", fmt.Errorf("当前账号不是 bridge 模式")
	}
	endpoint := normalized.BridgeEndpoint
	if endpoint == "" {
		endpoint = net.JoinHostPort(normalized.Host, fmt.Sprintf("%d", normalized.Port))
	}
	host, port, err := net.SplitHostPort(endpoint)
	if err != nil {
		return "", fmt.Errorf("bridge_endpoint 非法: %w", err)
	}
	if strings.TrimSpace(host) == "" || strings.TrimSpace(port) == "" {
		return "", fmt.Errorf("bridge_endpoint 不能为空")
	}
	return endpoint, nil
}
