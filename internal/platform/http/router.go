package httpx

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/app/bootstrap"
	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/modules/finance"
	"github.com/1420970597/nexus-mail/internal/modules/webhook"
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
		webhookHandler := webhook.NewHandler(app.WebhookService)
		webhookHandler.RegisterRoutes(secure)

		supplier := secure.Group("/supplier")
		supplier.Use(auth.RequireRoles(auth.RoleSupplier, auth.RoleAdmin))
		supplier.GET("/overview", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "supplier overview"})
		})

		admin := secure.Group("/admin")
		admin.Use(auth.RequireRoles(auth.RoleAdmin))
		admin.GET("/overview", func(c *gin.Context) {
			payload, err := buildAdminOverviewPayload(c.Request.Context(), app)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, payload)
		})
		admin.GET("/risk", func(c *gin.Context) {
			payload, err := buildAdminRiskPayload(c.Request.Context(), app)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, payload)
		})
		admin.GET("/audit", authHandler.AdminAudit)
	}

	return r
}

func buildAdminOverviewPayload(ctx context.Context, app *bootstrap.App) (gin.H, error) {
	projects, orders, wallets, disputes, audit, err := loadAdminDashboardData(ctx, app)
	if err != nil {
		return nil, err
	}
	summary := auth.BuildDashboardSummary(ctx, projects, orders, wallets, disputes, audit)
	return gin.H{
		"generated_at": time.Now().UTC(),
		"summary":      summary,
		"recent_audit": latestAuditEntries(audit, 5),
	}, nil
}

func buildAdminRiskPayload(ctx context.Context, app *bootstrap.App) (gin.H, error) {
	_, orders, _, disputes, audit, err := loadAdminDashboardData(ctx, app)
	if err != nil {
		return nil, err
	}
	summary, signals := auth.BuildRiskSignals(ctx, orders, disputes, audit)
	return gin.H{
		"generated_at": time.Now().UTC(),
		"summary":      summary,
		"signals":      signals,
	}, nil
}

func loadAdminDashboardData(ctx context.Context, app *bootstrap.App) ([]auth.DashboardProject, []auth.DashboardOrder, []auth.DashboardWalletUser, []auth.DashboardDispute, []auth.APIKeyAuditEntry, error) {
	users, err := app.AuthService.ListAllUsers(ctx)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	projects := make([]auth.DashboardProject, 0)
	walletUsers := make([]auth.DashboardWalletUser, 0, len(users))
	orders := make([]auth.DashboardOrder, 0)
	endUserCount := 0
	for _, user := range users {
		walletUsers = append(walletUsers, auth.DashboardWalletUser{UserID: user.ID, Email: user.Email, Role: string(user.Role)})
		if user.Role == auth.RoleUser {
			endUserCount++
		}
	}
	if endUserCount > 10 {
		return nil, nil, nil, nil, nil, errors.New("管理员概览当前仅支持 10 个以内终端用户的实时聚合，请先扩展聚合查询实现")
	}
	for _, user := range users {
		if user.Role == auth.RoleUser {
			entries, listErr := app.ActivationService.ListActivationOrders(ctx, user.ID)
			if listErr != nil {
				return nil, nil, nil, nil, nil, listErr
			}
			for _, entry := range entries {
				orders = append(orders, auth.DashboardOrder{ID: entry.ID, UserID: entry.UserID, Status: entry.Status})
			}
		}
	}
	projectItems, err := app.ActivationService.ListAllProjects(ctx)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	for _, item := range projectItems {
		projects = append(projects, auth.DashboardProject{ID: item.ID, Key: item.Key, Name: item.Name, IsActive: item.IsActive})
	}
	financeUsers, err := app.FinanceService.AdminWalletUsers(ctx)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	pendingByUser := map[int64]int64{}
	for _, wallet := range financeUsers {
		pendingByUser[wallet.UserID] = wallet.PendingSettlement
	}
	for index := range walletUsers {
		walletUsers[index].PendingSettlement = pendingByUser[walletUsers[index].UserID]
	}
	adminDisputes, err := app.FinanceService.ListOrderDisputes(ctx, 0, true)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	disputes := make([]auth.DashboardDispute, 0, len(adminDisputes))
	for _, item := range adminDisputes {
		disputes = append(disputes, auth.DashboardDispute{ID: item.ID, Status: item.Status})
	}
	audit, err := app.AuthService.ListAdminAudit(ctx, auth.AdminAuditFilter{Limit: 200})
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	return projects, orders, walletUsers, disputes, normalizeAuditEntries(audit), nil
}

func latestAuditEntries(items []auth.APIKeyAuditEntry, limit int) []auth.APIKeyAuditEntry {
	if limit <= 0 || len(items) <= limit {
		copied := make([]auth.APIKeyAuditEntry, len(items))
		copy(copied, items)
		return copied
	}
	copied := make([]auth.APIKeyAuditEntry, limit)
	copy(copied, items[:limit])
	return copied
}

func normalizeAuditEntries(items []auth.APIKeyAuditEntry) []auth.APIKeyAuditEntry {
	copied := make([]auth.APIKeyAuditEntry, 0, len(items))
	for _, item := range items {
		item.Action = strings.ToLower(strings.TrimSpace(item.Action))
		item.ActorType = strings.ToLower(strings.TrimSpace(item.ActorType))
		copied = append(copied, item)
	}
	return copied
}

func uniqueSuppliers(items []activation.ProjectOffering) int {
	seen := map[int64]struct{}{}
	for _, item := range items {
		seen[item.SupplierID] = struct{}{}
	}
	return len(seen)
}
