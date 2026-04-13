package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/app/bootstrap"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
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

		secure := api.Group("")
		secure.Use(authHandler.AuthRequiredForRoutes())
		secure.GET("/dashboard/overview", func(c *gin.Context) {
			user := c.MustGet("currentUser").(auth.User)
			c.JSON(http.StatusOK, gin.H{
				"message": "dashboard ready",
				"role":    user.Role,
				"stats": gin.H{
					"projects":  0,
					"orders":    0,
					"suppliers": 0,
				},
			})
		})

		supplier := secure.Group("/supplier")
		supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
		supplier.GET("/overview", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "supplier overview"})
		})
		supplier.GET("/settlements", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "supplier settlements"})
		})

		admin := secure.Group("/admin")
		admin.Use(auth.RequireRoles(auth.RoleAdmin))
		admin.GET("/overview", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin overview"})
		})
		admin.GET("/risk", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin risk center"})
		})
		admin.GET("/audit", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin audit logs"})
		})
	}

	return r
}
