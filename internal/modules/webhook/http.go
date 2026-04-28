package webhook

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) RegisterRoutes(secure *gin.RouterGroup) {
	group := secure.Group("/webhooks")
	group.GET("/endpoints", h.listEndpoints)
	group.POST("/endpoints", h.createEndpoint)
	group.GET("/endpoints/:id/deliveries", h.listDeliveries)
	group.POST("/endpoints/:id/test-delivery", h.createTestDelivery)
}

func (h *Handler) listEndpoints(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.ListEndpoints(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) createEndpoint(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	var input CreateEndpointInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, err := h.service.CreateEndpoint(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"endpoint": item})
}

func (h *Handler) listDeliveries(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	endpointID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || endpointID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 webhook endpoint ID"})
		return
	}
	items, err := h.service.ListEndpointDeliveries(c.Request.Context(), user.ID, endpointID)
	if err != nil {
		status := http.StatusBadRequest
		if err == ErrEndpointNotFound {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) createTestDelivery(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	endpointID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || endpointID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 webhook endpoint ID"})
		return
	}
	item, err := h.service.CreateTestDelivery(c.Request.Context(), user.ID, endpointID)
	if err != nil {
		status := http.StatusBadRequest
		if err == ErrEndpointNotFound {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"delivery": item})
}
