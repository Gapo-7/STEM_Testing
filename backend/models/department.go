package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Department представляет структурное подразделение компании.
// Отделы могут быть вложенными: ParentID указывает на родительский отдел.
type Department struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty"          json:"id"`
	Name        string              `bson:"name"                   json:"name"`        // Полное название (рус)
	Code        string              `bson:"code"                   json:"code"`        // Уникальный код (напр. "finance")
	Description string              `bson:"description"            json:"description"` // Краткое описание
	ParentID    *primitive.ObjectID `bson:"parent_id,omitempty"    json:"parent_id,omitempty"` // Родительский отдел
	HeadID      *primitive.ObjectID `bson:"head_id,omitempty"      json:"head_id,omitempty"`   // Руководитель отдела
	HeadName    string              `bson:"head_name,omitempty"    json:"head_name,omitempty"` // Кэш имени руководителя
	IsActive    bool                `bson:"is_active"              json:"is_active"`
	CreatedAt   time.Time           `bson:"created_at"             json:"created_at"`
	UpdatedAt   time.Time           `bson:"updated_at"             json:"updated_at"`
}

// DepartmentWithStats используется для отображения на дашборде (добавляет кол-во записей).
type DepartmentWithStats struct {
	Department  `bson:",inline"`
	RecordCount int64 `json:"record_count"`
}
