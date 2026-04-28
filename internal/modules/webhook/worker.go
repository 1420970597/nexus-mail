package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	defaultDeliveryBatchSize   = 20
	defaultDeliveryMaxAttempts = 5
	defaultDeliveryHTTPTimeout = 10 * time.Second
	defaultDeliveryLockTTL     = 2 * time.Minute
	maxDeliveryErrorLength     = 500
)

type WebhookDeliveryUpdate struct {
	ID            int64
	Status        string
	AttemptCount  int
	NextAttemptAt time.Time
	LastError     string
}

type DeliveryWorkerConfig struct {
	WorkerID    string
	BatchSize   int
	MaxAttempts int
	HTTPClient  *http.Client
	Now         func() time.Time
}

type DeliveryWorker struct {
	service     *Service
	repo        deliveryRepository
	workerID    string
	batchSize   int
	maxAttempts int
	httpClient  *http.Client
	now         func() time.Time
}

func NewDeliveryWorker(service *Service, cfg DeliveryWorkerConfig) *DeliveryWorker {
	workerID := strings.TrimSpace(cfg.WorkerID)
	if workerID == "" {
		workerID = "nexus-mail-webhook-worker"
	}
	batchSize := cfg.BatchSize
	if batchSize <= 0 || batchSize > maxEndpointListLimit {
		batchSize = defaultDeliveryBatchSize
	}
	maxAttempts := cfg.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = defaultDeliveryMaxAttempts
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: defaultDeliveryHTTPTimeout}
	}
	now := cfg.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	var repo deliveryRepository
	if service != nil {
		repo, _ = service.repo.(deliveryRepository)
	}
	return &DeliveryWorker{service: service, repo: repo, workerID: workerID, batchSize: batchSize, maxAttempts: maxAttempts, httpClient: client, now: now}
}

func (w *DeliveryWorker) ProcessPending(ctx context.Context) (int, error) {
	if w == nil || w.service == nil || w.repo == nil {
		return 0, errors.New("webhook delivery worker not configured")
	}
	items, err := w.repo.ClaimPendingDeliveries(ctx, w.workerID, w.batchSize)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, item := range items {
		if err := w.processOne(ctx, item); err != nil {
			return processed, err
		}
		processed++
	}
	return processed, nil
}

func (w *DeliveryWorker) processOne(ctx context.Context, delivery WebhookDelivery) error {
	endpoint, err := w.repo.GetEndpointByID(ctx, delivery.EndpointID)
	if err != nil {
		return w.recordFailure(ctx, delivery, fmt.Sprintf("load endpoint: %v", err))
	}
	if endpoint.Status != EndpointStatusActive {
		return w.recordFailure(ctx, delivery, "endpoint inactive")
	}
	if _, err := w.service.validateEndpointURL(ctx, endpoint.URL); err != nil {
		return w.recordFailure(ctx, delivery, err.Error())
	}
	secret, err := w.service.decryptSigningSecret(endpoint.UserID, endpoint.SecretCiphertext)
	if err != nil {
		return w.recordFailure(ctx, delivery, fmt.Sprintf("decrypt signing secret: %v", err))
	}
	payload := []byte(delivery.Payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.URL, bytes.NewReader(payload))
	if err != nil {
		return w.recordFailure(ctx, delivery, err.Error())
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "nexus-mail-webhook/1.0")
	req.Header.Set("X-Nexus-Webhook-Event", delivery.EventType)
	req.Header.Set("X-Nexus-Webhook-Delivery", fmt.Sprintf("%d", delivery.ID))
	req.Header.Set("X-Nexus-Webhook-Signature", signPayload(secret, payload))
	resp, err := w.httpClient.Do(req)
	if err != nil {
		return w.recordFailure(ctx, delivery, err.Error())
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return w.recordFailure(ctx, delivery, fmt.Sprintf("webhook endpoint returned HTTP %d", resp.StatusCode))
	}
	return w.repo.UpdateDeliveryResult(ctx, WebhookDeliveryUpdate{ID: delivery.ID, Status: DeliveryStatusSent, AttemptCount: delivery.AttemptCount + 1, NextAttemptAt: w.now(), LastError: ""})
}

func (w *DeliveryWorker) recordFailure(ctx context.Context, delivery WebhookDelivery, reason string) error {
	attempts := delivery.AttemptCount + 1
	status := DeliveryStatusPending
	nextAttemptAt := w.now().Add(deliveryBackoff(attempts))
	if attempts >= w.maxAttempts {
		status = DeliveryStatusFailed
		nextAttemptAt = w.now()
	}
	return w.repo.UpdateDeliveryResult(ctx, WebhookDeliveryUpdate{ID: delivery.ID, Status: status, AttemptCount: attempts, NextAttemptAt: nextAttemptAt, LastError: truncateDeliveryError(reason)})
}

func deliveryBackoff(attempts int) time.Duration {
	if attempts < 1 {
		attempts = 1
	}
	if attempts > 6 {
		attempts = 6
	}
	return time.Duration(1<<uint(attempts-1)) * time.Minute
}

func signPayload(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func truncateDeliveryError(reason string) string {
	reason = strings.TrimSpace(reason)
	if len(reason) <= maxDeliveryErrorLength {
		return reason
	}
	return reason[:maxDeliveryErrorLength]
}
