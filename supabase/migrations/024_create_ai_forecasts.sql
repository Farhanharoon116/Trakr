CREATE TABLE IF NOT EXISTS ai_forecasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id),
  forecast_type     TEXT NOT NULL DEFAULT 'sales',
  predictions       JSONB,
  insights          TEXT[],
  seasonality_flags TEXT[],
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
