package bootstrap

import (
	"context"
	"fmt"
	"time"

	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/modules/finance"
	"github.com/1420970597/nexus-mail/internal/modules/risk"
	"github.com/1420970597/nexus-mail/internal/modules/webhook"
	"github.com/1420970597/nexus-mail/internal/platform/cache"
	"github.com/1420970597/nexus-mail/internal/platform/config"
	"github.com/1420970597/nexus-mail/internal/platform/database"
	redis "github.com/redis/go-redis/v9"
)

type App struct {
	Config            config.Config
	DB                *database.DB
	Redis             *redis.Client
	AuthService       *auth.Service
	ActivationService *activation.Service
	FinanceService    *finance.Service
	RiskService       *risk.Service
	WebhookService    *webhook.Service
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	redisClient, err := cache.NewRedisClient(ctx, cfg.RedisURL, cache.RedisOptions{
		DialTimeout:  cfg.RedisDialTimeout,
		ReadTimeout:  cfg.RedisReadTimeout,
		WriteTimeout: cfg.RedisWriteTimeout,
		PoolSize:     cfg.RedisPoolSize,
	})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("connect redis: %w", err)
	}
	cleanup := true
	defer func() {
		if cleanup {
			_ = redisClient.Close()
			db.Close()
		}
	}()
	authRepo := auth.NewRepository(db.Pool)
	authService := auth.NewService(authRepo, authRepo, cfg.JWTSecret, time.Duration(cfg.JWTExpireSeconds)*time.Second, time.Duration(cfg.RefreshExpireSeconds)*time.Second)
	authService.SetAPIKeyRateLimiter(auth.NewRedisAPIKeyRateLimiterWithTimeout(redisClient, "", cfg.APIKeyRateLimitTimeout))
	if err := authRepo.EnsureSchema(ctx); err != nil {
		return nil, fmt.Errorf("ensure auth schema: %w", err)
	}
	if err := authRepo.SeedDevelopmentUsers(ctx, cfg.AppEnv); err != nil {
		return nil, fmt.Errorf("seed development users: %w", err)
	}

	activationRepo := activation.NewRepository(db.Pool)
	if err := activationRepo.EnsureSchema(ctx); err != nil {
		return nil, fmt.Errorf("ensure activation schema: %w", err)
	}
	if err := activationRepo.SeedDevelopmentData(ctx, cfg.AppEnv); err != nil {
		return nil, fmt.Errorf("seed activation data: %w", err)
	}

	financeRepo := finance.NewRepository(db.Pool)
	if err := financeRepo.EnsureSchema(ctx); err != nil {
		return nil, fmt.Errorf("ensure finance schema: %w", err)
	}
	if err := financeRepo.SeedDevelopmentData(ctx, cfg.AppEnv); err != nil {
		return nil, fmt.Errorf("seed finance data: %w", err)
	}

	riskRepo := risk.NewRepository(db.Pool)
	riskService := risk.NewService(riskRepo)
	if err := riskService.EnsureReady(ctx); err != nil {
		return nil, fmt.Errorf("ensure risk schema: %w", err)
	}

	webhookRepo := webhook.NewRepository(db.Pool)
	if err := webhookRepo.EnsureSchema(ctx); err != nil {
		return nil, fmt.Errorf("ensure webhook schema: %w", err)
	}
	webhookService := webhook.NewServiceWithEncryptionKey(webhookRepo, cfg.WebhookEncryptionKey)
	webhookService.UseNetworkResolver()

	cleanup = false
	return &App{
		Config:            cfg,
		DB:                db,
		Redis:             redisClient,
		AuthService:       authService,
		ActivationService: activation.NewService(activationRepo),
		FinanceService:    finance.NewService(financeRepo),
		RiskService:       riskService,
		WebhookService:    webhookService,
	}, nil
}

func (a *App) Close() {
	if a == nil {
		return
	}
	if a.Redis != nil {
		_ = a.Redis.Close()
	}
	if a.DB != nil {
		a.DB.Close()
	}
}
