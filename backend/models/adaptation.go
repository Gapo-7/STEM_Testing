package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Criterion описывает одну оценку кандидата на адаптацию.
type Criterion struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Comment     string             `bson:"comment" json:"comment"`
	Score       int                `bson:"score" json:"score"`
	EvaluatedBy string             `bson:"evaluated_by" json:"evaluated_by"`
	EvaluatedAt *time.Time         `bson:"evaluated_at,omitempty" json:"evaluated_at,omitempty"`
}

// AdaptationCandidate хранит данные кандидата, проходящего адаптацию.
type AdaptationCandidate struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	LastName         string              `bson:"last_name" json:"last_name"`
	FirstName        string              `bson:"first_name" json:"first_name"`
	MiddleName       string              `bson:"middle_name" json:"middle_name"`
	Phone            string              `bson:"phone" json:"phone"`
	Email            string              `bson:"email" json:"email"`
	Position         string              `bson:"position" json:"position"`
	DepartmentID     primitive.ObjectID  `bson:"department_id" json:"department_id"`
	Status           string              `bson:"status" json:"status"`
	StartDate        *time.Time          `bson:"start_date,omitempty" json:"start_date,omitempty"`
	EndDate          *time.Time          `bson:"end_date,omitempty" json:"end_date,omitempty"`
	EmployeeRecordID *primitive.ObjectID `bson:"employee_record_id,omitempty" json:"employee_record_id,omitempty"`
	Criteria         []Criterion         `bson:"criteria" json:"criteria"`
	Notes            string              `bson:"notes" json:"notes"`
	CreatedBy        primitive.ObjectID  `bson:"created_by" json:"created_by"`
	CreatedAt        time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt        time.Time           `bson:"updated_at" json:"updated_at"`
}

// AdaptationCandidateUpdateRequest используется для обновления кандидата.
type AdaptationCandidateUpdateRequest struct {
	LastName   string `json:"last_name" binding:"required"`
	FirstName  string `json:"first_name" binding:"required"`
	MiddleName string `json:"middle_name"`
	Phone      string `json:"phone"`
	Email      string `json:"email"`
	Position   string `json:"position" binding:"required"`
	Status     string `json:"status" binding:"required,oneof=ongoing passed failed fired"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	Notes      string `json:"notes"`
}
