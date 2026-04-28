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
