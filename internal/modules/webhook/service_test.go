package webhook

import (
	"context"
	"net"
	"strings"
	"testing"
)

type stubRepo struct {
	endpoints      []WebhookEndpoint
	deliveries     []WebhookDelivery
	nextEndpointID int64
	nextDeliveryID int64
	lastListLimit  int
}

type stubResolver struct {
	ips []net.IP
	err error
}

func (r stubResolver) LookupIP(context.Context, string) ([]net.IP, error) {
	return r.ips, r.err
}

func (r *stubRepo) ListEndpoints(ctx context.Context, userID int64, limit int) ([]WebhookEndpoint, error) {
	r.lastListLimit = limit
	items := make([]WebhookEndpoint, 0)
	for _, item := range r.endpoints {
		if item.UserID == userID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *stubRepo) CreateEndpoint(ctx context.Context, input CreateEndpointRecord) (WebhookEndpoint, error) {
	r.nextEndpointID++
	item := WebhookEndpoint{ID: r.nextEndpointID, UserID: input.UserID, URL: input.URL, Events: input.Events, Status: input.Status, SecretCiphertext: input.SecretCiphertext, SecretPreview: input.SecretPreview}
	r.endpoints = append(r.endpoints, item)
	return item, nil
}

func (r *stubRepo) GetEndpoint(ctx context.Context, userID, endpointID int64) (WebhookEndpoint, error) {
	for _, item := range r.endpoints {
		if item.UserID == userID && item.ID == endpointID {
			return item, nil
		}
	}
	return WebhookEndpoint{}, ErrEndpointNotFound
}

func (r *stubRepo) CreateDelivery(ctx context.Context, input CreateDeliveryRecord) (WebhookDelivery, error) {
	r.nextDeliveryID++
	item := WebhookDelivery{ID: r.nextDeliveryID, EndpointID: input.EndpointID, UserID: input.UserID, EventType: input.EventType, Payload: input.Payload, Status: DeliveryStatusPending, AttemptCount: 0}
	r.deliveries = append(r.deliveries, item)
	return item, nil
}

func (r *stubRepo) ListDeliveries(ctx context.Context, userID, endpointID int64, limit int) ([]WebhookDelivery, error) {
	items := make([]WebhookDelivery, 0)
	for _, item := range r.deliveries {
		if item.UserID == userID && item.EndpointID == endpointID {
			items = append(items, item)
		}
	}
	return items, nil
}

func TestCreateEndpointGeneratesSecretOnceAndListHidesPlaintext(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "unit-test-webhook-key")
	repo := &stubRepo{}
	svc := NewService(repo)
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	created, err := svc.CreateEndpoint(context.Background(), 42, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}})
	if err != nil {
		t.Fatalf("CreateEndpoint returned error: %v", err)
	}
	if created.SigningSecret == "" || !strings.HasPrefix(created.SigningSecret, "whsec_") {
		t.Fatalf("expected generated signing secret in create response, got %q", created.SigningSecret)
	}
	if created.SecretPreview == "" {
		t.Fatalf("expected secret preview")
	}

	items, err := svc.ListEndpoints(context.Background(), 42)
	if err != nil {
		t.Fatalf("ListEndpoints returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one endpoint, got %d", len(items))
	}
	if items[0].SigningSecret != "" {
		t.Fatalf("list must not expose plaintext secret, got %q", items[0].SigningSecret)
	}
	if items[0].SecretPreview != created.SecretPreview {
		t.Fatalf("expected preview %q, got %q", created.SecretPreview, items[0].SecretPreview)
	}
}

func TestCreateEndpointRejectsUnsafeURLs(t *testing.T) {
	svc := NewService(&stubRepo{})
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	unsafeURLs := []string{
		"ftp://example.com/hook",
		"http://localhost/hook",
		"http://127.0.0.1/hook",
		"http://10.0.0.4/hook",
		"http://172.16.1.9/hook",
		"http://192.168.1.9/hook",
		"http://169.254.1.2/hook",
		"http://2130706433/hook",
		"http://0x7f000001/hook",
		"http://0177.0.0.1/hook",
	}
	for _, rawURL := range unsafeURLs {
		if _, err := svc.CreateEndpoint(context.Background(), 42, CreateEndpointInput{URL: rawURL, Events: []string{"activation.finished"}}); err == nil {
			t.Fatalf("expected unsafe URL %q to be rejected", rawURL)
		}
	}
}

