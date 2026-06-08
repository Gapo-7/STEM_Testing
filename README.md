# STEM Academia — Document Management System

Система управления документами сотрудников с ролевым доступом.

## Стек
- **Backend**: Go 1.21 + Gin + MongoDB + JWT
- **Frontend**: React 18 + Vite + Tailwind CSS
- **БД**: MongoDB

## Быстрый старт

### 1. Предварительные требования
- Go 1.21+
- Node.js 18+
- MongoDB (локально или Atlas)

### 2. Настройка `.env`
Скопируйте файл `.env` в корне и измените значения:
```
JWT_SECRET=ваш-секретный-ключ-минимум-32-символа
MONGODB_URI=mongodb://localhost:27017
SEED_ADMIN_PASSWORD=ВашПарольДляДиректора
```

### 3. Backend
```bash
cd backend
go mod tidy       # скачать зависимости
go run main.go    # запуск на :8080
```
При первом запуске автоматически создаются:
- 10 отделов по оргструктуре STEM Academia
- Аккаунт директора (email из .env)

### 4. Frontend
```bash
cd frontend
npm install
npm run dev       # запуск на :5173
```

## Иерархия доступа

| Роль | Уровень | Доступ |
|------|---------|--------|
| `director` | 1 | Все отделы + управление пользователями |
| `managing_director` | 2 | Все отделы |
| `department_head` | 3 | Только свой отдел |
| `employee` | 4 | Нет доступа к отделам |

## API эндпоинты

```
POST /api/auth/register      — регистрация
POST /api/auth/login         — вход (возвращает access + refresh токены)
POST /api/auth/refresh       — обновление access-токена
POST /api/auth/logout        — выход (инвалидация refresh-токена)

GET  /api/users              — все пользователи [director]
PUT  /api/users/:id          — изменение роли/отдела [director]

GET  /api/departments        — доступные отделы (по роли)
POST /api/departments        — создать отдел [director/managing_director]

GET  /api/departments/:id/records     — записи отдела
POST /api/departments/:id/records     — добавить запись
PUT  /api/departments/:id/records/:rid — изменить запись
DELETE /api/departments/:id/records/:rid — удалить запись
```

## Защита от DDoS
- Auth-эндпоинты: **10 запросов/минуту** на IP
- Остальные: **100 запросов/минуту** на IP
- JWT access-токен: **15 минут**
- JWT refresh-токен: **7 дней** (хранится в MongoDB, инвалидируется при logout)

## Структура проекта
```
stem-doc-manager/
├── .env
├── backend/
│   ├── main.go
│   ├── config/        — загрузка конфигурации
│   ├── database/      — подключение к MongoDB + индексы
│   ├── models/        — User, Department, EmployeeRecord, Token
│   ├── handlers/      — auth, users, departments, records, seed
│   ├── middleware/    — JWT auth, rate limiter
│   └── utils/         — JWT generate/validate
└── frontend/
    └── src/
        ├── api/       — Axios клиент с авто-рефрешем токена
        ├── context/   — AuthContext, ThemeContext
        ├── components/ — Sidebar, ProtectedRoute
        └── pages/     — Login, Register, Dashboard, Department, RecordForm, UsersAdmin
```
