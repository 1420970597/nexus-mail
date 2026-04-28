package webhook

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

var ErrEndpointNotFound = errors.New("webhook endpoint not found")

const (
	maxEndpointListLimit      = 100
	defaultEndpointListLimit  = 50
	defaultDeliveryRetention  = 30 * 24 * time.Hour
	webhookSecretCipherPrefix = "v1:"
)

type repository interface {
	ListEndpoints(ctx context.Context, userID int64, limit int) ([]WebhookEndpoint, error)
	CreateEndpoint(ctx context.Context, input CreateEndpointRecord) (WebhookEndpoint, error)
	GetEndpoint(ctx context.Context, userID, endpointID int64) (WebhookEndpoint, error)
	CreateDelivery(ctx context.Context, input CreateDeliveryRecord) (WebhookDelivery, error)
	ListDeliveries(ctx context.Context, userID, endpointID int64, limit int) ([]WebhookDelivery, error)
	deliveryRepository
}

type deliveryRepository interface {
	ClaimPendingDeliveries(ctx context.Context, workerID string, limit int) ([]WebhookDelivery, error)
	GetEndpointByID(ctx context.Context, endpointID int64) (WebhookEndpoint, error)
	UpdateDeliveryResult(ctx context.Context, input WebhookDeliveryUpdate) error
}

type Resolver interface {
	LookupIP(ctx context.Context, host string) ([]net.IP, error)
}

type netResolver struct{}

func (netResolver) LookupIP(ctx context.Context, host string) ([]net.IP, error) {
	return net.DefaultResolver.LookupIP(ctx, "ip", host)
}

func NetResolver() Resolver { return netResolver{} }

type Service struct {
	repo          repository
	resolver      Resolver
	encryptionKey string
}

type staticPublicResolver struct{}

func (staticPublicResolver) LookupIP(context.Context, string) ([]net.IP, error) {
	return []net.IP{net.ParseIP("203.0.113.10")}, nil
}

func NewService(repo repository) *Service {
	keyMaterial := strings.TrimSpace(os.Getenv("WEBHOOK_SECRET_ENCRYPTION_KEY"))
	if keyMaterial == "" {
		keyMaterial = strings.TrimSpace(os.Getenv("JWT_SECRET"))
	}
	return &Service{repo: repo, resolver: staticPublicResolver{}, encryptionKey: keyMaterial}
}

func NewServiceWithEncryptionKey(repo repository, encryptionKey string) *Service {
	return &Service{repo: repo, resolver: staticPublicResolver{}, encryptionKey: strings.TrimSpace(encryptionKey)}
}

func (s *Service) SetResolver(resolver Resolver) {
	if resolver != nil {
		s.resolver = resolver
	}
}

func (s *Service) UseNetworkResolver() { s.resolver = netResolver{} }

func (s *Service) ListEndpoints(ctx context.Context, userID int64) ([]WebhookEndpointResponse, error) {
	items, err := s.repo.ListEndpoints(ctx, userID, defaultEndpointListLimit)
	if err != nil {
		return nil, err
	}
	out := make([]WebhookEndpointResponse, 0, len(items))
	for _, item := range items {
		out = append(out, endpointResponse(item, ""))
	}
	return out, nil
}

func (s *Service) CreateEndpoint(ctx context.Context, userID int64, input CreateEndpointInput) (WebhookEndpointResponse, error) {
	if userID <= 0 {
		return WebhookEndpointResponse{}, fmt.Errorf("user_id 无效")
	}
	normalizedURL, err := s.validateEndpointURL(ctx, input.URL)
	if err != nil {
		return WebhookEndpointResponse{}, err
	}
	events := normalizeEvents(input.Events)
	if len(events) == 0 {
		return WebhookEndpointResponse{}, fmt.Errorf("events 不能为空")
	}
	secret, err := generateSigningSecret()
	if err != nil {
		return WebhookEndpointResponse{}, err
	}
	ciphertext, err := s.encryptSigningSecret(userID, secret)
	if err != nil {
		return WebhookEndpointResponse{}, err
	}
	preview := secretPreview(secret)
	item, err := s.repo.CreateEndpoint(ctx, CreateEndpointRecord{UserID: userID, URL: normalizedURL, Events: events, Status: EndpointStatusActive, SecretCiphertext: ciphertext, SecretPreview: preview})
	if err != nil {
		return WebhookEndpointResponse{}, err
	}
	return endpointResponse(item, secret), nil
}

func (s *Service) CreateTestDelivery(ctx context.Context, userID, endpointID int64) (WebhookDelivery, error) {
	if endpointID <= 0 {
		return WebhookDelivery{}, fmt.Errorf("endpoint_id 无效")
	}
	endpoint, err := s.repo.GetEndpoint(ctx, userID, endpointID)
	if err != nil {
		return WebhookDelivery{}, err
	}
	payloadBytes, err := json.Marshal(map[string]any{"type": EventTypeWebhookTest, "endpoint_id": endpoint.ID, "test": true})
	if err != nil {
		return WebhookDelivery{}, err
	}
	return s.repo.CreateDelivery(ctx, CreateDeliveryRecord{EndpointID: endpoint.ID, UserID: userID, EventType: EventTypeWebhookTest, Payload: string(payloadBytes)})
}

