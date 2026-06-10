package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"stem-doc-manager/database"
	"stem-doc-manager/middleware"
	"stem-doc-manager/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetRecordKPI возвращает KPI-сводку, историю и справочник компонентов для сотрудника.
func GetRecordKPI(c *gin.Context) {
	if !database.HasSQL() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "SQL-хранилище KPI не настроено"})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}
	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID сотрудника"})
		return
	}

	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому отделу"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	department, record, err := loadDepartmentAndRecord(ctx, deptID, recordID)
	if err != nil {
		writeRecordLookupError(c, err)
		return
	}

	definition := models.GetDepartmentKPIDefinition(department.Code)
	history, err := readKPIHistory(ctx, deptID.Hex(), recordID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки KPI"})
		return
	}

	selectedPeriod := strings.TrimSpace(c.Query("period"))
	current := pickKPIByPeriod(history, selectedPeriod)
	if current == nil && len(history) > 0 {
		last := history[len(history)-1]
		current = &models.EmployeeKPIRecord{
			Period:        last.Period,
			OverallRating: last.OverallRating,
			Tasks:         last.Tasks,
			UpdatedAt:     last.UpdatedAt,
		}
	}

	periods := make([]string, 0, len(history))
	for _, item := range history {
		periods = append(periods, item.Period)
	}

	c.JSON(http.StatusOK, models.KPIPagePayload{
		Department:       definition,
		Employee:         record,
		Current:          current,
		History:          history,
		AvailablePeriods: periods,
	})
}

// UpsertRecordKPI сохраняет KPI по сотруднику и периоду.
func UpsertRecordKPI(c *gin.Context) {
	if !database.HasSQL() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "SQL-хранилище KPI не настроено"})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}
	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID сотрудника"})
		return
	}

	if !user.CanWrite(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет прав для изменения KPI"})
		return
	}

	var req models.KPIUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError(err)})
		return
	}
	if req.Period == "" {
		req.Period = time.Now().Format("2006-01")
	}
	if req.ContractType == "" {
		req.ContractType = "ТД"
	}
	if req.Tasks == nil {
		req.Tasks = []models.Task{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	department, record, err := loadDepartmentAndRecord(ctx, deptID, recordID)
	if err != nil {
		writeRecordLookupError(c, err)
		return
	}

	definition := models.GetDepartmentKPIDefinition(department.Code)

	// Сериализуем массив динамических задач напрямую в JSON-строку
	componentJSON, err := json.Marshal(req.Tasks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сериализации KPI"})
		return
	}

	_, err = database.SQLDB.ExecContext(ctx, `
INSERT INTO employee_kpi (
    name, department_id, record_id, period, contract_type,
    lateness_minutes, vacation, sick_leave_days, training,
    overall_rating, component_values, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT (department_id, record_id, period) DO UPDATE SET
    name = EXCLUDED.name,
    contract_type = EXCLUDED.contract_type,
    lateness_minutes = EXCLUDED.lateness_minutes,
    vacation = EXCLUDED.vacation,
    sick_leave_days = EXCLUDED.sick_leave_days,
    training = EXCLUDED.training,
    overall_rating = EXCLUDED.overall_rating,
    component_values = EXCLUDED.component_values,
    updated_at = EXCLUDED.updated_at
`, record.FullName(), deptID.Hex(), recordID.Hex(), req.Period, req.ContractType, req.LatenessMinutes, req.Vacation, req.SickLeaveDays, req.Training, req.OverallRating, componentJSON, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения KPI"})
		return
	}

	current, err := readKPIForPeriod(ctx, deptID.Hex(), recordID.Hex(), req.Period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка чтения KPI после сохранения"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "KPI сохранен",
		"department": definition,
		"employee":   record,
		"current":    current,
	})
}

// ApplyKPIToRecords обогащает записи сотрудников актуальными сводками KPI и сортирует их по рейтингу.
func ApplyKPIToRecords(ctx context.Context, deptID primitive.ObjectID, records []models.EmployeeRecord) []models.EmployeeRecord {
	if !database.HasSQL() || len(records) == 0 {
		return records
	}

	overviews, err := loadLatestKPIOverviews(ctx, deptID, records)
	if err != nil {
		return records
	}

	for i := range records {
		if summary, ok := overviews[records[i].ID.Hex()]; ok {
			records[i].KPI = &summary
		}
	}

	sort.SliceStable(records, func(i, j int) bool {
		left := 0.0
		right := 0.0
		if records[i].KPI != nil {
			left = records[i].KPI.OverallRating
		}
		if records[j].KPI != nil {
			right = records[j].KPI.OverallRating
		}
		if left == right {
			return records[i].FullName() < records[j].FullName()
		}
		return left > right
	})

	for i := range records {
		if records[i].KPI == nil {
			records[i].KPI = &models.EmployeeKPISummary{}
		}
	}

	return records
}

func loadDepartmentAndRecord(ctx context.Context, deptID, recordID primitive.ObjectID) (models.Department, models.EmployeeRecord, error) {
	var department models.Department
	if err := database.Collection("departments").FindOne(ctx, bson.M{"_id": deptID, "is_active": true}).Decode(&department); err != nil {
		return models.Department{}, models.EmployeeRecord{}, err
	}

	var record models.EmployeeRecord
	if err := database.Collection("employee_records").FindOne(ctx, bson.M{"_id": recordID, "department_id": deptID}).Decode(&record); err != nil {
		return models.Department{}, models.EmployeeRecord{}, err
	}

	return department, record, nil
}

