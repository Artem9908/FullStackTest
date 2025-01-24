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

func TestCreateOrder(t *testing.T) {
	clearTables()

	// Create test user and product
	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	testDB.Create(&user)

	product := models.Product{
		Name:  "Test Product",
		Price: 99.99,
		Stock: 100,
		SKU:   "TEST-SKU-001",
	}
	testDB.Create(&product)

	t.Run("Valid order creation", func(t *testing.T) {
		order := models.Order{
			UserID: user.ID,
			Items: []models.OrderItem{
				{
					ProductID: product.ID,
					Quantity:  2,
				},
			},
		}
		jsonValue, _ := json.Marshal(order)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/orders", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response models.Order
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotZero(t, response.ID)
		assert.Equal(t, models.OrderStatusPending, response.Status)
		assert.Equal(t, 199.98, response.Total) // 2 * 99.99
		assert.Len(t, response.Items, 1)

		// Verify stock was updated
		var updatedProduct models.Product
		testDB.First(&updatedProduct, product.ID)
		assert.Equal(t, 98, updatedProduct.Stock)
	})

	t.Run("Insufficient stock", func(t *testing.T) {
		order := models.Order{
			UserID: user.ID,
			Items: []models.OrderItem{
				{
					ProductID: product.ID,
					Quantity:  1000, // More than available stock
				},
			},
		}
		jsonValue, _ := json.Marshal(order)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/orders", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Insufficient stock")
	})

	t.Run("Non-existent product", func(t *testing.T) {
		order := models.Order{
			UserID: user.ID,
			Items: []models.OrderItem{
				{
					ProductID: 9999,
					Quantity:  1,
				},
			},
		}
		jsonValue, _ := json.Marshal(order)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/orders", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "Product not found")
	})
}

func TestGetOrders(t *testing.T) {
	clearTables()

	// Create test user and product
	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	testDB.Create(&user)

	product := models.Product{
		Name:  "Test Product",
		Price: 99.99,
		Stock: 100,
		SKU:   "TEST-SKU-001",
	}
	testDB.Create(&product)

	// Create multiple orders
	for i := 1; i <= 5; i++ {
		order := models.Order{
			UserID: user.ID,
			Status: models.OrderStatusPending,
			Total:  float64(i) * 99.99,
			Items: []models.OrderItem{
				{
					ProductID: product.ID,
					Quantity:  i,
					Price:    99.99,
				},
			},
		}
		testDB.Create(&order)
	}

	t.Run("Get all orders", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/orders", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Orders []struct {
				OrderID   uint    `json:"order_id"`
				UserID    uint    `json:"user_id"`
				UserName  string  `json:"user_name"`
				Status    string  `json:"status"`
				Total     float64 `json:"total"`
				ItemCount int     `json:"item_count"`
			} `json:"orders"`
			Pagination struct {
				TotalItems int64 `json:"total_items"`
			} `json:"pagination"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, int64(5), response.Pagination.TotalItems)
		for _, order := range response.Orders {
			assert.Equal(t, user.ID, order.UserID)
			assert.Equal(t, user.Name, order.UserName)
			assert.Equal(t, string(models.OrderStatusPending), order.Status)
			assert.Equal(t, 1, order.ItemCount)
		}
	})

	t.Run("Filter by user", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/orders?user_id=%d", user.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Orders []struct {
				UserID uint `json:"user_id"`
			} `json:"orders"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		for _, order := range response.Orders {
			assert.Equal(t, user.ID, order.UserID)
		}
	})
}

func TestUpdateOrderStatus(t *testing.T) {
	clearTables()

	// Create test order
	user := models.User{Name: "Test User", Email: "test@example.com"}
	testDB.Create(&user)

	order := models.Order{
		UserID: user.ID,
		Status: models.OrderStatusPending,
		Total:  99.99,
	}
	testDB.Create(&order)

	t.Run("Valid status transition", func(t *testing.T) {
		statusUpdate := struct {
			Status models.OrderStatus `json:"status"`
		}{
			Status: models.OrderStatusPaid,
		}
		jsonValue, _ := json.Marshal(statusUpdate)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/orders/%d/status", order.ID), bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedOrder models.Order
		testDB.First(&updatedOrder, order.ID)
		assert.Equal(t, models.OrderStatusPaid, updatedOrder.Status)
	})

	t.Run("Invalid status transition", func(t *testing.T) {
		statusUpdate := struct {
			Status models.OrderStatus `json:"status"`
		}{
			Status: models.OrderStatusDelivered, // Cannot go directly from paid to delivered
		}
		jsonValue, _ := json.Marshal(statusUpdate)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/orders/%d/status", order.ID), bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid status transition")
	})
}

func TestCancelOrder(t *testing.T) {
	clearTables()

	// Create test data
	user := models.User{Name: "Test User", Email: "test@example.com"}
	testDB.Create(&user)

	product := models.Product{
		Name:  "Test Product",
		Price: 99.99,
		Stock: 100,
		SKU:   "TEST-SKU-001",
	}
	testDB.Create(&product)

	order := models.Order{
		UserID: user.ID,
		Status: models.OrderStatusPending,
		Total:  199.98,
		Items: []models.OrderItem{
			{
				ProductID: product.ID,
				Quantity:  2,
				Price:    99.99,
			},
		},
	}
	testDB.Create(&order)

	// Update product stock to reflect the order
	testDB.Model(&product).Update("stock", 98)

	t.Run("Valid cancellation", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/orders/%d/cancel", order.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify order status
		var cancelledOrder models.Order
		testDB.First(&cancelledOrder, order.ID)
		assert.Equal(t, models.OrderStatusCancelled, cancelledOrder.Status)

		// Verify stock was restored
		var updatedProduct models.Product
		testDB.First(&updatedProduct, product.ID)
		assert.Equal(t, 100, updatedProduct.Stock)
	})

	t.Run("Already cancelled order", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/orders/%d/cancel", order.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Order is already cancelled")
	})
} 