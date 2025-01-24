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

func TestCreateProduct(t *testing.T) {
	clearTables()

	t.Run("Valid product creation", func(t *testing.T) {
		product := models.Product{
			Name:        "Test Product",
			Description: "Test Description",
			Price:       99.99,
			SKU:         "TEST-SKU-001",
			Stock:       100,
		}
		jsonValue, _ := json.Marshal(product)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/products", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response models.Product
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotZero(t, response.ID)
		assert.Equal(t, product.Name, response.Name)
		assert.Equal(t, product.Price, response.Price)
		assert.Equal(t, product.SKU, response.SKU)
	})

	t.Run("Invalid product data", func(t *testing.T) {
		invalidProduct := struct {
			Name string `json:"name"`
		}{
			Name: "Invalid Product",
		}
		jsonValue, _ := json.Marshal(invalidProduct)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/products", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetProducts(t *testing.T) {
	clearTables()

	// Create test products
	for i := 1; i <= 15; i++ {
		product := models.Product{
			Name:        fmt.Sprintf("Product %d", i),
			Description: fmt.Sprintf("Description %d", i),
			Price:       float64(i) * 10.0,
			SKU:         fmt.Sprintf("SKU-%d", i),
			Stock:       i * 10,
		}
		testDB.Create(&product)
	}

	t.Run("Get first page with stats", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/products?page=1&limit=10", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Products []struct {
				ID          uint    `json:"id"`
				Name        string  `json:"name"`
				Price       float64 `json:"price"`
				Stock       int     `json:"stock"`
				TotalOrders int     `json:"total_orders"`
				TotalSold   int     `json:"total_sold"`
				Revenue     float64 `json:"revenue"`
			} `json:"products"`
			Pagination struct {
				CurrentPage   int   `json:"current_page"`
				TotalItems   int64 `json:"total_items"`
				ItemsPerPage int   `json:"items_per_page"`
				TotalPages   int64 `json:"total_pages"`
			} `json:"pagination"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Len(t, response.Products, 10)
		assert.Equal(t, int64(15), response.Pagination.TotalItems)
		assert.Equal(t, int64(2), response.Pagination.TotalPages)
	})

	t.Run("Filter by price range", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/products?min_price=20&max_price=50", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Products []struct {
				Price float64 `json:"price"`
			} `json:"products"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		for _, product := range response.Products {
			assert.GreaterOrEqual(t, product.Price, 20.0)
			assert.LessOrEqual(t, product.Price, 50.0)
		}
	})

	t.Run("Filter in-stock products", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/products?in_stock=true", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response struct {
			Products []struct {
				Stock int `json:"stock"`
			} `json:"products"`
		}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		for _, product := range response.Products {
			assert.Greater(t, product.Stock, 0)
		}
	})
}

func TestUpdateStock(t *testing.T) {
	clearTables()

	// Create test product
	product := models.Product{
		Name:        "Test Product",
		Description: "Test Description",
		Price:       99.99,
		SKU:         "TEST-SKU-001",
		Stock:       100,
	}
	testDB.Create(&product)

	t.Run("Valid stock update", func(t *testing.T) {
		stockUpdate := struct {
			Quantity int `json:"quantity"`
		}{
			Quantity: 50,
		}
		jsonValue, _ := json.Marshal(stockUpdate)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/products/%d/stock", product.ID), bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify stock update
		var updatedProduct models.Product
		testDB.First(&updatedProduct, product.ID)
		assert.Equal(t, 50, updatedProduct.Stock)
	})

	t.Run("Invalid stock quantity", func(t *testing.T) {
		stockUpdate := struct {
			Quantity string `json:"quantity"`
		}{
			Quantity: "invalid",
		}
		jsonValue, _ := json.Marshal(stockUpdate)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/products/%d/stock", product.ID), bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Non-existent product", func(t *testing.T) {
		stockUpdate := struct {
			Quantity int `json:"quantity"`
		}{
			Quantity: 50,
		}
		jsonValue, _ := json.Marshal(stockUpdate)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", "/api/products/9999/stock", bytes.NewBuffer(jsonValue))
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestDeleteProduct(t *testing.T) {
	clearTables()

	// Create test product
	product := models.Product{
		Name:        "Test Product",
		Description: "Test Description",
		Price:       99.99,
		SKU:         "TEST-SKU-001",
		Stock:       100,
	}
	testDB.Create(&product)

	t.Run("Valid deletion", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/products/%d", product.ID), nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// Verify product is soft deleted
		var deletedProduct models.Product
		err := testDB.Unscoped().First(&deletedProduct, product.ID).Error
		assert.NoError(t, err)
		assert.NotNil(t, deletedProduct.DeletedAt)
	})

	t.Run("Non-existent product", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", "/api/products/9999", nil)
		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
} 