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
	JWTSecret            string
	JWTExpireSeconds     int
	RefreshExpireSeconds int
	MailIngestPort       string
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
}

func Load() (Config, error) {
	viper.AutomaticEnv()
	cfg := Config{
		AppEnv:               defaultString(viper.GetString("APP_ENV"), "development"),
		AppPort:              defaultString(viper.GetString("APP_PORT"), "8080"),
		DatabaseURL:          viper.GetString("DATABASE_URL"),
		RedisURL:             viper.GetString("REDIS_URL"),
		RabbitMQURL:          defaultString(viper.GetString("RABBITMQ_URL"), "amqp://nexus:nexus_dev@rabbitmq:5672/"),
		JWTSecret:            defaultString(viper.GetString("JWT_SECRET"), "change-me"),
		JWTExpireSeconds:     defaultInt(viper.GetInt("JWT_EXPIRE_SECONDS"), 3600),
		RefreshExpireSeconds: defaultInt(viper.GetInt("REFRESH_EXPIRE_SECONDS"), 604800),
		MailIngestPort:       defaultString(viper.GetString("MAIL_INGEST_PORT"), "2525"),
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
