package activation

import (
	"context"
	"errors"
	"testing"
	"time"
)

type stubRepo struct {
	order               ActivationOrder
	providerAccountIn   CreateProviderAccountInput
	mailboxIn           CreateMailboxInput
	updatedProjectIn    UpdateProjectInput
	providerAccountResp ProviderAccount
	mailboxResp         Mailbox
	projectResp         Project
	touchErr            error
	providerErr         error
	mailboxErr          error
	updateProjectErr    error
	submitResultInput   SubmitActivationResultInput
	submitResultResp    ActivationOrder
	submitResultErr     error
	finishResp          ActivationOrder
	finishErr           error
	expireCount         int64
	expireErr           error
	finalizeCount       int64
	finalizeAfter       time.Duration
	finalizeErr         error
}

func (s *stubRepo) ListProjects(context.Context) ([]Project, error)                 { return nil, nil }
func (s *stubRepo) ListAllProjects(context.Context) ([]Project, error)              { return nil, nil }
func (s *stubRepo) ListProjectOfferings(context.Context) ([]ProjectOffering, error) { return nil, nil }
func (s *stubRepo) CreateActivationOrder(context.Context, int64, CreateActivationOrderInput) (ActivationOrder, error) {
	return ActivationOrder{}, nil
}
func (s *stubRepo) ListActivationOrdersByUser(context.Context, int64) ([]ActivationOrder, error) {
	return nil, nil
}
func (s *stubRepo) GetActivationOrderForUser(context.Context, int64, int64) (ActivationOrder, error) {
	return ActivationOrder{}, nil
}
func (s *stubRepo) CancelActivationOrder(context.Context, int64, int64) (ActivationOrder, error) {
	return ActivationOrder{}, nil
}
func (s *stubRepo) TouchActivationOrderPolling(context.Context, int64, int64) (ActivationOrder, error) {
	if s.touchErr != nil {
		return ActivationOrder{}, s.touchErr
	}
	return s.order, nil
}
func (s *stubRepo) FinishActivationOrder(context.Context, int64, int64) (ActivationOrder, error) {
	if s.finishErr != nil {
		return ActivationOrder{}, s.finishErr
	}
	return s.finishResp, nil
}
func (s *stubRepo) SubmitActivationResult(_ context.Context, _ int64, _ int64, input SubmitActivationResultInput) (ActivationOrder, error) {
	s.submitResultInput = input
	if s.submitResultErr != nil {
		return ActivationOrder{}, s.submitResultErr
	}
	return s.submitResultResp, nil
}
func (s *stubRepo) ListSupplierResources(context.Context, int64) (map[string]any, error) {
	return nil, nil
}
func (s *stubRepo) ListAllSupplierResources(context.Context) (map[string]any, error) {
	return nil, nil
}
func (s *stubRepo) UpdateProject(_ context.Context, _ int64, input UpdateProjectInput) (Project, error) {
	s.updatedProjectIn = input
	if s.updateProjectErr != nil {
		return Project{}, s.updateProjectErr
	}
	return s.projectResp, nil
}
func (s *stubRepo) CreateDomain(context.Context, int64, CreateDomainInput) (Domain, error) {
	return Domain{}, nil
}
func (s *stubRepo) CreateProviderAccount(_ context.Context, _ int64, input CreateProviderAccountInput) (ProviderAccount, error) {
	s.providerAccountIn = input
	if s.providerErr != nil {
		return ProviderAccount{}, s.providerErr
	}
	return s.providerAccountResp, nil
}
func (s *stubRepo) CreateMailbox(_ context.Context, _ int64, input CreateMailboxInput) (Mailbox, error) {
	s.mailboxIn = input
	if s.mailboxErr != nil {
		return Mailbox{}, s.mailboxErr
	}
	return s.mailboxResp, nil
}
func (s *stubRepo) ExpireStaleActivationOrders(context.Context, time.Time) (int64, error) {
	if s.expireErr != nil {
		return 0, s.expireErr
	}
	return s.expireCount, nil
}
func (s *stubRepo) FinalizeReadyActivationOrders(_ context.Context, _ time.Time, finalizeAfter time.Duration) (int64, error) {
	s.finalizeAfter = finalizeAfter
	if s.finalizeErr != nil {
		return 0, s.finalizeErr
	}
	return s.finalizeCount, nil
}

