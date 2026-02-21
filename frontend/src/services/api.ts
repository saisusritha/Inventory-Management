import axios from 'axios';
import type { Product, ProductCreate, Order, OrderCreate, User, Inventory, LowStockAlert, InventoryMovement, Token } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: async (username: string, password: string): Promise<Token> => {
    const params = new URLSearchParams({ username, password });
    const { data } = await api.post<Token>('/users/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },
  register: async (payload: { email: string; username: string; password: string; full_name?: string }) => {
    const { data } = await api.post<User>('/users/register', payload);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/users/me');
    return data;
  },
};

// Products
export const productsApi = {
  list: async (params?: { skip?: number; limit?: number; category?: string }): Promise<Product[]> => {
    const { data } = await api.get<Product[]>('/products/', { params });
    return data;
  },
  get: async (id: number): Promise<Product> => {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },
  create: async (payload: ProductCreate): Promise<Product> => {
    const { data } = await api.post<Product>('/products/', payload);
    return data;
  },
  update: async (id: number, payload: Partial<ProductCreate>): Promise<Product> => {
    const { data } = await api.put<Product>(`/products/${id}`, payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
  categories: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/products/categories');
    return data;
  },
};

// Orders
export const ordersApi = {
  list: async (params?: { skip?: number; limit?: number }): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/orders/', { params });
    return data;
  },
  get: async (id: number): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },
  create: async (payload: OrderCreate): Promise<Order> => {
    const { data } = await api.post<Order>('/orders/', payload);
    return data;
  },
  updateStatus: async (id: number, status: string): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${id}`, { status });
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },
};

// Inventory
export const inventoryApi = {
  list: async (): Promise<Inventory[]> => {
    const { data } = await api.get<Inventory[]>('/inventory/');
    return data;
  },
  get: async (productId: number): Promise<Inventory> => {
    const { data } = await api.get<Inventory>(`/inventory/${productId}`);
    return data;
  },
  adjust: async (productId: number, payload: { quantity: number; movement_type: string; notes?: string }): Promise<Inventory> => {
    const { data } = await api.post<Inventory>(`/inventory/${productId}/adjust`, payload);
    return data;
  },
  lowStock: async (): Promise<LowStockAlert[]> => {
    const { data } = await api.get<LowStockAlert[]>('/inventory/low-stock');
    return data;
  },
  movements: async (productId: number): Promise<InventoryMovement[]> => {
    const { data } = await api.get<InventoryMovement[]>(`/inventory/${productId}/movements`);
    return data;
  },
};

export default api;
