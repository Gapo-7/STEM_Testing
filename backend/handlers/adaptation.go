package handlers

// Temporarily disable advanced adaptation features (criteria, promote, archive)
// so only creating a new adaptation candidate remains active.

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
)

// GET /api/adaptation/departments
func GetAdaptationDepartments(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"is_active": true}
	cursor, err := database.Collection("departments").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения отделов"})
		return
	}
	defer cursor.Close(ctx)

	departments := make([]models.Department, 0)
	if err := cursor.All(ctx, &departments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования отделов"})
		return
	}

	result := make([]gin.H, 0, len(departments))
	for _, dept := range departments {
		if !user.CanAccessDepartment(dept.ID) {
			continue
		}

		count, err := database.Collection("adaptation_candidates").CountDocuments(ctx, bson.M{"department_id": dept.ID})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка подсчёта кандидатов"})
			return
		}

		result = append(result, gin.H{
			"department":      dept,
			"candidate_count": count,
		})
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/adaptation/:deptId/candidates
func GetAdaptationCandidates(c *gin.Context) {
	// Temporarily disabled: do not expose candidate lists. Return empty array.
	c.JSON(http.StatusOK, []models.AdaptationCandidate{})
}

// POST /api/adaptation/:deptId/candidates
type createAdaptationCandidateRequest struct {
	LastName   string `json:"last_name" binding:"required"`
	FirstName  string `json:"first_name" binding:"required"`
	MiddleName string `json:"middle_name"`
	Phone      string `json:"phone"`
	Email      string `json:"email"`
	Position   string `json:"position" binding:"required"`
	StartDate  string `json:"start_date"`
	Notes      string `json:"notes"`
}

func CreateAdaptationCandidate(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, ok := parseObjectIDParam(c, "deptId")
	if !ok {
		return
	}

	if !user.CanWrite(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для создания кандидатов"})
		return
	}

	var req createAdaptationCandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	candidate := models.AdaptationCandidate{
		ID:           primitive.NewObjectID(),
		LastName:     req.LastName,
		FirstName:    req.FirstName,
		MiddleName:   req.MiddleName,
		Phone:        req.Phone,
		Email:        req.Email,
		Position:     req.Position,
		DepartmentID: deptID,
		Status:       "ongoing",
		Criteria:     make([]models.Criterion, 0),
		Notes:        req.Notes,
		CreatedBy:    user.ID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			candidate.StartDate = &startDate
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := database.Collection("adaptation_candidates").InsertOne(ctx, candidate); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания кандидата"})
		return
	}

	c.JSON(http.StatusCreated, candidate)
}

// GET /api/adaptation/candidates/:id
func GetAdaptationCandidate(c *gin.Context) {
	// Disabled during development: individual candidate view hidden.
	c.JSON(http.StatusNotFound, gin.H{"error": "Временно отключено"})
}

// PUT /api/adaptation/candidates/:id
func UpdateAdaptationCandidate(c *gin.Context) {
	// Disabled: updates (including status changes) are ignored for now.
	c.JSON(http.StatusForbidden, gin.H{"error": "Обновление кандидатов временно отключено"})
}

// POST /api/adaptation/candidates/:id/criteria
type createCriterionRequest struct {
	Title       string `json:"title" binding:"required"`
	Comment     string `json:"comment"`
	Score       int    `json:"score" binding:"required,min=1,max=100"`
	EvaluatedBy string `json:"evaluated_by" binding:"required"`
}

func AddAdaptationCriterion(c *gin.Context) {
	// Disabled: criteria tracking is turned off for now.
	c.JSON(http.StatusForbidden, gin.H{"error": "Добавление критериев временно отключено"})
}

// PUT /api/adaptation/candidates/:id/criteria/:cId
type updateCriterionRequest struct {
	Title       string `json:"title" binding:"required"`
	Comment     string `json:"comment"`
	Score       int    `json:"score" binding:"required,min=1,max=100"`
	EvaluatedBy string `json:"evaluated_by" binding:"required"`
}

func UpdateAdaptationCriterion(c *gin.Context) {
	// Disabled: criteria editing turned off.
	c.JSON(http.StatusForbidden, gin.H{"error": "Редактирование критериев временно отключено"})
}

// DELETE /api/adaptation/candidates/:id/criteria/:cId
func DeleteAdaptationCriterion(c *gin.Context) {
	// Disabled: criteria deletion turned off.
	c.JSON(http.StatusForbidden, gin.H{"error": "Удаление критериев временно отключено"})
}

// POST /api/adaptation/candidates/:id/promote
func PromoteAdaptationCandidate(c *gin.Context) {
	// Disabled: promotion/transfer to employee records is turned off for now.
	c.JSON(http.StatusForbidden, gin.H{"error": "Перевод кандидатов временно отключён"})
}

func parseObjectIDParam(c *gin.Context, name string) (primitive.ObjectID, bool) {
	id, err := primitive.ObjectIDFromHex(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID: " + name})
		return primitive.NilObjectID, false
	}
	return id, true
}
