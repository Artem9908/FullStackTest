import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse {
  limit: number;
  page: number;
  total_rows: number;
  total_pages: number;
  rows: User[];
}

export interface UserFilters {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
}

const api = {
  getUsers: async (filters: UserFilters = {}): Promise<PaginatedResponse> => {
    const params = new URLSearchParams();
    if (filters.name) params.append('name', filters.name);
    if (filters.email) params.append('email', filters.email);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await axios.get(`${API_URL}/users`, { params });
    return response.data;
  },

  createUser: async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    const response = await axios.post(`${API_URL}/users`, user);
    return response.data;
  },

  updateUser: async (id: number, user: Partial<User>): Promise<User> => {
    const response = await axios.put(`${API_URL}/users/${id}`, user);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/users/${id}`);
  },
};

export default api; 