package models

import (
	"time"

	"gorm.io/gorm"
)

type Product struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null;index:idx_product_name" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Price       float64        `gorm:"not null;type:decimal(10,2)" json:"price"`
	SKU         string         `gorm:"size:50;not null;uniqueIndex:idx_product_sku" json:"sku"`
	Stock       int            `gorm:"not null;default:0" json:"stock"`
	CreatedAt   time.Time      `gorm:"index:idx_product_created" json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for the Product model
func (Product) TableName() string {
	return "products"
} 