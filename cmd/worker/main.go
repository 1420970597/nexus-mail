package main

import (
	"context"
	"encoding/json"
	"log"
	"os/signal"
	"syscall"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/1420970597/nexus-mail/internal/modules/mailingest"
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
	repo := mailingest.NewRepository(db.Pool)
	if err := repo.EnsureSchema(ctx); err != nil {
		log.Fatalf("ensure mail-ingest schema: %v", err)
	}
	storage, err := mailingest.NewMinIOStorage(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOUseSSL, cfg.MinIORawBucket)
	if err != nil {
		log.Fatalf("init minio storage: %v", err)
	}

	conn, err := amqp.Dial(cfg.RabbitMQURL)
	if err != nil {
		log.Fatalf("connect rabbitmq: %v", err)
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("open rabbitmq channel: %v", err)
	}
	defer ch.Close()
	if _, err := ch.QueueDeclare(cfg.MailParseQueue, true, false, false, false, nil); err != nil {
		log.Fatalf("declare parse queue: %v", err)
	}
	msgs, err := ch.Consume(cfg.MailParseQueue, "nexus-mail-worker", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("consume parse queue: %v", err)
	}

	log.Printf("nexus-mail worker consuming queue=%s", cfg.MailParseQueue)
	for {
		select {
		case <-ctx.Done():
			log.Printf("worker shutting down: %v", ctx.Err())
			return
		case msg, ok := <-msgs:
			if !ok {
				log.Println("worker consumer channel closed")
				return
			}
			if err := processMessage(ctx, repo, storage, msg.Body); err != nil {
				log.Printf("process parse job failed: %v", err)
				_ = msg.Nack(false, true)
				continue
			}
			if err := msg.Ack(false); err != nil {
				log.Printf("ack parse job failed: %v", err)
			}
		}
	}
}

func processMessage(ctx context.Context, repo *mailingest.Repository, storage mailingest.ObjectStorage, body []byte) error {
	var payload mailingest.QueueMessage
	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}
	raw, err := storage.ReadObject(ctx, payload.RawObjectKey)
	if err != nil {
		return err
	}
	extractionType, extractionValue := mailingest.ExtractResult(raw)
	status := "no_match"
	matchedOrderID := int64(0)
	if extractionValue != "" {
		for _, recipient := range payload.RcptTo {
			matchedOrderID, err = repo.ApplyActivationResultByAddress(ctx, recipient, extractionType, extractionValue)
			if err != nil {
				return err
			}
			if matchedOrderID > 0 {
				status = "matched"
				break
			}
		}
	}
	return repo.MarkMessageParsed(ctx, payload.MessageID, status, extractionType, extractionValue, matchedOrderID)
}
