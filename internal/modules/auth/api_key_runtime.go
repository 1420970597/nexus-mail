package auth

import (
	"context"
	"net"
	"strings"
	"time"
)

const (
	defaultAPIKeyRateLimit       = 60
	defaultAPIKeyRateLimitWindow = time.Minute
)

func (s *Service) AuthenticateAPIKey(ctx context.Context, key, clientIP, requiredScope string) (User, APIKey, error) {
	repo := s.apiKeyRepo
	if repo == nil {
		return User{}, APIKey{}, ErrAPIKeyStoreMissing
	}
	item, err := repo.ValidateAPIKey(ctx, key)
	if err != nil {
		s.recordAPIKeyAudit(ctx, APIKeyAuthAuditEvent{
			ClientIP: clientIP,
			Scope:    requiredScope,
			Outcome:  APIKeyAuthOutcomeDeniedInvalid,
			Note:     err.Error(),
		})
		return User{}, APIKey{}, err
	}
	if err := ensureAPIKeyScope(item, requiredScope); err != nil {
		s.recordAPIKeyAudit(ctx, APIKeyAuthAuditEvent{
			APIKeyID:   &item.ID,
			UserID:     &item.UserID,
			KeyPreview: item.KeyPreview,
			ClientIP:   clientIP,
			Scope:      requiredScope,
			Outcome:    APIKeyAuthOutcomeDeniedScope,
			Note:       err.Error(),
		})
		return User{}, APIKey{}, err
	}
	if err := ensureAPIKeyWhitelist(item, clientIP); err != nil {
		s.recordAPIKeyAudit(ctx, APIKeyAuthAuditEvent{
			APIKeyID:   &item.ID,
			UserID:     &item.UserID,
			KeyPreview: item.KeyPreview,
			ClientIP:   clientIP,
			Scope:      requiredScope,
			Outcome:    APIKeyAuthOutcomeDeniedWhitelist,
			Note:       err.Error(),
		})
		return User{}, APIKey{}, err
	}
	if s.apiKeyRateLimiter != nil {
		allowed, err := s.apiKeyRateLimiter.Allow(ctx, item.KeyPreview, defaultAPIKeyRateLimit, defaultAPIKeyRateLimitWindow)
		if err != nil {
			return User{}, APIKey{}, err
		}
		if !allowed {
			s.recordAPIKeyAudit(ctx, APIKeyAuthAuditEvent{
				APIKeyID:   &item.ID,
				UserID:     &item.UserID,
				KeyPreview: item.KeyPreview,
				ClientIP:   clientIP,
				Scope:      requiredScope,
				Outcome:    APIKeyAuthOutcomeDeniedRateLimit,
				Note:       ErrAPIKeyRateLimited.Error(),
			})
			return User{}, APIKey{}, ErrAPIKeyRateLimited
		}
	}
	user := User{ID: item.UserID, Role: RoleUser}
	s.recordAPIKeyAudit(ctx, APIKeyAuthAuditEvent{
		APIKeyID:   &item.ID,
		UserID:     &item.UserID,
		KeyPreview: item.KeyPreview,
		ClientIP:   clientIP,
		Scope:      requiredScope,
		Outcome:    APIKeyAuthOutcomeSuccess,
		Note:       "API Key 鉴权通过",
	})
	return user, item, nil
}

func (s *Service) recordAPIKeyAudit(ctx context.Context, event APIKeyAuthAuditEvent) {
	if s.apiKeyRepo == nil {
		return
	}
	_ = s.apiKeyRepo.RecordAPIKeyAuthAudit(ctx, event)
}

func ensureAPIKeyScope(item APIKey, requiredScope string) error {
	requiredScope = strings.TrimSpace(strings.ToLower(requiredScope))
	if requiredScope == "" {
		return nil
	}
	for _, scope := range item.Scopes {
		if strings.EqualFold(strings.TrimSpace(scope), requiredScope) {
			return nil
		}
	}
	return ErrAPIKeyDeniedScope
}

func ensureAPIKeyWhitelist(item APIKey, clientIP string) error {
	if len(item.Whitelist) == 0 {
		return nil
	}
	host := strings.TrimSpace(clientIP)
	if strings.Contains(host, ":") {
		if parsedHost, _, err := net.SplitHostPort(host); err == nil {
			host = parsedHost
		}
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return ErrAPIKeyDeniedIP
	}
	for _, entry := range item.Whitelist {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if allowedIP := net.ParseIP(entry); allowedIP != nil && allowedIP.Equal(ip) {
			return nil
		}
		if _, network, err := net.ParseCIDR(entry); err == nil {
			if network.Contains(ip) {
				return nil
			}
			if mapped := ip.To4(); mapped != nil {
				if network.Contains(mapped) {
					return nil
				}
			}
			if v4InV6 := ip.To16(); v4InV6 != nil && ip.To4() != nil {
				if network.Contains(v4InV6) {
					return nil
				}
			}
		}
	}
	return ErrAPIKeyDeniedIP
}
