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
)

// GET /api/departments
// Возвращает только те отделы, к которым у пользователя есть доступ.
func GetDepartments(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Формируем фильтр в зависимости от роли
	filter := bson.M{"is_active": true}
	if !user.CanAccessAllDepartments() {
		// Руководитель отдела видит только свой отдел
		if user.DepartmentID == nil {
			c.JSON(http.StatusOK, []models.DepartmentWithStats{})
			return
		}
		filter["_id"] = *user.DepartmentID
	}

	cursor, err := database.Collection("departments").Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения отделов"})
		return
	}
	defer cursor.Close(ctx)

	var departments []models.Department
	if err := cursor.All(ctx, &departments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования"})
		return
	}

	// Добавляем количество записей для каждого отдела
	result := make([]models.DepartmentWithStats, 0, len(departments))
	for _, dept := range departments {
		count, _ := database.Collection("employee_records").CountDocuments(ctx, bson.M{
			"department_id": dept.ID,
		})
		result = append(result, models.DepartmentWithStats{
			Department:  dept,
			RecordCount: count,
		})
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/departments/:id
func GetDepartment(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	// Проверяем права доступа
	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому отделу"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var dept models.Department
	if err := database.Collection("departments").FindOne(ctx, bson.M{
		"_id":       deptID,
		"is_active": true,
	}).Decode(&dept); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Отдел не найден"})
		return
	}

	c.JSON(http.StatusOK, dept)
}

// POST /api/departments — только директор и управляющий директор
type createDepartmentRequest struct {
	Name        string  `json:"name"        binding:"required"`
	Code        string  `json:"code"        binding:"required"`
	Description string  `json:"description"`
	ParentID    *string `json:"parent_id"`
}

func CreateDepartment(c *gin.Context) {
	var req createDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	dept := models.Department{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if req.ParentID != nil && *req.ParentID != "" {
		parentID, err := primitive.ObjectIDFromHex(*req.ParentID)
		if err == nil {
			dept.ParentID = &parentID
		}
	}

	if _, err := database.Collection("departments").InsertOne(ctx, dept); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания отдела"})
		return
	}

	c.JSON(http.StatusCreated, dept)
}

// PUT /api/departments/:id
type updateDepartmentRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Code        string  `json:"code"`
	HeadID      *string `json:"head_id"`
	HeadName    string  `json:"head_name"`
}

func UpdateDepartment(c *gin.Context) {
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req updateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	update := bson.M{"updated_at": time.Now()}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.Code != "" {
		update["code"] = req.Code
	}
	if req.HeadName != "" {
		update["head_name"] = req.HeadName
	}
	if req.HeadID != nil {
		if *req.HeadID == "" {
			update["head_id"] = nil
		} else {
			hID, err := primitive.ObjectIDFromHex(*req.HeadID)
			if err == nil {
				update["head_id"] = hID
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.Collection("departments").UpdateOne(ctx,
		bson.M{"_id": deptID},
		bson.M{"$set": update},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Отдел не найден"})
		return
	}

	// Получаем обновленный отдел
	var updatedDept models.Department
	if err := database.Collection("departments").FindOne(ctx, bson.M{"_id": deptID}).Decode(&updatedDept); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения обновленного отдела"})
		return
	}

	c.JSON(http.StatusOK, updatedDept)
}

// DELETE /api/departments/:id — только директор
func DeleteDepartment(c *gin.Context) {
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Мягкое удаление
	result, err := database.Collection("departments").UpdateOne(ctx,
		bson.M{"_id": deptID},
		bson.M{"$set": bson.M{"is_active": false, "updated_at": time.Now()}},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Отдел не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Отдел деактивирован"})
}
