package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestAuthRequiredAcceptsTrimmedBearerToken(t *testing.T) {
	service := NewService(nil, nil, "super-secret-value", 3600*time.Second, 7200*time.Second)
	sessionID, err := generateTokenID()
	if err != nil {
		t.Fatalf("generate token id: %v", err)
	}
	accessToken, err := service.issueToken(User{ID: 7, Email: "supplier@nexus-mail.local", Role: RoleSupplier}, sessionID)
	if err != nil {
		t.Fatalf("issue access token: %v", err)
	}

	r := gin.New()
	r.GET("/secure", handlerWithTestService(service))

	req := httptest.NewRequest(http.MethodGet, "/secure", nil)
	req.Header.Set("Authorization", "  Bearer "+accessToken+"  ")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["email"] != "supplier@nexus-mail.local" {
		t.Fatalf("unexpected payload: %#v", payload)
	}
}

func handlerWithTestService(service *Service) gin.HandlerFunc {
	h := &Handler{service: service}
	return func(c *gin.Context) {
		h.authRequired()(c)
		if c.IsAborted() {
			return
		}
		user := c.MustGet("currentUser").(User)
		c.JSON(http.StatusOK, gin.H{"email": user.Email})
	}
}
