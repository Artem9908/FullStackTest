package handlers

import (
	"fullstacktest/pkg/database"
	"fullstacktest/pkg/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetUsersWithOrders returns a paginated list of users with their latest order
func GetUsersWithOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	nameFilter := c.DefaultQuery("name", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	users, total, err := database.GetUsersWithLastOrders(page, limit, nameFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users with orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"pagination": gin.H{
			"current_page": page,
			"total_items": total,
			"items_per_page": limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetUserOrderSummary returns order statistics for a specific user
func GetUserOrderSummary(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	summary, err := database.GetUserOrderSummary(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
} 