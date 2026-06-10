package models

import "time"

// MetricValues описывает плановые и фактические показатели внутри задачи.
type MetricValues struct {
	Plan float64 `json:"plan"`
	Fact float64 `json:"fact"`
}

// Task описывает структуру отдельной задачи/проекта сотрудника.
type Task struct {
	ID      string                  `json:"id"`
	Title   string                  `json:"title"`
	Metrics map[string]MetricValues `json:"metrics"`
}

// KPIComponentDefinition описывает один KPI-компонент отдела.
type KPIComponentDefinition struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
	Unit        string `json:"unit,omitempty"`
}

// DepartmentKPIDefinition хранит набор KPI-компонентов для конкретного отдела.
type DepartmentKPIDefinition struct {
	DepartmentCode string                   `json:"department_code"`
	Title          string                   `json:"title"`
	Components     []KPIComponentDefinition `json:"components"`
}

// EmployeeKPISummary — короткая информация о KPI для списка сотрудников.
type EmployeeKPISummary struct {
	OverallRating  float64   `json:"overall_rating"`
	Period         string    `json:"period"`
	UpdatedAt      time.Time `json:"updated_at"`
	ComponentCount int       `json:"component_count,omitempty"`
}

// EmployeeKPIRecord хранит KPI-данные по одному сотруднику и периоду.
type EmployeeKPIRecord struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	DepartmentID    string    `json:"department_id"`
	RecordID        string    `json:"record_id"`
	Period          string    `json:"period"`
	ContractType    string    `json:"contract_type"`
	LatenessMinutes int       `json:"lateness_minutes"`
	Vacation        string    `json:"vacation"`
	SickLeaveDays   int       `json:"sick_leave_days"`
	Training        string    `json:"training"`
	OverallRating   float64   `json:"overall_rating"`
	Tasks           []Task    `json:"tasks" gorm:"serializer:json"`
	UpdatedAt       time.Time `json:"updated_at"`
	ComponentValues interface{}
}

// KPIHistoryItem — одна точка истории KPI для графика и аккордеона.
type KPIHistoryItem struct {
	Period          string    `json:"period"`
	OverallRating   float64   `json:"overall_rating"`
	LatenessMinutes int       `json:"lateness_minutes"`
	SickLeaveDays   int       `json:"sick_leave_days"`
	Tasks           []Task    `json:"tasks" gorm:"serializer:json"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// KPIPagePayload — общая структура для страницы KPI.
type KPIPagePayload struct {
	Department       DepartmentKPIDefinition `json:"department"`
	Employee         EmployeeRecord          `json:"employee"` // Предполагается, что EmployeeRecord описан в другом файле этого пакета
	Current          *EmployeeKPIRecord      `json:"current,omitempty"`
	History          []KPIHistoryItem        `json:"history"`
	AvailablePeriods []string                `json:"available_periods"`
}

// KPIUpsertRequest — входные данные для сохранения KPI.
type KPIUpsertRequest struct {
	Period          string  `json:"period" binding:"required"`
	ContractType    string  `json:"contract_type"`
	LatenessMinutes int     `json:"lateness_minutes"`
	Vacation        string  `json:"vacation"`
	SickLeaveDays   int     `json:"sick_leave_days"`
	Training        string  `json:"training"`
	OverallRating   float64 `json:"overall_rating"`
	Tasks           []Task  `json:"tasks"` // Теперь бэкенд без проблем примет массив задач с фронта
}

// GetDepartmentKPIDefinition возвращает KPI-набор для отдела.
func GetDepartmentKPIDefinition(departmentCode string) DepartmentKPIDefinition {
	// Убрали все case "projects":, case "tenders": и т.д.
	// Теперь все отделы работают как HR — без готовых параметров
	return DepartmentKPIDefinition{
		DepartmentCode: departmentCode,
		Title:          "KPI отдела",
		Components:     []KPIComponentDefinition{},
	}
}
