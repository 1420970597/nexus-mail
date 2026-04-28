package risk

import (
	"context"
	"testing"
)

type stubRepo struct {
	items   []Rule
	adminID int64
	input   []UpsertRuleInput
	err     error
}

func (s *stubRepo) EnsureSchema(context.Context) error        { return s.err }
func (s *stubRepo) SeedDefaults(context.Context) error        { return s.err }
func (s *stubRepo) ListRules(context.Context) ([]Rule, error) { return s.items, s.err }
func (s *stubRepo) UpsertRules(_ context.Context, adminID int64, input []UpsertRuleInput) ([]Rule, error) {
	s.adminID = adminID
	s.input = input
	if s.err != nil {
		return nil, s.err
	}
	return []Rule{{Key: input[0].Key, Enabled: input[0].Enabled, Threshold: input[0].Threshold, WindowMinutes: input[0].WindowMinutes, Severity: input[0].Severity}}, nil
}

func TestUpdateRulesNormalizesAndValidatesRiskConfig(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	items, err := service.UpdateRules(context.Background(), 99, []UpsertRuleInput{{
		Key:           " HIGH_CANCEL ",
		Enabled:       true,
		Threshold:     6,
		WindowMinutes: 30,
		Severity:      " HIGH ",
		Description:   " 高频取消 ",
	}})
	if err != nil {
		t.Fatalf("UpdateRules() error = %v", err)
	}
	if len(items) != 1 || items[0].Key != "high_cancel" || items[0].Severity != "high" {
		t.Fatalf("unexpected normalized rule: %#v", items)
	}
	if repo.adminID != 99 {
		t.Fatalf("expected admin id to be forwarded for audit, got %d", repo.adminID)
	}
	if repo.input[0].Description != "高频取消" {
		t.Fatalf("expected trimmed description, got %#v", repo.input[0])
	}
}

func TestUpdateRulesRejectsUnsupportedOrDangerousValues(t *testing.T) {
	service := NewService(&stubRepo{})
	cases := []UpsertRuleInput{
		{Key: "unknown", Enabled: true, Threshold: 1, WindowMinutes: 10, Severity: "high"},
		{Key: "high_timeout", Enabled: true, Threshold: 0, WindowMinutes: 10, Severity: "high"},
		{Key: "api_denied_rate", Enabled: true, Threshold: 10, WindowMinutes: 0, Severity: "medium"},
		{Key: "sender_blacklist", Enabled: true, Threshold: 1, WindowMinutes: 5, Severity: "critical"},
	}
	for _, tc := range cases {
		if _, err := service.UpdateRules(context.Background(), 9, []UpsertRuleInput{tc}); err == nil {
			t.Fatalf("expected validation error for %#v", tc)
		}
	}
}
