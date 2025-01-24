package database

import (
	"fullstacktest/pkg/models"
)

type UserWithLastOrder struct {
	UserID        uint    `json:"user_id"`
	UserName      string  `json:"user_name"`
	UserEmail     string  `json:"user_email"`
	LastOrderID   *uint   `json:"last_order_id"`
	LastOrderDate *string `json:"last_order_date"`
	OrderStatus   *string `json:"order_status"`
	OrderTotal    *float64 `json:"order_total"`
}

// GetUsersWithLastOrders returns a paginated list of users with their last order
// This query is optimized for large datasets using:
// 1. LATERAL JOIN for getting only the latest order
// 2. Covering indexes
// 3. Pagination
// 4. Proper JOIN conditions
func GetUsersWithLastOrders(page, limit int, nameFilter string) ([]UserWithLastOrder, int64, error) {
	var total int64
	var results []UserWithLastOrder

	// Count total users with filter
	query := DB.Model(&models.User{})
	if nameFilter != "" {
		query = query.Where("users.name ILIKE ?", "%"+nameFilter+"%")
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Main query using LATERAL JOIN for better performance
	err := DB.Raw(`
		WITH RankedUsers AS (
			SELECT 
				u.id,
				u.name,
				u.email,
				ROW_NUMBER() OVER (ORDER BY u.created_at DESC) as row_num
			FROM users u
			WHERE 
				u.deleted_at IS NULL
				AND CASE WHEN ? != '' THEN u.name ILIKE ? ELSE TRUE END
		)
		SELECT 
			ru.id as user_id,
			ru.name as user_name,
			ru.email as user_email,
			o.id as last_order_id,
			o.created_at::text as last_order_date,
			o.status::text as order_status,
			o.total as order_total
		FROM RankedUsers ru
		LEFT JOIN LATERAL (
			SELECT o.*
			FROM orders o
			WHERE o.user_id = ru.id
			AND o.deleted_at IS NULL
			ORDER BY o.created_at DESC
			LIMIT 1
		) o ON true
		WHERE ru.row_num > ? AND ru.row_num <= ?
		ORDER BY ru.id DESC
	`, nameFilter, "%"+nameFilter+"%", (page-1)*limit, page*limit).
		Scan(&results).Error

	return results, total, err
}

// GetUserOrderSummary returns a summary of user's orders with basic statistics
func GetUserOrderSummary(userID uint) (struct {
	TotalOrders     int     `json:"total_orders"`
	TotalSpent      float64 `json:"total_spent"`
	AverageOrderValue float64 `json:"average_order_value"`
	LastOrderDate    *string `json:"last_order_date"`
}, error) {
	var summary struct {
		TotalOrders      int     `json:"total_orders"`
		TotalSpent       float64 `json:"total_spent"`
		AverageOrderValue float64 `json:"average_order_value"`
		LastOrderDate    *string `json:"last_order_date"`
	}

	err := DB.Raw(`
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(SUM(total), 0) as total_spent,
			COALESCE(AVG(total), 0) as average_order_value,
			MAX(created_at)::text as last_order_date
		FROM orders
		WHERE user_id = ?
		AND deleted_at IS NULL
	`, userID).Scan(&summary).Error

	return summary, err
}

// ProductWithStats represents a product with additional statistics
type ProductWithStats struct {
	ID          uint    `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	SKU         string  `json:"sku"`
	Stock       int     `json:"stock"`
	TotalOrders int     `json:"total_orders"`
	TotalSold   int     `json:"total_sold"`
	Revenue     float64 `json:"revenue"`
}

// GetProductsWithStats returns products with their sales statistics
func GetProductsWithStats(page, limit int, nameFilter string, minPrice, maxPrice float64, inStock bool) ([]ProductWithStats, int64, error) {
	var total int64
	var results []ProductWithStats

	// Base query for counting
	countQuery := DB.Model(&models.Product{}).Where("deleted_at IS NULL")
	if nameFilter != "" {
		countQuery = countQuery.Where("name ILIKE ?", "%"+nameFilter+"%")
	}
	countQuery = countQuery.Where("price BETWEEN ? AND ?", minPrice, maxPrice)
	if inStock {
		countQuery = countQuery.Where("stock > 0")
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Main query with statistics
	err := DB.Raw(`
		WITH ProductStats AS (
			SELECT 
				p.id,
				COUNT(DISTINCT oi.order_id) as total_orders,
				COALESCE(SUM(oi.quantity), 0) as total_sold,
				COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
			FROM products p
			LEFT JOIN order_items oi ON p.id = oi.product_id
			LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
			WHERE p.deleted_at IS NULL
			GROUP BY p.id
		)
		SELECT 
			p.id,
			p.name,
			p.description,
			p.price,
			p.sku,
			p.stock,
			COALESCE(ps.total_orders, 0) as total_orders,
			COALESCE(ps.total_sold, 0) as total_sold,
			COALESCE(ps.revenue, 0) as revenue
		FROM products p
		LEFT JOIN ProductStats ps ON p.id = ps.id
		WHERE 
			p.deleted_at IS NULL
			AND CASE WHEN ? != '' THEN p.name ILIKE ? ELSE TRUE END
			AND p.price BETWEEN ? AND ?
			AND CASE WHEN ? THEN p.stock > 0 ELSE TRUE END
		ORDER BY p.created_at DESC
		OFFSET ? LIMIT ?
	`, nameFilter, "%"+nameFilter+"%", minPrice, maxPrice, inStock, (page-1)*limit, limit).
		Scan(&results).Error

	return results, total, err
}

// OrderWithDetails represents an order with detailed information
type OrderWithDetails struct {
	OrderID     uint           `json:"order_id"`
	UserID      uint           `json:"user_id"`
	UserName    string         `json:"user_name"`
	UserEmail   string         `json:"user_email"`
	Status      models.OrderStatus `json:"status"`
	Total       float64        `json:"total"`
	ItemCount   int            `json:"item_count"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
}

// GetOrdersWithDetails returns orders with user and item details
func GetOrdersWithDetails(page, limit int, userID string, status string) ([]OrderWithDetails, int64, error) {
	var total int64
	var results []OrderWithDetails

	// Base query for counting
	countQuery := DB.Model(&models.Order{}).Where("orders.deleted_at IS NULL")
	if userID != "" {
		countQuery = countQuery.Where("orders.user_id = ?", userID)
	}
	if status != "" {
		countQuery = countQuery.Where("orders.status = ?", status)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Main query with all details
	err := DB.Raw(`
		WITH OrderItemCounts AS (
			SELECT 
				order_id,
				COUNT(*) as item_count
			FROM order_items
			GROUP BY order_id
		)
		SELECT 
			o.id as order_id,
			o.user_id,
			u.name as user_name,
			u.email as user_email,
			o.status,
			o.total,
			COALESCE(oic.item_count, 0) as item_count,
			o.created_at::text as created_at,
			o.updated_at::text as updated_at
		FROM orders o
		JOIN users u ON o.user_id = u.id
		LEFT JOIN OrderItemCounts oic ON o.id = oic.order_id
		WHERE 
			o.deleted_at IS NULL
			AND CASE WHEN ? != '' THEN o.user_id::text = ? ELSE TRUE END
			AND CASE WHEN ? != '' THEN o.status = ? ELSE TRUE END
		ORDER BY o.created_at DESC
		OFFSET ? LIMIT ?
	`, userID, userID, status, status, (page-1)*limit, limit).
		Scan(&results).Error

	return results, total, err
}

// GetOrderDetails returns detailed information about a specific order
func GetOrderDetails(orderID uint) (*struct {
	Order    models.Order     `json:"order"`
	Items    []struct {
		ID          uint    `json:"id"`
		ProductName string  `json:"product_name"`
		SKU         string  `json:"sku"`
		Quantity    int     `json:"quantity"`
		Price       float64 `json:"price"`
		Subtotal    float64 `json:"subtotal"`
	} `json:"items"`
	User struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"user"`
}, error) {
	var result struct {
		Order    models.Order     `json:"order"`
		Items    []struct {
			ID          uint    `json:"id"`
			ProductName string  `json:"product_name"`
			SKU         string  `json:"sku"`
			Quantity    int     `json:"quantity"`
			Price       float64 `json:"price"`
			Subtotal    float64 `json:"subtotal"`
		} `json:"items"`
		User struct {
			ID    uint   `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"user"`
	}

	// Get order with basic information
	if err := DB.First(&result.Order, orderID).Error; err != nil {
		return nil, err
	}

	// Get items with product details
	err := DB.Raw(`
		SELECT 
			oi.id,
			p.name as product_name,
			p.sku,
			oi.quantity,
			oi.price,
			(oi.quantity * oi.price) as subtotal
		FROM order_items oi
		JOIN products p ON oi.product_id = p.id
		WHERE oi.order_id = ?
		ORDER BY oi.id
	`, orderID).Scan(&result.Items).Error
	if err != nil {
		return nil, err
	}

	// Get user details
	err = DB.Raw(`
		SELECT 
			u.id,
			u.name,
			u.email
		FROM users u
		JOIN orders o ON u.id = o.user_id
		WHERE o.id = ?
	`, orderID).Scan(&result.User).Error

	return &result, err
} 