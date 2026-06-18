package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FiredEmployee хранит копию записи уволенного сотрудника.
type FiredEmployee struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LastName         string             `bson:"last_name" json:"last_name"`
	FirstName        string             `bson:"first_name" json:"first_name"`
	MiddleName       string             `bson:"middle_name" json:"middle_name"`
	Position         string             `bson:"position" json:"position"`
	DepartmentID     primitive.ObjectID `bson:"department_id" json:"department_id"`
	Phone            string             `bson:"phone" json:"phone"`
	Email            string             `bson:"email" json:"email"`
	EmployeeNum      string             `bson:"employee_num" json:"employee_num"`
	HireDate         *time.Time         `bson:"hire_date,omitempty" json:"hire_date,omitempty"`
	FireDate         time.Time          `bson:"fire_date" json:"fire_date"`
	FireReason       string             `bson:"fire_reason" json:"fire_reason"`
	FireType         string             `bson:"fire_type" json:"fire_type"`
	OriginalRecordID primitive.ObjectID `bson:"original_record_id" json:"original_record_id"`
	Notes            string             `bson:"notes" json:"notes"`
	City             string             `bson:"city,omitempty" json:"city,omitempty"`
	StartDate        *time.Time         `bson:"start_date,omitempty" json:"start_date,omitempty"`
	EndDate          *time.Time         `bson:"end_date,omitempty" json:"end_date,omitempty"`
	Status           string             `bson:"status,omitempty" json:"status,omitempty"`
	Documents        []DocumentMeta     `bson:"documents,omitempty" json:"documents,omitempty"`
	AvatarPath       string             `bson:"avatar_path,omitempty" json:"avatar_path,omitempty"`
	AvatarURL        string             `bson:"-" json:"avatar_url,omitempty"`
	OriginalNotes    string             `bson:"original_notes,omitempty" json:"original_notes,omitempty"`
	CreatedBy        primitive.ObjectID `bson:"created_by" json:"created_by"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
}

// FiredEmployeeCreateRequest описывает ручное создание уволенного.
type FiredEmployeeCreateRequest struct {
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
