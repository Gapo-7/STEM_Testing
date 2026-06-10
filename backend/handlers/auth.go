// Пакет handlers содержит HTTP-обработчики для всех эндпоинтов API.
package handlers

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
	"golang.org/x/crypto/bcrypt"
)

// ─────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────

type registerRequest struct {
	Name     string `json:"name"     binding:"required,min=2"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// Register создаёт нового пользователя с ролью "employee".
// Назначение роли и отдела выполняется администратором через /api/users/:id.
func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Проверяем уникальность email
	count, _ := database.Collection("users").CountDocuments(ctx, bson.M{"email": req.Email})
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким email уже существует"})
		return
	}

	// Хэшируем пароль (bcrypt cost=12)
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка хэширования пароля"})
		return
	}

	user := models.User{
		ID:           primitive.NewObjectID(),
		Name:         strings.TrimSpace(req.Name),
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         models.RoleEmployee, // новые пользователи — сотрудники
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if _, err := database.Collection("users").InsertOne(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при сохранении пользователя"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Аккаунт создан. Ожидайте назначения роли администратором.",
		"user_id": user.ID.Hex(),
	})
}

// ─────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login аутентифицирует пользователя и возвращает пару токенов.
func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := database.Collection("users").FindOne(ctx, bson.M{
		"email":     strings.ToLower(req.Email),
		"is_active": true,
	}).Decode(&user)
	if err != nil {
		// Одинаковая ошибка для несуществующего пользователя и неверного пароля (безопасность)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
		return
	}

	// Проверяем пароль
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
		return
	}

	// Генерируем токены
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, user.Role, user.DepartmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	refreshToken, expiresAt, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации refresh-токена"})
		return
	}

	// Сохраняем хэш refresh-токена в БД
	rt := models.RefreshToken{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		TokenHash: utils.HashToken(refreshToken),
		UserAgent: c.GetHeader("User-Agent"),
		IP:        c.ClientIP(),
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}
	database.Collection("refresh_tokens").InsertOne(ctx, rt) //nolint

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":            user.ID.Hex(),
			"name":          user.Name,
			"email":         user.Email,
			"role":          user.Role,
			"department_id": user.DepartmentID,
		},
	})
}

// ─────────────────────────────────────────────
//  POST /api/auth/refresh
// ─────────────────────────────────────────────

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken обменивает валидный refresh-токен на новый access-токен.
func RefreshToken(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите refresh_token"})
		return
	}

	// Проверяем подпись и срок действия refresh-токена
	userIDStr, err := utils.ParseRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh-токен недействителен или истёк"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Проверяем, не был ли токен отозван (хэш должен быть в БД)
	tokenHash := utils.HashToken(req.RefreshToken)
	count, _ := database.Collection("refresh_tokens").CountDocuments(ctx, bson.M{"token_hash": tokenHash})
	if count == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh-токен был отозван"})
		return
	}

	userID, _ := primitive.ObjectIDFromHex(userIDStr)
	var user models.User
	if err := database.Collection("users").FindOne(ctx, bson.M{"_id": userID, "is_active": true}).Decode(&user); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не найден"})
		return
	}

	// Выдаём новый access-токен
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, user.Role, user.DepartmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"access_token": accessToken})
}

// ─────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────

// Logout инвалидирует refresh-токен (удаляет из БД).
func Logout(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Выход выполнен"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Удаляем refresh-токен из БД по хэшу
	tokenHash := utils.HashToken(req.RefreshToken)
	database.Collection("refresh_tokens").DeleteOne(ctx, bson.M{"token_hash": tokenHash}) //nolint

	c.JSON(http.StatusOK, gin.H{"message": "Выход выполнен успешно"})
}

// ─────────────────────────────────────────────
//  Вспомогательные функции
// ─────────────────────────────────────────────
