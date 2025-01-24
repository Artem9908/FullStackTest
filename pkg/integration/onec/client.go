package onec

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client represents a 1C API client
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new 1C API client
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Product represents a product in 1C
type Product struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category"`
}

// Order represents an order in 1C
type Order struct {
	ID         string    `json:"id"`
	Number     string    `json:"number"`
	Date       time.Time `json:"date"`
	CustomerID string    `json:"customerId"`
	Status     string    `json:"status"`
	Items      []Item    `json:"items"`
	Total      float64   `json:"total"`
}

// Item represents an order item in 1C
type Item struct {
	ProductID string  `json:"productId"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

// GetProducts fetches products from 1C
func (c *Client) GetProducts(ctx context.Context, modifiedSince *time.Time) ([]Product, error) {
	url := fmt.Sprintf("%s/products", c.baseURL)
	if modifiedSince != nil {
		url = fmt.Sprintf("%s?modifiedSince=%s", url, modifiedSince.Format(time.RFC3339))
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var products []Product
	if err := json.NewDecoder(resp.Body).Decode(&products); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return products, nil
}

// UpdateOrderStatus updates order status in 1C
func (c *Client) UpdateOrderStatus(ctx context.Context, orderID, status string) error {
	url := fmt.Sprintf("%s/orders/%s/status", c.baseURL, orderID)
	payload := map[string]string{"status": status}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshaling payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

// SyncOrders sends orders to 1C
func (c *Client) SyncOrders(ctx context.Context, orders []Order) error {
	url := fmt.Sprintf("%s/orders/batch", c.baseURL)

	body, err := json.Marshal(orders)
	if err != nil {
		return fmt.Errorf("marshaling orders: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

// GetStockUpdates fetches stock updates from 1C
func (c *Client) GetStockUpdates(ctx context.Context, since time.Time) (map[string]int, error) {
	url := fmt.Sprintf("%s/products/stock?since=%s", c.baseURL, since.Format(time.RFC3339))

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var updates map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&updates); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return updates, nil
} 