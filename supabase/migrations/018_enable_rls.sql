-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- businesses: owner can read/update their own business
CREATE POLICY "businesses_owner_access" ON businesses
  FOR ALL USING (owner_id = auth.uid());

-- Helper: get business_id for the current user
-- Used in policies below via subquery

CREATE POLICY "users_business_access" ON users
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "branches_business_access" ON branches
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "categories_business_access" ON categories
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "products_business_access" ON products
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "inventory_business_access" ON inventory
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "shifts_business_access" ON shifts
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "customers_business_access" ON customers
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sales_business_access" ON sales
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sale_items_business_access" ON sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "employees_business_access" ON employees
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "attendance_business_access" ON attendance
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "leave_requests_business_access" ON leave_requests
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "suppliers_business_access" ON suppliers
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "purchase_orders_business_access" ON purchase_orders
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "purchase_order_items_business_access" ON purchase_order_items
  FOR ALL USING (
    po_id IN (
      SELECT id FROM purchase_orders
      WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "audit_logs_business_access" ON audit_logs
  FOR ALL USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );
