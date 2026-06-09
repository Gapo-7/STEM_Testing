package database

import (
	"context"
	"database/sql"
	"log"
	"time"

	"stem-doc-manager/config"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var SQLDB *sql.DB

// ConnectSQL подключает PostgreSQL для KPI.
func ConnectSQL() {
	if config.App.PostgresDSN == "" {
		log.Println("[db] POSTGRES_DSN не задан, KPI-функции будут недоступны")
		return
	}

	db, err := sql.Open("pgx", config.App.PostgresDSN)
	if err != nil {
		log.Fatalf("[db] Не удалось открыть PostgreSQL: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("[db] PostgreSQL недоступен: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	SQLDB = db
	log.Println("[db] Подключено к PostgreSQL для KPI")
	createKPITables()
}

// DisconnectSQL закрывает PostgreSQL-подключение.
func DisconnectSQL() {
	if SQLDB != nil {
		if err := SQLDB.Close(); err != nil {
			log.Printf("[db] Ошибка при закрытии PostgreSQL: %v", err)
		}
	}
}

// HasSQL сообщает, доступен ли SQL-слой.
func HasSQL() bool {
	return SQLDB != nil
}

func createKPITables() {
	if SQLDB == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := SQLDB.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS employee_kpi (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(255) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    period VARCHAR(50) NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'ТД',
    lateness_minutes INT DEFAULT 0,
    vacation VARCHAR(255) DEFAULT '',
    sick_leave_days INT DEFAULT 0,
    training TEXT DEFAULT '',
    overall_rating NUMERIC(6,2) NOT NULL DEFAULT 0,
    component_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, record_id, period)
);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_department_record_period ON employee_kpi (department_id, record_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_department_period ON employee_kpi (department_id, period DESC);
`)
	if err != nil {
		log.Printf("[db] Предупреждение при создании KPI-таблицы: %v", err)
	}
}
