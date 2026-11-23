// Tipos que reflejan supabase/migrations/0001_init.sql.
// Si cambias el esquema, actualiza este archivo.

export type UserRole = 'customer' | 'admin';
export type ProductMode = 'stock' | 'preorder';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ordered'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  role: UserRole;
  created_at: string;
}

export interface StoreSettings {
  whatsapp_number: string;
  deposit_percent: number;
  delivery_notes: string;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  path: string;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number | null;
  mode: ProductMode;
  preorder_days: number | null;
  is_active: boolean;
  created_at: string;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  size: string;
  color: string;
  unit_price: number;
  quantity: number;
  is_preorder: boolean;
  image_path: string | null;
}

export interface Order {
  id: number;
  user_id: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes: string;
  subtotal: number;
  deposit_required: number;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

export interface CartItem {
  variantId: number;
  productId: number;
  name: string;
  size: string;
  color: string;
  price: number;
  imagePath: string | null;
  isPreorder: boolean;
  quantity: number;
  /** Stock disponible cuando se agregó (solo informativo; el servidor valida). */
  maxStock: number | null;
}
