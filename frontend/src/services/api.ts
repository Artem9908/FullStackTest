import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

export interface User {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  sku: string
  stock: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product: Product
  quantity: number
  price: number
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: number
  user_id: number
  user: User
  status: OrderStatus
  total: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface GetUsersParams {
  search?: string
  page?: number
  per_page?: number
}

interface ProductSearchParams {
  search?: string
  page?: number
  per_page?: number
  minPrice?: number
  maxPrice?: number
}

interface OrderSearchParams {
  page?: number
  per_page?: number
  status?: OrderStatus
  user_id?: number
}

export const getUsers = async (params: GetUsersParams = {}): Promise<PaginatedResponse<User>> => {
  const { data } = await api.get('/users', { params })
  return data
}

export const getUser = async (id: number): Promise<User> => {
  const { data } = await api.get(`/users/${id}`)
  return data
}

export const createUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
  const { data } = await api.post('/users', user)
  return data
}

export const updateUser = async (id: number, user: Partial<User>): Promise<User> => {
  const { data } = await api.put(`/users/${id}`, user)
  return data
}

export const deleteUser = async (id: number): Promise<{ success: boolean }> => {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

export const getProducts = async (params: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
  const response = await api.get('/products', { params })
  return response.data
}

export const getProduct = async (id: number): Promise<Product> => {
  const response = await api.get(`/products/${id}`)
  return response.data
}

export const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
  const response = await api.post('/products', product)
  return response.data
}

export const updateProduct = async (id: number, product: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>): Promise<Product> => {
  const response = await api.put(`/products/${id}`, product)
  return response.data
}

export const updateStock = async (id: number, stock: number): Promise<Product> => {
  const response = await api.patch(`/products/${id}`, { stock })
  return response.data
}

export const deleteProduct = async (id: number): Promise<void> => {
  await api.delete(`/products/${id}`)
}

export const getOrders = async (params: OrderSearchParams): Promise<PaginatedResponse<Order>> => {
  const response = await api.get('/orders', { params })
  return response.data
}

export const getOrder = async (id: number): Promise<Order> => {
  const response = await api.get(`/orders/${id}`)
  return response.data
}

export const createOrder = async (order: { user_id: number; items: { product_id: number; quantity: number }[] }): Promise<Order> => {
  const response = await api.post('/orders', order)
  return response.data
}

export const updateOrderStatus = async (id: number, status: OrderStatus): Promise<Order> => {
  const response = await api.patch(`/orders/${id}`, { status })
  return response.data
}

export const cancelOrder = async (id: number): Promise<Order> => {
  const response = await api.post(`/orders/${id}/cancel`)
  return response.data
} 