CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  qty_ordered     DECIMAL(12,2) NOT NULL,
  qty_received    DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost       DECIMAL(12,2) NOT NULL,
  total           DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
