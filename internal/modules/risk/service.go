package risk

import (
	"context"
	"fmt"
	"strings"
)

type repository interface {
	EnsureSchema(ctx context.Context) error
	SeedDefaults(ctx context.Context) error
	ListRules(ctx context.Context) ([]Rule, error)
	UpsertRules(ctx context.Context, adminID int64, input []UpsertRuleInput) ([]Rule, error)
	ListSenderBlacklist(ctx context.Context) ([]SenderBlacklistEntry, error)
	UpsertSenderBlacklist(ctx context.Context, adminID int64, input []SenderBlacklistInput) ([]SenderBlacklistEntry, error)
	RecordSenderBlacklistHit(ctx context.Context, sender, pattern string) error
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service { return &Service{repo: repo} }

func (s *Service) EnsureReady(ctx context.Context) error {
	if s == nil || s.repo == nil {
		return nil
	}
	if err := s.repo.EnsureSchema(ctx); err != nil {
		return err
	}
	return s.repo.SeedDefaults(ctx)
}

func (s *Service) ListRules(ctx context.Context) ([]Rule, error) {
	return s.repo.ListRules(ctx)
}

func (s *Service) UpdateRules(ctx context.Context, adminID int64, input []UpsertRuleInput) ([]Rule, error) {
	if len(input) == 0 {
		return nil, fmt.Errorf("风控规则不能为空")
	}
	normalized := make([]UpsertRuleInput, 0, len(input))
	seen := map[string]struct{}{}
	for _, item := range input {
		item.Key = strings.TrimSpace(strings.ToLower(item.Key))
		item.Severity = strings.TrimSpace(strings.ToLower(item.Severity))
		item.Description = strings.TrimSpace(item.Description)
		if _, ok := supportedRuleKeys[item.Key]; !ok {
			return nil, fmt.Errorf("不支持的风控规则: %s", item.Key)
		}
		if _, exists := seen[item.Key]; exists {
			return nil, fmt.Errorf("风控规则重复: %s", item.Key)
		}
		seen[item.Key] = struct{}{}
		if item.Threshold <= 0 {
			return nil, fmt.Errorf("threshold 必须大于 0")
		}
		if item.WindowMinutes <= 0 || item.WindowMinutes > 1440 {
			return nil, fmt.Errorf("window_minutes 必须在 1 到 1440 之间")
		}
		if item.Severity != "high" && item.Severity != "medium" && item.Severity != "low" {
			return nil, fmt.Errorf("severity 仅支持 high、medium 或 low")
		}
		if item.Description == "" {
			item.Description = supportedRuleKeys[item.Key]
		}
		normalized = append(normalized, item)
	}
	return s.repo.UpsertRules(ctx, adminID, normalized)
}

func (s *Service) ListSenderBlacklist(ctx context.Context) ([]SenderBlacklistEntry, error) {
	return s.repo.ListSenderBlacklist(ctx)
}

func (s *Service) UpdateSenderBlacklist(ctx context.Context, adminID int64, input []SenderBlacklistInput) ([]SenderBlacklistEntry, error) {
	if len(input) == 0 {
		return nil, fmt.Errorf("发件人黑名单不能为空")
	}
	if len(input) > 200 {
		return nil, fmt.Errorf("发件人黑名单最多支持 200 条")
	}
	normalized := make([]SenderBlacklistInput, 0, len(input))
	seen := map[string]struct{}{}
	for _, item := range input {
		item.Pattern = strings.TrimSpace(strings.ToLower(item.Pattern))
		item.MatchType = strings.TrimSpace(strings.ToLower(item.MatchType))
		item.Note = strings.TrimSpace(item.Note)
		if item.MatchType != "email" && item.MatchType != "domain" {
			return nil, fmt.Errorf("match_type 仅支持 email 或 domain")
		}
		if item.Pattern == "" || len(item.Pattern) > 255 {
			return nil, fmt.Errorf("pattern 长度必须在 1 到 255 之间")
		}
		if strings.ContainsAny(item.Pattern, " /\\\t\r\n") {
			return nil, fmt.Errorf("pattern 包含非法字符")
		}
		if item.MatchType == "email" {
			local, domain, ok := strings.Cut(item.Pattern, "@")
			if !ok || local == "" || domain == "" || strings.Contains(domain, "@") || strings.Contains(item.Pattern, "*") || !strings.Contains(domain, ".") {
				return nil, fmt.Errorf("email 黑名单必须是明确邮箱地址")
			}
		}
		if item.MatchType == "domain" {
			domain := strings.TrimPrefix(item.Pattern, "*.")
			if domain == "" || strings.Contains(domain, "@") || strings.Contains(domain, "*") || !strings.Contains(domain, ".") {
				return nil, fmt.Errorf("domain 黑名单必须是域名或 *.域名")
			}
		}
		key := item.MatchType + ":" + item.Pattern
		if _, exists := seen[key]; exists {
			return nil, fmt.Errorf("发件人黑名单重复: %s", item.Pattern)
		}
		seen[key] = struct{}{}
		normalized = append(normalized, item)
	}
	return s.repo.UpsertSenderBlacklist(ctx, adminID, normalized)
}

func (s *Service) EvaluateSender(ctx context.Context, sender string) (bool, SenderBlacklistEntry, error) {
	sender = strings.TrimSpace(strings.ToLower(sender))
	if sender == "" {
		return false, SenderBlacklistEntry{}, nil
	}
	items, err := s.ListSenderBlacklist(ctx)
	if err != nil {
		return false, SenderBlacklistEntry{}, err
	}
	_, domain, hasDomain := strings.Cut(sender, "@")
	for _, item := range items {
		if !item.Enabled {
			continue
		}
		pattern := strings.TrimSpace(strings.ToLower(item.Pattern))
		switch strings.TrimSpace(strings.ToLower(item.MatchType)) {
		case "email":
			if sender == pattern {
				return true, item, nil
			}
		case "domain":
			if !hasDomain {
				continue
			}
			if strings.HasPrefix(pattern, "*.") {
				base := strings.TrimPrefix(pattern, "*.")
				if domain != base && strings.HasSuffix(domain, "."+base) {
					return true, item, nil
				}
			} else if domain == pattern {
				return true, item, nil
			}
		}
	}
	return false, SenderBlacklistEntry{}, nil
}

var supportedRuleKeys = map[string]string{
	"high_cancel":      "高频取消订单检测",
	"high_timeout":     "高频超时订单检测",
	"api_denied_rate":  "API Key 异常访问检测",
	"sender_blacklist": "发件人黑名单命中检测",
}
