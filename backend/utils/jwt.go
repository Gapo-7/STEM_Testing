// Пакет utils предоставляет вспомогательные функции для работы с JWT-токенами.
package utils

import (
	"crypto/sha256"
	"fmt"
	"time"

	"stem-doc-manager/config"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Claims — кастомные поля JWT access-токена.
type Claims struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	DepartmentID string `json:"department_id,omitempty"`
	jwt.RegisteredClaims
}

// GenerateAccessToken создаёт краткоживущий access-токен (15 мин).
func GenerateAccessToken(userID primitive.ObjectID, email, role string, deptID *primitive.ObjectID) (string, error) {
	expiry, err := time.ParseDuration(config.App.JWTAccessExpiry)
	if err != nil {
		expiry = 15 * time.Minute
	}

	deptStr := ""
	if deptID != nil {
		deptStr = deptID.Hex()
	}

	claims := Claims{
		UserID:       userID.Hex(),
		Email:        email,
		Role:         role,
		DepartmentID: deptStr,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID.Hex(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.App.JWTSecret))
}

// GenerateRefreshToken создаёт долгоживущий refresh-токен (7 дней).
// Возвращает сам токен (строка) и время его истечения.
func GenerateRefreshToken(userID primitive.ObjectID) (string, time.Time, error) {
	expiry, err := time.ParseDuration(config.App.JWTRefreshExpiry)
	if err != nil {
		expiry = 7 * 24 * time.Hour
	}
	expiresAt := time.Now().Add(expiry)

	claims := jwt.RegisteredClaims{
		Subject:   userID.Hex(),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.App.JWTSecret))
	return signed, expiresAt, err
}

// ParseAccessToken парсит и валидирует access-токен, возвращает Claims.
func ParseAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("неожиданный метод подписи: %v", t.Header["alg"])
		}
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("невалидный токен")
}

// ParseRefreshToken парсит refresh-токен и возвращает userID.
func ParseRefreshToken(tokenStr string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil {
		return "", err
	}
	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		return claims.Subject, nil
	}
	return "", fmt.Errorf("невалидный refresh-токен")
}

// HashToken возвращает SHA-256 хэш токена для безопасного хранения в БД.
// Сам токен в БД не хранится — только его хэш.
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", hash)
}
