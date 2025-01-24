// User related types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  orders_count?: number;
  total_spent?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Order related types
export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

export enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled'
}

// Product related types
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  stock: number;
  category: string;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

// Query params types
export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface UserSearchParams extends PaginationParams {
  search?: string;
  sort_by?: 'name' | 'created_at' | 'orders_count';
  sort_order?: 'asc' | 'desc';
}

export interface ProductSearchParams extends PaginationParams {
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export interface OrderSearchParams extends PaginationParams {
  user_id?: number;
  status?: OrderStatus;
  start_date?: string;
  end_date?: string;
} 