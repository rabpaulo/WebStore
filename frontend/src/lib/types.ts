export type Role = 'ADMIN' | 'SELLER';
export type StockStatus = 'OK' | 'LOW' | 'OUT';
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface Variant {
  id: string;
  productId: string;
  sku: string;
  color: string;
  size: string;
  price: string;
  currentStock: number;
  minimumStock: number;
  product?: Product;
  stockStatus?: StockStatus;
  suggestedQuantity?: number;
}
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category: Category;
  active: boolean;
  createdAt: string;
  variants: Variant[];
  variantCount?: number;
  totalStock?: number;
  stockStatus?: StockStatus;
}
export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  _count?: { orders: number };
}
export interface OrderItem {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  productVariant: Variant & { product: Product };
}
export interface Order {
  id: string;
  number: number;
  customerId?: string;
  customer?: Customer | null;
  status: OrderStatus;
  total: string;
  createdAt: string;
  paidAt?: string | null;
  createdBy: User;
  items: OrderItem[];
}
export interface Movement {
  id: string;
  createdAt: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  productVariant: Variant & { product: Product };
  order?: { id: string; number: number } | null;
  createdBy: User;
}
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface DashboardSummary {
  products: number;
  ordersThisMonth: number;
  revenueThisMonth: string | null;
  lowStock: number;
  outOfStock: number;
  stockUnits: number;
  totalVariants: number;
  recentOrders: Order[];
  replenishment: (Variant & { product: Product; suggestedQuantity: number })[];
  salesByDay: { date: string; total: string | null; orders: number }[];
  month: string;
}
