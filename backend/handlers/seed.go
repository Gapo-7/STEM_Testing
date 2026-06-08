package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"stem-doc-manager/config"
	"stem-doc-manager/database"
	"stem-doc-manager/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// SeedDatabase заполняет БД начальными данными: отделы из оргструктуры и аккаунт директора.
// Вызывается автоматически при первом запуске сервера (если БД пуста).
func SeedDatabase() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Пропускаем сид, если данные уже есть
	count, _ := database.Collection("departments").CountDocuments(ctx, bson.M{})
	if count > 0 {
		log.Println("[seed] База данных уже заполнена, пропускаем сид")
		return
	}

	log.Println("[seed] Начало заполнения базы данных...")

	// ── Отделы по оргструктуре STEM Academia ─────────────────────────────
	departments := []models.Department{
		{
			ID: mustID("000000000000000000000001"),
			Name: "Административно-управленческий департамент",
			Code: "admin_management", Description: "Управление компанией и административные функции",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000002"),
			Name: "Финансовый отдел", Code: "finance",
			Description: "Бухгалтерия, финансовый анализ и отчётность",
			ParentID:    pID("000000000000000000000001"),
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000003"),
			Name: "HR отдел", Code: "hr",
			Description: "Подбор и управление персоналом",
			ParentID:    pID("000000000000000000000001"),
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000004"),
			Name: "Проектный департамент", Code: "projects",
			Description: "Управление строительными и инженерными проектами",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000005"),
			Name: "Отдел тендеров", Code: "tenders",
			Description: "Участие в государственных и коммерческих тендерах",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000006"),
			Name: "Торговый Дом", Code: "trading_house",
			Description: "Снабжение и материально-техническое обеспечение",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000007"),
			Name: "STEM Academia", Code: "stem_academia",
			Description: "Образовательное подразделение компании",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000008"),
			Name: "SA Development", Code: "sa_development",
			Description: "Строительно-инженерное подразделение",
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000009"),
			Name: "Отдел проектов SA", Code: "sa_projects",
			Description: "Проектный отдел SA Development",
			ParentID:    pID("000000000000000000000008"),
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
		{
			ID: mustID("000000000000000000000010"),
			Name: "Отдел продаж SA", Code: "sa_sales",
			Description: "Отдел продаж SA Development",
			ParentID:    pID("000000000000000000000008"),
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		},
	}

	// Вставляем отделы
	deptDocs := make([]interface{}, len(departments))
	for i, d := range departments {
		deptDocs[i] = d
	}
	if _, err := database.Collection("departments").InsertMany(ctx, deptDocs); err != nil {
		log.Printf("[seed] Ошибка вставки отделов: %v", err)
		return
	}
	log.Printf("[seed] Создано %d отделов", len(departments))

	// ── Аккаунт директора ─────────────────────────────────────────────
	adminCount, _ := database.Collection("users").CountDocuments(ctx, bson.M{})
	if adminCount == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte(config.App.SeedAdminPassword), 12)
		admin := models.User{
			ID:           primitive.NewObjectID(),
			Name:         config.App.SeedAdminName,
			Email:        config.App.SeedAdminEmail,
			PasswordHash: string(hash),
			Role:         models.RoleDirector,
			IsActive:     true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		if _, err := database.Collection("users").InsertOne(ctx, admin); err != nil {
			log.Printf("[seed] Ошибка создания администратора: %v", err)
		} else {
			log.Printf("[seed] Администратор создан: %s", config.App.SeedAdminEmail)
		}
	}

	log.Println("[seed] Заполнение базы данных завершено!")
}

// SeedHandler — HTTP-обработчик для ручного запуска сида (только для разработки)
func SeedHandler(c *gin.Context) {
	SeedDatabase()
	c.JSON(http.StatusOK, gin.H{"message": "База данных заполнена"})
}

// mustID создаёт ObjectID из hex-строки (паникует при ошибке — только для сида)
func mustID(hex string) primitive.ObjectID {
	id, err := primitive.ObjectIDFromHex(hex)
	if err != nil {
		panic(err)
	}
	return id
}

// pID — хелпер для создания указателя на ObjectID
func pID(hex string) *primitive.ObjectID {
	id := mustID(hex)
	return &id
}
