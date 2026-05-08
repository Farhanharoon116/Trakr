CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  cnic            TEXT,
  designation     VARCHAR(255),
  hire_date       DATE,
  salary          DECIMAL(12,2),
  bank_account    TEXT,
  emergency_contact JSONB,
  branch_id       UUID REFERENCES branches(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
