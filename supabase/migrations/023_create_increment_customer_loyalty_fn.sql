-- Function to atomically increment loyalty points and total_spent for a customer
CREATE OR REPLACE FUNCTION increment_customer_loyalty(
  p_customer_id UUID,
  p_points INTEGER,
  p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET
    loyalty_points = loyalty_points + p_points,
    total_spent    = total_spent + p_amount,
    updated_at     = now()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;
