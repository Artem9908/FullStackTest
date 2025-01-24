package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"fullstacktest/pkg/integration/sync"

	"github.com/gin-gonic/gin"
)

// Handler handles integration endpoints
type Handler struct {
	syncService *sync.Service
}

// NewHandler creates a new integration handler
func NewHandler(syncService *sync.Service) *Handler {
	return &Handler{
		syncService: syncService,
	}
}

// RegisterRoutes registers the integration routes
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	group := r.Group("/api/sync")
	{
		group.POST("/products", h.syncProducts)
		group.POST("/orders", h.syncOrders)
		group.POST("/orders/:id/status", h.updateOrderStatus)
		group.GET("/status", h.getSyncStatus)
	}
}

// SyncRequest represents a sync request
type SyncRequest struct {
	Force bool `json:"force"`
}

// StatusResponse represents a sync status response
type StatusResponse struct {
	LastProductSync time.Time `json:"lastProductSync"`
	LastOrderSync   time.Time `json:"lastOrderSync"`
	Status         string    `json:"status"`
}

func (h *Handler) syncProducts(c *gin.Context) {
	var req SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.syncService.SyncProducts(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *Handler) syncOrders(c *gin.Context) {
	var req SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.syncService.SyncOrders(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// OrderStatusUpdate represents an order status update
type OrderStatusUpdate struct {
	Status string `json:"status" binding:"required"`
}

func (h *Handler) updateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order ID is required"})
		return
	}

	var update OrderStatusUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.syncService.HandleOrderStatusUpdate(c.Request.Context(), orderID, update.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *Handler) getSyncStatus(c *gin.Context) {
	// In a real implementation, you would get these values from Redis or database
	status := StatusResponse{
		LastProductSync: time.Now().Add(-5 * time.Minute),
		LastOrderSync:   time.Now().Add(-3 * time.Minute),
		Status:         "healthy",
	}

	c.JSON(http.StatusOK, status)
} 