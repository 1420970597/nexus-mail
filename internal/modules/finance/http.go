package finance

import (
	"net/http"

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

	supplier := secure.Group("/supplier")
	supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
	supplier.GET("/settlements", h.supplierOverview)

	admin := secure.Group("/admin")
	admin.Use(auth.RequireRoles(auth.RoleAdmin))
	admin.GET("/wallet-users", h.adminWalletUsers)
	admin.POST("/wallet-adjustments", h.adminAdjustWallet)
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
