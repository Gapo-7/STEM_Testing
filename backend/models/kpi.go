package models

import "time"

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
	ID              int64              `json:"id"`
	Name            string             `json:"name"`
	DepartmentID    string             `json:"department_id"`
	RecordID        string             `json:"record_id"`
	Period          string             `json:"period"`
	ContractType    string             `json:"contract_type"`
	LatenessMinutes int                `json:"lateness_minutes"`
	Vacation        string             `json:"vacation"`
	SickLeaveDays   int                `json:"sick_leave_days"`
	Training        string             `json:"training"`
	OverallRating   float64            `json:"overall_rating"`
	ComponentValues map[string]float64 `json:"component_values"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

// KPIHistoryItem — одна точка истории KPI для графика.
type KPIHistoryItem struct {
	Period          string             `json:"period"`
	OverallRating   float64            `json:"overall_rating"`
	ComponentValues map[string]float64 `json:"component_values"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

// KPIPagePayload — общая структура для страницы KPI.
type KPIPagePayload struct {
	Department       DepartmentKPIDefinition `json:"department"`
	Employee         EmployeeRecord          `json:"employee"`
	Current          *EmployeeKPIRecord      `json:"current,omitempty"`
	History          []KPIHistoryItem        `json:"history"`
	AvailablePeriods []string                `json:"available_periods"`
}

// KPIUpsertRequest — входные данные для сохранения KPI.
type KPIUpsertRequest struct {
	Period          string             `json:"period" binding:"required"`
	ContractType    string             `json:"contract_type"`
	LatenessMinutes int                `json:"lateness_minutes"`
	Vacation        string             `json:"vacation"`
	SickLeaveDays   int                `json:"sick_leave_days"`
	Training        string             `json:"training"`
	OverallRating   float64            `json:"overall_rating"`
	ComponentValues map[string]float64 `json:"component_values"`
}

// GetDepartmentKPIDefinition возвращает KPI-набор для отдела.
// Общая таблица KPI остаётся единой, а отличия отделов хранятся в JSON-компонентах.
func GetDepartmentKPIDefinition(departmentCode string) DepartmentKPIDefinition {
	switch departmentCode {
	case "projects":
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI проектного отдела",
			Components: []KPIComponentDefinition{
				{Key: "actual_delivery_time", Label: "Фактический срок реализации", Unit: "дн."},
				{Key: "project_quality", Label: "Качество реализованного проекта"},
				{Key: "project_control", Label: "Самостоятельное ведение и контроль проекта"},
				{Key: "margin_plan", Label: "Выполнение плана маржи", Unit: "%"},
				{Key: "completed_projects", Label: "Количество реализованных проектов", Unit: "шт."},
				{Key: "professional_growth", Label: "Профессиональное развитие сотрудника"},
				{Key: "discipline", Label: "Трудовая дисциплина"},
			},
		}
	case "tenders":
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI отдела тендеров",
			Components: []KPIComponentDefinition{
				{Key: "won_total", Label: "Выиграно всего", Unit: "шт."},
				{Key: "contract_sum", Label: "Сумма контрактов", Unit: "₸"},
				{Key: "lost_total", Label: "Проиграно всего", Unit: "шт."},
				{Key: "follow_up_quality", Label: "Отработка проектов", Description: "Звонки, жалобы, сопровождение и т.п."},
			},
		}
	case "sa_projects":
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI отдела проектов SA",
			Components: []KPIComponentDefinition{
				{Key: "actual_delivery_time", Label: "Фактический срок реализации", Unit: "дн."},
				{Key: "project_quality", Label: "Качество проекта"},
				{Key: "project_control", Label: "Самостоятельное ведение и контроль"},
				{Key: "completed_projects", Label: "Количество реализованных проектов", Unit: "шт."},
				{Key: "discipline", Label: "Трудовая дисциплина"},
			},
		}
	case "sa_sales":
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI коммерческого отдела SA",
			Components: []KPIComponentDefinition{
				{Key: "annual_sales", Label: "Сумма продаж за год", Unit: "₸"},
				{Key: "annual_profit", Label: "Сумма прибыли за год", Unit: "₸"},
				{Key: "discipline", Label: "Трудовая дисциплина"},
				{Key: "engagement", Label: "Вовлеченность сотрудника"},
				{Key: "presentations_quality", Label: "Презентации (качество)"},
				{Key: "training", Label: "Обучение"},
			},
		}
	case "designers":
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI дизайнеров",
			Components: []KPIComponentDefinition{
				{Key: "completed_projects", Label: "Выполнено проектов", Unit: "шт."},
				{Key: "active_projects", Label: "Активных проектов", Unit: "шт."},
				{Key: "closed_projects", Label: "Завершенных проектов", Unit: "шт."},
				{Key: "overdue_projects", Label: "Проектов с просрочкой", Unit: "шт."},
				{Key: "quality", Label: "Качество"},
			},
		}
	default:
		return DepartmentKPIDefinition{
			DepartmentCode: departmentCode,
			Title:          "KPI отдела",
			Components: []KPIComponentDefinition{
				{Key: "discipline", Label: "Трудовая дисциплина"},
				{Key: "training", Label: "Обучение"},
			},
		}
	}
}
