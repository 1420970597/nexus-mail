package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/app/bootstrap"
	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/modules/finance"
)

func NewRouter(app *bootstrap.App) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		api.GET("/system/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		authHandler := auth.NewHandler(app.AuthService)
		authGroup := api.Group("/auth")
		authHandler.RegisterRoutes(authGroup)

		apiKeyRead := api.Group("")
		apiKeyRead.Use(authHandler.AuthRequiredForAPIKeyScope("activation:read"))
		apiKeyRead.GET("/dashboard/overview/api-key", func(c *gin.Context) {
			user := c.MustGet("currentUser").(auth.User)
			key := c.MustGet("currentAPIKey").(auth.APIKey)
			inventory, err := app.ActivationService.ListInventory(c.Request.Context())
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"message":    "dashboard ready",
				"role":       user.Role,
				"api_key_id": key.ID,
				"stats": gin.H{
					"projects":  len(inventory),
					"suppliers": uniqueSuppliers(inventory),
				},
			})
		})

		secure := api.Group("")
		secure.Use(authHandler.AuthRequiredForRoutes())
		secure.GET("/dashboard/overview", func(c *gin.Context) {
			user := c.MustGet("currentUser").(auth.User)
			inventory, _ := app.ActivationService.ListInventory(c.Request.Context())
			orders, _ := app.ActivationService.ListActivationOrders(c.Request.Context(), user.ID)
			c.JSON(http.StatusOK, gin.H{
				"message": "dashboard ready",
				"role":    user.Role,
				"stats": gin.H{
					"projects":  len(inventory),
					"orders":    len(orders),
					"suppliers": uniqueSuppliers(inventory),
				},
			})
		})

		activationHandler := activation.NewHandler(app.ActivationService)
		activationHandler.RegisterRoutes(secure)
		financeHandler := finance.NewHandler(app.FinanceService, app.Config.AppEnv == "development")
		financeHandler.RegisterRoutes(secure)

		supplier := secure.Group("/supplier")
		supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
		supplier.GET("/overview", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "supplier overview"})
		})

		admin := secure.Group("/admin")
		admin.Use(auth.RequireRoles(auth.RoleAdmin))
		admin.GET("/overview", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin overview"})
		})
		admin.GET("/risk", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin risk center"})
		})
		admin.GET("/audit", authHandler.AdminAudit)
	}

	return r
}

func uniqueSuppliers(items []activation.ProjectOffering) int {
	seen := map[int64]struct{}{}
	for _, item := range items {
		seen[item.SupplierID] = struct{}{}
	}
	return len(seen)
}
