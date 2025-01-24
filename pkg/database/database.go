package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"fullstacktest/pkg/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Configure GORM logger
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	// Configure database connection
	config := &gorm.Config{
		Logger: newLogger,
		PrepareStmt: true, // Enable prepared statement cache
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	// Configure PostgreSQL connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Disable prepared statement cache at postgres driver level
	}), config)

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Configure connection pool
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)           // Maximum number of idle connections
	sqlDB.SetMaxOpenConns(100)          // Maximum number of open connections
	sqlDB.SetConnMaxLifetime(time.Hour) // Maximum lifetime of a connection

	// Auto Migrate the schema with indexes
	err = DB.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Create composite indexes for better query performance
	DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items (order_id, product_id);
		CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_products_name_price ON products (name, price);
	`)

	// Create partial index for active orders
	DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_active_orders ON orders (user_id, created_at DESC) 
		WHERE status NOT IN ('delivered', 'cancelled');
	`)
} 