func TestCreateEndpointRejectsDomainResolvingToPrivateIP(t *testing.T) {
	svc := NewService(&stubRepo{})
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("10.0.0.5")}})
	if _, err := svc.CreateEndpoint(context.Background(), 42, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}}); err == nil {
		t.Fatal("expected domain resolving to private IP to be rejected")
	}
}

func TestCreateEndpointStoresEncryptedSecretMaterial(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "unit-test-webhook-key")
	repo := &stubRepo{}
	svc := NewService(repo)
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	created, err := svc.CreateEndpoint(context.Background(), 42, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}})
	if err != nil {
		t.Fatalf("CreateEndpoint returned error: %v", err)
	}
	if len(repo.endpoints) != 1 {
		t.Fatalf("expected stored endpoint")
	}
	stored := repo.endpoints[0]
	if stored.SecretCiphertext == "" || !strings.HasPrefix(stored.SecretCiphertext, webhookSecretCipherPrefix) {
		t.Fatalf("expected encrypted secret ciphertext, got %q", stored.SecretCiphertext)
	}
	if strings.Contains(stored.SecretCiphertext, created.SigningSecret) {
		t.Fatal("ciphertext must not contain plaintext signing secret")
	}
	if stored.SecretPreview != created.SecretPreview {
		t.Fatalf("expected stored preview %q, got %q", created.SecretPreview, stored.SecretPreview)
	}
}

func TestListEndpointsUsesDefaultBoundedLimit(t *testing.T) {
	repo := &stubRepo{}
	svc := NewService(repo)
	if _, err := svc.ListEndpoints(context.Background(), 42); err != nil {
		t.Fatalf("ListEndpoints returned error: %v", err)
	}
	if repo.lastListLimit != defaultEndpointListLimit {
		t.Fatalf("expected default list limit %d, got %d", defaultEndpointListLimit, repo.lastListLimit)
	}
}

func TestCreateEndpointRequiresEncryptionKey(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "")
	t.Setenv("JWT_SECRET", "")
	svc := NewService(&stubRepo{})
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	if _, err := svc.CreateEndpoint(context.Background(), 42, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}}); err == nil {
		t.Fatal("expected missing encryption key to reject endpoint creation")
	}
}

func TestCreateTestDeliveryCreatesPendingRetryRecordWithoutNetwork(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "unit-test-webhook-key")
	repo := &stubRepo{}
	svc := NewService(repo)
	created, err := svc.CreateEndpoint(context.Background(), 7, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}})
	if err != nil {
		t.Fatalf("CreateEndpoint returned error: %v", err)
	}
	delivery, err := svc.CreateTestDelivery(context.Background(), 7, created.ID)
	if err != nil {
		t.Fatalf("CreateTestDelivery returned error: %v", err)
	}
	if delivery.Status != DeliveryStatusPending {
		t.Fatalf("expected pending delivery, got %q", delivery.Status)
	}
	if delivery.AttemptCount != 0 {
		t.Fatalf("expected zero attempts before worker sends, got %d", delivery.AttemptCount)
	}
	if delivery.EventType != EventTypeWebhookTest {
		t.Fatalf("expected test event type, got %q", delivery.EventType)
	}
	if len(repo.deliveries) != 1 {
		t.Fatalf("expected exactly one delivery record, got %d", len(repo.deliveries))
	}
}

func TestListEndpointDeliveriesRequiresOwnedEndpointAndReturnsPendingRecords(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "unit-test-webhook-key")
	repo := &stubRepo{}
	svc := NewService(repo)
	created, err := svc.CreateEndpoint(context.Background(), 7, CreateEndpointInput{URL: "https://hooks.example.com/mail", Events: []string{"activation.finished"}})
	if err != nil {
		t.Fatalf("CreateEndpoint returned error: %v", err)
	}
	if _, err := svc.CreateTestDelivery(context.Background(), 7, created.ID); err != nil {
		t.Fatalf("CreateTestDelivery returned error: %v", err)
	}

	items, err := svc.ListEndpointDeliveries(context.Background(), 7, created.ID)
	if err != nil {
		t.Fatalf("ListEndpointDeliveries returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one delivery, got %d", len(items))
	}
	if items[0].EndpointID != created.ID || items[0].Status != DeliveryStatusPending || items[0].EventType != EventTypeWebhookTest {
		t.Fatalf("unexpected delivery item: %+v", items[0])
	}
	if _, err := svc.ListEndpointDeliveries(context.Background(), 8, created.ID); err != ErrEndpointNotFound {
		t.Fatalf("expected other user to receive ErrEndpointNotFound, got %v", err)
	}
}
