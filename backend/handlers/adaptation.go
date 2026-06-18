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
	user, _ := middleware.GetCurrentUser(c)
	deptID, ok := parseObjectIDParam(c, "deptId")
	if !ok {
		return
	}

	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому отделу"})
		return
	}

	filter := bson.M{"department_id": deptID}
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := database.Collection("adaptation_candidates").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения кандидатов"})
		return
	}
	defer cursor.Close(ctx)

	candidates := make([]models.AdaptationCandidate, 0)
	if err := cursor.All(ctx, &candidates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка декодирования кандидатов"})
		return
	}

	c.JSON(http.StatusOK, candidates)
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
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if !user.CanAccessDepartment(candidate.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому кандидату"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

// PUT /api/adaptation/candidates/:id
func UpdateAdaptationCandidate(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}

	var req models.AdaptationCandidateUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if !user.CanWrite(candidate.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для обновления кандидата"})
		return
	}

	update := bson.M{
		"last_name":   req.LastName,
		"first_name":  req.FirstName,
		"middle_name": req.MiddleName,
		"phone":       req.Phone,
		"email":       req.Email,
		"position":    req.Position,
		"notes":       req.Notes,
		"updated_at":  time.Now(),
	}

	if req.Status != "" {
		update["status"] = req.Status
		if req.Status != "ongoing" && candidate.EndDate == nil {
			endDate := time.Now()
			update["end_date"] = endDate
		}
	}

	if req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			update["start_date"] = startDate
		}
	}

	if req.EndDate != "" {
		if endDate, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			update["end_date"] = endDate
		}
	}

	if _, err := database.Collection("adaptation_candidates").UpdateOne(ctx,
		bson.M{"_id": candidateID},
		bson.M{"$set": update},
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления кандидата"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Кандидат обновлён"})
}

// POST /api/adaptation/candidates/:id/criteria
type createCriterionRequest struct {
	Title       string `json:"title" binding:"required"`
	Comment     string `json:"comment"`
	Score       int    `json:"score" binding:"required,min=1,max=100"`
	EvaluatedBy string `json:"evaluated_by" binding:"required"`
}

func AddAdaptationCriterion(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}

	var req createCriterionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if !user.CanWrite(candidate.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для добавления критерия"})
		return
	}

	criterion := models.Criterion{
		ID:          primitive.NewObjectID(),
		Title:       req.Title,
		Comment:     req.Comment,
		Score:       req.Score,
		EvaluatedBy: req.EvaluatedBy,
	}
	if now := time.Now(); true {
		criterion.EvaluatedAt = &now
	}

	if _, err := database.Collection("adaptation_candidates").UpdateOne(ctx,
		bson.M{"_id": candidateID},
		bson.M{"$push": bson.M{"criteria": criterion}, "$set": bson.M{"updated_at": time.Now()}},
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка добавления критерия"})
		return
	}

	c.JSON(http.StatusCreated, criterion)
}

// PUT /api/adaptation/candidates/:id/criteria/:cId
type updateCriterionRequest struct {
	Title       string `json:"title" binding:"required"`
	Comment     string `json:"comment"`
	Score       int    `json:"score" binding:"required,min=1,max=100"`
	EvaluatedBy string `json:"evaluated_by" binding:"required"`
}

func UpdateAdaptationCriterion(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}
	criterionID, ok := parseObjectIDParam(c, "cId")
	if !ok {
		return
	}

	var req updateCriterionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if !user.CanWrite(candidate.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для изменения критерия"})
		return
	}

	update := bson.M{
		"criteria.$[item].title":        req.Title,
		"criteria.$[item].comment":      req.Comment,
		"criteria.$[item].score":        req.Score,
		"criteria.$[item].evaluated_by": req.EvaluatedBy,
		"updated_at":                    time.Now(),
	}

	opts := options.Update().SetArrayFilters(options.ArrayFilters{Filters: []interface{}{bson.M{"item._id": criterionID}}})
	result, err := database.Collection("adaptation_candidates").UpdateOne(ctx,
		bson.M{"_id": candidateID},
		bson.M{"$set": update},
		opts,
	)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Критерий не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Критерий обновлён"})
}

// DELETE /api/adaptation/candidates/:id/criteria/:cId
func DeleteAdaptationCriterion(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}
	criterionID, ok := parseObjectIDParam(c, "cId")
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if !user.CanWrite(candidate.DepartmentID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для удаления критерия"})
		return
	}

	result, err := database.Collection("adaptation_candidates").UpdateOne(ctx,
		bson.M{"_id": candidateID},
		bson.M{"$pull": bson.M{"criteria": bson.M{"_id": criterionID}}, "$set": bson.M{"updated_at": time.Now()}},
	)
	if err != nil || result.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Критерий не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Критерий удалён"})
}

// POST /api/adaptation/candidates/:id/promote
func PromoteAdaptationCandidate(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	candidateID, ok := parseObjectIDParam(c, "id")
	if !ok {
		return
	}

	if user.Role != models.RoleDirector && user.Role != models.RoleManagingDirector {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав для перевода кандидата"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var candidate models.AdaptationCandidate
	if err := database.Collection("adaptation_candidates").FindOne(ctx, bson.M{"_id": candidateID}).Decode(&candidate); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Кандидат не найден"})
		return
	}

	if candidate.Status == "fired" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя переводить уволенного кандидата"})
		return
	}

	if candidate.EmployeeRecordID != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Кандидат уже переведён", "employee_record_id": candidate.EmployeeRecordID.Hex()})
		return
	}

	record := models.EmployeeRecord{
		ID:           primitive.NewObjectID(),
		DepartmentID: candidate.DepartmentID,
		LastName:     candidate.LastName,
		FirstName:    candidate.FirstName,
		MiddleName:   candidate.MiddleName,
		Position:     candidate.Position,
		Phone:        candidate.Phone,
		Email:        candidate.Email,
		Status:       models.StatusActive,
		Notes:        candidate.Notes,
		CreatedBy:    user.ID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if candidate.StartDate != nil {
		record.StartDate = candidate.StartDate
	} else {
		now := time.Now()
		record.StartDate = &now
	}

	if _, err := database.Collection("employee_records").InsertOne(ctx, record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания сотрудника"})
		return
	}

	endDate := time.Now()
	update := bson.M{
		"status":             "passed",
		"end_date":           endDate,
		"employee_record_id": record.ID,
		"updated_at":         time.Now(),
	}

	if _, err := database.Collection("adaptation_candidates").UpdateOne(ctx,
		bson.M{"_id": candidateID},
		bson.M{"$set": update},
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления кандидата"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":            "Кандидат переведён в сотрудники",
		"employee_record_id": record.ID.Hex(),
		"candidate_id":       candidateID.Hex(),
	})
}

func parseObjectIDParam(c *gin.Context, name string) (primitive.ObjectID, bool) {
	id, err := primitive.ObjectIDFromHex(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID: " + name})
		return primitive.NilObjectID, false
	}
	return id, true
}
