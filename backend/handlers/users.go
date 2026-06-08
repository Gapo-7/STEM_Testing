package handlers

import (
	"context"
	"net/http"
	"time"

	"stem-doc-manager/database"
	"stem-doc-manager/middleware"
	"stem-doc-manager/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// GET /api/users — список всех пользователей (только директор)
func GetUsers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := database.Collection("users").Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// GET /api/users/me — текущий пользователь
func GetMe(c *gin.Context) {
	user, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Не авторизован"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// GET /api/users/:id
func GetUser(c *gin.Context) {
	currentUser, _ := middleware.GetCurrentUser(c)
	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	// Обычный пользователь может видеть только себя
	if models.HierarchyLevel(currentUser.Role) > 2 && currentUser.ID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := database.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// PUT /api/users/:id — обновление пользователя
// Директор может менять роль и отдел; пользователь — только своё имя и пароль
type updateUserRequest struct {
	Name         string  `json:"name"`
	Role         *string `json:"role"`          // только для директора
	DepartmentID *string `json:"department_id"` // только для директора
	IsActive     *bool   `json:"is_active"`     // только для директора
	Password     string  `json:"password"`      // необязательно
}

func UpdateUser(c *gin.Context) {
	currentUser, _ := middleware.GetCurrentUser(c)
	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	isDirector := models.HierarchyLevel(currentUser.Role) <= 1
	isSelf := currentUser.ID == userID

	if !isDirector && !isSelf {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	// Строим набор обновлений
	update := bson.M{"updated_at": time.Now()}
	if req.Name != "" {
		update["name"] = req.Name
	}

	// Только директор может менять роли и отделы
	if isDirector {
		if req.Role != nil {
			update["role"] = *req.Role
		}
		if req.DepartmentID != nil {
			if *req.DepartmentID == "" {
				update["department_id"] = nil
			} else {
				deptID, err := primitive.ObjectIDFromHex(*req.DepartmentID)
				if err == nil {
					update["department_id"] = deptID
				}
			}
		}
		if req.IsActive != nil {
			update["is_active"] = *req.IsActive
		}
	}

	// Смена пароля (для себя или директором)
	if req.Password != "" {
		if len(req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен быть минимум 8 символов"})
			return
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		update["password_hash"] = string(hash)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": update},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь обновлён"})
}

// DELETE /api/users/:id — только директор
func DeleteUser(c *gin.Context) {
	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Деактивируем вместо удаления (мягкое удаление)
	result, err := database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"is_active": false, "updated_at": time.Now()}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь деактивирован"})
}
