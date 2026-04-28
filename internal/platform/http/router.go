package httpx

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/app/bootstrap"
	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/modules/finance"
	"github.com/1420970597/nexus-mail/internal/modules/risk"
	"github.com/1420970597/nexus-mail/internal/modules/webhook"
)

func NewRouter(app *bootstrap.App) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.GET("/healthz", func(c *gin.Context) {
		payload := gin.H{"status": "ok"}
		if app != nil && app.Redis != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 100*time.Millisecond)
			defer cancel()
			if err := app.Redis.Ping(ctx).Err(); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "redis": "unavailable"})
				return
			}
			payload["redis"] = "ok"
		}
		c.JSON(http.StatusOK, payload)
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

		activationHandler := activation.NewHandler(app.ActivationService)
		apiKeyWrite := api.Group("")
		apiKeyWrite.Use(authHandler.AuthRequiredForAPIKeyScope("activation:write"))
		activationHandler.RegisterAPIKeyWriteRoutes(apiKeyWrite)

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

		activationHandler.RegisterRoutes(secure)
		activationHandler.RegisterOrderRoutes(secure)
		activationHandler.RegisterSupplierAdminRoutes(secure)
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
		riskHandler := risk.NewHandler(app.RiskService)
		riskHandler.RegisterAdminRoutes(admin)
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
	rules, err := loadRiskRuleConfigs(ctx, app)
	if err != nil {
		return nil, err
	}
	summary, signals := auth.BuildRiskSignalsWithRules(ctx, orders, disputes, audit, rules)
	return gin.H{
		"generated_at": time.Now().UTC(),
		"summary":      summary,
		"signals":      signals,
	}, nil
}

func loadRiskRuleConfigs(ctx context.Context, app *bootstrap.App) ([]auth.RiskRuleConfig, error) {
	if app == nil || app.RiskService == nil {
		return nil, nil
	}
	items, err := app.RiskService.ListRules(ctx)
	if err != nil {
		return nil, err
	}
	rules := make([]auth.RiskRuleConfig, 0, len(items))
	for _, item := range items {
		rules = append(rules, auth.RiskRuleConfig{
			Key:       item.Key,
			Enabled:   item.Enabled,
			Threshold: item.Threshold,
			Severity:  item.Severity,
		})
	}
	return rules, nil
}

func loadAdminDashboardData(ctx context.Context, app *bootstrap.App) ([]auth.DashboardProject, []auth.DashboardOrder, []auth.DashboardWalletUser, []auth.DashboardDispute, []auth.APIKeyAuditEntry, error) {
	users, err := app.AuthService.ListAllUsers(ctx)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	projects := make([]auth.DashboardProject, 0)
	walletUsers := make([]auth.DashboardWalletUser, 0, len(users))
	orders := make([]auth.DashboardOrder, 0)
	for _, user := range users {
		walletUsers = append(walletUsers, auth.DashboardWalletUser{UserID: user.ID, Email: user.Email, Role: string(user.Role)})
	}
	orderItems, err := app.ActivationService.ListAllActivationOrders(ctx)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	for _, entry := range orderItems {
		orders = append(orders, auth.DashboardOrder{ID: entry.ID, UserID: entry.UserID, Status: entry.Status, FinalPrice: entry.FinalPrice})
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
