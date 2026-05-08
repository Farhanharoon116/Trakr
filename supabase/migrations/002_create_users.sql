CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone           VARCHAR(20) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner','manager','cashier','employee')),
  pin             VARCHAR(6),
  branch_id       UUID,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
