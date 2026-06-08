// Пакет models определяет структуры данных для MongoDB.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Роли пользователей — определяют уровень доступа в системе.
// Иерархия: чем меньше число, тем выше уровень доступа.
const (
	RoleDirector        = "director"         // Уровень 1 — доступ ко всем отделам
	RoleManagingDirector = "managing_director" // Уровень 2 — доступ ко всем отделам
	RoleDepartmentHead  = "department_head"  // Уровень 3 — только свой отдел
	RoleEmployee        = "employee"         // Уровень 4 — только своя карточка
)

// HierarchyLevel возвращает числовой уровень иерархии по роли.
// Используется для сравнения: director (1) > managing_director (2) > ...
func HierarchyLevel(role string) int {
	switch role {
	case RoleDirector:
		return 1
	case RoleManagingDirector:
		return 2
	case RoleDepartmentHead:
		return 3
	default:
		return 4
	}
}

// User представляет учётную запись сотрудника в системе.
type User struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty"          json:"id"`
	Name         string              `bson:"name"                   json:"name"`
	Email        string              `bson:"email"                  json:"email"`
	PasswordHash string              `bson:"password_hash"          json:"-"` // никогда не отдаём в JSON
	Role         string              `bson:"role"                   json:"role"`
	DepartmentID *primitive.ObjectID `bson:"department_id,omitempty" json:"department_id,omitempty"`
	IsActive     bool                `bson:"is_active"              json:"is_active"`
	CreatedAt    time.Time           `bson:"created_at"             json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at"             json:"updated_at"`
}

// CanAccessAllDepartments возвращает true, если у пользователя уровень 1 или 2.
func (u *User) CanAccessAllDepartments() bool {
	return HierarchyLevel(u.Role) <= 2
}

// CanAccessDepartment проверяет, есть ли у пользователя доступ к конкретному отделу.
func (u *User) CanAccessDepartment(deptID primitive.ObjectID) bool {
	if u.CanAccessAllDepartments() {
		return true
	}
	// Руководитель отдела видит только свой отдел
	if u.Role == RoleDepartmentHead && u.DepartmentID != nil {
		return *u.DepartmentID == deptID
	}
	return false
}

// CanWrite проверяет, может ли пользователь создавать/редактировать записи в отделе.
func (u *User) CanWrite(deptID primitive.ObjectID) bool {
	return u.CanAccessDepartment(deptID)
}
