package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	AppEnv               string
	AppPort              string
	DatabaseURL          string
	RedisURL             string
	RabbitMQURL          string
	MailParseQueue       string
	MinIOEndpoint        string
	MinIOAccessKey       string
	MinIOSecretKey       string
	MinIOUseSSL          bool
	MinIORawBucket       string
	JWTSecret            string
	JWTExpireSeconds     int
	RefreshExpireSeconds int
	MailIngestPort       string
	MailIngestSpoolDir   string
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
}

func Load() (Config, error) {
	viper.AutomaticEnv()
	cfg := Config{
		AppEnv:               defaultString(viper.GetString("APP_ENV"), "production"),
		AppPort:              defaultString(viper.GetString("APP_PORT"), "8080"),
		DatabaseURL:          viper.GetString("DATABASE_URL"),
		RedisURL:             viper.GetString("REDIS_URL"),
		RabbitMQURL:          defaultString(viper.GetString("RABBITMQ_URL"), "amqp://nexus:nexus_dev@rabbitmq:5672/"),
		MailParseQueue:       defaultString(viper.GetString("MAIL_PARSE_QUEUE"), "mail.parse.raw"),
		MinIOEndpoint:        defaultString(viper.GetString("MINIO_ENDPOINT"), "minio:9000"),
		MinIOAccessKey:       defaultString(viper.GetString("MINIO_ROOT_USER"), "minioadmin"),
		MinIOSecretKey:       defaultString(viper.GetString("MINIO_ROOT_PASSWORD"), "minioadmin"),
		MinIOUseSSL:          viper.GetBool("MINIO_USE_SSL"),
		MinIORawBucket:       defaultString(viper.GetString("MINIO_BUCKET_RAW_MAIL"), "nexus-mail-raw"),
		JWTSecret:            defaultString(viper.GetString("JWT_SECRET"), "change-me"),
		JWTExpireSeconds:     defaultInt(viper.GetInt("JWT_EXPIRE_SECONDS"), 3600),
		RefreshExpireSeconds: defaultInt(viper.GetInt("REFRESH_EXPIRE_SECONDS"), 604800),
		MailIngestPort:       defaultString(viper.GetString("MAIL_INGEST_PORT"), "2525"),
		MailIngestSpoolDir:   defaultString(viper.GetString("MAIL_INGEST_SPOOL_DIR"), "/tmp/nexus-mail-ingest"),
		ReadTimeout:          10 * time.Second,
		WriteTimeout:         15 * time.Second,
	}
	return cfg, cfg.Validate()
}

func (c Config) Validate() error {
	var missing []string
	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if c.RedisURL == "" {
		missing = append(missing, "REDIS_URL")
	}
	if c.JWTSecret == "" || c.JWTSecret == "change-me" || c.JWTSecret == "change-me-in-production" {
		missing = append(missing, "JWT_SECRET(valid)")
	}
	if len(missing) > 0 {
		return fmt.Errorf("invalid configuration, missing or insecure settings: %s", strings.Join(missing, ", "))
	}
	return nil
}

func defaultString(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

func defaultInt(v, fallback int) int {
	if v == 0 {
		return fallback
	}
	return v
}
