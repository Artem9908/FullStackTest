package tests

import (
	"fullstacktest/pkg/database"
	"fullstacktest/pkg/models"
	"fullstacktest/pkg/router"
	"log"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var testDB *gorm.DB
var testRouter *gin.Engine

func TestMain(m *testing.M) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Setup test database
	setupTestDB()

	// Run tests
	code := m.Run()

	// Cleanup
	cleanupTestDB()

	os.Exit(code)
}

func setupTestDB() {
	// Configure test database connection
	dsn := "host=localhost user=postgres password=postgres dbname=fullstacktest_test port=5432 sslmode=disable"
	
	var err error
	testDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("Failed to connect to test database:", err)
	}

	// Migrate schema
	err = testDB.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
	)
	if err != nil {
		log.Fatal("Failed to migrate test database:", err)
	}

	// Create indexes
	testDB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items (order_id, product_id);
		CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_products_name_price ON products (name, price);
		CREATE INDEX IF NOT EXISTS idx_active_orders ON orders (user_id, created_at DESC) 
		WHERE status NOT IN ('delivered', 'cancelled');
	`)

	// Set the test DB for the application
	database.DB = testDB

	// Initialize the test router
	testRouter = router.SetupRouter()
}

func cleanupTestDB() {
	// Drop all tables
	sqlDB, err := testDB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	// Drop all tables
	testDB.Exec("DROP SCHEMA public CASCADE")
	testDB.Exec("CREATE SCHEMA public")

	// Close connection
	sqlDB.Close()
}

// Helper function to clear all tables between tests
func clearTables() {
	testDB.Exec("TRUNCATE TABLE users CASCADE")
	testDB.Exec("TRUNCATE TABLE products CASCADE")
	testDB.Exec("TRUNCATE TABLE orders CASCADE")
	testDB.Exec("TRUNCATE TABLE order_items CASCADE")
} 