func TestGetActivationResultIncludesPollingHints(t *testing.T) {
	repo := &stubRepo{order: ActivationOrder{ID: 12, Status: OrderStatusWaitingEmail, ExpiresAt: time.Now().Add(25 * time.Second), ExtractionType: "code"}}
	service := NewService(repo)

	result, err := service.GetActivationResult(context.Background(), 1, 12)
	if err != nil {
		t.Fatalf("GetActivationResult() error = %v", err)
	}
	if result.OrderID != 12 {
		t.Fatalf("expected order id 12, got %d", result.OrderID)
	}
	if result.IsTerminal {
		t.Fatal("expected waiting order to be non-terminal")
	}
	if result.NextPollAfterSeconds != 5 {
		t.Fatalf("expected next poll 5s, got %d", result.NextPollAfterSeconds)
	}
	if result.ExpiresInSeconds <= 0 {
		t.Fatalf("expected positive expires_in_seconds, got %d", result.ExpiresInSeconds)
	}
}

func TestCreateProviderAccountNormalizesDefaults(t *testing.T) {
	repo := &stubRepo{providerAccountResp: ProviderAccount{ID: 1}}
	service := NewService(repo)

	_, err := service.CreateProviderAccount(context.Background(), 2, CreateProviderAccountInput{Provider: "  Outlook  ", Identifier: " foo@example.com ", RefreshToken: "refresh-demo-token"})
	if err != nil {
		t.Fatalf("CreateProviderAccount() error = %v", err)
	}
	if repo.providerAccountIn.Provider != "outlook" {
		t.Fatalf("expected normalized provider, got %q", repo.providerAccountIn.Provider)
	}
	if repo.providerAccountIn.SourceType != "public_mailbox_account" {
		t.Fatalf("expected default source_type public_mailbox_account, got %q", repo.providerAccountIn.SourceType)
	}
	if repo.providerAccountIn.ProtocolMode != "imap_pull" {
		t.Fatalf("expected default protocol_mode imap_pull, got %q", repo.providerAccountIn.ProtocolMode)
	}
	if repo.providerAccountIn.Host != "outlook.office365.com" {
		t.Fatalf("expected normalized host outlook.office365.com, got %q", repo.providerAccountIn.Host)
	}
	if repo.providerAccountIn.Port != 993 {
		t.Fatalf("expected default IMAP port 993, got %d", repo.providerAccountIn.Port)
	}
	if repo.providerAccountIn.Identifier != "foo@example.com" {
		t.Fatalf("expected trimmed identifier, got %q", repo.providerAccountIn.Identifier)
	}
}

func TestCreateProviderAccountBuildsProtonBridgeDefaults(t *testing.T) {
	repo := &stubRepo{providerAccountResp: ProviderAccount{ID: 2}}
	service := NewService(repo)

	_, err := service.CreateProviderAccount(context.Background(), 2, CreateProviderAccountInput{Provider: "ProtonMail", AuthMode: "bridge_local_credential", Identifier: " proton@example.com ", CredentialSecret: "bridge-pass"})
	if err != nil {
		t.Fatalf("CreateProviderAccount() error = %v", err)
	}
	if repo.providerAccountIn.SourceType != "bridge_mailbox" {
		t.Fatalf("expected bridge_mailbox source type, got %q", repo.providerAccountIn.SourceType)
	}
	if repo.providerAccountIn.Host != "127.0.0.1" || repo.providerAccountIn.Port != 1143 {
		t.Fatalf("expected proton bridge endpoint defaults, got host=%q port=%d", repo.providerAccountIn.Host, repo.providerAccountIn.Port)
	}
	if repo.providerAccountIn.BridgeEndpoint != "127.0.0.1:1143" {
		t.Fatalf("expected bridge endpoint default, got %q", repo.providerAccountIn.BridgeEndpoint)
	}
}

func TestCreateProviderAccountRequiresCredentialSecretForAppPassword(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.CreateProviderAccount(context.Background(), 2, CreateProviderAccountInput{Provider: "qq", AuthMode: "app_password", ProtocolMode: "imap_pull", Identifier: "qq@example.com"})
	if err == nil || err.Error() != "当前认证方式要求 credential_secret 或 secret_ref" {
		t.Fatalf("expected credential secret validation error, got %v", err)
	}
}

