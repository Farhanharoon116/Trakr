CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION next_receipt_number(p_business_id UUID)
RETURNS TEXT AS $$
  SELECT 'INV-' || LPAD(nextval('receipt_number_seq')::TEXT, 5, '0');
$$ LANGUAGE sql;
