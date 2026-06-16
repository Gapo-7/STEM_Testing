package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"stem-doc-manager/database"
	"stem-doc-manager/middleware"
	"stem-doc-manager/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// GET /api/archive/failed
func GetArchiveFailed(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID := c.Query("department_id")

	filter := bson.M{"status": "failed"}
	if deptID != "" {
		if id, err := primitive.ObjectIDFromHex(deptID); err == nil {
			filter["department_id"] = id
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := database.Collection("adaptation_candidates").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения архивных кандидатов"})
		return
	}
	defer cursor.Close(ctx)

	candidates := make([]models.AdaptationCandidate, 0)
	if err := cursor.All(ctx, &candidates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования кандидатов"})
		return
	}

	visible := make([]models.AdaptationCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if user.CanAccessDepartment(candidate.DepartmentID) {
			visible = append(visible, candidate)
		}
	}

	c.JSON(http.StatusOK, visible)
}

// GET /api/archive/fired
func GetArchiveFired(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID := c.Query("department_id")

	filter := bson.M{}
	if deptID != "" {
		if id, err := primitive.ObjectIDFromHex(deptID); err == nil {
			filter["department_id"] = id
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := database.Collection("fired_employees").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения уволенных"})
		return
	}
	defer cursor.Close(ctx)

	fired := make([]models.FiredEmployee, 0)
	if err := cursor.All(ctx, &fired); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования уволенных"})
		return
	}

	byOriginal := make(map[string]models.FiredEmployee)
	for _, item := range fired {
		if !user.CanAccessDepartment(item.DepartmentID) {
			continue
		}
		key := item.OriginalRecordID.Hex()
		existing, ok := byOriginal[key]
		if !ok || item.CreatedAt.After(existing.CreatedAt) {
			byOriginal[key] = item
		}
	}

	visible := make([]models.FiredEmployee, 0, len(byOriginal))
	for _, item := range byOriginal {
		visible = append(visible, item)
	}

	c.JSON(http.StatusOK, visible)
}

// POST /api/archive/fired
type createFiredEmployeeRequest struct {
	LastName         string `json:"last_name" binding:"required"`
	FirstName        string `json:"first_name" binding:"required"`
	MiddleName       string `json:"middle_name"`
	Position         string `json:"position" binding:"required"`
	DepartmentID     string `json:"department_id" binding:"required"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	EmployeeNum      string `json:"employee_num"`
	HireDate         string `json:"hire_date"`
	FireDate         string `json:"fire_date" binding:"required"`
	FireReason       string `json:"fire_reason" binding:"required"`
	FireType         string `json:"fire_type" binding:"required,oneof=voluntary forced contract_end"`
	OriginalRecordID string `json:"original_record_id" binding:"required"`
	Notes            string `json:"notes"`
}

func CreateFiredEmployee(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	if user.Role != models.RoleDirector && user.Role != models.RoleManagingDirector {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав для создания уволенного"})
		return
	}

	var req createFiredEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	deptID, err := primitive.ObjectIDFromHex(req.DepartmentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный department_id"})
		return
	}
	originalID, err := primitive.ObjectIDFromHex(req.OriginalRecordID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный original_record_id"})
		return
	}

	hireDate, _ := parseOptionalDate(req.HireDate)
	fireDate, err := time.Parse("2006-01-02", req.FireDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат fire_date"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var original models.EmployeeRecord
	if err := database.Collection("employee_records").FindOne(ctx, bson.M{"_id": originalID}).Decode(&original); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Оригинальная запись не найдена"})
		return
	}

	if original.DepartmentID != deptID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный department_id для оригинальной записи"})
		return
	}

	if original.Status == models.StatusInactive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Сотрудник уже уволен"})
		return
	}

	var existing models.FiredEmployee
	err = database.Collection("fired_employees").FindOne(ctx, bson.M{"original_record_id": originalID}).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Сотрудник уже находится в архиве уволенных"})
		return
	}
	if err != nil && err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка проверки архива уволенных"})
		return
	}

	item := models.FiredEmployee{
		ID:               primitive.NewObjectID(),
		LastName:         req.LastName,
		FirstName:        req.FirstName,
		MiddleName:       req.MiddleName,
		Position:         req.Position,
		DepartmentID:     deptID,
		Phone:            req.Phone,
		Email:            req.Email,
		EmployeeNum:      req.EmployeeNum,
		HireDate:         hireDate,
		FireDate:         fireDate,
		FireReason:       req.FireReason,
		FireType:         req.FireType,
		OriginalRecordID: originalID,
		Notes:            req.Notes,
		CreatedBy:        user.ID,
		CreatedAt:        time.Now(),
	}

	if _, err := database.Collection("fired_employees").InsertOne(ctx, item); err != nil {
		var we mongo.WriteException
		if errors.As(err, &we) {
			for _, e := range we.WriteErrors {
				if e.Code == 11000 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Сотрудник уже находится в архиве уволенных"})
					return
				}
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания записи уволенного"})
		return
	}

	if _, err := database.Collection("employee_records").UpdateOne(ctx,
		bson.M{"_id": originalID},
		bson.M{"$set": bson.M{"status": models.StatusInactive, "end_date": fireDate}},
	); err != nil {
		_, _ = database.Collection("fired_employees").DeleteOne(ctx, bson.M{"_id": item.ID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка пометки оригинальной записи"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// GET /api/archive/fired/:id
func GetFiredEmployee(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	id, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var item models.FiredEmployee
	if err := database.Collection("fired_employees").FindOne(ctx, bson.M{"_id": id}).Decode(&item); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Уволенный не найден"})
		return
	}

	if !user.CanAccessDepartment(item.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому сотруднику"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func parseOptionalDate(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
