package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"stem-doc-manager/database"
	"stem-doc-manager/models"
	"stem-doc-manager/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthRequired проверяет JWT access-токен в заголовке Authorization.
// При успехе кладёт объект пользователя в контекст Gin под ключом "user".
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Извлекаем токен из заголовка: "Authorization: Bearer <token>"
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Требуется авторизация",
				"code":  "unauthorized",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Неверный формат токена. Используйте: Bearer <token>",
				"code":  "invalid_token_format",
			})
			return
		}

		// Парсим и проверяем токен
		claims, err := utils.ParseAccessToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Токен недействителен или истёк",
				"code":  "token_expired",
			})
			return
		}

		// Загружаем пользователя из БД (для проверки актуальных данных)
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Неверный ID пользователя"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var user models.User
		err = database.Collection("users").FindOne(ctx, bson.M{
			"_id":       userID,
			"is_active": true,
		}).Decode(&user)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Пользователь не найден или деактивирован",
				"code":  "user_not_found",
			})
			return
		}

		// Сохраняем пользователя в контексте для использования в хэндлерах
		c.Set("user", user)
		c.Set("userID", userID)
		c.Next()
	}
}

// RequireRole создаёт middleware для проверки конкретной роли.
// Используется для эндпоинтов, доступных только руководству.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Не авторизован"})
			return
		}
		u := user.(models.User)
		for _, role := range roles {
			if u.Role == role {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Недостаточно прав для выполнения действия",
			"code":  "forbidden",
		})
	}
}

// GetCurrentUser — хелпер для извлечения пользователя из контекста Gin.
func GetCurrentUser(c *gin.Context) (models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return models.User{}, false
	}
	u, ok := user.(models.User)
	return u, ok
}
