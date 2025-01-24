package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type RateLimiter struct {
	ips    map[string]*rate.Limiter
	mu     *sync.RWMutex
	rate   rate.Limit
	burst  int
	ttl    time.Duration
	cleanup time.Duration
}

func NewRateLimiter(r rate.Limit, b int, ttl, cleanup time.Duration) *RateLimiter {
	limiter := &RateLimiter{
		ips:     make(map[string]*rate.Limiter),
		mu:      &sync.RWMutex{},
		rate:    r,
		burst:   b,
		ttl:     ttl,
		cleanup: cleanup,
	}

	go limiter.cleanupTask()
	return limiter
}

func (rl *RateLimiter) cleanupTask() {
	ticker := time.NewTicker(rl.cleanup)
	for range ticker.C {
		rl.mu.Lock()
		for ip, limiter := range rl.ips {
			if time.Since(limiter.LastTime()) > rl.ttl {
				delete(rl.ips, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.ips[ip] = limiter
	}

	return limiter
}

func RateLimit(requests int, per time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(rate.Limit(float64(requests)/per.Seconds()), requests, per*2, per)
	
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.getLimiter(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
				"retry_after": per.Seconds(),
			})
			return
		}
		c.Next()
	}
} 