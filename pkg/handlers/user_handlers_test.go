package handlers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"fullstacktest/pkg/database"
	"fullstacktest/pkg/handlers"
	"fullstacktest/pkg/models"
	"fullstacktest/pkg/router"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

var (
	testDB     *gorm.DB
	testRouter http.Handler
)

func setupTestDB(t *testing.T) {
	var err error
	testDB, err = database.NewTestConnection()
	require.NoError(t, err)

	err = testDB.AutoMigrate(&models.User{}, &models.Order{}, &models.Product{})
	require.NoError(t, err)

	testRouter = router.SetupRouter(testDB)
}

func clearTables(t *testing.T) {
	require.NoError(t, testDB.Exec("TRUNCATE users CASCADE").Error)
	require.NoError(t, testDB.Exec("TRUNCATE orders CASCADE").Error)
	require.NoError(t, testDB.Exec("TRUNCATE products CASCADE").Error)
}

func TestUserHandlers(t *testing.T) {
	setupTestDB(t)

	t.Run("CreateUser", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			payload := map[string]interface{}{
				"name":  "John Doe",
				"email": "john@example.com",
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("POST", "/api/users", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.NotNil(t, response["id"])
			assert.Equal(t, payload["name"], response["name"])
			assert.Equal(t, payload["email"], response["email"])
		})

		t.Run("InvalidEmail", func(t *testing.T) {
			payload := map[string]interface{}{
				"name":  "John Doe",
				"email": "invalid-email",
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("POST", "/api/users", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		})

		t.Run("DuplicateEmail", func(t *testing.T) {
			// Create first user
			user := models.User{
				Name:  "Test User",
				Email: "test@example.com",
			}
			require.NoError(t, testDB.Create(&user).Error)

			// Try to create user with same email
			payload := map[string]interface{}{
				"name":  "Another User",
				"email": "test@example.com",
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("POST", "/api/users", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusConflict, w.Code)
		})
	})

	t.Run("GetUsers", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			// Create test users
			users := []models.User{
				{Name: "User 1", Email: "user1@example.com"},
				{Name: "User 2", Email: "user2@example.com"},
				{Name: "User 3", Email: "user3@example.com"},
			}
			for _, user := range users {
				require.NoError(t, testDB.Create(&user).Error)
			}

			req := httptest.NewRequest("GET", "/api/users?page=1&per_page=10", nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			data, ok := response["data"].([]interface{})
			require.True(t, ok)
			assert.Len(t, data, 3)
			assert.Equal(t, float64(3), response["total"])
		})

		t.Run("WithSearch", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/users?search=User 2", nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			data, ok := response["data"].([]interface{})
			require.True(t, ok)
			assert.Len(t, data, 1)
		})
	})

	t.Run("GetUser", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			user := models.User{
				Name:  "Test User",
				Email: "test@example.com",
			}
			require.NoError(t, testDB.Create(&user).Error)

			req := httptest.NewRequest("GET", fmt.Sprintf("/api/users/%d", user.ID), nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response models.User
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, user.ID, response.ID)
			assert.Equal(t, user.Name, response.Name)
			assert.Equal(t, user.Email, response.Email)
		})

		t.Run("NotFound", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/users/999", nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code)
		})
	})

	t.Run("UpdateUser", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			user := models.User{
				Name:  "Original Name",
				Email: "original@example.com",
			}
			require.NoError(t, testDB.Create(&user).Error)

			payload := map[string]interface{}{
				"name":  "Updated Name",
				"email": "updated@example.com",
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("PUT", fmt.Sprintf("/api/users/%d", user.ID), bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response models.User
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, payload["name"], response.Name)
			assert.Equal(t, payload["email"], response.Email)
		})

		t.Run("NotFound", func(t *testing.T) {
			payload := map[string]interface{}{
				"name":  "Updated Name",
				"email": "updated@example.com",
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("PUT", "/api/users/999", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code)
		})
	})

	t.Run("DeleteUser", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			user := models.User{
				Name:  "Test User",
				Email: "test@example.com",
			}
			require.NoError(t, testDB.Create(&user).Error)

			req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/users/%d", user.ID), nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNoContent, w.Code)

			// Verify user is soft deleted
			var count int64
			testDB.Unscoped().Model(&models.User{}).Where("id = ?", user.ID).Count(&count)
			assert.Equal(t, int64(1), count)

			testDB.Model(&models.User{}).Where("id = ?", user.ID).Count(&count)
			assert.Equal(t, int64(0), count)
		})

		t.Run("NotFound", func(t *testing.T) {
			req := httptest.NewRequest("DELETE", "/api/users/999", nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code)
		})
	})

	t.Run("GetUserWithOrders", func(t *testing.T) {
		clearTables(t)

		t.Run("Success", func(t *testing.T) {
			// Create test user
			user := models.User{
				Name:  "Test User",
				Email: "test@example.com",
			}
			require.NoError(t, testDB.Create(&user).Error)

			// Create test products
			product := models.Product{
				Name:        "Test Product",
				Price:       10.0,
				Stock:      100,
				SKU:        "TEST-001",
				Category:   "Test",
			}
			require.NoError(t, testDB.Create(&product).Error)

			// Create test orders
			order := models.Order{
				UserID: user.ID,
				Status: "pending",
				Total:  20.0,
				Items: []models.OrderItem{
					{
						ProductID: product.ID,
						Quantity:  2,
						Price:    10.0,
					},
				},
			}
			require.NoError(t, testDB.Create(&order).Error)

			req := httptest.NewRequest("GET", fmt.Sprintf("/api/users/%d/orders", user.ID), nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			orders, ok := response["orders"].([]interface{})
			require.True(t, ok)
			assert.Len(t, orders, 1)

			firstOrder := orders[0].(map[string]interface{})
			assert.Equal(t, float64(order.ID), firstOrder["id"])
			assert.Equal(t, order.Status, firstOrder["status"])
			assert.Equal(t, order.Total, firstOrder["total"])
		})

		t.Run("UserNotFound", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/users/999/orders", nil)
			w := httptest.NewRecorder()

			testRouter.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code)
		})
	})
}

func TestUserHandlersPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	setupTestDB(t)
	clearTables(t)

	// Create 1000 test users
	users := make([]models.User, 1000)
	for i := range users {
		users[i] = models.User{
			Name:  fmt.Sprintf("User %d", i),
			Email: fmt.Sprintf("user%d@example.com", i),
		}
	}
	require.NoError(t, testDB.CreateInBatches(users, 100).Error)

	t.Run("ListUsersPerformance", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/users?page=1&per_page=50", nil)
		w := httptest.NewRecorder()

		start := time.Now()
		testRouter.ServeHTTP(w, req)
		duration := time.Since(start)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration.Milliseconds(), int64(100), "Request took too long")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data, ok := response["data"].([]interface{})
		require.True(t, ok)
		assert.Len(t, data, 50)
	})

	t.Run("SearchUsersPerformance", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/users?search=User&page=1&per_page=50", nil)
		w := httptest.NewRecorder()

		start := time.Now()
		testRouter.ServeHTTP(w, req)
		duration := time.Since(start)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration.Milliseconds(), int64(100), "Search took too long")
	})
} 