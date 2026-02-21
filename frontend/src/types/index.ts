export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  stock_quantity?: number;
  available_quantity?: number;
  is_low_stock?: boolean;
}

export interface ProductCreate {
  name: string;
  sku: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  is_active: boolean;
  initial_stock: number;
  reorder_point: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id?: number;
  status: OrderStatus;
  total_amount: number;
  shipping_address?: string;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface OrderCreate {
  items: { product_id: number; quantity: number }[];
  shipping_address?: string;
  notes?: string;
}

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  updated_at: string;
}

export interface LowStockAlert {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_point: number;
}

export interface InventoryMovement {
  id: number;
  inventory_id: number;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}
