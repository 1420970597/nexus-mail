package finance

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
)

type Handler struct {
	service        *Service
	allowSelfTopUp bool
}

func NewHandler(service *Service, allowSelfTopUp bool) *Handler {
	return &Handler{service: service, allowSelfTopUp: allowSelfTopUp}
}

func (h *Handler) RegisterRoutes(secure *gin.RouterGroup) {
	secure.GET("/wallet/overview", h.walletOverview)
	secure.GET("/wallet/transactions", h.walletTransactions)
	secure.POST("/wallet/topups", h.topupWallet)
	secure.POST("/wallet/disputes/:orderID", h.createDisputeAsUser)

	supplier := secure.Group("/supplier")
	supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
	supplier.GET("/settlements", h.supplierOverview)
	supplier.GET("/cost-profiles", h.supplierCostProfiles)
	supplier.POST("/cost-profiles", h.upsertSupplierCostProfile)
	supplier.GET("/reports", h.supplierReports)
	supplier.GET("/disputes", h.listSupplierDisputes)
	supplier.POST("/disputes/:orderID", h.createDisputeAsSupplier)

	admin := secure.Group("/admin")
	admin.Use(auth.RequireRoles(auth.RoleAdmin))
	admin.GET("/wallet-users", h.adminWalletUsers)
	admin.POST("/wallet-adjustments", h.adminAdjustWallet)
	admin.GET("/disputes", h.listAdminDisputes)
	admin.POST("/disputes/:id/resolve", h.resolveDispute)
}

func (h *Handler) walletOverview(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	item, err := h.service.WalletOverview(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": item})
}

func (h *Handler) walletTransactions(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.WalletTransactions(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) topupWallet(c *gin.Context) {
	if !h.allowSelfTopUp {
		c.JSON(http.StatusForbidden, gin.H{"error": "当前环境未开启自助充值"})
		return
	}
	user := c.MustGet("currentUser").(auth.User)
	var input TopUpInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	wallet, err := h.service.TopUpWallet(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": wallet})
}

func (h *Handler) supplierOverview(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	wallet, entries, err := h.service.SupplierOverview(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": wallet, "entries": entries})
}

func (h *Handler) adminWalletUsers(c *gin.Context) {
	items, err := h.service.AdminWalletUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) adminAdjustWallet(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	var input AdminAdjustmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	wallet, err := h.service.AdminAdjustWallet(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": wallet})
}

func (h *Handler) supplierCostProfiles(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.ListSupplierCostProfiles(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) upsertSupplierCostProfile(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	if user.Role != auth.RoleSupplier {
		c.JSON(http.StatusForbidden, gin.H{"error": "仅供应商可维护成本模型"})
		return
	}
	var input UpsertSupplierCostProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, err := h.service.UpsertSupplierCostProfile(c.Request.Context(), user.ID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"profile": item})
}

func (h *Handler) supplierReports(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.SupplierReport(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) createDisputeAsUser(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	h.createDispute(c, user, string(auth.RoleUser))
}

func (h *Handler) createDisputeAsSupplier(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	h.createDispute(c, user, string(auth.RoleSupplier))
}

func (h *Handler) createDispute(c *gin.Context, user auth.User, actorRole string) {
	orderID, ok := parseFinanceIDParam(c, "orderID", "无效的订单 ID")
	if !ok {
		return
	}
	var input CreateOrderDisputeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, err := h.service.CreateOrderDispute(c.Request.Context(), user.ID, orderID, actorRole, input.Reason)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"dispute": item})
}

func (h *Handler) listSupplierDisputes(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	items, err := h.service.ListOrderDisputes(c.Request.Context(), user.ID, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) listAdminDisputes(c *gin.Context) {
	items, err := h.service.ListOrderDisputes(c.Request.Context(), 0, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) resolveDispute(c *gin.Context) {
	user := c.MustGet("currentUser").(auth.User)
	disputeID, ok := parseFinanceIDParam(c, "id", "无效的争议单 ID")
	if !ok {
		return
	}
	var input ResolveOrderDisputeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	item, err := h.service.ResolveOrderDispute(c.Request.Context(), user.ID, disputeID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"dispute": item})
}

func parseFinanceIDParam(c *gin.Context, name string, message string) (int64, bool) {
	value, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return 0, false
	}
	return value, true
}
