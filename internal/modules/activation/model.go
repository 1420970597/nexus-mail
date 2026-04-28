package activation

import "time"

type Project struct {
	ID             int64     `json:"id"`
	Key            string    `json:"key"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	DefaultPrice   int64     `json:"default_price"`
	SuccessRate    float64   `json:"success_rate"`
	TimeoutSeconds int       `json:"timeout_seconds"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

type Domain struct {
	ID         int64     `json:"id"`
	SupplierID int64     `json:"supplier_id"`
	Name       string    `json:"name"`
	Region     string    `json:"region"`
	Status     string    `json:"status"`
	CatchAll   bool      `json:"catch_all"`
	CreatedAt  time.Time `json:"created_at"`
}

type Mailbox struct {
	ID         int64     `json:"id"`
	DomainID   int64     `json:"domain_id"`
	AccountID  int64     `json:"account_id"`
	LocalPart  string    `json:"local_part"`
	Address    string    `json:"address"`
	SourceType string    `json:"source_type"`
	Status     string    `json:"status"`
	ProjectKey string    `json:"project_key"`
	Provider   string    `json:"provider,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type ProviderAccount struct {
	ID               int64      `json:"id"`
	SupplierID       int64      `json:"supplier_id"`
	Provider         string     `json:"provider"`
	SourceType       string     `json:"source_type"`
	AuthMode         string     `json:"auth_mode"`
	ProtocolMode     string     `json:"protocol_mode"`
	Identifier       string     `json:"identifier"`
	Status           string     `json:"status"`
	Host             string     `json:"host,omitempty"`
	Port             int        `json:"port,omitempty"`
	AccessToken      string     `json:"-"`
	RefreshToken     string     `json:"-"`
	CredentialSecret string     `json:"-"`
	SecretRef        string     `json:"secret_ref,omitempty"`
	TokenExpiresAt   *time.Time `json:"token_expires_at,omitempty"`
	HealthStatus     string     `json:"health_status,omitempty"`
	HealthReason     string     `json:"health_reason,omitempty"`
	HealthCheckedAt  *time.Time `json:"health_checked_at,omitempty"`
	BridgeEndpoint   string     `json:"bridge_endpoint,omitempty"`
	BridgeLabel      string     `json:"bridge_label,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type ProjectOffering struct {
	ID           int64   `json:"id"`
	ProjectID    int64   `json:"project_id"`
	ProjectKey   string  `json:"project_key"`
	ProjectName  string  `json:"project_name"`
	DomainID     int64   `json:"domain_id"`
	DomainName   string  `json:"domain_name"`
	SupplierID   int64   `json:"supplier_id"`
	Price        int64   `json:"price"`
	Stock        int64   `json:"stock"`
	SuccessRate  float64 `json:"success_rate"`
	Priority     int     `json:"priority"`
	SourceType   string  `json:"source_type"`
	ProtocolMode string  `json:"protocol_mode,omitempty"`
}

type UpsertProjectOfferingInput struct {
	ProjectKey   string  `json:"project_key"`
	DomainID     int64   `json:"domain_id"`
	Price        int64   `json:"price"`
	SuccessRate  float64 `json:"success_rate"`
	Priority     int     `json:"priority"`
	SourceType   string  `json:"source_type"`
	ProtocolMode string  `json:"protocol_mode"`
}

type ActivationOrder struct {
	ID              int64      `json:"id"`
	OrderNo         string     `json:"order_no"`
	UserID          int64      `json:"user_id"`
	ProjectID       int64      `json:"project_id"`
	ProjectKey      string     `json:"project_key"`
	ProjectName     string     `json:"project_name"`
	DomainID        int64      `json:"domain_id"`
	DomainName      string     `json:"domain_name"`
	MailboxID       int64      `json:"mailbox_id"`
	EmailAddress    string     `json:"email_address"`
	Status          string     `json:"status"`
	QuotedPrice     int64      `json:"quoted_price"`
	FinalPrice      int64      `json:"final_price"`
	ExtractionType  string     `json:"extraction_type"`
	ExtractionValue string     `json:"extraction_value"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	ExpiresAt       time.Time  `json:"expires_at"`
	CanceledAt      *time.Time `json:"canceled_at,omitempty"`
}

type CreateActivationOrderInput struct {
	ProjectKey string `json:"project_key"`
	DomainID   int64  `json:"domain_id"`
}

type UpdateProjectInput struct {
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	DefaultPrice   int64   `json:"default_price"`
	SuccessRate    float64 `json:"success_rate"`
	TimeoutSeconds int     `json:"timeout_seconds"`
	IsActive       bool    `json:"is_active"`
}

type CreateDomainInput struct {
	Name     string `json:"name"`
	Region   string `json:"region"`
	CatchAll bool   `json:"catch_all"`
	Status   string `json:"status"`
}

type CreateProviderAccountInput struct {
	Provider         string `json:"provider"`
	SourceType       string `json:"source_type"`
	AuthMode         string `json:"auth_mode"`
	ProtocolMode     string `json:"protocol_mode"`
	Identifier       string `json:"identifier"`
	Status           string `json:"status"`
	Host             string `json:"host"`
	Port             int    `json:"port"`
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	CredentialSecret string `json:"credential_secret"`
	SecretRef        string `json:"secret_ref"`
	BridgeEndpoint   string `json:"bridge_endpoint"`
	BridgeLabel      string `json:"bridge_label"`
}

type CreateMailboxInput struct {
	DomainID   int64  `json:"domain_id"`
	AccountID  int64  `json:"account_id"`
	LocalPart  string `json:"local_part"`
	Address    string `json:"address"`
	SourceType string `json:"source_type"`
	ProjectKey string `json:"project_key"`
	Status     string `json:"status"`
}

type SubmitActivationResultInput struct {
	ExtractionType  string `json:"extraction_type"`
	ExtractionValue string `json:"extraction_value"`
}

type ActivationResult struct {
	OrderID              int64  `json:"order_id"`
	Status               string `json:"status"`
	ExtractionType       string `json:"extraction_type"`
	ExtractionValue      string `json:"extraction_value"`
	IsTerminal           bool   `json:"is_terminal"`
	ExpiresInSeconds     int64  `json:"expires_in_seconds"`
	NextPollAfterSeconds int    `json:"next_poll_after_seconds"`
}

type ProviderAccountHealthUpdate struct {
	Status         string
	Reason         string
	AccessToken    string
	RefreshToken   string
	TokenExpiresAt *time.Time
}

const (
	OrderStatusCreated      = "CREATED"
	OrderStatusAllocating   = "ALLOCATING"
	OrderStatusAllocated    = "ALLOCATED"
	OrderStatusWaitingEmail = "WAITING_EMAIL"
	OrderStatusReady        = "READY"
	OrderStatusFinished     = "FINISHED"
	OrderStatusCanceled     = "CANCELED"
	OrderStatusTimeout      = "TIMEOUT"
)

func isTerminalOrderStatus(status string) bool {
	switch status {
	case OrderStatusReady, OrderStatusFinished, OrderStatusCanceled, OrderStatusTimeout:
		return true
	default:
		return false
	}
}
