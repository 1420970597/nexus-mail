package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"github.com/1420970597/nexus-mail/internal/modules/activation"
	"github.com/1420970597/nexus-mail/internal/platform/config"
	"github.com/1420970597/nexus-mail/internal/platform/database"
)

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
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	log.Println("nexus-mail scheduler booted")

	runSweep := func() {
		expired, err := service.ExpireStaleActivationOrders(ctx, time.Now().UTC())
		if err != nil {
			log.Printf("expire stale activation orders failed: %v", err)
			return
		}
		log.Printf("scheduler timeout sweep complete: expired=%d", expired)
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
