package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/modules/mailboxpoll"
	"github.com/1420970597/nexus-mail/internal/platform/config"
	"github.com/1420970597/nexus-mail/internal/platform/database"
)

type accountHealthWriter struct {
	repo *activation.Repository
}

func (w accountHealthWriter) UpdateProviderAccountHealth(ctx context.Context, accountID int64, status, reason, accessToken, refreshToken string, expiresAt *time.Time) error {
	return w.repo.UpdateProviderAccountHealth(ctx, accountID, activation.ProviderAccountHealthUpdate{
		Status:         status,
		Reason:         reason,
		AccessToken:    accessToken,
		RefreshToken:   refreshToken,
		TokenExpiresAt: expiresAt,
	})
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer db.Close()
	repo := activation.NewRepository(db.Pool)
	service := activation.NewService(repo)
	pollSync := mailboxpoll.SyncService{
		Refresher: mailboxpoll.NewHTTPOAuthRefresher(map[string]mailboxpoll.ProviderOAuthConfig{
			"gmail": {
				ClientID:     cfg.GoogleOAuthClientID,
				ClientSecret: cfg.GoogleOAuthSecret,
				TokenURL:     cfg.GoogleOAuthTokenURL,
			},
			"microsoft": {
				ClientID:     cfg.MicrosoftOAuthClientID,
				ClientSecret: cfg.MicrosoftOAuthSecret,
				TokenURL:     cfg.MicrosoftOAuthTokenURL,
				Scope:        "offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/POP.AccessAsUser.All",
			},
		}),
		Writer: accountHealthWriter{repo: repo},
	}
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	log.Println("nexus-mail scheduler booted")

	runSweep := func() {
		now := time.Now().UTC()
		expired, err := service.ExpireStaleActivationOrders(ctx, now)
		if err != nil {
			log.Printf("expire stale activation orders failed: %v", err)
		} else {
			log.Printf("scheduler timeout sweep complete: expired=%d", expired)
		}
		finalized, err := service.FinalizeReadyActivationOrders(ctx, now, cfg.OrderAutoFinishAfter)
		if err != nil {
			log.Printf("finalize ready activation orders failed: %v", err)
		} else {
			log.Printf("scheduler finalize sweep complete: finalized=%d", finalized)
		}
		accounts, err := repo.ListActiveProviderAccounts(ctx)
		if err != nil {
			log.Printf("list provider accounts failed: %v", err)
			return
		}
		for _, account := range accounts {
			if account.Status != "active" {
				continue
			}
			if err := pollSync.SyncAccount(ctx, mailboxpoll.AccountConfig{
				AccountID:      account.ID,
				Provider:       account.Provider,
				SourceType:     account.SourceType,
				AuthMode:       account.AuthMode,
				ProtocolMode:   account.ProtocolMode,
				Identifier:     account.Identifier,
				Host:           account.Host,
				Port:           account.Port,
				AccessToken:    account.AccessToken,
				RefreshToken:   account.RefreshToken,
				TokenExpiresAt: account.TokenExpiresAt,
				BridgeEndpoint: account.BridgeEndpoint,
				BridgeLabel:    account.BridgeLabel,
			}); err != nil {
				log.Printf("sync provider account health failed: account=%d err=%v", account.ID, err)
			}
		}
	}

	runSweep()
	for {
		select {
		case <-ticker.C:
			runSweep()
		case <-ctx.Done():
			log.Printf("scheduler shutting down: %v", ctx.Err())
			return
		}
	}
}
