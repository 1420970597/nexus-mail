package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"sort"
	"strings"
)

const maxAPIKeyWhitelistEntries = 64

var allowedAPIKeyScopes = map[string]struct{}{
	"activation:read":  {},
	"activation:write": {},
	"finance:read":     {},
	"finance:write":    {},
}

func generateAPIKeyPlaintext() (string, string, string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", "", "", err
	}
	secret := hex.EncodeToString(raw)
	plaintext := fmt.Sprintf("nmx_%s", secret)
	digest := sha256.Sum256([]byte(plaintext))
	hash := hex.EncodeToString(digest[:])
	preview := plaintext[:10] + "..." + plaintext[len(plaintext)-4:]
	return plaintext, hash, preview, nil
}

func normalizeScopes(items []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(items))
	for _, item := range items {
		value := strings.TrimSpace(strings.ToLower(item))
		if value == "" {
			continue
		}
		if _, ok := allowedAPIKeyScopes[value]; !ok {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func validateScopes(items []string) ([]string, error) {
	if len(items) == 0 {
		return []string{"activation:read"}, nil
	}
	normalizedInput := make([]string, 0, len(items))
	for _, item := range items {
		value := strings.TrimSpace(strings.ToLower(item))
		if value == "" {
			continue
		}
		normalizedInput = append(normalizedInput, value)
		if _, ok := allowedAPIKeyScopes[value]; !ok {
			return nil, fmt.Errorf("存在不支持的 scope: %s", value)
		}
	}
	if len(normalizedInput) == 0 {
		return nil, fmt.Errorf("API Key scopes 不能全为空")
	}
	return normalizeScopes(normalizedInput), nil
}

func normalizeWhitelist(items []string) ([]string, error) {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(items))
	for _, item := range items {
		value := strings.TrimSpace(item)
		if value == "" {
			continue
		}
		normalized, err := normalizeWhitelistEntry(value)
		if err != nil {
			return nil, err
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		if len(result) >= maxAPIKeyWhitelistEntries {
			return nil, fmt.Errorf("IP 白名单最多支持 %d 条", maxAPIKeyWhitelistEntries)
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	sort.Strings(result)
	return result, nil
}

func normalizeWhitelistEntry(value string) (string, error) {
	if ip := net.ParseIP(value); ip != nil {
		return ip.String(), nil
	}
	if _, network, err := net.ParseCIDR(value); err == nil {
		return network.String(), nil
	}
	return "", fmt.Errorf("IP 白名单仅支持合法 IP 或 CIDR")
}
