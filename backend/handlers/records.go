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

// GET /api/departments/:id/records
func GetRecords(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому отделу"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Опциональный поиск по имени
	filter := bson.M{"department_id": deptID}
	if q := c.Query("q"); q != "" {
		filter["$or"] = bson.A{
			bson.M{"last_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"first_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"position": bson.M{"$regex": q, "$options": "i"}},
		}
	}

	if status := c.Query("status"); status != "" {
		if !isValidStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный статус"})
			return
		}
		filter["status"] = status
	} else {
		filter["status"] = models.StatusActive
	}

	opts := options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}})
	cursor, err := database.Collection("employee_records").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения записей"})
		return
	}
	defer cursor.Close(ctx)

	records := make([]models.EmployeeRecord, 0)
	if err := cursor.All(ctx, &records); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования"})
		return
	}
	records = ApplyKPIToRecords(ctx, deptID, records)

	c.JSON(http.StatusOK, records)
}

// GET /api/departments/:id/records/:rid
func GetRecord(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}
	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var record models.EmployeeRecord
	if err := database.Collection("employee_records").FindOne(ctx, bson.M{
		"_id":           recordID,
		"department_id": deptID,
	}).Decode(&record); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
		return
	}
	if overviews, err := loadLatestKPIOverviews(ctx, deptID, []models.EmployeeRecord{record}); err == nil {
		if summary, ok := overviews[record.ID.Hex()]; ok {
			record.KPI = &summary
		}
	}

	c.JSON(http.StatusOK, record)
}

// POST /api/departments/:id/records
type createRecordRequest struct {
	LastName    string `json:"last_name"  binding:"required"`
	FirstName   string `json:"first_name" binding:"required"`
	MiddleName  string `json:"middle_name"`
	Position    string `json:"position"   binding:"required"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	City        string `json:"city"`
	EmployeeNum string `json:"employee_num"`
	StartDate   string `json:"start_date"` // формат: 2006-01-02
	Status      string `json:"status"`
	Notes       string `json:"notes"`
	// Список документов (только имена и типы)
	Documents []struct {
		Name        string `json:"name"`
		DocType     string `json:"doc_type"`
		Description string `json:"description"`
	} `json:"documents"`
}

func CreateRecord(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	if !user.CanWrite(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для создания записей в этом отделе"})
		return
	}

	var req createRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	record := models.EmployeeRecord{
		ID:           primitive.NewObjectID(),
		DepartmentID: deptID,
		LastName:     req.LastName,
		FirstName:    req.FirstName,
		MiddleName:   req.MiddleName,
		Position:     req.Position,
		Phone:        req.Phone,
		Email:        req.Email,
		City:         req.City,
		EmployeeNum:  req.EmployeeNum,
		Status:       statusOrDefault(req.Status),
		Notes:        req.Notes,
		Documents:    make([]models.DocumentMeta, 0),
		CreatedBy:    user.ID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Парсим дату приёма
	if req.StartDate != "" {
		if t, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			record.StartDate = &t
		}
	}

	// Конвертируем документы
	for _, d := range req.Documents {
		record.Documents = append(record.Documents, models.DocumentMeta{
			ID:          primitive.NewObjectID(),
			Name:        d.Name,
			DocType:     d.DocType,
			Description: d.Description,
			FilePath:    "",
			FileSize:    0,
			UploadedAt:  time.Now(),
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := database.Collection("employee_records").InsertOne(ctx, record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания записи"})
		return
	}

	c.JSON(http.StatusCreated, record)
}

// PUT /api/departments/:id/records/:rid
func UpdateRecord(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	if !user.CanWrite(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для редактирования"})
		return
	}

	var req createRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	update := bson.M{
		"last_name":    req.LastName,
		"first_name":   req.FirstName,
		"middle_name":  req.MiddleName,
		"position":     req.Position,
		"phone":        req.Phone,
		"email":        req.Email,
		"city":         req.City,
		"employee_num": req.EmployeeNum,
		"status":       statusOrDefault(req.Status),
		"notes":        req.Notes,
		"updated_at":   time.Now(),
	}

	if req.StartDate != "" {
		if t, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			update["start_date"] = t
		}
	}

	// Обновляем список документов
	docs := make([]models.DocumentMeta, 0, len(req.Documents))
	for _, d := range req.Documents {
		docs = append(docs, models.DocumentMeta{
			ID:          primitive.NewObjectID(),
			Name:        d.Name,
			DocType:     d.DocType,
			Description: d.Description,
			FilePath:    "",
			FileSize:    0,
			UploadedAt:  time.Now(),
		})
	}
	update["documents"] = docs

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.Collection("employee_records").UpdateOne(ctx,
		bson.M{"_id": recordID, "department_id": deptID},
		bson.M{"$set": update},
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Запись обновлена"})
}

// DELETE /api/departments/:id/records/:rid
func DeleteRecord(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	deptID, _ := primitive.ObjectIDFromHex(c.Param("id"))
	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	if !user.CanWrite(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для удаления"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := database.Collection("employee_records").DeleteOne(ctx, bson.M{
		"_id":           recordID,
		"department_id": deptID,
	})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Запись удалена"})
}

func isValidStatus(s string) bool {
	switch s {
	case models.StatusActive, models.StatusInactive, models.StatusOnLeave:
		return true
	default:
		return false
	}
}

func statusOrDefault(s string) string {
	switch s {
	case models.StatusActive, models.StatusInactive, models.StatusOnLeave:
		return s
	default:
		return models.StatusActive
	}
}
