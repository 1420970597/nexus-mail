package webhook

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type workerRepo struct {
	endpoints  map[int64]WebhookEndpoint
	deliveries map[int64]WebhookDelivery
	claimed    []int64
	updated    []WebhookDeliveryUpdate
}

func newWorkerRepo() *workerRepo {
	return &workerRepo{endpoints: map[int64]WebhookEndpoint{}, deliveries: map[int64]WebhookDelivery{}}
}

func (r *workerRepo) ListEndpoints(ctx context.Context, userID int64, limit int) ([]WebhookEndpoint, error) {
	return nil, nil
}

func (r *workerRepo) CreateEndpoint(ctx context.Context, input CreateEndpointRecord) (WebhookEndpoint, error) {
	return WebhookEndpoint{}, nil
}

func (r *workerRepo) GetEndpoint(ctx context.Context, userID, endpointID int64) (WebhookEndpoint, error) {
	item, err := r.GetEndpointByID(ctx, endpointID)
	if err != nil || item.UserID != userID {
		return WebhookEndpoint{}, ErrEndpointNotFound
	}
	return item, nil
}

func (r *workerRepo) CreateDelivery(ctx context.Context, input CreateDeliveryRecord) (WebhookDelivery, error) {
	return WebhookDelivery{}, nil
}

func (r *workerRepo) ListDeliveries(ctx context.Context, userID, endpointID int64, limit int) ([]WebhookDelivery, error) {
	return nil, nil
}

func (r *workerRepo) ClaimPendingDeliveries(ctx context.Context, workerID string, limit int) ([]WebhookDelivery, error) {
	items := make([]WebhookDelivery, 0)
	for id, item := range r.deliveries {
		if item.Status != DeliveryStatusPending || item.NextAttemptAt.After(time.Now()) || (!item.ExpiresAt.IsZero() && !item.ExpiresAt.After(time.Now())) {
			continue
		}
		if item.LockedAt != nil && item.LockedAt.After(time.Now().Add(-defaultDeliveryLockTTL)) {
			continue
		}
		now := time.Now().UTC()
		item.LockedAt = &now
		item.LockedBy = workerID
		r.deliveries[id] = item
		r.claimed = append(r.claimed, id)
		items = append(items, item)
		if len(items) >= limit {
			break
		}
	}
	return items, nil
}

func (r *workerRepo) GetEndpointByID(ctx context.Context, endpointID int64) (WebhookEndpoint, error) {
	item, ok := r.endpoints[endpointID]
	if !ok {
		return WebhookEndpoint{}, ErrEndpointNotFound
	}
	return item, nil
}

func (r *workerRepo) UpdateDeliveryResult(ctx context.Context, input WebhookDeliveryUpdate) error {
	item := r.deliveries[input.ID]
	item.Status = input.Status
	item.AttemptCount = input.AttemptCount
	item.NextAttemptAt = input.NextAttemptAt
	item.LastError = input.LastError
	item.LockedAt = nil
	item.LockedBy = ""
	r.deliveries[input.ID] = item
	r.updated = append(r.updated, input)
	return nil
}

