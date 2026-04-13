package activation

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type repository interface {
	ListProjects(ctx context.Context) ([]Project, error)
	ListAllProjects(ctx context.Context) ([]Project, error)
	ListProjectOfferings(ctx context.Context) ([]ProjectOffering, error)
	CreateActivationOrder(ctx context.Context, userID int64, input CreateActivationOrderInput) (ActivationOrder, error)
	ListActivationOrdersByUser(ctx context.Context, userID int64) ([]ActivationOrder, error)
	GetActivationOrderForUser(ctx context.Context, userID, orderID int64) (ActivationOrder, error)
	CancelActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error)
	TouchActivationOrderPolling(ctx context.Context, userID, orderID int64) (ActivationOrder, error)
	FinishActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error)
	SubmitActivationResult(ctx context.Context, supplierID, orderID int64, input SubmitActivationResultInput) (ActivationOrder, error)
	ListSupplierResources(ctx context.Context, supplierID int64) (map[string]any, error)
	ListAllSupplierResources(ctx context.Context) (map[string]any, error)
	UpdateProject(ctx context.Context, projectID int64, input UpdateProjectInput) (Project, error)
	CreateDomain(ctx context.Context, supplierID int64, input CreateDomainInput) (Domain, error)
	CreateProviderAccount(ctx context.Context, supplierID int64, input CreateProviderAccountInput) (ProviderAccount, error)
	CreateMailbox(ctx context.Context, supplierID int64, input CreateMailboxInput) (Mailbox, error)
	ExpireStaleActivationOrders(ctx context.Context, now time.Time) (int64, error)
	FinalizeReadyActivationOrders(ctx context.Context, now time.Time, finalizeAfter time.Duration) (int64, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service { return &Service{repo: repo} }

func (s *Service) ListProjects(ctx context.Context) ([]Project, error) {
	return s.repo.ListProjects(ctx)
}

func (s *Service) ListAllProjects(ctx context.Context) ([]Project, error) {
	return s.repo.ListAllProjects(ctx)
}

func (s *Service) ListInventory(ctx context.Context) ([]ProjectOffering, error) {
	return s.repo.ListProjectOfferings(ctx)
}

func (s *Service) CreateActivationOrder(ctx context.Context, userID int64, input CreateActivationOrderInput) (ActivationOrder, error) {
	if strings.TrimSpace(input.ProjectKey) == "" {
		return ActivationOrder{}, fmt.Errorf("project_key 不能为空")
	}
	return s.repo.CreateActivationOrder(ctx, userID, input)
}

func (s *Service) ListActivationOrders(ctx context.Context, userID int64) ([]ActivationOrder, error) {
	return s.repo.ListActivationOrdersByUser(ctx, userID)
}

func (s *Service) GetActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	return s.repo.GetActivationOrderForUser(ctx, userID, orderID)
}

func (s *Service) GetActivationResult(ctx context.Context, userID, orderID int64) (ActivationResult, error) {
	order, err := s.repo.TouchActivationOrderPolling(ctx, userID, orderID)
	if err != nil {
		return ActivationResult{}, err
	}
	return buildActivationResult(order), nil
}

func (s *Service) CancelActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	return s.repo.CancelActivationOrder(ctx, userID, orderID)
}

func (s *Service) FinishActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	return s.repo.FinishActivationOrder(ctx, userID, orderID)
}

func (s *Service) SubmitActivationResult(ctx context.Context, supplierID, orderID int64, input SubmitActivationResultInput) (ActivationOrder, error) {
	input.ExtractionType = strings.TrimSpace(input.ExtractionType)
	input.ExtractionValue = strings.TrimSpace(input.ExtractionValue)
	if input.ExtractionType == "" {
		input.ExtractionType = "code"
	}
	if input.ExtractionValue == "" {
		return ActivationOrder{}, fmt.Errorf("提取结果不能为空")
	}
	return s.repo.SubmitActivationResult(ctx, supplierID, orderID, input)
}

func (s *Service) SupplierResources(ctx context.Context, supplierID int64) (map[string]any, error) {
	return s.repo.ListSupplierResources(ctx, supplierID)
}

func (s *Service) AllSupplierResources(ctx context.Context) (map[string]any, error) {
	return s.repo.ListAllSupplierResources(ctx)
}

