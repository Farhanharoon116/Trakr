CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id),
  name_en         VARCHAR(255) NOT NULL,
  name_ur         VARCHAR(255),
  sku             VARCHAR(100),
  price           DECIMAL(12,2) NOT NULL,
  cost            DECIMAL(12,2),
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 17.00,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
