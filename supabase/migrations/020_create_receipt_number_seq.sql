-- Per-business receipt number sequences are managed via a counter table
-- to avoid gaps and ensure business-scoped numbering.

CREATE TABLE IF NOT EXISTS receipt_counters (
  business_id  UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  last_value   BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_receipt_number(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO receipt_counters (business_id, last_value)
    VALUES (p_business_id, 1)
  ON CONFLICT (business_id) DO UPDATE
    SET last_value = receipt_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'INV-' || LPAD(v_next::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