func (s *Service) ExpireStaleActivationOrders(ctx context.Context, now time.Time) (int64, error) {
	return s.repo.ExpireStaleActivationOrders(ctx, now)
}

func (s *Service) FinalizeReadyActivationOrders(ctx context.Context, now time.Time, finalizeAfter time.Duration) (int64, error) {
	return s.repo.FinalizeReadyActivationOrders(ctx, now, finalizeAfter)
}

func (s *Service) UpdateProject(ctx context.Context, projectID int64, input UpdateProjectInput) (Project, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	if input.Name == "" {
		return Project{}, fmt.Errorf("项目名称不能为空")
	}
	if input.DefaultPrice < 0 {
		return Project{}, fmt.Errorf("默认价格不能小于 0")
	}
	if input.SuccessRate < 0 || input.SuccessRate > 1 {
		return Project{}, fmt.Errorf("成功率必须位于 0 到 1 之间")
	}
	if input.TimeoutSeconds <= 0 {
		return Project{}, fmt.Errorf("超时时间必须大于 0")
	}
	return s.repo.UpdateProject(ctx, projectID, input)
}

func (s *Service) CreateDomain(ctx context.Context, supplierID int64, input CreateDomainInput) (Domain, error) {
	input.Name = strings.TrimSpace(strings.ToLower(input.Name))
	input.Region = strings.TrimSpace(input.Region)
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	if input.Name == "" {
		return Domain{}, fmt.Errorf("域名不能为空")
	}
	if input.Region == "" {
		input.Region = "global"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	return s.repo.CreateDomain(ctx, supplierID, input)
}

func (s *Service) CreateProviderAccount(ctx context.Context, supplierID int64, input CreateProviderAccountInput) (ProviderAccount, error) {
	input.Provider = strings.TrimSpace(strings.ToLower(input.Provider))
	input.SourceType = strings.TrimSpace(strings.ToLower(input.SourceType))
	input.AuthMode = strings.TrimSpace(strings.ToLower(input.AuthMode))
	input.ProtocolMode = strings.TrimSpace(strings.ToLower(input.ProtocolMode))
	input.Identifier = strings.TrimSpace(input.Identifier)
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	input.Host = strings.TrimSpace(strings.ToLower(input.Host))
	input.AccessToken = strings.TrimSpace(input.AccessToken)
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	input.CredentialSecret = strings.TrimSpace(input.CredentialSecret)
	input.SecretRef = strings.TrimSpace(input.SecretRef)
	input.BridgeEndpoint = strings.TrimSpace(strings.ToLower(input.BridgeEndpoint))
	input.BridgeLabel = strings.TrimSpace(input.BridgeLabel)
	if input.Provider == "" || input.Identifier == "" {
		return ProviderAccount{}, fmt.Errorf("provider 与标识不能为空")
	}
	if input.SourceType == "" {
		input.SourceType = "public_mailbox_account"
	}
	if input.AuthMode == "" {
		input.AuthMode = "oauth2"
	}
	if input.ProtocolMode == "" {
		input.ProtocolMode = "imap_pull"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.Host == "" {
		input.Host = defaultProviderHost(input.Provider, input.ProtocolMode, input.AuthMode)
	}
	if input.Port == 0 {
		input.Port = defaultProviderPort(input.ProtocolMode, input.AuthMode)
	}
	if input.AuthMode == "bridge_local_credential" {
		if input.Host != "127.0.0.1" && input.Host != "localhost" {
			return ProviderAccount{}, fmt.Errorf("Proton Bridge 仅允许本机 127.0.0.1/localhost")
		}
		if input.Port != 1143 {
			return ProviderAccount{}, fmt.Errorf("Proton Bridge IMAP 端口固定为 1143")
		}
	} else if expectedHost := defaultProviderHost(input.Provider, input.ProtocolMode, input.AuthMode); expectedHost != "" {
		expectedPort := defaultProviderPort(input.ProtocolMode, input.AuthMode)
		if input.Host != expectedHost || input.Port != expectedPort {
			return ProviderAccount{}, fmt.Errorf("provider %s 仅支持官方端点 %s:%d", input.Provider, expectedHost, expectedPort)
		}
	}
	if requiresSecretCredential(input.AuthMode) && input.CredentialSecret == "" && input.SecretRef == "" {
		return ProviderAccount{}, fmt.Errorf("当前认证方式要求 credential_secret 或 secret_ref")
	}
	if input.AuthMode == "oauth2" && input.RefreshToken == "" {
		return ProviderAccount{}, fmt.Errorf("oauth2 模式要求 refresh_token")
	}
	if input.AuthMode == "bridge_local_credential" {
		if input.Provider != "proton" && input.Provider != "protonmail" {
			return ProviderAccount{}, fmt.Errorf("bridge_local_credential 仅支持 proton")
		}
		if input.SourceType == "public_mailbox_account" {
			input.SourceType = "bridge_mailbox"
		}
		if input.Provider == "proton" || input.Provider == "protonmail" {
			input.Provider = "proton"
			if input.Host == "" {
				input.Host = "127.0.0.1"
			}
			if input.Port == 0 {
				input.Port = 1143
			}
			if input.BridgeEndpoint == "" {
				input.BridgeEndpoint = "127.0.0.1:1143"
			}
			if input.BridgeLabel == "" {
				input.BridgeLabel = "proton-bridge"
			}
		}
	}
	return s.repo.CreateProviderAccount(ctx, supplierID, input)
}

func (s *Service) CreateMailbox(ctx context.Context, supplierID int64, input CreateMailboxInput) (Mailbox, error) {
	input.LocalPart = strings.TrimSpace(strings.ToLower(input.LocalPart))
	input.Address = strings.TrimSpace(strings.ToLower(input.Address))
	input.SourceType = strings.TrimSpace(strings.ToLower(input.SourceType))
	input.ProjectKey = strings.TrimSpace(strings.ToLower(input.ProjectKey))
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	if input.ProjectKey == "" {
		return Mailbox{}, fmt.Errorf("project_key 不能为空")
	}
	if input.SourceType == "" {
		input.SourceType = "self_hosted_domain"
	}
	if input.Status == "" {
		input.Status = "available"
	}
	if input.Address == "" && input.LocalPart == "" {
		return Mailbox{}, fmt.Errorf("邮箱地址或 local_part 至少填写一项")
	}
	return s.repo.CreateMailbox(ctx, supplierID, input)
}

func defaultProviderHost(provider, protocolMode, authMode string) string {
	if authMode == "bridge_local_credential" && (provider == "proton" || provider == "protonmail") {
		return "127.0.0.1"
	}
	switch protocolMode {
	case "pop3_pull":
		switch provider {
		case "outlook", "microsoft":
			return "outlook.office365.com"
		case "qq":
			return "pop.qq.com"
		case "163":
			return "pop.163.com"
		}
	default:
		switch provider {
		case "gmail":
			return "imap.gmail.com"
		case "outlook", "microsoft":
			return "outlook.office365.com"
		case "qq":
			return "imap.qq.com"
		case "163":
			return "imap.163.com"
		case "proton", "protonmail":
			return "127.0.0.1"
		}
	}
	return ""
}

func defaultProviderPort(protocolMode, authMode string) int {
	if authMode == "bridge_local_credential" {
		return 1143
	}
	switch protocolMode {
	case "pop3_pull":
		return 995
	default:
		return 993
	}
}

func requiresSecretCredential(authMode string) bool {
	switch authMode {
	case "authorization_code", "app_password", "password", "bridge_local_credential":
		return true
	default:
		return false
	}
}

func buildActivationResult(order ActivationOrder) ActivationResult {
	expiresIn := int64(time.Until(order.ExpiresAt).Seconds())
	if expiresIn < 0 {
		expiresIn = 0
	}
	nextPoll := 5
	switch order.Status {
	case OrderStatusAllocated:
		nextPoll = 3
	case OrderStatusWaitingEmail:
		nextPoll = 5
	case OrderStatusReady:
		nextPoll = 0
	default:
		if isTerminalOrderStatus(order.Status) {
			nextPoll = 0
		}
	}
	return ActivationResult{
		OrderID:              order.ID,
		Status:               order.Status,
		ExtractionType:       order.ExtractionType,
		ExtractionValue:      order.ExtractionValue,
		IsTerminal:           isTerminalOrderStatus(order.Status),
		ExpiresInSeconds:     expiresIn,
		NextPollAfterSeconds: nextPoll,
	}
}
