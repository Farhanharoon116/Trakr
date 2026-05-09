CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ,
  clock_out       TIMESTAMPTZ,
  lat_in          DECIMAL(10,7),
  lng_in          DECIMAL(10,7),
  hours_worked    DECIMAL(5,2),
  overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','leave','half_day')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);
