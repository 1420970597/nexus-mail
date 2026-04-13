package mailingest

import (
	"context"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type QueueMessage struct {
	MessageID    string   `json:"message_id"`
	MailFrom     string   `json:"mail_from"`
	RcptTo       []string `json:"rcpt_to"`
	RawPath      string   `json:"raw_path"`
	MetadataPath string   `json:"metadata_path"`
	StoredAt     string   `json:"stored_at"`
}

type Publisher interface {
	PublishParseJob(ctx context.Context, item PersistedMessage) error
	Close() error
}

type NopPublisher struct{}

func (NopPublisher) PublishParseJob(context.Context, PersistedMessage) error { return nil }
func (NopPublisher) Close() error                                            { return nil }

type RabbitPublisher struct {
	conn      *amqp.Connection
	channel   *amqp.Channel
	queueName string
}

func NewRabbitPublisher(url, queueName string) (*RabbitPublisher, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("dial rabbitmq: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("open rabbitmq channel: %w", err)
	}
	if _, err := ch.QueueDeclare(queueName, true, false, false, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("declare rabbitmq queue: %w", err)
	}
	return &RabbitPublisher{conn: conn, channel: ch, queueName: queueName}, nil
}

func (p *RabbitPublisher) PublishParseJob(ctx context.Context, item PersistedMessage) error {
	if p == nil || p.channel == nil {
		return nil
	}
	payload, err := json.Marshal(QueueMessage{
		MessageID:    item.ID,
		MailFrom:     item.MailFrom,
		RcptTo:       item.RcptTo,
		RawPath:      item.RawPath,
		MetadataPath: item.MetadataPath,
		StoredAt:     item.StoredAt.Format("2006-01-02T15:04:05Z07:00"),
	})
	if err != nil {
		return fmt.Errorf("marshal queue payload: %w", err)
	}
	if err := p.channel.PublishWithContext(ctx, "", p.queueName, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    item.ID,
		Body:         payload,
	}); err != nil {
		return fmt.Errorf("publish parse job: %w", err)
	}
	return nil
}

func (p *RabbitPublisher) Close() error {
	if p == nil {
		return nil
	}
	if p.channel != nil {
		_ = p.channel.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
