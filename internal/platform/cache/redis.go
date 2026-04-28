package cache

import (
	"context"
	"time"

	redis "github.com/redis/go-redis/v9"
)

type RedisOptions struct {
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	PoolSize     int
}

func NewRedisClient(ctx context.Context, redisURL string, options RedisOptions) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	if options.DialTimeout > 0 {
		opt.DialTimeout = options.DialTimeout
	}
	if options.ReadTimeout > 0 {
		opt.ReadTimeout = options.ReadTimeout
	}
	if options.WriteTimeout > 0 {
		opt.WriteTimeout = options.WriteTimeout
	}
	if options.PoolSize > 0 {
		opt.PoolSize = options.PoolSize
	}
	client := redis.NewClient(opt)
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, err
	}
	return client, nil
}
