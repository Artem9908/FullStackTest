package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"fullstacktest/pkg/integration/onec"
	"fullstacktest/pkg/models"

	"github.com/go-redis/redis/v8"
	"github.com/streadway/amqp"
	"gorm.io/gorm"
)

// Service handles synchronization between the application and 1C
type Service struct {
	db          *gorm.DB
	onecClient  *onec.Client
	redis       *redis.Client
	rabbitmq    *amqp.Channel
	syncQueue   string
	updateQueue string
}

// NewService creates a new synchronization service
func NewService(db *gorm.DB, onecClient *onec.Client, redis *redis.Client, rabbitmq *amqp.Channel) *Service {
	return &Service{
		db:          db,
		onecClient:  onecClient,
		redis:       redis,
		rabbitmq:    rabbitmq,
		syncQueue:   "sync_queue",
		updateQueue: "update_queue",
	}
}

// SyncProducts synchronizes products with 1C
func (s *Service) SyncProducts(ctx context.Context) error {
	// Get last sync time from Redis
	lastSync, err := s.redis.Get(ctx, "last_product_sync").Time()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("getting last sync time: %w", err)
	}

	// Fetch products from 1C
	products, err := s.onecClient.GetProducts(ctx, &lastSync)
	if err != nil {
		return fmt.Errorf("fetching products: %w", err)
	}

	// Begin transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("beginning transaction: %w", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update products in database
	for _, p := range products {
		product := models.Product{
			ExternalID:  p.ID,
			Code:        p.Code,
			Name:        p.Name,
			Description: p.Description,
			Price:       p.Price,
			Stock:       p.Stock,
			Category:    p.Category,
		}

		if err := tx.Where("external_id = ?", p.ID).
			Assign(product).
			FirstOrCreate(&product).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("upserting product: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}

	// Update last sync time
	if err := s.redis.Set(ctx, "last_product_sync", time.Now(), 0).Err(); err != nil {
		return fmt.Errorf("updating last sync time: %w", err)
	}

	return nil
}

// SyncOrders synchronizes orders with 1C
func (s *Service) SyncOrders(ctx context.Context) error {
	var orders []models.Order
	if err := s.db.Preload("Items").
		Where("synced = ?", false).
		Find(&orders).Error; err != nil {
		return fmt.Errorf("fetching unsynced orders: %w", err)
	}

	if len(orders) == 0 {
		return nil
	}

	// Convert to 1C format
	onecOrders := make([]onec.Order, len(orders))
	for i, order := range orders {
		items := make([]onec.Item, len(order.Items))
		for j, item := range order.Items {
			items[j] = onec.Item{
				ProductID: item.ProductExternalID,
				Quantity:  item.Quantity,
				Price:     item.Price,
			}
		}

		onecOrders[i] = onec.Order{
			ID:         order.ExternalID,
			Number:     order.Number,
			Date:       order.CreatedAt,
			CustomerID: order.UserExternalID,
			Status:     order.Status,
			Items:     items,
			Total:     order.Total,
		}
	}

	// Send orders to 1C
	if err := s.onecClient.SyncOrders(ctx, onecOrders); err != nil {
		return fmt.Errorf("sending orders to 1C: %w", err)
	}

	// Mark orders as synced
	if err := s.db.Model(&models.Order{}).
		Where("id IN ?", getOrderIDs(orders)).
		Update("synced", true).Error; err != nil {
		return fmt.Errorf("marking orders as synced: %w", err)
	}

	return nil
}

// HandleOrderStatusUpdate processes order status updates from 1C
func (s *Service) HandleOrderStatusUpdate(ctx context.Context, orderID, status string) error {
	// Update order status in database
	if err := s.db.Model(&models.Order{}).
		Where("external_id = ?", orderID).
		Update("status", status).Error; err != nil {
		return fmt.Errorf("updating order status: %w", err)
	}

	// Publish event
	event := map[string]interface{}{
		"type":     "order_status_updated",
		"orderID":  orderID,
		"status":   status,
		"datetime": time.Now(),
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshaling event: %w", err)
	}

	if err := s.rabbitmq.Publish(
		"",             // exchange
		s.updateQueue,  // routing key
		false,          // mandatory
		false,          // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	); err != nil {
		return fmt.Errorf("publishing event: %w", err)
	}

	return nil
}

// StartSyncWorker starts the background sync worker
func (s *Service) StartSyncWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.SyncProducts(ctx); err != nil {
				log.Printf("Error syncing products: %v", err)
			}
			if err := s.SyncOrders(ctx); err != nil {
				log.Printf("Error syncing orders: %v", err)
			}
		}
	}
}

func getOrderIDs(orders []models.Order) []uint {
	ids := make([]uint, len(orders))
	for i, order := range orders {
		ids[i] = order.ID
	}
	return ids
} 