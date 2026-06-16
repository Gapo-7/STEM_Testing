// Пакет database управляет подключением к MongoDB и выполняет начальный сид данных.
package database

import (
	"context"
	"log"
	"time"

	"stem-doc-manager/config"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var DB *mongo.Database

// Connect устанавливает соединение с MongoDB и проверяет доступность.
func Connect() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(config.App.MongoURI)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("[db] Не удалось подключиться к MongoDB: %v", err)
	}

	// Ping для проверки соединения
	if err = client.Ping(ctx, nil); err != nil {
		log.Fatalf("[db] MongoDB недоступна: %v", err)
	}

	Client = client
	DB = client.Database(config.App.MongoDB)
	log.Printf("[db] Подключено к MongoDB: %s/%s", config.App.MongoURI, config.App.MongoDB)

	// Создаём индексы
	createIndexes()
}

// Disconnect корректно закрывает соединение.
func Disconnect() {
	if Client != nil {
		if err := Client.Disconnect(context.Background()); err != nil {
			log.Printf("[db] Ошибка при отключении: %v", err)
		}
	}
}

// Collection возвращает коллекцию по имени.
func Collection(name string) *mongo.Collection {
	return DB.Collection(name)
}

// createIndexes создаёт необходимые индексы для оптимизации запросов.
func createIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Уникальный индекс на email пользователей
	usersColl := DB.Collection("users")
	_, err := usersColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Printf("[db] Предупреждение при создании индекса users.email: %v", err)
	}

	// Индекс для быстрого поиска refresh-токенов
	tokensColl := DB.Collection("refresh_tokens")
	_, err = tokensColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "token_hash", Value: 1}},
	})
	if err != nil {
		log.Printf("[db] Предупреждение при создании индекса refresh_tokens: %v", err)
	}

	// TTL-индекс: автоматически удаляет просроченные токены
	_, err = tokensColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
	if err != nil {
		log.Printf("[db] Предупреждение при создании TTL-индекса токенов: %v", err)
	}

	firedColl := DB.Collection("fired_employees")
	_, err = firedColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "original_record_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Printf("[db] Предупреждение при создании индекса fired_employees.original_record_id: %v", err)
	}

	log.Println("[db] Индексы созданы")
}
