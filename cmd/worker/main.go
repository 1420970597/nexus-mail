package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/1420970597/nexus-mail/internal/platform/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
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
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

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
			log.Printf("worker received parse job message_id=%s bytes=%d", msg.MessageId, len(msg.Body))
			if err := msg.Ack(false); err != nil {
				log.Printf("ack parse job failed: %v", err)
			}
		}
	}
}
