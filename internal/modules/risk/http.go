package risk

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) RegisterAdminRoutes(admin *gin.RouterGroup) {
	admin.GET("/risk/rules", h.listRules)
	admin.PUT("/risk/rules", h.updateRules)
}

func (h *Handler) listRules(c *gin.Context) {
	items, err := h.service.ListRules(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) updateRules(c *gin.Context) {
	var payload struct {
		Items []UpsertRuleInput `json:"items"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.UpdateRules(c.Request.Context(), user.ID, payload.Items)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