func TestCreateProviderAccountAcceptsSecretRefForAuthorizationCode(t *testing.T) {
	repo := &stubRepo{providerAccountResp: ProviderAccount{ID: 3}}
	service := NewService(repo)
	_, err := service.CreateProviderAccount(context.Background(), 2, CreateProviderAccountInput{Provider: "qq", AuthMode: "authorization_code", ProtocolMode: "imap_pull", Identifier: "qq@example.com", SecretRef: "vault://mail/qq-auth-code"})
	if err != nil {
		t.Fatalf("CreateProviderAccount() error = %v", err)
	}
	if repo.providerAccountIn.SecretRef != "vault://mail/qq-auth-code" {
		t.Fatalf("expected secret ref to propagate, got %q", repo.providerAccountIn.SecretRef)
	}
}

func TestCreateMailboxNormalizesValues(t *testing.T) {
	repo := &stubRepo{mailboxResp: Mailbox{ID: 3}}
	service := NewService(repo)

	_, err := service.CreateMailbox(context.Background(), 9, CreateMailboxInput{LocalPart: " Agent ", ProjectKey: " OpenAI "})
	if err != nil {
		t.Fatalf("CreateMailbox() error = %v", err)
	}
	if repo.mailboxIn.LocalPart != "agent" {
		t.Fatalf("expected local part normalized to agent, got %q", repo.mailboxIn.LocalPart)
	}
	if repo.mailboxIn.ProjectKey != "openai" {
		t.Fatalf("expected project key openai, got %q", repo.mailboxIn.ProjectKey)
	}
	if repo.mailboxIn.SourceType != "self_hosted_domain" {
		t.Fatalf("expected default source_type self_hosted_domain, got %q", repo.mailboxIn.SourceType)
	}
	if repo.mailboxIn.Status != "available" {
		t.Fatalf("expected default status available, got %q", repo.mailboxIn.Status)
	}
}

func TestSubmitActivationResultDefaultsExtractionType(t *testing.T) {
	repo := &stubRepo{submitResultResp: ActivationOrder{ID: 4, Status: OrderStatusReady}}
	service := NewService(repo)

	_, err := service.SubmitActivationResult(context.Background(), 7, 4, SubmitActivationResultInput{ExtractionValue: "654321"})
	if err != nil {
		t.Fatalf("SubmitActivationResult() error = %v", err)
	}
	if repo.submitResultInput.ExtractionType != "code" {
		t.Fatalf("expected default extraction type code, got %q", repo.submitResultInput.ExtractionType)
	}
	if repo.submitResultInput.ExtractionValue != "654321" {
		t.Fatalf("expected extraction value 654321, got %q", repo.submitResultInput.ExtractionValue)
	}
}

func TestSubmitActivationResultRejectsEmptyValue(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.SubmitActivationResult(context.Background(), 7, 4, SubmitActivationResultInput{ExtractionType: "code"})
	if err == nil || err.Error() != "提取结果不能为空" {
		t.Fatalf("expected empty result error, got %v", err)
	}
}

func TestUpdateProjectValidatesFields(t *testing.T) {
	service := NewService(&stubRepo{})
	_, err := service.UpdateProject(context.Background(), 8, UpdateProjectInput{Name: "  ", DefaultPrice: 1, SuccessRate: 0.8, TimeoutSeconds: 60, IsActive: true})
	if err == nil || err.Error() != "项目名称不能为空" {
		t.Fatalf("expected empty name error, got %v", err)
	}
}

func TestGetActivationResultPropagatesRepositoryErrors(t *testing.T) {
	service := NewService(&stubRepo{touchErr: errors.New("boom")})
	_, err := service.GetActivationResult(context.Background(), 1, 1)
	if err == nil || err.Error() != "boom" {
		t.Fatalf("expected repo error boom, got %v", err)
	}
}

func TestExpireStaleActivationOrdersUsesRepository(t *testing.T) {
	service := NewService(&stubRepo{expireCount: 3})
	count, err := service.ExpireStaleActivationOrders(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("ExpireStaleActivationOrders() error = %v", err)
	}
	if count != 3 {
		t.Fatalf("expected 3 expired orders, got %d", count)
	}
}

func TestFinalizeReadyActivationOrdersUsesRepository(t *testing.T) {
	repo := &stubRepo{finalizeCount: 2}
	service := NewService(repo)
	count, err := service.FinalizeReadyActivationOrders(context.Background(), time.Now(), 90*time.Second)
	if err != nil {
		t.Fatalf("FinalizeReadyActivationOrders() error = %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 finalized orders, got %d", count)
	}
	if repo.finalizeAfter != 90*time.Second {
		t.Fatalf("expected finalizeAfter to propagate, got %s", repo.finalizeAfter)
	}
}
