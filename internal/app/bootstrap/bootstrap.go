package bootstrap

import (
	"context"
	"fmt"
	"time"

	"github.com/1420970597/nexus-mail/internal/modules/auth"
	"github.com/1420970597/nexus-mail/internal/platform/config"
	"github.com/1420970597/nexus-mail/internal/platform/database"
)

type App struct {
	Config      config.Config
	DB          *database.DB
	AuthService *auth.Service
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	repo := auth.NewRepository(db.Pool)
	service := auth.NewService(repo, cfg.JWTSecret, time.Duration(cfg.JWTExpireSeconds)*time.Second, time.Duration(cfg.RefreshExpireSeconds)*time.Second)
	if err := repo.EnsureSchema(ctx); err != nil {
		return nil, fmt.Errorf("ensure auth schema: %w", err)
	}
	if err := repo.SeedDevelopmentUsers(ctx, cfg.AppEnv); err != nil {
		return nil, fmt.Errorf("seed development users: %w", err)
	}
	return &App{Config: cfg, DB: db, AuthService: service}, nil
}
