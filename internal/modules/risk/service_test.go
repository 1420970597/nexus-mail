package risk

import (
	"context"
	"testing"
)

type stubRepo struct {
	items         []Rule
	adminID       int64
	input         []UpsertRuleInput
	senderItems   []SenderBlacklistEntry
	senderAdminID int64
	senderInput   []SenderBlacklistInput
	auditErr      error
	err           error
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
func (s *stubRepo) ListSenderBlacklist(context.Context) ([]SenderBlacklistEntry, error) {
	return s.senderItems, s.err
}
func (s *stubRepo) UpsertSenderBlacklist(_ context.Context, adminID int64, input []SenderBlacklistInput) ([]SenderBlacklistEntry, error) {
	s.senderAdminID = adminID
	s.senderInput = input
	if s.err != nil {
		return nil, s.err
	}
	items := make([]SenderBlacklistEntry, 0, len(input))
	for index, item := range input {
		items = append(items, SenderBlacklistEntry{ID: int64(index + 1), Pattern: item.Pattern, MatchType: item.MatchType, Enabled: item.Enabled, Note: item.Note})
	}
	return items, nil
}
func (s *stubRepo) RecordSenderBlacklistHit(context.Context, string, string) error { return s.auditErr }

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

func TestUpdateSenderBlacklistNormalizesAndValidatesEntries(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)

	items, err := service.UpdateSenderBlacklist(context.Background(), 42, []SenderBlacklistInput{
		{Pattern: " BAD@Example.Test ", MatchType: "email", Note: " known abuse "},
		{Pattern: "*.Phish.Test", MatchType: "domain"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.senderAdminID != 42 {
		t.Fatalf("expected admin id for audit, got %d", repo.senderAdminID)
	}
	if len(items) != 2 || items[0].Pattern != "bad@example.test" || items[0].MatchType != "email" || items[0].Note != "known abuse" {
		t.Fatalf("unexpected normalized sender blacklist: %#v", items)
	}
	if items[1].Pattern != "*.phish.test" || items[1].MatchType != "domain" {
		t.Fatalf("unexpected domain wildcard entry: %#v", items[1])
	}
}

func TestUpdateSenderBlacklistRejectsUnsafeOrDuplicateEntries(t *testing.T) {
	service := NewService(&stubRepo{})
	cases := [][]SenderBlacklistInput{
		{{Pattern: "", MatchType: "email"}},
		{{Pattern: "bad@example.test", MatchType: "regex"}},
		{{Pattern: "bad@example.test", MatchType: "email"}, {Pattern: "BAD@example.test", MatchType: "email"}},
		{{Pattern: "*@example.test", MatchType: "email"}},
		{{Pattern: "bad@", MatchType: "email"}},
		{{Pattern: "a@@example.test", MatchType: "email"}},
	}
	for _, tc := range cases {
		if _, err := service.UpdateSenderBlacklist(context.Background(), 1, tc); err == nil {
			t.Fatalf("expected validation error for %#v", tc)
		}
	}
}

func TestEvaluateSenderBlacklistMatchesEmailDomainAndWildcard(t *testing.T) {
	service := NewService(&stubRepo{senderItems: []SenderBlacklistEntry{
		{Pattern: "bad@example.test", MatchType: "email", Enabled: true},
		{Pattern: "blocked.test", MatchType: "domain", Enabled: true},
		{Pattern: "*.phish.test", MatchType: "domain", Enabled: true},
		{Pattern: "disabled@example.test", MatchType: "email", Enabled: false},
	}})

	for _, sender := range []string{"Bad@Example.Test", "sales@blocked.test", "alerts@sub.phish.test"} {
		matched, entry, err := service.EvaluateSender(context.Background(), sender)
		if err != nil {
			t.Fatalf("unexpected error for %s: %v", sender, err)
		}
		if !matched || entry.Pattern == "" {
			t.Fatalf("expected sender %s to match, matched=%v entry=%#v", sender, matched, entry)
		}
	}
	matched, _, err := service.EvaluateSender(context.Background(), "disabled@example.test")
	if err != nil || matched {
		t.Fatalf("expected disabled entry not to match, matched=%v err=%v", matched, err)
	}
}

func TestSenderEvaluatorAdapterBlocksEvenWhenAuditFails(t *testing.T) {
	repo := &stubRepo{
		senderItems: []SenderBlacklistEntry{{Pattern: "bad@example.test", MatchType: "email", Enabled: true}},
		auditErr:    assertErr{},
	}
	service := NewService(repo)

	matched, reason, err := SenderEvaluatorAdapter{Service: service}.EvaluateSender(context.Background(), "bad@example.test")
	if err != nil {
		t.Fatalf("expected audit failure not to soften blacklist enforcement, got %v", err)
	}
	if !matched || reason != "email:bad@example.test" {
		t.Fatalf("expected sender to remain blocked, matched=%v reason=%q", matched, reason)
	}
}

type assertErr struct{}

func (assertErr) Error() string { return "audit failed" }
