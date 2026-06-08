package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RefreshToken хранится в MongoDB для возможности инвалидации при выходе.
// TTL-индекс автоматически удаляет истёкшие токены (настроен в database/mongo.go).
type RefreshToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"  json:"id"`
	UserID    primitive.ObjectID `bson:"user_id"        json:"user_id"`
	TokenHash string             `bson:"token_hash"     json:"-"` // SHA-256 хэш токена
	UserAgent string             `bson:"user_agent"     json:"user_agent"`
	IP        string             `bson:"ip"             json:"ip"`
	ExpiresAt time.Time          `bson:"expires_at"     json:"expires_at"` // Используется TTL-индексом
	CreatedAt time.Time          `bson:"created_at"     json:"created_at"`
}
