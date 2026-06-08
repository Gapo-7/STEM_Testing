// Пакет middleware содержит промежуточные обработчики Gin.
package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// ipLimiter хранит информацию об ограничителе для одного IP.
type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter управляет ограничителями запросов по IP-адресам.
// Реализует алгоритм token bucket: каждый IP получает N токенов в минуту.
type IPRateLimiter struct {
	mu      sync.Mutex
	clients map[string]*ipLimiter
	limit   rate.Limit // токенов в секунду
	burst   int        // максимальный всплеск запросов
}

func newIPRateLimiter(requestsPerMinute int) *IPRateLimiter {
	rl := &IPRateLimiter{
		clients: make(map[string]*ipLimiter),
		limit:   rate.Limit(float64(requestsPerMinute) / 60.0),
		burst:   requestsPerMinute / 5, // разрешаем всплеск до 20% от лимита
	}
	// Горутина очистки: раз в 3 минуты удаляет неактивных клиентов
	go rl.cleanup()
	return rl
}

// getLimiter возвращает ограничитель для данного IP, создавая при необходимости.
func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	client, exists := rl.clients[ip]
	if !exists {
		client = &ipLimiter{
			limiter: rate.NewLimiter(rl.limit, rl.burst),
		}
		rl.clients[ip] = client
	}
	client.lastSeen = time.Now()
	return client.limiter
}

// cleanup удаляет записи о клиентах, которые не делали запросов >3 минут.
func (rl *IPRateLimiter) cleanup() {
	for {
		time.Sleep(3 * time.Minute)
		rl.mu.Lock()
		for ip, client := range rl.clients {
			if time.Since(client.lastSeen) > 3*time.Minute {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit создаёт middleware для ограничения запросов по IP.
// requestsPerMinute — максимальное количество запросов в минуту с одного IP.
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	limiter := newIPRateLimiter(requestsPerMinute)

	return func(c *gin.Context) {
		// Получаем реальный IP (учитываем прокси)
		ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
		if err != nil {
			ip = c.Request.RemoteAddr
		}
		// X-Forwarded-For имеет приоритет (если настроен обратный прокси)
		if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
			ip = forwarded
		}

		if !limiter.getLimiter(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Слишком много запросов. Пожалуйста, подождите.",
				"code":  "rate_limit_exceeded",
			})
			return
		}
		c.Next()
	}
}
