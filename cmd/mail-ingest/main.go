package main

import (
	"context"
	"log"
	"net"
	"os"

	"github.com/1420970597/nexus-mail/internal/modules/mailingest"
	"github.com/1420970597/nexus-mail/internal/platform/config"
	"github.com/1420970597/nexus-mail/internal/platform/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	ctx := context.Background()
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer db.Close()

	service := mailingest.NewService(cfg.MailIngestSpoolDir)
	repo := mailingest.NewRepository(db.Pool)
	if err := repo.EnsureSchema(ctx); err != nil {
		log.Fatalf("ensure mail-ingest schema: %v", err)
	}
	storage, err := mailingest.NewMinIOStorage(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOUseSSL, cfg.MinIORawBucket)
	if err != nil {
		log.Fatalf("init minio storage: %v", err)
	}
	if err := storage.EnsureBucket(ctx); err != nil {
		log.Fatalf("ensure minio bucket: %v", err)
	}
	publisher, err := mailingest.NewRabbitPublisher(cfg.RabbitMQURL, cfg.MailParseQueue)
	if err != nil {
		log.Fatalf("init rabbitmq publisher: %v", err)
	}
	defer publisher.Close()
	server := mailingest.NewServer(service, repo, storage, publisher, log.Default())
	ln, err := net.Listen("tcp", ":"+cfg.MailIngestPort)
	if err != nil {
		log.Fatal(err)
	}
	defer ln.Close()

	if err := os.MkdirAll(cfg.MailIngestSpoolDir, 0o755); err != nil {
		log.Fatalf("prepare spool dir: %v", err)
	}
	log.Printf("mail-ingest listening on :%s, spool=%s, queue=%s, bucket=%s", cfg.MailIngestPort, cfg.MailIngestSpoolDir, cfg.MailParseQueue, cfg.MinIORawBucket)
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("accept error: %v", err)
			continue
		}
		go server.HandleConn(conn)
	}
}