func TestWorkerDeliversPendingWebhookWithSignatureAndMarksSent(t *testing.T) {
	secret := "whsec_unit_test_secret"
	repo := newWorkerRepo()
	svc := NewServiceWithEncryptionKey(repo, "unit-test-webhook-key")
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	ciphertext, err := svc.encryptSigningSecret(42, secret)
	if err != nil {
		t.Fatalf("encrypt signing secret: %v", err)
	}
	var gotSignature string
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		gotSignature = r.Header.Get("X-Nexus-Webhook-Signature")
		if r.Header.Get("X-Nexus-Webhook-Event") != EventTypeWebhookTest {
			t.Fatalf("unexpected event header %q", r.Header.Get("X-Nexus-Webhook-Event"))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	listener, err := net.Listen("tcp", "203.0.113.10:0")
	if err != nil {
		t.Skipf("test host cannot bind documentation IP: %v", err)
	}
	server.Listener = listener
	server.Start()
	defer server.Close()
	repo.endpoints[1] = WebhookEndpoint{ID: 1, UserID: 42, URL: server.URL, Status: EndpointStatusActive, SecretCiphertext: ciphertext}
	repo.deliveries[10] = WebhookDelivery{ID: 10, EndpointID: 1, UserID: 42, EventType: EventTypeWebhookTest, Payload: `{"type":"webhook.test"}`, Status: DeliveryStatusPending, AttemptCount: 0, NextAttemptAt: time.Now().Add(-time.Second), ExpiresAt: time.Now().Add(time.Hour)}

	worker := NewDeliveryWorker(svc, DeliveryWorkerConfig{WorkerID: "unit-worker", BatchSize: 5, HTTPClient: server.Client()})
	processed, err := worker.ProcessPending(context.Background())
	if err != nil {
		t.Fatalf("ProcessPending returned error: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected one processed delivery, got %d", processed)
	}
	updated := repo.deliveries[10]
	if updated.Status != DeliveryStatusSent || updated.AttemptCount != 1 || updated.LastError != "" {
		t.Fatalf("expected sent delivery with one attempt, got %+v", updated)
	}
	if !strings.HasPrefix(gotSignature, "sha256=") {
		t.Fatalf("expected sha256 signature header, got %q", gotSignature)
	}
	expected := signPayload(secret, []byte(repo.deliveries[10].Payload))
	if gotSignature != expected {
		t.Fatalf("expected signature %q, got %q", expected, gotSignature)
	}
}

func TestWorkerRetriesFailedWebhookWithBackoffAndEventuallyFails(t *testing.T) {
	secret := "whsec_unit_test_secret"
	repo := newWorkerRepo()
	svc := NewServiceWithEncryptionKey(repo, "unit-test-webhook-key")
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("203.0.113.10")}})
	ciphertext, err := svc.encryptSigningSecret(42, secret)
	if err != nil {
		t.Fatalf("encrypt signing secret: %v", err)
	}
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusInternalServerError)
	}))
	listener, err := net.Listen("tcp", "203.0.113.11:0")
	if err != nil {
		t.Skipf("test host cannot bind documentation IP: %v", err)
	}
	server.Listener = listener
	server.Start()
	defer server.Close()
	repo.endpoints[1] = WebhookEndpoint{ID: 1, UserID: 42, URL: server.URL, Status: EndpointStatusActive, SecretCiphertext: ciphertext}
	repo.deliveries[11] = WebhookDelivery{ID: 11, EndpointID: 1, UserID: 42, EventType: EventTypeWebhookTest, Payload: `{"type":"webhook.test"}`, Status: DeliveryStatusPending, AttemptCount: 0, NextAttemptAt: time.Now().Add(-time.Second), ExpiresAt: time.Now().Add(time.Hour)}

	worker := NewDeliveryWorker(svc, DeliveryWorkerConfig{WorkerID: "unit-worker", BatchSize: 5, HTTPClient: server.Client(), MaxAttempts: 2})
	if _, err := worker.ProcessPending(context.Background()); err != nil {
		t.Fatalf("first ProcessPending returned error: %v", err)
	}
	first := repo.deliveries[11]
	if first.Status != DeliveryStatusPending || first.AttemptCount != 1 || first.LastError == "" || !first.NextAttemptAt.After(time.Now()) {
		t.Fatalf("expected pending retry with backoff after first failure, got %+v", first)
	}
	first.NextAttemptAt = time.Now().Add(-time.Second)
	repo.deliveries[11] = first
	if _, err := worker.ProcessPending(context.Background()); err != nil {
		t.Fatalf("second ProcessPending returned error: %v", err)
	}
	second := repo.deliveries[11]
	if second.Status != DeliveryStatusFailed || second.AttemptCount != 2 || !strings.Contains(second.LastError, "500") {
		t.Fatalf("expected failed delivery after max attempts, got %+v", second)
	}
}

func TestWorkerRejectsEndpointThatResolvesPrivateAtSendTime(t *testing.T) {
	secret := "whsec_unit_test_secret"
	repo := newWorkerRepo()
	svc := NewServiceWithEncryptionKey(repo, "unit-test-webhook-key")
	svc.SetResolver(stubResolver{ips: []net.IP{net.ParseIP("10.0.0.5")}})
	ciphertext, err := svc.encryptSigningSecret(42, secret)
	if err != nil {
		t.Fatalf("encrypt signing secret: %v", err)
	}
	repo.endpoints[2] = WebhookEndpoint{ID: 2, UserID: 42, URL: "https://hooks.example.com/path", Status: EndpointStatusActive, SecretCiphertext: ciphertext}
	repo.deliveries[12] = WebhookDelivery{ID: 12, EndpointID: 2, UserID: 42, EventType: EventTypeWebhookTest, Payload: `{"type":"webhook.test"}`, Status: DeliveryStatusPending, AttemptCount: 0, NextAttemptAt: time.Now().Add(-time.Second), ExpiresAt: time.Now().Add(time.Hour)}

	worker := NewDeliveryWorker(svc, DeliveryWorkerConfig{WorkerID: "unit-worker", BatchSize: 5})
	if _, err := worker.ProcessPending(context.Background()); err != nil {
		t.Fatalf("ProcessPending returned error: %v", err)
	}
	updated := repo.deliveries[12]
	if updated.Status != DeliveryStatusPending || updated.AttemptCount != 1 || !strings.Contains(updated.LastError, "内网") {
		t.Fatalf("expected private resolved endpoint to be recorded as retryable failure, got %+v", updated)
	}
}

func TestWorkerClaimsStaleLocksButSkipsFreshLocks(t *testing.T) {
	repo := newWorkerRepo()
	now := time.Now().UTC()
	freshLockedAt := now.Add(-time.Minute)
	staleLockedAt := now.Add(-defaultDeliveryLockTTL - time.Minute)
	repo.deliveries[20] = WebhookDelivery{ID: 20, Status: DeliveryStatusPending, NextAttemptAt: now.Add(-time.Second), ExpiresAt: now.Add(time.Hour), LockedAt: &freshLockedAt}
	repo.deliveries[21] = WebhookDelivery{ID: 21, Status: DeliveryStatusPending, NextAttemptAt: now.Add(-time.Second), ExpiresAt: now.Add(time.Hour), LockedAt: &staleLockedAt}

	items, err := repo.ClaimPendingDeliveries(context.Background(), "unit", 10)
	if err != nil {
		t.Fatalf("ClaimPendingDeliveries returned error: %v", err)
	}
	if len(items) != 1 || items[0].ID != 21 {
		t.Fatalf("expected only stale lock to be reclaimed, got %+v", items)
	}
}
