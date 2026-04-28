package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	redis "github.com/redis/go-redis/v9"
)

const defaultAPIKeyRateLimitRedisPrefix = "nexus-mail:api-key-rate"

var redisRateLimitScript = redis.NewScript(`
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
elseif redis.call("PTTL", KEYS[1]) < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
`)

type redisAPIKeyRateLimiter struct {
	client  *redis.Client
	prefix  string
	timeout time.Duration
}

func NewRedisAPIKeyRateLimiter(client *redis.Client, prefix string) APIKeyRateLimiter {
	return NewRedisAPIKeyRateLimiterWithTimeout(client, prefix, 100*time.Millisecond)
}

func NewRedisAPIKeyRateLimiterWithTimeout(client *redis.Client, prefix string, timeout time.Duration) APIKeyRateLimiter {
	if strings.TrimSpace(prefix) == "" {
		prefix = defaultAPIKeyRateLimitRedisPrefix
	}
	if timeout <= 0 {
		timeout = 100 * time.Millisecond
	}
	return &redisAPIKeyRateLimiter{client: client, prefix: strings.TrimRight(prefix, ":"), timeout: timeout}
}

func (l *redisAPIKeyRateLimiter) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	if l == nil || l.client == nil || limit <= 0 || window <= 0 {
		return true, nil
	}

	callCtx, cancel := context.WithTimeout(ctx, l.timeout)
	defer cancel()
	count, err := redisRateLimitScript.Run(callCtx, l.client, []string{l.bucketKey(key)}, int64(window/time.Millisecond)).Int64()
	if err != nil {
		return false, err
	}
	return count <= int64(limit), nil
}

func (l *redisAPIKeyRateLimiter) bucketKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return l.prefix + ":" + hex.EncodeToString(sum[:])
}
