package webhook

import "time"

const (
	EndpointStatusActive = "active"

	DeliveryStatusPending = "pending"
	DeliveryStatusSent    = "sent"
	DeliveryStatusFailed  = "failed"

	EventTypeWebhookTest = "webhook.test"
)

type WebhookEndpoint struct {
	ID               int64     `json:"id"`
	UserID           int64     `json:"user_id"`
	URL              string    `json:"url"`
	Events           []string  `json:"events"`
	Status           string    `json:"status"`
	SecretCiphertext string    `json:"-"`
	SecretPreview    string    `json:"secret_preview"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type WebhookEndpointResponse struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	URL           string    `json:"url"`
	Events        []string  `json:"events"`
	Status        string    `json:"status"`
	SecretPreview string    `json:"secret_preview"`
	SigningSecret string    `json:"signing_secret,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type WebhookDelivery struct {
	ID            int64      `json:"id"`
	EndpointID    int64      `json:"endpoint_id"`
	UserID        int64      `json:"user_id"`
	EventType     string     `json:"event_type"`
	Payload       string     `json:"payload"`
	Status        string     `json:"status"`
	AttemptCount  int        `json:"attempt_count"`
	NextAttemptAt time.Time  `json:"next_attempt_at"`
	LockedAt      *time.Time `json:"locked_at,omitempty"`
	LockedBy      string     `json:"locked_by,omitempty"`
	ExpiresAt     time.Time  `json:"expires_at"`
	LastError     string     `json:"last_error"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateEndpointInput struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

type CreateEndpointRecord struct {
	UserID           int64
	URL              string
	Events           []string
	Status           string
	SecretCiphertext string
	SecretPreview    string
}

type CreateDeliveryRecord struct {
	EndpointID int64
	UserID     int64
	EventType  string
	Payload    string
}
