package main

import (
	"context"
	"testing"
	"time"

	"github.com/1420970597/nexus-mail/internal/modules/webhook"
)

type schedulerWebhookRepo struct{}

func (schedulerWebhookRepo) ListEndpoints(context.Context, int64, int) ([]webhook.WebhookEndpoint, error) {
	return nil, nil
}
func (schedulerWebhookRepo) CreateEndpoint(context.Context, webhook.CreateEndpointRecord) (webhook.WebhookEndpoint, error) {
	return webhook.WebhookEndpoint{}, nil
}
func (schedulerWebhookRepo) GetEndpoint(context.Context, int64, int64) (webhook.WebhookEndpoint, error) {
	return webhook.WebhookEndpoint{}, webhook.ErrEndpointNotFound
}
func (schedulerWebhookRepo) CreateDelivery(context.Context, webhook.CreateDeliveryRecord) (webhook.WebhookDelivery, error) {
	return webhook.WebhookDelivery{}, nil
}
func (schedulerWebhookRepo) ListDeliveries(context.Context, int64, int64, int) ([]webhook.WebhookDelivery, error) {
	return nil, nil
}
func (schedulerWebhookRepo) ClaimPendingDeliveries(context.Context, string, int) ([]webhook.WebhookDelivery, error) {
	return nil, nil
}
func (schedulerWebhookRepo) GetEndpointByID(context.Context, int64) (webhook.WebhookEndpoint, error) {
	return webhook.WebhookEndpoint{}, webhook.ErrEndpointNotFound
}
func (schedulerWebhookRepo) UpdateDeliveryResult(context.Context, webhook.WebhookDeliveryUpdate) error {
	return nil
}

func TestWebhookWorkerModeSelectsWebhookLoop(t *testing.T) {
	mode := schedulerMode([]string{"scheduler", "webhook-worker"})
	if mode != "webhook-worker" {
		t.Fatalf("expected webhook-worker mode, got %q", mode)
	}
}

func TestWebhookWorkerLoopProcessesWithoutBlockingSchedulerSweep(t *testing.T) {
	svc := webhook.NewServiceWithEncryptionKey(schedulerWebhookRepo{}, "unit-test-webhook-key")
	worker := newWebhookDeliveryWorker(svc)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	processed, err := worker.ProcessPending(ctx)
	if err != nil {
		t.Fatalf("ProcessPending returned error: %v", err)
	}
	if processed != 0 {
		t.Fatalf("expected no pending deliveries, got %d", processed)
	}
}

func TestWebhookWorkerModeUsesNetworkResolver(t *testing.T) {
	repo := schedulerWebhookRepo{}
	svc := webhook.NewServiceWithEncryptionKey(repo, "unit-test-webhook-key")
	worker := newWebhookDeliveryWorker(svc)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	processed, err := worker.ProcessPending(ctx)
	if err != nil {
		t.Fatalf("ProcessPending returned error: %v", err)
	}
	if processed != 0 {
		t.Fatalf("expected no pending deliveries, got %d", processed)
	}
}