func (s *Service) ListEndpointDeliveries(ctx context.Context, userID, endpointID int64) ([]WebhookDelivery, error) {
	if endpointID <= 0 {
		return nil, fmt.Errorf("endpoint_id 无效")
	}
	if _, err := s.repo.GetEndpoint(ctx, userID, endpointID); err != nil {
		return nil, err
	}
	return s.repo.ListDeliveries(ctx, userID, endpointID, defaultEndpointListLimit)
}

func endpointResponse(item WebhookEndpoint, signingSecret string) WebhookEndpointResponse {
	return WebhookEndpointResponse{
		ID:            item.ID,
		UserID:        item.UserID,
		URL:           item.URL,
		Events:        append([]string(nil), item.Events...),
		Status:        item.Status,
		SecretPreview: item.SecretPreview,
		SigningSecret: signingSecret,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

func normalizeEvents(events []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(events))
	for _, event := range events {
		event = strings.ToLower(strings.TrimSpace(event))
		if event == "" {
			continue
		}
		if _, ok := seen[event]; ok {
			continue
		}
		seen[event] = struct{}{}
		out = append(out, event)
	}
	sort.Strings(out)
	return out
}

func generateSigningSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "whsec_" + hex.EncodeToString(buf), nil
}

func secretPreview(secret string) string {
	if secret == "" {
		return ""
	}
	if len(secret) <= 10 {
		return secret[:2] + "…"
	}
	return secret[:10] + "…" + secret[len(secret)-4:]
}

func (s *Service) encryptSigningSecret(userID int64, secret string) (string, error) {
	keyMaterial := strings.TrimSpace(s.encryptionKey)
	if keyMaterial == "" {
		return "", fmt.Errorf("WEBHOOK_SECRET_ENCRYPTION_KEY 未配置")
	}
	key := sha256.Sum256([]byte(fmt.Sprintf("nexus-mail-webhook-secret:v1:%d:%s", userID, keyMaterial)))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(secret), nil)
	return webhookSecretCipherPrefix + base64.RawURLEncoding.EncodeToString(sealed), nil
}

func (s *Service) decryptSigningSecret(userID int64, ciphertext string) (string, error) {
	keyMaterial := strings.TrimSpace(s.encryptionKey)
	if keyMaterial == "" {
		return "", fmt.Errorf("WEBHOOK_SECRET_ENCRYPTION_KEY 未配置")
	}
	if !strings.HasPrefix(ciphertext, webhookSecretCipherPrefix) {
		return "", fmt.Errorf("webhook signing secret ciphertext 无效")
	}
	sealed, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(ciphertext, webhookSecretCipherPrefix))
	if err != nil {
		return "", err
	}
	key := sha256.Sum256([]byte(fmt.Sprintf("nexus-mail-webhook-secret:v1:%d:%s", userID, keyMaterial)))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(sealed) < gcm.NonceSize() {
		return "", fmt.Errorf("webhook signing secret ciphertext 长度无效")
	}
	nonce := sealed[:gcm.NonceSize()]
	body := sealed[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, body, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func (s *Service) validateEndpointURL(ctx context.Context, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("webhook URL 无效")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("webhook URL 仅支持 http/https")
	}
	host := strings.TrimSpace(strings.TrimSuffix(strings.ToLower(parsed.Hostname()), "."))
	if isUnsafeHostLiteral(host) {
		return "", fmt.Errorf("webhook URL 不允许指向本地或内网地址")
	}
	if decodedIP, ok := parseIPLiteral(host); ok {
		if isUnsafeIP(decodedIP) {
			return "", fmt.Errorf("webhook URL 不允许指向本地或内网地址")
		}
		return parsed.String(), nil
	}
	resolver := s.resolver
	if resolver == nil {
		resolver = netResolver{}
	}
	ips, err := resolver.LookupIP(ctx, host)
	if err != nil || len(ips) == 0 {
		return "", fmt.Errorf("webhook URL 域名无法解析")
	}
	for _, ip := range ips {
		if isUnsafeIP(ip) {
			return "", fmt.Errorf("webhook URL 不允许解析到本地或内网地址")
		}
	}
	return parsed.String(), nil
}

func isUnsafeHostLiteral(host string) bool {
	return host == "" || host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal")
}

func parseIPLiteral(host string) (net.IP, bool) {
	if ip := net.ParseIP(host); ip != nil {
		return ip, true
	}
	if strings.Contains(host, ".") {
		parts := strings.Split(host, ".")
		if len(parts) > 4 {
			return nil, false
		}
		var value uint32
		for _, part := range parts {
			if part == "" {
				return nil, false
			}
			n, err := strconv.ParseUint(part, 0, 32)
			if err != nil || n > 255 {
				return nil, false
			}
			value = (value << 8) | uint32(n)
		}
		for i := len(parts); i < 4; i++ {
			value <<= 8
		}
		return net.IPv4(byte(value>>24), byte(value>>16), byte(value>>8), byte(value)), true
	}
	if n, err := strconv.ParseUint(host, 0, 32); err == nil {
		return net.IPv4(byte(n>>24), byte(n>>16), byte(n>>8), byte(n)), true
	}
	return nil, false
}

func isUnsafeIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast()
}
