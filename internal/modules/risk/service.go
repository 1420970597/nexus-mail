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

var supportedRuleKeys = map[string]string{
	"high_cancel":      "高频取消订单检测",
	"high_timeout":     "高频超时订单检测",
	"api_denied_rate":  "API Key 异常访问检测",
	"sender_blacklist": "发件人黑名单命中检测",
}
