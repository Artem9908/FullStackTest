package handlers

import (
	"errors"
	"fullstacktest/pkg/database"
	"fullstacktest/pkg/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateOrder creates a new order with items
func CreateOrder(c *gin.Context) {
	var order models.Order
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Start a transaction
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Calculate total and validate stock
	var total float64
	for i, item := range order.Items {
		var product models.Product
		if err := tx.First(&product, item.ProductID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found", "product_id": item.ProductID})
			return
		}

		if product.Stock < item.Quantity {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Insufficient stock",
				"product_id": item.ProductID,
				"available": product.Stock,
				"requested": item.Quantity,
			})
			return
		}

		// Update stock
		if err := tx.Model(&product).Update("stock", product.Stock-item.Quantity).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock"})
			return
		}

		// Set item price from current product price
		order.Items[i].Price = product.Price
		total += product.Price * float64(item.Quantity)
	}

	order.Total = total
	order.Status = models.OrderStatusPending

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Reload order with all relationships
	if err := database.DB.Preload("Items.Product").Preload("User").First(&order, order.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load order details"})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// GetOrders returns a paginated list of orders with optional filters
func GetOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	userID := c.Query("user_id")
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	orders, total, err := database.GetOrdersWithDetails(page, limit, userID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"pagination": gin.H{
			"current_page": page,
			"total_items": total,
			"items_per_page": limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetOrder returns a single order by ID with detailed information
func GetOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	orderDetails, err := database.GetOrderDetails(uint(orderID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order"})
		}
		return
	}

	c.JSON(http.StatusOK, orderDetails)
}

// UpdateOrderStatus updates the status of an order
func UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var statusUpdate struct {
		Status models.OrderStatus `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&statusUpdate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate status transition
	var order models.Order
	if err := database.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Validate status transition
	if !isValidStatusTransition(order.Status, statusUpdate.Status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status transition"})
		return
	}

	if err := database.DB.Model(&order).Update("status", statusUpdate.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	c.Status(http.StatusOK)
}

// CancelOrder cancels an order and restores product stock
func CancelOrder(c *gin.Context) {
	id := c.Param("id")
	
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var order models.Order
	if err := tx.Preload("Items").First(&order, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status == models.OrderStatusCancelled {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is already cancelled"})
		return
	}

	if order.Status == models.OrderStatusDelivered {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel delivered order"})
		return
	}

	// Restore stock for each item
	for _, item := range order.Items {
		if err := tx.Model(&models.Product{}).
			Where("id = ?", item.ProductID).
			Update("stock", gorm.Expr("stock + ?", item.Quantity)).
			Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore stock"})
			return
		}
	}

	if err := tx.Model(&order).Update("status", models.OrderStatusCancelled).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.Status(http.StatusOK)
}

// Helper function to validate order status transitions
func isValidStatusTransition(current, new models.OrderStatus) bool {
	validTransitions := map[models.OrderStatus][]models.OrderStatus{
		models.OrderStatusPending: {
			models.OrderStatusPaid,
			models.OrderStatusCancelled,
		},
		models.OrderStatusPaid: {
			models.OrderStatusShipped,
			models.OrderStatusCancelled,
		},
		models.OrderStatusShipped: {
			models.OrderStatusDelivered,
			models.OrderStatusCancelled,
		},
		models.OrderStatusDelivered: {},
		models.OrderStatusCancelled: {},
	}

	for _, validStatus := range validTransitions[current] {
		if validStatus == new {
			return true
		}
	}
	return false
} 