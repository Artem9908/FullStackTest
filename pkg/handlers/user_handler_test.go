package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"fullstacktest/pkg/database"
	"fullstacktest/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/api/users", GetUsers)
	router.POST("/api/users", CreateUser)
	router.PUT("/api/users/:id", UpdateUser)
	router.DELETE("/api/users/:id", DeleteUser)
	return router
}

func TestGetUsers(t *testing.T) {
	router := setupTestRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/users", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestCreateUser(t *testing.T) {
	router := setupTestRouter()

	user := models.User{
		Name:  "Test User",
		Email: "test@example.com",
	}
	jsonValue, _ := json.Marshal(user)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/users", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.User
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, user.Name, response.Name)
	assert.Equal(t, user.Email, response.Email)

	// Cleanup
	database.DB.Unscoped().Delete(&response)
} 