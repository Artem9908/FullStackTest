package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"fullstacktest/pkg/models"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateUser(t *testing.T) {
	clearTables()

	// Test case 1: Valid user creation
	t.Run("Valid user creation", func(t *testing.T) {
		user := models.User{
			Name:  "Test User",
			Email: "test@example.com",
		}
		jsonValue, _ := json.Marshal(user)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/users", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response models.User
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotZero(t, response.ID)
		assert.Equal(t, user.Name, response.Name)
		assert.Equal(t, user.Email, response.Email)
	})

	// Test case 2: Invalid user data
	t.Run("Invalid user data", func(t *testing.T) {
		invalidUser := struct {
			Name string `json:"name"`
		}{
			Name: "Invalid User",
		}
		jsonValue, _ := json.Marshal(invalidUser)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/users", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetUsers(t *testing.T) {
	clearTables()

	// Create test users
	for i := 1; i <= 15; i++ {
		user := models.User{
			Name:  fmt.Sprintf("User %d", i),
			Email: fmt.Sprintf("user%d@example.com", i),
		}
		testDB.Create(&user)
	}

	// Test case 1: Get first page of users
	t.Run("Get first page", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/users?page=1&limit=10", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Users      []models.User `json:"users"`
			Pagination struct {
				CurrentPage   int   `json:"current_page"`
				TotalItems   int64 `json:"total_items"`
				ItemsPerPage int   `json:"items_per_page"`
				TotalPages   int64 `json:"total_pages"`
			} `json:"pagination"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Len(t, response.Users, 10)
		assert.Equal(t, int64(15), response.Pagination.TotalItems)
		assert.Equal(t, int64(2), response.Pagination.TotalPages)
	})

	// Test case 2: Filter users by name
	t.Run("Filter by name", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/users?name=User 1", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Users []models.User `json:"users"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.Users)
		for _, user := range response.Users {
			assert.Contains(t, user.Name, "User 1")
		}
	})
}

func TestGetUsersWithOrders(t *testing.T) {
	clearTables()

	// Create test user with orders
	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	testDB.Create(&user)

	product := models.Product{
		Name:  "Test Product",
		Price: 10.0,
		Stock: 100,
	}
	testDB.Create(&product)

	order := models.Order{
		UserID: user.ID,
		Status: models.OrderStatusPending,
		Total:  20.0,
		Items: []models.OrderItem{
			{
				ProductID: product.ID,
				Quantity:  2,
				Price:    10.0,
			},
		},
	}
	testDB.Create(&order)

	t.Run("Get users with orders", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/users/with-orders", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Users []struct {
				UserID        uint     `json:"user_id"`
				UserName      string   `json:"user_name"`
				LastOrderID   *uint    `json:"last_order_id"`
				OrderStatus   *string  `json:"order_status"`
				OrderTotal    *float64 `json:"order_total"`
			} `json:"users"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.Users)

		firstUser := response.Users[0]
		assert.Equal(t, user.ID, firstUser.UserID)
		assert.Equal(t, user.Name, firstUser.UserName)
		assert.NotNil(t, firstUser.LastOrderID)
		assert.NotNil(t, firstUser.OrderStatus)
		assert.NotNil(t, firstUser.OrderTotal)
		assert.Equal(t, order.ID, *firstUser.LastOrderID)
		assert.Equal(t, string(order.Status), *firstUser.OrderStatus)
		assert.Equal(t, order.Total, *firstUser.OrderTotal)
	})
}

func TestUpdateUser(t *testing.T) {
	clearTables()

	// Create test user
	user := models.User{
		Name:  "Original Name",
		Email: "original@example.com",
	}
	testDB.Create(&user)

	t.Run("Valid update", func(t *testing.T) {
		updatedUser := models.User{
			ID:    user.ID,
			Name:  "Updated Name",
			Email: "updated@example.com",
		}
		jsonValue, _ := json.Marshal(updatedUser)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/users/%d", user.ID), bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.User
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, updatedUser.Name, response.Name)
		assert.Equal(t, updatedUser.Email, response.Email)
	})

	t.Run("Non-existent user", func(t *testing.T) {
		updatedUser := models.User{
			ID:    9999,
			Name:  "Non-existent",
			Email: "nonexistent@example.com",
		}
		jsonValue, _ := json.Marshal(updatedUser)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", "/api/users/9999", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestDeleteUser(t *testing.T) {
	clearTables()

	// Create test user
	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	testDB.Create(&user)

	t.Run("Valid deletion", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/users/%d", user.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// Verify user is soft deleted
		var deletedUser models.User
		err := testDB.Unscoped().First(&deletedUser, user.ID).Error
		assert.NoError(t, err)
		assert.NotNil(t, deletedUser.DeletedAt)
	})

	t.Run("Non-existent user", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", "/api/users/9999", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestGetUserOrderSummary(t *testing.T) {
	clearTables()

	// Create test user with multiple orders
	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	testDB.Create(&user)

	product := models.Product{
		Name:  "Test Product",
		Price: 10.0,
		Stock: 100,
	}
	testDB.Create(&product)

	// Create multiple orders
	orders := []models.Order{
		{
			UserID: user.ID,
			Status: models.OrderStatusPaid,
			Total:  20.0,
			Items: []models.OrderItem{
				{
					ProductID: product.ID,
					Quantity:  2,
					Price:    10.0,
				},
			},
		},
		{
			UserID: user.ID,
			Status: models.OrderStatusDelivered,
			Total:  30.0,
			Items: []models.OrderItem{
				{
					ProductID: product.ID,
					Quantity:  3,
					Price:    10.0,
				},
			},
		},
	}
	for _, order := range orders {
		testDB.Create(&order)
	}

	t.Run("Get order summary", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/users/%d/orders/summary", user.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			TotalOrders      int     `json:"total_orders"`
			TotalSpent       float64 `json:"total_spent"`
			AverageOrderValue float64 `json:"average_order_value"`
			LastOrderDate    *string `json:"last_order_date"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 2, response.TotalOrders)
		assert.Equal(t, 50.0, response.TotalSpent)
		assert.Equal(t, 25.0, response.AverageOrderValue)
		assert.NotNil(t, response.LastOrderDate)
	})
} 