package activation

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
	secure.GET("/projects", h.listProjects)
	secure.GET("/projects/inventory", h.listInventory)

	secure.GET("/orders/activations", h.listOrders)
	secure.POST("/orders/activations", h.createOrder)
	secure.GET("/orders/activations/:id", h.getOrder)
	secure.GET("/orders/activations/:id/result", h.getResult)
	secure.POST("/orders/activations/:id/cancel", h.cancelOrder)

	supplier := secure.Group("/supplier/resources")
	supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
	supplier.GET("/overview", h.supplierOverview)

	admin := secure.Group("/admin/projects")
	admin.Use(auth.RequireRoles(auth.RoleAdmin))
	admin.GET("/offerings", h.adminOfferings)
}

func (h *Handler) listProjects(c *gin.Context) {
	items, err := h.service.ListProjects(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) listInventory(c *gin.Context) {
	items, err := h.service.ListInventory(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) createOrder(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	var input CreateActivationOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	order, err := h.service.CreateActivationOrder(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"order": order})
}

func (h *Handler) listOrders(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.ListActivationOrders(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) getOrder(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	orderID, ok := parseID(c)
	if !ok {
		return
	}
	order, err := h.service.GetActivationOrder(c.Request.Context(), user.ID, orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) getResult(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	orderID, ok := parseID(c)
	if !ok {
		return
	}
	result, err := h.service.GetActivationResult(c.Request.Context(), user.ID, orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"result": result})
}

func (h *Handler) cancelOrder(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	orderID, ok := parseID(c)
	if !ok {
		return
	}
	order, err := h.service.CancelActivationOrder(c.Request.Context(), user.ID, orderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) supplierOverview(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	var (
		data map[string]any
		err  error
	)
	if user.Role == auth.RoleAdmin {
		data, err = h.service.AllSupplierResources(c.Request.Context())
	} else {
		data, err = h.service.SupplierResources(c.Request.Context(), user.ID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) adminOfferings(c *gin.Context) {
	items, err := h.service.ListInventory(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func parseID(c *gin.Context) (int64, bool) {
	value, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的订单 ID"})
		return 0, false
	}
	return value, true
}
