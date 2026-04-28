package auth

import (
	"context"
	"sync"
	"time"
)

type APIKeyRateLimiter interface {
	Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error)
}

type memoryAPIKeyRateLimiter struct {
	mu      sync.Mutex
	buckets map[string]memoryRateLimitBucket
	now     func() time.Time
}

type memoryRateLimitBucket struct {
	count      int
	windowEnds time.Time
}

func NewMemoryAPIKeyRateLimiter() APIKeyRateLimiter {
	return &memoryAPIKeyRateLimiter{
		buckets: map[string]memoryRateLimitBucket{},
		now:     time.Now,
	}
}

func (l *memoryAPIKeyRateLimiter) Allow(_ context.Context, key string, limit int, window time.Duration) (bool, error) {
	if l == nil || limit <= 0 || window <= 0 {
		return true, nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	bucket := l.buckets[key]
	if bucket.windowEnds.IsZero() || !now.Before(bucket.windowEnds) {
		bucket = memoryRateLimitBucket{windowEnds: now.Add(window)}
	}
	if bucket.count >= limit {
		l.buckets[key] = bucket
		return false, nil
	}
	bucket.count++
	l.buckets[key] = bucket
	return true, nil
}
