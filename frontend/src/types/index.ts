export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  orders_count?: number;
  total_spent?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  sales_count?: number;
  revenue?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
}

export enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export interface Order {
  id: number;
  user: User;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ProductSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export interface OrderSearchParams {
  page?: number;
  per_page?: number;
  status?: OrderStatus;
  user_id?: number;
  start_date?: string;
  end_date?: string;
} 