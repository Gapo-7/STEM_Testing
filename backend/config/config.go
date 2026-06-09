// Пакет config загружает и хранит конфигурацию приложения из переменных окружения.
package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config содержит все настройки приложения.
type Config struct {
	Port              string
	GinMode           string
	MongoURI          string
	MongoDB           string
	PostgresDSN       string
	JWTSecret         string
	JWTAccessExpiry   string
	JWTRefreshExpiry  string
	AllowedOrigins    string
	RateLimitGlobal   int
	RateLimitAuth     int
	SeedAdminEmail    string
	SeedAdminPassword string
	SeedAdminName     string
}

var App Config

// Load читает .env файл и заполняет глобальную конфигурацию.
// Если переменная отсутствует — используется значение по умолчанию.
func Load() {
	// Загружаем .env файл (ошибка не критична — можно передавать переменные напрямую)
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("[config] .env файл не найден, используются переменные окружения системы")
	}

	App = Config{
		Port:              getEnv("PORT", "8080"),
		GinMode:           getEnv("GIN_MODE", "debug"),
		MongoURI:          getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDB:           getEnv("MONGODB_DATABASE", "stem_doc_manager"),
		PostgresDSN:       getEnv("POSTGRES_DSN", ""),
		JWTSecret:         getEnv("JWT_SECRET", "default-secret-CHANGE-IN-PROD"),
		JWTAccessExpiry:   getEnv("JWT_ACCESS_EXPIRY", "15m"),
		JWTRefreshExpiry:  getEnv("JWT_REFRESH_EXPIRY", "168h"),
		AllowedOrigins:    getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		RateLimitGlobal:   getEnvInt("RATE_LIMIT_GLOBAL", 100),
		RateLimitAuth:     getEnvInt("RATE_LIMIT_AUTH", 10),
		SeedAdminEmail:    getEnv("SEED_ADMIN_EMAIL", "admin@stem-academia.kz"),
		SeedAdminPassword: getEnv("SEED_ADMIN_PASSWORD", "Admin1234!"),
		SeedAdminName:     getEnv("SEED_ADMIN_NAME", "Администратор Системы"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
