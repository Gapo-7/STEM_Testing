package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Статусы сотрудника
const (
	StatusActive   = "active"    // Работает
	StatusInactive = "inactive"  // Уволен
	StatusOnLeave  = "on_leave"  // В отпуске/декрете
)

// DocumentMeta хранит метаданные документа с информацией о файле.
type DocumentMeta struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name"          json:"name"`        // Название документа
	DocType     string             `bson:"doc_type"      json:"doc_type"`    // Тип: contract, id, diploma, etc.
	Description string             `bson:"description"   json:"description"` // Дополнительная информация
	FilePath    string             `bson:"file_path"     json:"file_path"`   // Путь к файлу на диске
	FileSize    int64              `bson:"file_size"     json:"file_size"`   // Размер файла в байтах
	UploadedAt  time.Time          `bson:"uploaded_at"   json:"uploaded_at"` // Дата загрузки файла
}

// EmployeeRecord — основная запись о сотруднике в отделе.
// Содержит личную информацию и список документов (пока только названия).
type EmployeeRecord struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty"          json:"id"`
	DepartmentID primitive.ObjectID  `bson:"department_id"          json:"department_id"`

	// --- Персональные данные ---
	LastName   string `bson:"last_name"   json:"last_name"`   // Фамилия
	FirstName  string `bson:"first_name"  json:"first_name"`  // Имя
	MiddleName string `bson:"middle_name" json:"middle_name"` // Отчество / Патроним
	
	// --- Должность и контакты ---
	Position string `bson:"position" json:"position"` // Должность
	Phone    string `bson:"phone"    json:"phone"`    // Телефон
	Email    string `bson:"email"    json:"email"`    // Корпоративный email
	City     string `bson:"city"     json:"city"`     // Город (Астана / Алматы)

	// --- Трудовые данные ---
	StartDate   *time.Time `bson:"start_date,omitempty"   json:"start_date,omitempty"`   // Дата приёма
	EndDate     *time.Time `bson:"end_date,omitempty"     json:"end_date,omitempty"`     // Дата увольнения
	Status      string     `bson:"status"                 json:"status"`                 // active | inactive | on_leave
	EmployeeNum string     `bson:"employee_num,omitempty" json:"employee_num,omitempty"` // Табельный номер

	// --- Документы (имена без файлов) ---
	// Список названий документов, связанных с сотрудником.
	// Загрузка самих файлов будет добавлена в следующей версии.
	Documents []DocumentMeta `bson:"documents" json:"documents"`

	// --- Дополнительно ---
	Notes string `bson:"notes" json:"notes"` // Произвольные заметки

	// --- Метаданные записи ---
	CreatedBy primitive.ObjectID `bson:"created_by" json:"created_by"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// FullName возвращает полное ФИО сотрудника.
func (e *EmployeeRecord) FullName() string {
	return e.LastName + " " + e.FirstName + " " + e.MiddleName
}