func writeRecordLookupError(c *gin.Context, err error) {
	if errors.Is(err, mongo.ErrNoDocuments) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сотрудник или отдел не найдены"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных сотрудника"})
}

func readKPIHistory(ctx context.Context, deptID, recordID string) ([]models.KPIHistoryItem, error) {
	rows, err := database.SQLDB.QueryContext(ctx, `
SELECT period, overall_rating, lateness_minutes, sick_leave_days, component_values, updated_at
FROM employee_kpi
WHERE department_id = $1 AND record_id = $2
ORDER BY period ASC, updated_at ASC
`, deptID, recordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	history := make([]models.KPIHistoryItem, 0)
	for rows.Next() {
		item, err := scanKPIHistoryItem(rows)
		if err != nil {
			return nil, err
		}
		history = append(history, item)
	}
	return history, rows.Err()
}

func readKPIForPeriod(ctx context.Context, deptID, recordID, period string) (*models.EmployeeKPIRecord, error) {
	row := database.SQLDB.QueryRowContext(ctx, `
SELECT id, name, department_id, record_id, period, contract_type, lateness_minutes,
       vacation, sick_leave_days, training, overall_rating, component_values, updated_at
FROM employee_kpi
WHERE department_id = $1 AND record_id = $2 AND period = $3
`, deptID, recordID, period)

	record, err := scanKPIRecord(row)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func pickKPIByPeriod(history []models.KPIHistoryItem, period string) *models.EmployeeKPIRecord {
	if len(history) == 0 {
		return nil
	}
	if period == "" {
		return &models.EmployeeKPIRecord{
			Period:        history[len(history)-1].Period,
			OverallRating: history[len(history)-1].OverallRating,
			Tasks:         history[len(history)-1].Tasks,
			UpdatedAt:     history[len(history)-1].UpdatedAt,
		}
	}
	for _, item := range history {
		if item.Period == period {
			return &models.EmployeeKPIRecord{
				Period:        item.Period,
				OverallRating: item.OverallRating,
				Tasks:         item.Tasks,
				UpdatedAt:     item.UpdatedAt,
			}
		}
	}
	return nil
}

func scanKPIRecord(scanner interface{ Scan(dest ...any) error }) (models.EmployeeKPIRecord, error) {
	var record models.EmployeeKPIRecord
	var componentBytes []byte
	if err := scanner.Scan(
		&record.ID,
		&record.Name,
		&record.DepartmentID,
		&record.RecordID,
		&record.Period,
		&record.ContractType,
		&record.LatenessMinutes,
		&record.Vacation,
		&record.SickLeaveDays,
		&record.Training,
		&record.OverallRating,
		&componentBytes,
		&record.UpdatedAt,
	); err != nil {
		return models.EmployeeKPIRecord{}, err
	}
	record.Tasks = []models.Task{}
	if len(componentBytes) > 0 {
		if err := json.Unmarshal(componentBytes, &record.Tasks); err != nil {
			return models.EmployeeKPIRecord{}, err
		}
	}
	return record, nil
}

func scanKPIHistoryItem(rows *sql.Rows) (models.KPIHistoryItem, error) {
	var item models.KPIHistoryItem
	var componentBytes []byte
	if err := rows.Scan(&item.Period, &item.OverallRating, &item.LatenessMinutes, &item.SickLeaveDays, &componentBytes, &item.UpdatedAt); err != nil {
		return models.KPIHistoryItem{}, err
	}
	item.Tasks = []models.Task{}
	if len(componentBytes) > 0 {
		if err := json.Unmarshal(componentBytes, &item.Tasks); err != nil {
			return models.KPIHistoryItem{}, err
		}
	}
	return item, nil
}

func loadLatestKPIOverviews(ctx context.Context, deptID primitive.ObjectID, records []models.EmployeeRecord) (map[string]models.EmployeeKPISummary, error) {
	recordIDs := make([]string, 0, len(records))
	for _, record := range records {
		recordIDs = append(recordIDs, record.ID.Hex())
	}
	if len(recordIDs) == 0 {
		return map[string]models.EmployeeKPISummary{}, nil
	}

	placeholders := make([]string, len(recordIDs))
	args := make([]any, 0, len(recordIDs)+1)
	args = append(args, deptID.Hex())
	for i, recordID := range recordIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, recordID)
	}

	query := fmt.Sprintf(`
SELECT DISTINCT ON (record_id) record_id, period, overall_rating, updated_at
FROM employee_kpi
WHERE department_id = $1 AND record_id IN (%s)
ORDER BY record_id, period DESC, updated_at DESC
`, strings.Join(placeholders, ","))

	rows, err := database.SQLDB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]models.EmployeeKPISummary)
	for rows.Next() {
		var recordID, period string
		var overall float64
		var updatedAt time.Time
		if err := rows.Scan(&recordID, &period, &overall, &updatedAt); err != nil {
			return nil, err
		}
		result[recordID] = models.EmployeeKPISummary{OverallRating: overall, Period: period, UpdatedAt: updatedAt}
	}
	return result, rows.Err()
}

// Заглушка для обработки ошибок валидации Gin
func validationError(err error) string {
	return err.Error()
}
