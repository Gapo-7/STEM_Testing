package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"stem-doc-manager/database"
	"stem-doc-manager/middleware"
	"stem-doc-manager/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	maxFileSize = 50 * 1024 * 1024 // 50 MB
	uploadsDir  = "./uploads"
)

// POST /api/departments/:id/records/:rid/upload
func UploadDocument(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	// Парсим параметры маршрута
	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	// Проверка доступа
	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	// 1. Получаем файл из запроса
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не найден"})
		return
	}
	defer file.Close()

	// 2. Получаем информацию о документе из формы
	docType := c.PostForm("doc_type")
	docName := c.PostForm("name")
	description := c.PostForm("description")

	if docName == "" {
		docName = header.Filename
	}

	// 3. Валидация размера
	if header.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Файл слишком большой (макс %d MB)", maxFileSize/1024/1024),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 4. Получаем информацию о отделе для кода папки
	var department models.Department
	err = database.Collection("departments").FindOne(ctx, bson.M{"_id": deptID}).Decode(&department)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Отдел не найден"})
		return
	}

	// 5. Создаем иерархическую структуру папок
	// uploads/finance/507f1f77bcf86cd799439011/filename.pdf
	deptFolder := filepath.Join(uploadsDir, department.Code)
	recordFolder := filepath.Join(deptFolder, recordID.Hex())

	// Создаем директории если их нет
	if err := os.MkdirAll(recordFolder, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания папки"})
		return
	}

	// 6. Создаем уникальное имя файла
	timestamp := time.Now().Unix()
	uniqueFileName := fmt.Sprintf("%d_%s", timestamp, header.Filename)
	filePath := filepath.Join(recordFolder, uniqueFileName)

	// 7. Сохраняем файл на диск
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения файла"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка записи файла"})
		return
	}

	// 8. Создаем документ в MongoDB
	docID := primitive.NewObjectID()
	newDoc := models.DocumentMeta{
		ID:          docID,
		Name:        docName,
		DocType:     docType,
		Description: description,
		FilePath:    filePath,
		FileSize:    header.Size,
		UploadedAt:  time.Now(),
	}

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 9. Обновляем запись сотрудника - добавляем документ в массив
	_, err = database.Collection("employee_records").UpdateOne(ctx,
		bson.M{
			"_id":           recordID,
			"department_id": deptID,
		},
		bson.M{
			"$push": bson.M{"documents": newDoc},
		},
	)
	if err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения в БД"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Файл загружен успешно",
		"document":  newDoc,
		"file_path": filePath,
	})
}

// GET /api/departments/:id/records/:rid/download/:docid
func DownloadDocument(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	docID, err := primitive.ObjectIDFromHex(c.Param("docid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID документа"})
		return
	}

	// Проверка доступа
	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Получаем запись сотрудника
	var record models.EmployeeRecord
	err = database.Collection("employee_records").FindOne(ctx,
		bson.M{
			"_id":           recordID,
			"department_id": deptID,
		},
	).Decode(&record)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
		return
	}

	// Ищем документ в массиве
	var document *models.DocumentMeta
	for i := range record.Documents {
		if record.Documents[i].ID == docID {
			document = &record.Documents[i]
			break
		}
	}

	if document == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Документ не найден"})
		return
	}

	// Проверяем что файл существует
	if _, err := os.Stat(document.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Файл не найден на сервере"})
		return
	}

	// Отправляем файл как вложение (используем имя, указанное пользователем)
	c.FileAttachment(document.FilePath, document.Name)
}

// DELETE /api/departments/:id/records/:rid/documents/:docid
func DeleteDocument(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	deptID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID отдела"})
		return
	}

	recordID, err := primitive.ObjectIDFromHex(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID записи"})
		return
	}

	docID, err := primitive.ObjectIDFromHex(c.Param("docid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID документа"})
		return
	}

	// Проверка доступа
	if !user.CanAccessDepartment(deptID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Получаем запись
	var record models.EmployeeRecord
	err = database.Collection("employee_records").FindOne(ctx,
		bson.M{
			"_id":           recordID,
			"department_id": deptID,
		},
	).Decode(&record)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
		return
	}

	// Ищем документ и удаляем файл
	for i := range record.Documents {
		if record.Documents[i].ID == docID {
			filePath := record.Documents[i].FilePath
			os.Remove(filePath) // Удаляем файл с диска

			// Удаляем документ из массива в MongoDB
			_, err := database.Collection("employee_records").UpdateOne(ctx,
				bson.M{"_id": recordID},
				bson.M{"$pull": bson.M{"documents": bson.M{"_id": docID}}},
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Документ удален"})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Документ не найден"})
}
