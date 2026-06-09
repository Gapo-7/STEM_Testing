package main

import (
	"log"
	"stem-doc-manager/config"
	"stem-doc-manager/database"
	"stem-doc-manager/handlers"
	"stem-doc-manager/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.Load()
	gin.SetMode(config.App.GinMode)

	database.Connect()
	database.ConnectSQL()
	defer database.Disconnect()
	defer database.DisconnectSQL()

	// Сид начальных данных при первом запуске
	handlers.SeedDatabase()

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{config.App.AllowedOrigins},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")

	// ── Auth (строгий rate limit — защита от DDoS) ──
	auth := api.Group("/auth")
	auth.Use(middleware.RateLimit(config.App.RateLimitAuth))
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.RefreshToken)
		auth.POST("/logout", handlers.Logout)
	}

	// ── Защищённые маршруты (глобальный rate limit) ──
	protected := api.Group("/")
	protected.Use(middleware.RateLimit(config.App.RateLimitGlobal))
	protected.Use(middleware.AuthRequired())
	{
		// Текущий пользователь
		protected.GET("/users/me", handlers.GetMe)

		// Управление пользователями (директор)
		users := protected.Group("/users")
		users.Use(middleware.RequireRole("director"))
		{
			users.GET("", handlers.GetUsers)
			users.GET("/:id", handlers.GetUser)
			users.PUT("/:id", handlers.UpdateUser)
			users.DELETE("/:id", handlers.DeleteUser)
		}
		// Пользователь редактирует себя
		protected.PUT("/users/me", handlers.UpdateUser)

		// Отделы
		depts := protected.Group("/departments")
		{
			depts.GET("", handlers.GetDepartments)
			depts.GET("/:id", handlers.GetDepartment)
			// Создание/удаление — только директор и управляющий
			depts.POST("", middleware.RequireRole("director", "managing_director"), handlers.CreateDepartment)
			depts.PUT("/:id", middleware.RequireRole("director", "managing_director"), handlers.UpdateDepartment)
			depts.DELETE("/:id", middleware.RequireRole("director"), handlers.DeleteDepartment)

			// Записи сотрудников внутри отдела
			depts.GET("/:id/records", handlers.GetRecords)
			depts.POST("/:id/records", handlers.CreateRecord)
			depts.GET("/:id/records/:rid", handlers.GetRecord)
			depts.PUT("/:id/records/:rid", handlers.UpdateRecord)
			depts.DELETE("/:id/records/:rid", handlers.DeleteRecord)
			depts.GET("/:id/records/:rid/kpi", handlers.GetRecordKPI)
			depts.PUT("/:id/records/:rid/kpi", handlers.UpsertRecordKPI)

			// Документы сотрудника (загрузка, скачивание, удаление)
			depts.POST("/:id/records/:rid/upload", handlers.UploadDocument)
			depts.GET("/:id/records/:rid/download/:docid", handlers.DownloadDocument)
			depts.DELETE("/:id/records/:rid/documents/:docid", handlers.DeleteDocument)
		}
	}

	log.Printf("[server] Запуск на порту :%s", config.App.Port)
	if err := r.Run(":" + config.App.Port); err != nil {
		log.Fatalf("[server] Ошибка запуска: %v", err)
	}
}
