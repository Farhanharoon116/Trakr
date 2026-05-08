-- adjust_inventory: atomically decrement inventory qty_on_hand
-- Used by the sales endpoint when recording a completed sale.

CREATE OR REPLACE FUNCTION adjust_inventory(
  p_product_id UUID,
  p_branch_id  UUID,
  p_qty_change DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory
  SET qty_on_hand = qty_on_hand + p_qty_change
  WHERE product_id = p_product_id
    AND branch_id  = p_branch_id;
END;
$$ LANGUAGE plpgsql;
