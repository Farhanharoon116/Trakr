// Core

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  plan: 'starter' | 'growth' | 'enterprise';
  country: string;
  currency: string;
  tax_id: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  business_id: string;
  phone: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'employee';
  pin: string | null;
  branch_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name_en: string;
  name_ur: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name_en: string;
  name_ur: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  tax_rate: number;
  image_url: string | null;
  is_active: boolean;
  track_inventory: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  business_id: string;
  product_id: string;
  branch_id: string;
  qty_on_hand: number;
  reorder_point: number;
  reorder_qty: number;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  business_id: string;
  branch_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  total_sales: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  loyalty_points: number;
  total_spent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  cashier_id: string;
  shift_id: string | null;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'easypaisa' | 'jazzcash' | 'credit';
  receipt_number: string;
  receipt_url: string | null;
  notes: string | null;
  synced_at: string | null;
  offline_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  created_at: string;
}

export interface Employee {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  cnic: string | null;
  designation: string | null;
  hire_date: string | null;
  salary: number | null;
  bank_account: string | null;
  emergency_contact: Record<string, unknown> | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  business_id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  lat_in: number | null;
  lng_in: number | null;
  hours_worked: number | null;
  overtime_hours: number;
  status: 'present' | 'absent' | 'leave' | 'half_day';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  business_id: string;
  employee_id: string;
  leave_type: 'annual' | 'sick' | 'unpaid' | 'other';
  from_date: string;
  to_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  branch_id: string;
  supplier_id: string;
  po_number: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  total: number;
  expected_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  total: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string | null;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
