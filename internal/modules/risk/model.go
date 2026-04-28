package risk

import "time"

type Rule struct {
	Key           string    `json:"key"`
	Enabled       bool      `json:"enabled"`
	Threshold     int       `json:"threshold"`
	WindowMinutes int       `json:"window_minutes"`
	Severity      string    `json:"severity"`
	Description   string    `json:"description"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type UpsertRuleInput struct {
	Key           string `json:"key"`
	Enabled       bool   `json:"enabled"`
	Threshold     int    `json:"threshold"`
	WindowMinutes int    `json:"window_minutes"`
	Severity      string `json:"severity"`
	Description   string `json:"description"`
}

type SenderBlacklistEntry struct {
	ID        int64     `json:"id"`
	Pattern   string    `json:"pattern"`
	MatchType string    `json:"match_type"`
	Enabled   bool      `json:"enabled"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SenderBlacklistInput struct {
	Pattern   string `json:"pattern"`
	MatchType string `json:"match_type"`
	Enabled   bool   `json:"enabled"`
	Note      string `json:"note"`
}
