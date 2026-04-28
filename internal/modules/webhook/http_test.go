package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
)

type handlerRepo struct{ stubRepo }

func TestHandlerCreatesListsAndQueuesTestDelivery(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET_ENCRYPTION_KEY", "unit-test-webhook-key")
	gin.SetMode(gin.TestMode)
	repo := &handlerRepo{}
	handler := NewHandler(NewService(repo))
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("currentUser", auth.User{ID: 99, Email: "user@example.com", Role: auth.RoleUser})
		c.Next()
	})
	handler.RegisterRoutes(r.Group("/api/v1"))

	createBody := []byte(`{"url":"https://hooks.example.com/nexus","events":["activation.finished"]}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/endpoints", bytes.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 from create, got %d: %s", w.Code, w.Body.String())
	}
	var createResp map[string]WebhookEndpointResponse
	if err := json.Unmarshal(w.Body.Bytes(), &createResp); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	endpoint := createResp["endpoint"]
	if endpoint.SigningSecret == "" {
		t.Fatalf("create response should include one-time signing secret")
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/webhooks/endpoints", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from list, got %d: %s", w.Code, w.Body.String())
	}
	var listResp struct {
		Items []WebhookEndpointResponse `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(listResp.Items) != 1 {
		t.Fatalf("expected one listed endpoint, got %d", len(listResp.Items))
	}
	if listResp.Items[0].SigningSecret != "" {
		t.Fatalf("list response must not include plaintext signing secret")
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/endpoints/1/test-delivery", nil))
	if w.Code != http.StatusAccepted {
		t.Fatalf("expected 202 from test delivery, got %d: %s", w.Code, w.Body.String())
	}
	var deliveryResp map[string]WebhookDelivery
	if err := json.Unmarshal(w.Body.Bytes(), &deliveryResp); err != nil {
		t.Fatalf("decode delivery response: %v", err)
	}
	if deliveryResp["delivery"].Status != DeliveryStatusPending {
		t.Fatalf("expected pending delivery, got %q", deliveryResp["delivery"].Status)
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/webhooks/endpoints/1/deliveries", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from list deliveries, got %d: %s", w.Code, w.Body.String())
	}
	var deliveriesResp struct {
		Items []WebhookDelivery `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &deliveriesResp); err != nil {
		t.Fatalf("decode deliveries response: %v", err)
	}
	if len(deliveriesResp.Items) != 1 || deliveriesResp.Items[0].Status != DeliveryStatusPending {
		t.Fatalf("expected one pending delivery, got %+v", deliveriesResp.Items)
	}
}

func TestHandlerRejectsUnsafeEndpointURL(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&handlerRepo{}))
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("currentUser", auth.User{ID: 99, Role: auth.RoleUser})
		c.Next()
	})
	handler.RegisterRoutes(r.Group("/api/v1"))

	body := []byte(`{"url":"http://127.0.0.1:9000/hook","events":["activation.finished"]}`)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/endpoints", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsafe URL, got %d: %s", w.Code, w.Body.String())
	}
}

var _ = context.Background
