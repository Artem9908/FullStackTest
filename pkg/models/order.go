package models

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusPaid     OrderStatus = "paid"
	OrderStatusShipped  OrderStatus = "shipped"
	OrderStatusDelivered OrderStatus = "delivered"
	OrderStatusCancelled OrderStatus = "cancelled"
)

type Order struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index:idx_order_user" json:"user_id"`
	User      User          `gorm:"foreignKey:UserID" json:"user"`
	Status    OrderStatus    `gorm:"type:varchar(20);not null;default:'pending';index:idx_order_status" json:"status"`
	Total     float64        `gorm:"not null;type:decimal(10,2)" json:"total"`
	Items     []OrderItem    `gorm:"foreignKey:OrderID" json:"items"`
	CreatedAt time.Time      `gorm:"index:idx_order_created" json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type OrderItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	OrderID   uint    `gorm:"not null;index:idx_order_item_order" json:"order_id"`
	ProductID uint    `gorm:"not null;index:idx_order_item_product" json:"product_id"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product"`
	Quantity  int     `gorm:"not null" json:"quantity"`
	Price     float64 `gorm:"not null;type:decimal(10,2)" json:"price"`
}

// TableName specifies the table name for the Order model
func (Order) TableName() string {
	return "orders"
}

// TableName specifies the table name for the OrderItem model
func (OrderItem) TableName() string {
	return "order_items"
} 