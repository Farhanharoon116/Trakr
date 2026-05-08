# BizOS — GitHub Copilot Master Build Prompt
### Complete System Architecture + Step-by-Step Copilot Instructions
> **How to use this file:** Read Section 1–3 first (architecture, conventions, rules). Then hand each Section 4 Phase to Copilot as a separate PR prompt. Every Phase is a self-contained pull request. Do NOT send multiple phases at once.

---

## SECTION 1 — PROJECT OVERVIEW & CONTEXT

You are building **BizOS** — a multi-tenant, all-in-one Business Operating System for Pakistani SMEs. It is a SaaS platform with a web dashboard (React) and a mobile app (Flutter). The platform includes POS, Inventory, Accounting, HR, CRM, Procurement, and AI analytics modules.

**Core constraints that shape every architectural decision:**
- Works **offline-first** — Pakistani shops face daily load shedding and unreliable internet
- **Urdu + English** UI — RTL support must be baked in from day one, not added later
- **FBR (Federal Board of Revenue)** compliance — NTN, GST invoices must be legally valid
- **WhatsApp** is the primary communication layer — receipts, alerts, promotions
- **JazzCash + Easypaisa** are first-class payment methods alongside cash
- **Bluetooth thermal printers** must work from web (WebUSB + ESC/POS) and Flutter
- **Multi-tenant** — every piece of data is scoped by `business_id`
- **Role-based access** — Owner, Manager, Cashier, Employee with strict row-level security

---

## SECTION 2 — FULL SYSTEM ARCHITECTURE

### 2.1 Repository Structure (Monorepo)

```
bizos/
├── apps/
│   ├── web/                          # React + Vite + TypeScript (Owner dashboard + POS web)
│   └── mobile/                       # Flutter (Cashier POS app + Employee self-service)
├── packages/
│   ├── api/                          # Node.js + Express + TypeScript (REST API)
│   ├── shared/                       # Shared types, constants, Zod schemas
│   └── fbr/                          # Standalone FBR compliance service (isolated)
├── supabase/
│   ├── migrations/                   # All DB migrations (numbered, never edited after merge)
│   ├── seed/                         # Dev seed data
│   └── functions/                    # Supabase Edge Functions (webhooks, cron)
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Run tests + typecheck on every PR
│       └── deploy.yml                # Deploy on merge to main
├── pnpm-workspace.yaml
├── package.json                      # Root scripts
└── .env.example                      # Every env var documented here
```

### 2.2 Tech Stack — Final Decisions

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Frontend Web | React + Vite + TypeScript | React 18, Vite 5 | Fast HMR, strong typing, your existing experience |
| Styling | Tailwind CSS v3 | v3.4 | Utility-first, purges unused CSS, works offline |
| State (client) | Zustand | v4 | Lightweight, no boilerplate, works with React 18 |
| State (server) | TanStack Query | v5 | Cache, sync, offline support built-in |
| Forms | React Hook Form + Zod | latest | Type-safe validation, minimal re-renders |
| Mobile | Flutter | 3.x (stable) | Single codebase for Android + iOS |
| Backend | Node.js + Express + TypeScript | Node 20 LTS | Consistent JS stack, fast, battle-tested |
| Database | PostgreSQL via Supabase | latest | ACID transactions — critical for POS/inventory |
| Auth | Supabase Auth (Phone OTP) | latest | Built-in OTP, JWT, RLS policies |
| Real-time | Supabase Realtime (WebSockets) | latest | Live dashboard, POS sync across devices |
| File Storage | Supabase Storage | latest | Product images, receipt PDFs, logos |
| Offline Sync | IndexedDB via Dexie.js | v3 | Dexie = best DX over raw IndexedDB |
| Background Sync | Service Worker (Workbox) | v7 | Queue POS transactions when offline |
| OTP/SMS | MSG91 | REST API | Cheapest reliable SMS delivery in Pakistan |
| WhatsApp | Interakt (WhatsApp Business API) | REST API | Managed WA API, 2-week approval — apply day 1 |
| Payments | JazzCash + Easypaisa | REST APIs | Most used mobile wallets in Pakistan |
| Print (web) | WebUSB + ESC/POS commands | custom | Bluetooth thermal printer from browser |
| Print (Flutter) | flutter_bluetooth_serial | pub.dev | BLE thermal printer from mobile |
| AI/ML | Google Gemini API | gemini-1.5-flash | Sales forecasting, inventory reorder |
| Package Manager | pnpm | v9 | Fast, disk-efficient, workspace support |
| Testing | Vitest + React Testing Library | latest | Fast, Vite-native test runner |
| CI/CD | GitHub Actions | - | Free for private repos, deploy on merge |
| Hosting (web) | Vercel | Pro | Edge CDN, zero DevOps |
| Hosting (API) | Railway | Hobby→Pro | Affordable Node.js hosting, auto-scale |
| Monitoring | Sentry | Free tier | Error tracking, offline error capture |

### 2.3 Database Schema (Complete)

All tables follow these rules:
- Every table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Every table has `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()`
- Every table (except `businesses`) has `business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE`
- Row-Level Security (RLS) enabled on **every** table
- Never use `SERIAL` or `INTEGER` for IDs — always UUID

```sql
-- ═══════════════════════════════════════════════════
-- CORE TENANT
-- ═══════════════════════════════════════════════════

CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth','enterprise')),
  country         VARCHAR(2) NOT NULL DEFAULT 'PK',
  currency        VARCHAR(3) NOT NULL DEFAULT 'PKR',
  tax_id          VARCHAR(20),                          -- NTN number
  phone           VARCHAR(20),
  address         TEXT,
  logo_url        TEXT,
  settings        JSONB NOT NULL DEFAULT '{}',           -- receipt template, tax rates, etc.
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- USERS & ROLES
-- ═══════════════════════════════════════════════════

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),   -- matches Supabase Auth UID
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone           VARCHAR(20) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner','manager','cashier','employee')),
  pin             VARCHAR(6),                           -- hashed 6-digit POS PIN
  branch_id       UUID REFERENCES branches(id),         -- assigned branch (nullable = all branches)
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- BRANCHES (Multi-outlet)
-- ═══════════════════════════════════════════════════

CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,                -- e.g. 'Main Shop', 'Gulshan Branch'
  address         TEXT,
  phone           VARCHAR(20),
  manager_id      UUID REFERENCES users(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- PRODUCTS & INVENTORY
-- ═══════════════════════════════════════════════════

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name_en         VARCHAR(255) NOT NULL,
  name_ur         VARCHAR(255),
  color           VARCHAR(7),                           -- hex color for POS grid
  icon            VARCHAR(50),                          -- lucide icon name
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id),
  name_en         VARCHAR(255) NOT NULL,
  name_ur         VARCHAR(255),
  sku             VARCHAR(100),                         -- barcode / SKU
  price           DECIMAL(12,2) NOT NULL,               -- selling price in PKR
  cost            DECIMAL(12,2),                        -- cost price (margin calculation)
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 17.00,  -- GST %
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  qty_on_hand     DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_point   DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_qty     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id)                         -- one record per product per branch
);

-- ═══════════════════════════════════════════════════
-- SALES (POS TRANSACTIONS)
-- ═══════════════════════════════════════════════════

CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  cashier_id      UUID NOT NULL REFERENCES users(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,                          -- NULL = shift is open
  opening_cash    DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_cash    DECIMAL(12,2),
  total_sales     DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  phone           VARCHAR(20),                          -- used for WhatsApp receipts
  email           VARCHAR(255),
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  total_spent     DECIMAL(12,2) NOT NULL DEFAULT 0,     -- lifetime value
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  cashier_id      UUID NOT NULL REFERENCES users(id),
  shift_id        UUID REFERENCES shifts(id),
  customer_id     UUID REFERENCES customers(id),        -- NULL = walk-in
  subtotal        DECIMAL(12,2) NOT NULL,
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card','easypaisa','jazzcash','credit')),
  receipt_number  VARCHAR(20) NOT NULL,                 -- e.g. INV-00123 (unique per business)
  receipt_url     TEXT,                                 -- PDF stored in Supabase Storage
  notes           TEXT,
  synced_at       TIMESTAMPTZ,                          -- NULL = created offline, not yet confirmed
  offline_id      UUID,                                 -- client-generated UUID for offline dedup
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  qty             DECIMAL(12,2) NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL,               -- price at time of sale (snapshot)
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate        DECIMAL(5,2) NOT NULL,                -- GST at time of sale (snapshot)
  total           DECIMAL(12,2) NOT NULL,               -- line total after discount + tax
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- HR & EMPLOYEES
-- ═══════════════════════════════════════════════════

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),            -- links to auth user if they use the app
  name            VARCHAR(255) NOT NULL,
  cnic            TEXT,                                 -- AES-256 encrypted National ID
  designation     VARCHAR(255),
  hire_date       DATE,
  salary          DECIMAL(12,2),                        -- monthly base salary in PKR
  bank_account    TEXT,                                 -- AES-256 encrypted
  emergency_contact JSONB,
  branch_id       UUID REFERENCES branches(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ,
  clock_out       TIMESTAMPTZ,
  lat_in          DECIMAL(10,7),
  lng_in          DECIMAL(10,7),
  hours_worked    DECIMAL(5,2),                         -- calculated on clock_out
  overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','leave','half_day')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('annual','sick','unpaid','other')),
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- PROCUREMENT
-- ═══════════════════════════════════════════════════

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  ntn             VARCHAR(20),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  po_number       VARCHAR(20) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_date   DATE,
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  qty_ordered     DECIMAL(12,2) NOT NULL,
  qty_received    DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost       DECIMAL(12,2) NOT NULL,
  total           DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- AUDIT LOG (every write operation)
-- ═══════════════════════════════════════════════════

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 Row-Level Security Policy Pattern

Every table gets this RLS pattern. Copilot must apply this to every migration:

```sql
-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Owner/Manager: full access to their business data
CREATE POLICY "<table>_business_access" ON <table_name>
  FOR ALL USING (
    business_id = (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );
```

### 2.5 API Architecture

```
/api/v1/
├── auth/
│   ├── POST   /send-otp              # Send OTP via MSG91
│   ├── POST   /verify-otp            # Verify OTP, issue JWT
│   └── POST   /refresh               # Refresh access token
├── businesses/
│   ├── POST   /                      # Create business (onboarding step 1)
│   ├── GET    /me                    # Current business details
│   └── PATCH  /me                    # Update settings
├── branches/
│   ├── GET    /                      # List branches
│   ├── POST   /                      # Create branch
│   ├── PATCH  /:id                   # Update branch
│   └── DELETE /:id                   # Soft delete
├── products/
│   ├── GET    /                      # List (with inventory levels)
│   ├── POST   /                      # Create product
│   ├── PATCH  /:id                   # Update product
│   └── DELETE /:id                   # Soft delete (is_active = false)
├── inventory/
│   ├── GET    /                      # Stock levels (by branch)
│   ├── POST   /adjust                # Manual stock adjustment
│   └── GET    /low-stock             # Items below reorder_point
├── sales/
│   ├── GET    /                      # List sales (paginated, filtered)
│   ├── POST   /                      # Create sale (atomic: deduct stock)
│   ├── POST   /bulk-sync             # Sync offline sales batch
│   └── GET    /:id/receipt           # Get/generate receipt PDF
├── customers/
│   ├── GET    /                      # List / search by phone
│   ├── POST   /                      # Create customer
│   └── PATCH  /:id                   # Update CRM notes, loyalty
├── employees/
│   ├── GET    /                      # List employees
│   ├── POST   /                      # Add employee
│   ├── PATCH  /:id                   # Update
│   └── GET    /:id/salary-slip       # Generate salary slip PDF
├── attendance/
│   ├── POST   /clock-in              # GPS-pinned clock-in
│   ├── POST   /clock-out             # Clock-out + calculate hours
│   └── GET    /report                # Attendance report (date range)
├── shifts/
│   ├── POST   /open                  # Open new shift
│   ├── POST   /:id/close             # Close shift + reconcile cash
│   └── GET    /current              # Get open shift for current cashier
├── suppliers/            (CRUD standard)
├── purchase-orders/      (CRUD + receive goods endpoint)
├── reports/
│   ├── GET    /dashboard             # Real-time KPIs
│   ├── GET    /sales                 # Sales report (date, branch, cashier)
│   ├── GET    /inventory             # Stock report
│   ├── GET    /staff-performance     # Cashier leaderboard
│   └── GET    /fbr-gst              # FBR-ready GST export (CSV/PDF)
├── ai/
│   ├── POST   /forecast              # Sales forecast (Gemini)
│   └── POST   /reorder-suggestions   # Inventory reorder suggestions
└── webhooks/
    ├── POST   /whatsapp-incoming      # Handle incoming WA messages
    └── POST   /payment-callback       # JazzCash/Easypaisa payment callbacks
```

### 2.6 Offline-First Architecture (Critical)

This is the most complex part. The POS must work completely offline.

**How it works:**

```
[POS Screen] → [Dexie.js (IndexedDB)] → [Service Worker] → [API Sync Queue]
                        ↓
              Optimistic UI update (instant)
                        ↓
              Background sync when online
                        ↓
              Server confirms + resolves conflicts
```

**Rules Copilot must follow for offline:**
1. Every POS transaction is written to IndexedDB FIRST, then synced
2. Each offline record gets a client-generated `offline_id` (UUID v4)
3. The sync queue uses `navigator.serviceWorker` Background Sync API
4. Inventory is cached locally (refreshed every 30s when online)
5. If sync fails, the transaction is never lost — it stays in IndexedDB queue
6. Duplicate detection: server checks `offline_id` before inserting

### 2.7 FBR Service (Isolated Module)

The FBR module lives in `packages/fbr/` and is the ONLY place that knows about tax rules.

```typescript
// packages/fbr/src/index.ts

interface FBRInvoice {
  receiptNumber: string;
  businessNTN: string;
  businessName: string;
  saleDate: Date;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    taxRate: number;    // GST %
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
}

// generateFBRReceipt(invoice: FBRInvoice): PDF Buffer
// validateNTN(ntn: string): boolean
// calculateGST(amount: number, rate: number): number
// generateGSTReturn(sales: Sale[], period: string): CSV string
```

### 2.8 Environment Variables

Every `.env` file must contain exactly these variables (documented in `.env.example`):

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never expose to client

# API
API_PORT=3001
JWT_SECRET=                       # 256-bit random string
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# MSG91 (SMS OTP)
MSG91_API_KEY=
MSG91_SENDER_ID=BIZOS
MSG91_TEMPLATE_ID=

# WhatsApp (Interakt)
INTERAKT_API_KEY=
INTERAKT_BASE_URL=https://api.interakt.ai/v1

# Payments
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
EASYPAISA_STORE_ID=
EASYPAISA_ACCOUNT_NUMBER=

# AI
GEMINI_API_KEY=

# Encryption (for CNIC, bank account)
ENCRYPTION_KEY=                   # AES-256 key (32 bytes, hex)

# Sentry
SENTRY_DSN=
VITE_SENTRY_DSN=

# App
VITE_APP_URL=http://localhost:5173
API_URL=http://localhost:3001
```

---

## SECTION 3 — COPILOT RULES & CONVENTIONS

> **Read this before every PR prompt. These rules are non-negotiable.**

### Code Quality Rules
1. **TypeScript strict mode everywhere** — `"strict": true` in all `tsconfig.json`
2. **No `any` types** — use `unknown` + type guards if needed
3. **Zod for all runtime validation** — API inputs, env vars, form data
4. **No `console.log` in production code** — use structured logger (`pino` on server)
5. **Error boundaries on every page** — React `ErrorBoundary` wrapping all routes
6. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to client** — server-only
7. **All money amounts are `DECIMAL(12,2)` in DB and `number` in JS** — never use floats for currency, use integer paise math internally: `Math.round(amount * 100) / 100`

### Git/PR Rules
1. **One PR per Phase** — never combine phases
2. **PR title format:** `feat(phase-N): short description`
3. **Every PR must pass CI** — typecheck + tests must be green
4. **Migration files are immutable** — never edit an existing migration, always add a new one
5. **Seed data is in `supabase/seed/`** — never hardcode test data in source

### Security Rules
1. **All API routes require auth middleware** — except `/auth/*` endpoints
2. **All API routes check `business_id` from JWT** — never trust client-sent `business_id`
3. **CNIC and bank_account fields** — encrypt with AES-256 before storage, decrypt on read
4. **Rate limiting** — 5 OTP requests per phone per hour (prevent abuse)
5. **Supabase RLS** — every table has RLS enabled, even if the API also checks auth

### UI/UX Rules (Web Dashboard)
1. **Design system:** Tailwind CSS + shadcn/ui components (pre-configured)
2. **RTL support:** use `dir="auto"` on inputs, `font-[Noto_Naskh_Arabic]` for Urdu text
3. **Loading states:** every async operation shows a skeleton loader
4. **Empty states:** every list has a designed empty state (not just blank)
5. **Mobile-first:** dashboard must be usable on a 375px phone screen
6. **Color palette:**
   - Primary: `#2563EB` (blue)
   - Success: `#16A34A` (green)
   - Warning: `#D97706` (amber)
   - Danger: `#DC2626` (red)
   - Background: `#F8FAFC`
   - Surface: `#FFFFFF`
   - Border: `#E2E8F0`

---

## SECTION 4 — PHASE-BY-PHASE COPILOT PR PROMPTS

---

### PHASE 1 — Foundation (PR #1)
**Goal:** Monorepo setup, database, auth system. No UI yet. Just infrastructure.

**PR Title:** `feat(phase-1a): monorepo setup + supabase schema`

---

#### PROMPT 1A — Monorepo + Database Setup

```
You are building BizOS — a multi-tenant SaaS platform for Pakistani SMEs.

TASK: Set up the monorepo structure and database schema.

STEP 1: Initialize monorepo
Create the following directory structure using pnpm workspaces:

bizos/
├── apps/
│   ├── web/          (empty, placeholder package.json only)
│   └── mobile/       (empty, placeholder package.json only)
├── packages/
│   ├── api/          (empty, placeholder package.json only)
│   ├── shared/       (empty, placeholder package.json only)
│   └── fbr/          (empty, placeholder package.json only)
├── supabase/
│   ├── migrations/
│   └── seed/
├── pnpm-workspace.yaml
├── package.json      (root, with scripts: dev, build, test, typecheck)
├── .env.example      (document every variable from the architecture doc)
├── .gitignore        (node_modules, .env, dist, .next, build)
└── .github/
    └── workflows/
        └── ci.yml    (runs: pnpm typecheck && pnpm test on every PR)

pnpm-workspace.yaml content:
packages:
  - 'apps/*'
  - 'packages/*'

STEP 2: Create Supabase migrations
In supabase/migrations/, create numbered SQL files:

File: 001_create_businesses.sql
File: 002_create_users.sql
File: 003_create_branches.sql
File: 004_create_categories.sql
File: 005_create_products.sql
File: 006_create_inventory.sql
File: 007_create_shifts.sql
File: 008_create_customers.sql
File: 009_create_sales.sql
File: 010_create_sale_items.sql
File: 011_create_employees.sql
File: 012_create_attendance.sql
File: 013_create_leave_requests.sql
File: 014_create_suppliers.sql
File: 015_create_purchase_orders.sql
File: 016_create_purchase_order_items.sql
File: 017_create_audit_logs.sql
File: 018_enable_rls.sql       (enable RLS + create policies for every table)
File: 019_create_functions.sql  (create updated_at trigger function + apply to all tables)

Use the EXACT schema from the architecture document (UUIDs, correct column types,
DECIMAL(12,2) for money, correct CHECK constraints, correct FK relationships).

Migration 019 must create this trigger and apply it to every table:
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

File: 020_create_receipt_number_seq.sql
Create a sequence and function for generating receipt numbers per business:
CREATE SEQUENCE receipt_number_seq START 1;
CREATE OR REPLACE FUNCTION next_receipt_number(p_business_id UUID)
RETURNS TEXT AS $$
  SELECT 'INV-' || LPAD(nextval('receipt_number_seq')::TEXT, 5, '0');
$$ LANGUAGE sql;

STEP 3: Create shared types package
In packages/shared/src/types.ts, export TypeScript interfaces that mirror
the database schema exactly. Every table gets an interface. Use:
- `string` for UUID fields
- `number` for DECIMAL fields
- `string` for TIMESTAMPTZ fields (ISO 8601)
- string literal unions for all CHECK constraint enums

Also export Zod schemas in packages/shared/src/schemas.ts for:
- CreateSaleSchema
- CreateProductSchema
- CreateEmployeeSchema
- OTPRequestSchema
- OTPVerifySchema

RULES:
- TypeScript strict mode on all packages
- No any types
- Every migration file is idempotent (use IF NOT EXISTS)
- Add a README.md to the root explaining the monorepo structure
```

---

**PR Title:** `feat(phase-1b): express api + auth system`

#### PROMPT 1B — API + Auth

```
You are building BizOS. The monorepo is set up. Now build the backend API.

TASK: Build packages/api/ — Node.js + Express + TypeScript REST API with auth.

STEP 1: Initialize packages/api/
Install dependencies:
- express, cors, helmet, compression
- @supabase/supabase-js
- jsonwebtoken, bcryptjs
- zod
- pino, pino-http          (structured logging)
- express-rate-limit        (rate limit OTP endpoints)
- dotenv
- Dev: typescript, tsx, @types/express, @types/node, vitest

Create tsconfig.json with strict: true, target ES2022, moduleResolution bundler.

File structure for packages/api/src/:
├── index.ts               (server entry point)
├── app.ts                 (Express app, middleware setup)
├── config.ts              (parse + validate env vars with Zod)
├── db.ts                  (Supabase client, service role)
├── middleware/
│   ├── auth.ts            (JWT verification, attach req.user)
│   ├── business.ts        (attach req.business from JWT claims)
│   ├── errorHandler.ts    (global error handler)
│   └── notFound.ts
├── routes/
│   ├── auth.ts
│   ├── businesses.ts
│   ├── branches.ts
│   ├── products.ts
│   ├── inventory.ts
│   ├── sales.ts
│   ├── customers.ts
│   ├── employees.ts
│   ├── attendance.ts
│   ├── shifts.ts
│   ├── reports.ts
│   └── index.ts           (combine all routers)
├── services/
│   ├── otp.service.ts     (MSG91 integration)
│   ├── whatsapp.service.ts (Interakt integration, stub OK for now)
│   └── receipt.service.ts  (PDF generation stub)
└── utils/
    ├── jwt.ts             (sign, verify access + refresh tokens)
    ├── crypto.ts          (AES-256 encrypt/decrypt for CNIC, bank_account)
    ├── errors.ts          (AppError class, HTTP error codes)
    └── pagination.ts      (cursor-based pagination helper)

STEP 2: Auth flow
Implement these routes in routes/auth.ts:

POST /api/v1/auth/send-otp
- Body: { phone: string }  (validate with Zod: Pakistani format +92XXXXXXXXXX)
- Rate limit: 5 requests per phone per hour (use express-rate-limit keyed by phone)
- Call otp.service.ts to send OTP via MSG91
- Store OTP hash + expiry (5 min) in Supabase (table: otp_sessions, create migration 021)
- Return: { success: true, expires_in: 300 }

POST /api/v1/auth/verify-otp
- Body: { phone: string, otp: string }
- Check OTP hash from otp_sessions table, verify not expired
- If first login: trigger onboarding flow (return { new_user: true, setup_token: ... })
- If existing user: return { access_token, refresh_token, user, business }
- access_token expires in 15 minutes (JWT)
- refresh_token expires in 30 days (JWT, stored in Supabase refresh_tokens table)

POST /api/v1/auth/refresh
- Body: { refresh_token: string }
- Verify refresh token, issue new access_token

POST /api/v1/auth/setup-business  (first-time only, requires setup_token)
- Body: { business_name, phone, plan: 'starter' }
- Creates business record + user record + first branch ('Main Branch')
- Returns full auth response

STEP 3: Auth middleware
middleware/auth.ts must:
1. Extract Bearer token from Authorization header
2. Verify JWT signature
3. Check token not expired
4. Attach to req: { userId, businessId, role, branchId }
5. Return 401 if any check fails

STEP 4: Protected route pattern
All routes except /auth/* use the auth middleware.
All service routes extract businessId from req.user (NEVER from request body or params).
This prevents cross-tenant data access.

STEP 5: Business endpoint
GET /api/v1/businesses/me — return current business with branch list
PATCH /api/v1/businesses/me — update business name, logo, settings, NTN

STEP 6: Error handling
errorHandler.ts must handle:
- AppError instances (operational errors with HTTP status)
- Zod validation errors (return 400 with field-level messages)
- Unknown errors (return 500, log with pino, send to Sentry)

RULES:
- Every route handler is wrapped in try/catch or use asyncHandler wrapper
- Validate ALL request bodies with Zod before touching the database
- Log every request with pino-http (method, path, status, duration)
- Write Vitest tests for: OTP rate limiting, JWT generation/verification,
  auth middleware (valid token, expired token, wrong business)
```

---

### PHASE 2 — POS Core (PR #2)
**PR Title:** `feat(phase-2): react web app + pos screen + inventory`

#### PROMPT 2 — Web App + POS Screen

```
You are building BizOS. The API is built. Now build the React web app with the POS screen.

TASK: Build apps/web/ — React + Vite + TypeScript web application.
This is the most important screen in the entire product. Get it right.

STEP 1: Initialize apps/web/
Install dependencies:
- react, react-dom, react-router-dom v6
- @supabase/supabase-js
- @tanstack/react-query v5
- zustand
- react-hook-form + @hookform/resolvers + zod
- tailwindcss + autoprefixer + postcss
- shadcn/ui (initialize with: npx shadcn-ui@latest init)
- lucide-react
- dexie                     (IndexedDB wrapper for offline)
- workbox-window            (service worker)
- jspdf + html2canvas       (receipt PDF generation)
- react-hot-toast           (notifications)
- date-fns                  (date formatting)
- Dev: vitest, @testing-library/react, jsdom

Configure Tailwind with the BizOS color palette:
Primary: #2563EB, Success: #16A34A, Warning: #D97706, Danger: #DC2626
Background: #F8FAFC, Surface: #FFFFFF, Border: #E2E8F0

STEP 2: App structure
apps/web/src/
├── main.tsx
├── App.tsx                  (router setup, QueryClientProvider, auth guard)
├── lib/
│   ├── supabase.ts          (Supabase client - anon key only)
│   ├── api.ts               (Axios/fetch wrapper with auth headers)
│   ├── queryClient.ts       (TanStack Query configuration)
│   └── db.ts                (Dexie IndexedDB schema for offline)
├── store/
│   ├── auth.store.ts        (Zustand: user, business, tokens)
│   ├── pos.store.ts         (Zustand: cart state, active shift)
│   └── ui.store.ts          (Zustand: sidebar open, language toggle)
├── hooks/
│   ├── useProducts.ts       (fetch products, cached + offline)
│   ├── useSales.ts          (create sale, offline queue)
│   ├── useInventory.ts      (stock levels)
│   └── useShift.ts          (open/close shift)
├── components/
│   ├── ui/                  (shadcn components, do not modify)
│   ├── layout/
│   │   ├── AppShell.tsx     (sidebar + topbar wrapper)
│   │   ├── Sidebar.tsx      (navigation, role-based menu items)
│   │   └── TopBar.tsx       (business name, user avatar, language toggle)
│   ├── pos/
│   │   ├── POSScreen.tsx    (main POS layout)
│   │   ├── ProductGrid.tsx  (product cards, category filter)
│   │   ├── ProductCard.tsx  (single product, click to add to cart)
│   │   ├── Cart.tsx         (cart items, totals, discount field)
│   │   ├── CartItem.tsx     (qty control, remove)
│   │   ├── PaymentModal.tsx (cash/card/easypaisa/jazzcash selection)
│   │   ├── ReceiptModal.tsx (after sale: print/WhatsApp/close)
│   │   └── BarcodeScanner.tsx (use device camera via QuaggaJS)
│   └── shared/
│       ├── LoadingSkeleton.tsx
│       ├── EmptyState.tsx
│       └── OfflineBadge.tsx  (shows when device is offline)
└── pages/
    ├── auth/
    │   ├── LoginPage.tsx    (phone input + OTP verify)
    │   └── SetupPage.tsx    (first-time business setup wizard)
    ├── pos/
    │   └── POSPage.tsx
    ├── dashboard/
    │   └── DashboardPage.tsx  (KPI cards only - stub for now)
    ├── products/
    │   └── ProductsPage.tsx   (list + add/edit - stub)
    └── NotFoundPage.tsx

STEP 3: POS Screen (THE most critical feature)
POSScreen.tsx layout (two-column, no scrolling on desktop):

LEFT COLUMN (60% width):
- Search bar at top (searches product name_en + name_ur + SKU in real-time)
- Category filter tabs (All + each category with color dot)
- Product grid: 4 columns on desktop, 2 on mobile
- Each ProductCard shows: image, name, price, stock badge
- Click ProductCard → add to cart (or increase qty if already in cart)

RIGHT COLUMN (40% width):
- "New Sale" header + current shift info
- Cart items list (scrollable)
- Each CartItem: product name, qty stepper (-/+), unit price, line total, × remove
- Discount field (flat amount OR percentage, toggle)
- Totals breakdown: subtotal, discount, GST (17%), total
- Customer search field (type phone → find or create customer)
- Payment method buttons: Cash 💵 | Card 💳 | Easypaisa | JazzCash
- "Complete Sale" button (disabled if cart empty)
- For Cash: show "Amount Tendered" field + "Change Due" calculation

OFFLINE BEHAVIOR:
- When navigator.onLine === false, show OfflineBadge in header
- Products are loaded from Dexie (synced when online)
- Completed sales are queued in Dexie offline_queue table
- Show "X transactions pending sync" badge when offline queue > 0
- When online restored, auto-trigger bulk sync to /api/v1/sales/bulk-sync

STEP 4: Dexie (IndexedDB) Schema
lib/db.ts:
class BizOSDatabase extends Dexie {
  products: Dexie.Table<LocalProduct, string>
  inventory: Dexie.Table<LocalInventory, string>
  offline_queue: Dexie.Table<OfflineSale, string>

  Schema:
  products: 'id, sku, name_en, name_ur, category_id, updated_at'
  inventory: '[product_id+branch_id], product_id, branch_id'
  offline_queue: 'offline_id, created_at, synced'
}

STEP 5: Auth flow (web)
LoginPage.tsx:
1. Phone number input (Pakistani format, auto-format to +92)
2. "Get OTP" button → POST /api/v1/auth/send-otp
3. 6-digit OTP input appears (auto-focus, auto-submit on 6 digits)
4. On success: store tokens in auth.store.ts (Zustand persist to localStorage)
5. If new_user: redirect to /setup
6. If existing user: redirect to /pos

SetupPage.tsx (3-step wizard):
Step 1: Business name + business type (dropdown)
Step 2: Business address + NTN (optional)
Step 3: Add first products (can skip, add later)

STEP 6: Role-based routing
Route guard: useAuth hook checks role before rendering
- /pos → cashier, manager, owner
- /dashboard → manager, owner
- /products → manager, owner
- /employees → owner only
- /settings → owner only

Cashiers who navigate to /dashboard get redirected to /pos

RULES:
- POS screen must be usable with only keyboard (Tab + Enter for speed)
- POS screen must work at 375px width (mobile)
- Product grid uses CSS Grid with auto-fill (not fixed columns)
- All money displayed as "Rs 1,234" format (never PKR symbol, always Rs)
- Write tests for: cart calculations (discount, GST, total), offline queue, auth guard
```

---

### PHASE 3 — Dashboard + Inventory + Products (PR #3)
**PR Title:** `feat(phase-3): dashboard kpis + products + inventory management`

#### PROMPT 3 — Dashboard + Inventory

```
You are building BizOS. The POS screen is complete. Now build the management dashboard.

TASK: Build the owner/manager dashboard, products management, and inventory pages.

STEP 1: Dashboard Page (DashboardPage.tsx)
Build 4 rows of content:

ROW 1 — KPI Cards (fetched from GET /api/v1/reports/dashboard):
- Today's Revenue (Rs amount, green if above yesterday)
- Today's Transactions (count)
- Low Stock Items (count, red badge if > 0)
- Active Staff (clocked in today)
Each card shows: icon, value, % change vs yesterday, sparkline (last 7 days)

ROW 2 — Two charts side by side:
- Sales chart: line chart, last 30 days, daily revenue
- Top Products: horizontal bar chart, top 5 by revenue today

ROW 3 — Recent Transactions table:
Columns: Receipt #, Time, Cashier, Items, Total, Payment Method
Last 10 sales, with link to full sale detail

ROW 4 — Low Stock Alerts:
List of products where qty_on_hand < reorder_point
Each row: product name, branch, current stock, reorder point, "Create PO" button

Use recharts for all charts.
All data fetched with TanStack Query (5-minute stale time for dashboard).

STEP 2: Products Page (ProductsPage.tsx)
List view:
- Search bar (debounced, 300ms)
- Filter by category (dropdown)
- Filter by active/inactive toggle
- "Add Product" button (opens AddProductModal)
- Table: image thumbnail, name (EN + UR), SKU, price, cost, margin %, stock, actions

AddProductModal / EditProductModal:
Form fields:
- Product name (English) — required
- Product name (Urdu) — optional
- Category — dropdown (create new inline)
- SKU / Barcode — optional, validate uniqueness per business
- Selling Price (Rs) — required, positive number
- Cost Price (Rs) — optional (used for margin calc)
- GST Rate % — default 17, editable
- Product Image — upload to Supabase Storage (resize to max 500x500 before upload)
- Track Inventory — toggle
- Active — toggle

On save: POST /api/v1/products, invalidate product query cache.

STEP 3: Inventory Page (InventoryPage.tsx)
Tab 1 — Stock Levels:
Table: Product, Branch, In Stock, Reorder Point, Reorder Qty, Last Updated
Row color: red if below reorder_point, amber if within 20% of reorder_point

Tab 2 — Stock Adjustments:
Form: Select product → Select branch → Enter qty (+ or -) → Reason dropdown → Submit
Reason options: Received from supplier, Damaged, Counted (stocktake), Theft, Other

Tab 3 — Low Stock Report:
Filtered view of all items below reorder_point, sortable by urgency

STEP 4: API routes to build (in packages/api/src/routes/):
GET /api/v1/reports/dashboard
  - Returns: today_revenue, yesterday_revenue, transaction_count, low_stock_count,
    active_staff_count, sales_chart (last 30 days), top_products (today)
  - All in a single query using Supabase aggregations for performance

GET /api/v1/products (paginated, search, filter)
POST /api/v1/products (create)
PATCH /api/v1/products/:id (update)
DELETE /api/v1/products/:id (soft delete: set is_active = false)

GET /api/v1/inventory (by business + branch filter)
POST /api/v1/inventory/adjust (manual adjustment + audit log entry)
GET /api/v1/inventory/low-stock

STEP 5: Receipt generation
When a sale is completed, generate a PDF receipt:
- Use jsPDF in the browser (client-side PDF)
- Receipt layout (80mm thermal printer width = 302px):
  Header: Business name, address, NTN, phone
  Body: date, receipt number, cashier name
  Items table: name | qty | price | total
  Totals: subtotal, discount, GST (17%), TOTAL
  Footer: "Thank you for your business" + WhatsApp number
- Store PDF in Supabase Storage at: receipts/{business_id}/{receipt_number}.pdf
- Return URL for display in ReceiptModal

RULES:
- Dashboard must auto-refresh every 60 seconds (use refetchInterval in TanStack Query)
- Charts must be responsive (recharts ResponsiveContainer)
- All tables must handle empty state gracefully
- Image upload must validate: max 5MB, PNG/JPG only, show preview before upload
```

---

### PHASE 4 — HR, Attendance & Shifts (PR #4)
**PR Title:** `feat(phase-4): hr module + attendance + shifts`

#### PROMPT 4 — HR Module

```
You are building BizOS. Dashboard and products are complete. Now build the HR module.

TASK: Build employee management, attendance tracking, and shift management.

STEP 1: Employees Page (EmployeesPage.tsx)
List view:
- Employee cards (grid on desktop, list on mobile)
- Each card: avatar initials, name, designation, branch, status badge (Active/Inactive)
- Filter by branch, designation, active status
- "Add Employee" button

AddEmployeeModal / EditEmployeeModal:
Form fields:
- Full Name — required
- CNIC — validate format (XXXXX-XXXXXXX-X), encrypt before saving
- Phone Number — for app login
- Designation — text input with suggestions
- Hire Date — date picker
- Monthly Salary (Rs) — number input
- Bank Account — optional, encrypt before saving
- Assigned Branch — dropdown
- Emergency Contact — name + phone

STEP 2: Attendance Page (AttendancePage.tsx)
Tab 1 — Today's Attendance:
Table: Employee, Clock In, Clock Out, Hours Worked, Status, Actions
"Mark Absent" button for employees who haven't clocked in by noon
Real-time: refresh every 2 minutes

Tab 2 — Attendance Report (date range):
Date range picker → show attendance table
Export to CSV button (generates client-side CSV download)
Summary: total present, absent, leave, half-day

Tab 3 — Leave Requests:
List of pending leave requests
Each row: employee name, leave type, dates, reason, Approve/Reject buttons
Approved/rejected history below

STEP 3: Shifts Page (ShiftsPage.tsx)
Current Open Shifts table: Cashier, Branch, Opened At, Duration, Sales Total
Shift History: date, cashier, branch, opening cash, closing cash, difference, total sales
"View Shift Detail" → shows all transactions in that shift

Shift Open/Close flow (this also happens from POS screen):
Open Shift modal: count opening cash → submit → shift record created
Close Shift modal: count closing cash → shows expected vs actual → submit

STEP 4: API routes
GET /api/v1/employees (paginated, filter by branch, active)
POST /api/v1/employees (encrypt CNIC + bank_account before DB insert)
PATCH /api/v1/employees/:id
GET /api/v1/employees/:id/salary-slip (generate PDF)

POST /api/v1/attendance/clock-in
  Body: { employee_id, lat, lng }
  Server: create attendance record, set clock_in = now(), status = 'present'

POST /api/v1/attendance/clock-out
  Body: { employee_id }
  Server: set clock_out = now(), calculate hours_worked + overtime_hours

GET /api/v1/attendance/report (query: start_date, end_date, employee_id?)
GET /api/v1/leave-requests (filter by status: pending/approved/rejected)
POST /api/v1/leave-requests (employee submits)
PATCH /api/v1/leave-requests/:id (owner approves/rejects)

GET /api/v1/shifts/current (open shifts for this business)
POST /api/v1/shifts/open
POST /api/v1/shifts/:id/close

STEP 5: Salary Slip PDF
Generate using jsPDF:
Header: business logo, name, "Salary Slip — [Month Year]"
Employee details: name, designation, CNIC (last 4 digits only), bank account (last 4 digits)
Attendance summary: total working days, days present, days absent, leave days
Earnings: basic salary, overtime pay (hourly rate × overtime hours)
Deductions: leave deductions (if any)
Net Salary: total earnings - total deductions
Signatures block: employee + authorized signatory

STEP 6: Salary calculation logic (in services/payroll.service.ts)
calculateMonthlySalary(employee, attendanceRecords, month):
  working_days = business days in month
  days_present = count(status === 'present' || 'half_day')
  half_day_count = count(status === 'half_day')
  daily_rate = employee.salary / working_days
  basic_earned = daily_rate × days_present - (daily_rate × 0.5 × half_day_count)
  hourly_rate = employee.salary / (working_days × 8)
  overtime_pay = hourly_rate × 1.5 × total_overtime_hours
  net_salary = basic_earned + overtime_pay

RULES:
- CNIC must be decrypted only for display, never stored decrypted
- Salary slips must match Pakistani payroll conventions
- Clock-in GPS coordinates: store but don't hard-enforce location (optional geofencing later)
- Employees without app access can still be tracked (owner clocks them in manually)
```

---

### PHASE 5 — CRM + WhatsApp + FBR (PR #5)
**PR Title:** `feat(phase-5): crm + whatsapp receipts + fbr compliance`

#### PROMPT 5 — CRM + WhatsApp + FBR

```
You are building BizOS. HR module is complete. Now build CRM, WhatsApp, and FBR compliance.

TASK: Customer relationship management, automated WhatsApp receipts, and FBR-ready invoices.

STEP 1: Build packages/fbr/ (isolated FBR service)
packages/fbr/src/index.ts — export these functions:

validateNTN(ntn: string): boolean
  NTN format: XXXXXXX-X (7 digits, dash, 1 digit)
  Also accept 13-digit CNIC format for individuals

calculateGST(amount: number, rate: number): number
  Return Math.round(amount * rate / 100 * 100) / 100
  (round to 2 decimal places)

generateFBRReceiptData(sale: Sale, business: Business, items: SaleItem[]): FBRReceiptData
  Returns structured data for rendering on receipt:
  { ntn, businessName, receiptNumber, date, items with GST breakdown, totals }

generateGSTReturn(sales: Sale[], period: 'monthly' | 'quarterly'): string
  Returns CSV string conforming to FBR's standard GST return format:
  Columns: SR, Invoice#, Date, Buyer Name, Buyer NTN, Taxable Value, GST Amount

Write unit tests for all functions with Pakistani tax scenarios.

STEP 2: CRM Page (CustomersPage.tsx)
List view:
- Search by name or phone number
- Customer table: name, phone, total purchases, loyalty points, last visit
- Click row → Customer Detail panel (slides in from right)

Customer Detail Panel:
- Contact info + edit inline
- Loyalty points balance + history
- Purchase history (last 20 transactions, paginated)
- CRM notes (freetext, auto-saved)
- "Send WhatsApp Message" button → opens message template selector

Add Customer:
- Can add from POS screen (inline) or from CRM page
- Fields: name (optional), phone (required), email (optional)

Loyalty Points:
- Earn: 1 point per Rs 100 spent (configurable in business settings)
- Redeem: 100 points = Rs 10 discount (configurable)
- Points applied at POS checkout as a discount option

STEP 3: WhatsApp Service (services/whatsapp.service.ts)
Implement Interakt API integration:

sendReceiptMessage(phone: string, receiptData: FBRReceiptData): Promise<void>
  Template: "receipt_notification"
  Variables: business_name, receipt_number, total_amount, items_summary, receipt_url

sendLowStockAlert(phone: string, product: Product, currentStock: number): Promise<void>
  Template: "low_stock_alert"
  Sends to business owner's phone

sendPaymentReminder(phone: string, customer: Customer, amount: number): Promise<void>
  Template: "payment_reminder"
  For credit sales

All functions must:
- Be fire-and-forget (don't block sale completion if WA fails)
- Log success/failure with pino
- Queue in a retry table if API returns 5xx (try again after 5 min)

STEP 4: FBR Receipt on POS
Update PaymentModal and ReceiptModal to show FBR-compliant data:
- Add NTN to receipt header
- Add GST breakdown line (taxable amount + GST amount + total)
- Add "FBR Verified" footer text
- Receipt PDF must include QR code (encode receipt URL) using qrcode package

STEP 5: GST Report Page (under Reports section)
Form: select date range (month/quarter), select branch (all or specific)
"Generate Report" button → calls GET /api/v1/reports/fbr-gst
Display summary: total sales, total taxable, total GST collected
Download CSV button (FBR standard format)
Download PDF button (formatted GST return document)

STEP 6: WhatsApp Receipt flow (end-to-end)
After sale completes:
1. Generate receipt PDF (existing jsPDF code)
2. Upload PDF to Supabase Storage
3. Get public URL
4. If customer has phone: call whatsapp.service.sendReceiptMessage()
5. Show "WhatsApp Sent ✓" in ReceiptModal
6. If no WhatsApp API yet: show "WhatsApp not configured" (graceful degradation)

STEP 7: Business Settings Page (SettingsPage.tsx)
Tabs:
- General: business name, phone, address, logo upload
- Tax: NTN, GST rate default, enable/disable tax on receipts
- Receipts: receipt header text, footer text, show/hide logo, language (EN/UR/Both)
- WhatsApp: Interakt API key input, test message button
- Loyalty: points per Rs 100, points needed for Rs 10 discount, on/off toggle
- Payments: enable/disable each payment method, JazzCash merchant ID, Easypaisa store ID

RULES:
- WhatsApp failures must NEVER block or roll back a sale
- GST calculations must match FBR's standard to 2 decimal places
- Receipt PDF must be exactly 80mm wide (302px) for thermal printer compatibility
- FBR receipt must show: NTN, GST amount, taxable amount separately
- Test FBR service with edge cases: zero GST, multiple tax rates, rounding
```

---

### PHASE 6 — Flutter Mobile App (PR #6)
**PR Title:** `feat(phase-6): flutter mobile app — cashier pos + employee self-service`

#### PROMPT 6 — Flutter App

```
You are building BizOS. The web app is complete. Now build the Flutter mobile app.

TASK: Build apps/mobile/ — Flutter app for cashiers and employees.
This app uses the SAME backend API as the web app.

STEP 1: Flutter project setup
Initialize Flutter project in apps/mobile/
Target: Android (API 24+) and iOS (14+)

pubspec.yaml dependencies:
- supabase_flutter
- http (API calls)
- flutter_secure_storage (JWT token storage)
- hive + hive_flutter (local offline storage, like Dexie for Flutter)
- provider OR riverpod (state management — use Riverpod 2.x)
- go_router (navigation)
- flutter_bluetooth_serial (thermal printer)
- esc_pos_utils_plus (ESC/POS command generation)
- geolocator (GPS for clock-in)
- local_auth (biometric unlock)
- firebase_messaging (push notifications)
- cached_network_image (product images)
- intl (number/date formatting, Urdu locale)
- flutter_local_notifications
- qr_flutter (QR code on receipt)

STEP 2: App structure
apps/mobile/lib/
├── main.dart
├── app.dart                     (GoRouter setup, theme)
├── core/
│   ├── api/
│   │   ├── api_client.dart      (http wrapper, auth headers, refresh token logic)
│   │   └── endpoints.dart       (all API URL constants)
│   ├── auth/
│   │   ├── auth_service.dart    (OTP flow, token management)
│   │   └── auth_provider.dart   (Riverpod provider)
│   ├── offline/
│   │   ├── offline_db.dart      (Hive boxes: products, inventory, queue)
│   │   └── sync_service.dart    (background sync when online)
│   ├── printing/
│   │   ├── printer_service.dart (Bluetooth discovery + connect)
│   │   └── receipt_builder.dart (ESC/POS commands for 80mm receipt)
│   └── theme/
│       ├── colors.dart          (same palette as web: #2563EB, etc.)
│       └── text_styles.dart
├── features/
│   ├── auth/
│   │   ├── login_screen.dart    (phone + OTP)
│   │   └── pin_screen.dart      (6-digit POS PIN for quick re-auth)
│   ├── pos/
│   │   ├── pos_screen.dart      (main POS — product grid + cart)
│   │   ├── product_grid.dart
│   │   ├── cart_widget.dart
│   │   ├── payment_bottom_sheet.dart
│   │   └── receipt_screen.dart  (print / WhatsApp / close)
│   ├── employee/
│   │   ├── home_screen.dart     (employee dashboard: shift, clock in/out)
│   │   ├── schedule_screen.dart (weekly shift view)
│   │   ├── attendance_screen.dart
│   │   ├── leave_screen.dart    (submit leave request)
│   │   └── salary_screen.dart   (view salary slips)
│   └── settings/
│       └── printer_settings.dart (pair thermal printer)
└── shared/
    ├── widgets/
    │   ├── offline_banner.dart   (red banner when no internet)
    │   ├── loading_overlay.dart
    │   └── urdu_text.dart        (Text widget with Noto Nastaliq font)
    └── utils/
        ├── currency.dart         (format as "Rs 1,234")
        └── validators.dart

STEP 3: POS Screen (Flutter)
Layout: same two-column concept as web, but adapted for mobile:
- Mobile: tabs (Products | Cart) with floating "Complete Sale" button
- Tablet: side-by-side columns like web

Product grid: GridView.builder, 2 columns mobile / 3 columns tablet
Each product tile: image, name, price, stock badge
Tap → add to cart with haptic feedback

Cart: ListView of CartItem widgets
SwipeToDismiss to remove items
Long press on qty to type manually

Payment bottom sheet:
- Payment method selector (large touch targets)
- Amount tendered (for cash) with numpad
- Change due calculation
- "Complete Sale" button

STEP 4: Offline POS (Flutter)
Hive box: 'products' — sync on app open + every 30s when online
Hive box: 'inventory' — sync same frequency
Hive box: 'offline_queue' — persists across app restarts

When sale completed offline:
1. Save to offline_queue Hive box with offline_id
2. Show "Sale saved offline" snackbar
3. When connectivity restored: sync_service.dart uploads queue
4. On success: remove from queue, show "X sales synced" notification

STEP 5: Thermal Printer
printer_service.dart:
- Scan for Bluetooth devices on Settings screen
- Save paired printer MAC address in flutter_secure_storage
- On receipt screen: "Print Receipt" button → connect → send ESC/POS commands

receipt_builder.dart — ESC/POS receipt layout:
- 80mm paper width
- Business name (center, bold)
- NTN, address, phone
- Divider line
- Date, time, receipt number, cashier
- Items table (left-align name, right-align price)
- Totals section
- GST amount
- Payment method
- Divider line
- "Thank you!" footer
- QR code (receipt URL or receipt number)
- Paper cut command

STEP 6: Employee Self-Service
HomeScreen shows based on role:
If role === 'cashier': show POS screen directly
If role === 'employee': show employee home

Employee home:
- Today's clock-in/out status (large card)
- Clock In button (requires GPS) → POST /api/v1/attendance/clock-in
- Clock Out button → POST /api/v1/attendance/clock-out
- This Week summary: days present, hours worked
- Quick links: Schedule, Leave Request, Salary Slips

Push Notifications (Firebase Messaging):
- Low stock alert → owner/manager
- Leave approved/rejected → employee
- Shift reminder (30 min before shift starts) → cashier

STEP 7: Biometric PIN Lock
On app open:
1. If no active session: show LoginScreen
2. If active session but >30 min idle: show PinScreen (6-digit PIN)
3. PinScreen shows: business name, "Enter your PIN", numpad
4. After 3 failed PINs: fall back to OTP login
5. Optional: biometric (fingerprint/face) using local_auth package

RULES:
- Use Riverpod for ALL state — no setState in business logic
- Use GoRouter for navigation — no Navigator.push directly
- All money displayed as "Rs 1,234" using currency.dart utility
- Urdu text uses NotoNastaliqUrdu font (add to pubspec assets)
- Test on Android emulator API 29+ minimum
- The POS screen must complete a sale in under 5 taps (select product → payment → done)
```

---

### PHASE 7 — AI + Procurement + Multi-Branch (PR #7)
**PR Title:** `feat(phase-7): ai forecasting + procurement + multi-branch`

#### PROMPT 7 — AI + Enterprise Features

```
You are building BizOS. Core platform is complete. Now build enterprise features.

TASK: AI sales forecasting, procurement module, and multi-branch management.

STEP 1: AI Sales Forecasting (Gemini API)
Build packages/api/src/services/ai.service.ts:

async generateSalesForecast(businessId: string, branchId?: string): Promise<ForecastResult>
  1. Fetch last 90 days of daily sales data from DB (date, total_revenue, transaction_count)
  2. Build a structured prompt for Gemini:
     "You are a sales analyst for a Pakistani retail business. Here is 90 days of sales data:
     [CSV of date,revenue,transactions]
     Analyze trends, seasonality (Pakistani holidays: Eid, Ramadan, independence day),
     and predict the next 30 days of daily revenue.
     Respond ONLY in this JSON format:
     { predictions: [{date: 'YYYY-MM-DD', predicted_revenue: number, confidence: 'high'|'medium'|'low'}],
       insights: string[], seasonality_flags: string[] }"
  3. Call Gemini API (gemini-1.5-flash model)
  4. Parse JSON response, validate with Zod
  5. Store result in ai_forecasts table (migration 022)
  6. Return ForecastResult

async generateReorderSuggestions(businessId: string): Promise<ReorderSuggestion[]>
  1. Fetch all products with inventory below or near reorder_point
  2. Fetch sales velocity (avg daily units sold, last 30 days) per product
  3. Prompt Gemini:
     "Given sales velocity and current stock, calculate days until stockout and
     recommended reorder quantity for each product.
     [product data as CSV]
     Respond in JSON: [{product_id, days_until_stockout, recommended_qty, urgency: 'urgent'|'soon'|'monitor'}]"
  4. Return array

AI Insights Page (AIPage.tsx):
- "Generate Forecast" button → shows 30-day revenue prediction chart
- Line chart: actual (last 90 days) + predicted (next 30 days, dashed line)
- Insights list: bullet points from Gemini's insights array
- Reorder suggestions table: product, current stock, days to stockout, recommended order qty

STEP 2: Procurement Module
PurchaseOrdersPage.tsx:
List of POs with status badges (Draft / Sent / Received / Cancelled)
"New Purchase Order" button

Create PO flow:
1. Select supplier (or create new inline)
2. Select branch
3. Add items: product search → qty → unit cost (auto-fills from product.cost)
4. Preview: line items table + total
5. Set expected delivery date
6. Save as Draft OR Send (changes status to 'sent')

Receive Goods flow (when PO status = 'sent'):
"Receive Goods" button → for each item: enter qty_received
On submit:
- Update inventory: qty_on_hand += qty_received per branch
- Update product.cost to latest unit_cost (weighted average)
- Set PO status to 'received'
- Add audit log entry

Supplier Management page (simple CRUD):
Fields: name, phone, email, address, NTN

API routes:
GET/POST /api/v1/suppliers
GET/POST /api/v1/purchase-orders
PATCH /api/v1/purchase-orders/:id
POST /api/v1/purchase-orders/:id/receive (receive goods endpoint)

STEP 3: Multi-Branch Dashboard
Only visible for Enterprise plan businesses.

BranchSwitcher component (in TopBar):
- Dropdown showing all branches
- "All Branches" option for consolidated view
- Selecting a branch filters all data

Consolidated Reports Page:
Revenue by branch: grouped bar chart, last 30 days
Staff performance by branch: table with top cashier per branch
Inventory comparison: side-by-side stock levels across branches
Inter-branch transfer: transfer stock from Branch A to Branch B (deduct one, add other)

STEP 4: Staff Leaderboard (Gamification)
LeaderboardPage.tsx:
- This month's top cashier (most revenue processed)
- Most transactions processed
- Highest average sale value
- Perfect attendance award (zero absences)
Display as: podium animation for top 3, table for rest
Owner can post a WhatsApp message to the team congratulating winners

STEP 5: Audit Log Viewer
AuditLogPage.tsx (owner only):
Table: timestamp, user, action (INSERT/UPDATE/DELETE), table, what changed
Filters: by user, by table, by date range
Show diff: old value vs new value for UPDATE actions

RULES:
- AI calls are async and non-blocking — show loading skeleton while waiting
- Gemini API key is server-side only, never exposed to client
- PO receiving must be atomic: all inventory updates in a single Supabase transaction
- Multi-branch data isolation: managers only see their assigned branch
- Forecast results cached for 24 hours (don't call Gemini on every page load)
```

---

### PHASE 8 — Launch Prep + Performance (PR #8)
**PR Title:** `feat(phase-8): launch prep + performance + monitoring`

#### PROMPT 8 — Launch Readiness

```
You are building BizOS. All features are built. Now make it production-ready.

TASK: Performance optimization, error monitoring, onboarding flow, and launch checklist.

STEP 1: Service Worker (PWA)
Make the web app installable as a PWA:

In apps/web/, add:
- manifest.json (name: BizOS, icons for 192x192 and 512x512, theme_color: #2563EB)
- Service worker using Workbox (via vite-plugin-pwa)

Workbox configuration:
- Cache strategy for API calls: NetworkFirst with 5-second timeout, fallback to cache
- Cache strategy for static assets: CacheFirst
- Background Sync for offline POS queue:
  - Register sync tag 'pos-sync'
  - When navigator.onLine fires: trigger bulk sync

STEP 2: Onboarding Wizard (polish)
Make the SetupPage.tsx a proper wizard experience:

Step 1 (Business Info):
- Business name, type (retail/restaurant/pharmacy/salon/other)
- Animated illustration of the selected business type

Step 2 (First Branch):
- Branch name (default: "Main Branch")
- Address
- Business hours

Step 3 (Add Products):
- "Quick Add" mode: name + price only (SKU/cost optional)
- "Import CSV" option (parse CSV with Papa Parse, map columns, bulk insert)
- Skip button (prominent — don't force this step)

Step 4 (Invite Team):
- Enter phone numbers of staff (one per line)
- Assign role: Manager / Cashier / Employee
- Send OTP invite (they get a WhatsApp message with download link)
- Skip button

Step 5 (Choose Plan):
- Show 3 plan cards: Starter (Rs 3,000), Growth (Rs 7,000), Enterprise (Rs 15,000+)
- "Start 30-day free trial" button (no credit card)
- Each plan lists included modules clearly

STEP 3: Performance audit and fixes
Run Lighthouse on the POS screen and dashboard. Fix until scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95

Specific fixes to implement:
- Lazy load all pages except /pos and /auth (React.lazy + Suspense)
- Product images: use Supabase image transformation for WebP + correct size
- TanStack Query: configure staleTime properly (products: 5min, dashboard: 1min, inventory: 2min)
- Virtualize product grid if > 100 products (use @tanstack/react-virtual)
- Memoize CartItem with React.memo (re-renders on every keystroke otherwise)
- Bundle analysis: run vite-bundle-analyzer, split vendor chunks

STEP 4: Error monitoring
Add Sentry to both web and API:

apps/web:
- Initialize Sentry in main.tsx
- Wrap Router with Sentry.ErrorBoundary
- Capture POS transaction errors explicitly (Sentry.captureException)
- User context: set Sentry user to { id: userId, business: businessName }

packages/api:
- Sentry Express middleware (requestHandler + errorHandler)
- Attach businessId to every Sentry event

STEP 5: API rate limiting + security hardening
- Apply rate limiting to all API routes (100 req/min per IP, 1000 req/min per business)
- Add input sanitization middleware (strip HTML from all text fields)
- Set security headers with Helmet.js (already installed, configure properly)
- Add CORS whitelist: only allow requests from bizos.pk and localhost in dev
- Log all 4xx/5xx errors with full request context for debugging

STEP 6: Landing page (apps/web/src/pages/LandingPage.tsx)
Route: / (unauthenticated users see this)
Sections:
1. Hero: "Pakistan ka business, digital ho gaya" — headline in Urdu + English
   CTA: "Free mein shuru karein" (WhatsApp CTA button) + "Demo dekhein" (video modal)
2. Problem section: 4 pain points with illustrations (load shedding, manual ledger, etc.)
3. Features grid: 8 feature cards with icons (POS, Inventory, HR, etc.)
4. How it works: 3-step visual (Sign up → Add products → First sale in 10 min)
5. Pricing: 3 plan cards matching the onboarding wizard
6. Testimonials: 3 placeholder testimonial cards (replace with real ones after beta)
7. Footer: WhatsApp number, email, social links

Design: clean, trustworthy, Pakistani context (use Rs not $, reference Urdu)

STEP 7: Final launch checklist (create LAUNCH_CHECKLIST.md)
Create a checklist file that must be checked before going live:
□ Supabase project on Pro plan
□ RLS policies tested for all 5 roles
□ WhatsApp API approved by Meta
□ JazzCash sandbox → production credentials switched
□ Easypaisa sandbox → production credentials switched
□ MSG91 production API key (not test)
□ Domain bizos.pk pointing to Vercel
□ SSL certificate active
□ Sentry alerts configured for error rate > 1%
□ Backup policy: Supabase daily backups enabled
□ GDPR/PDPA: Privacy policy page live at /privacy
□ Load test: simulate 50 concurrent POS transactions (use k6)
□ Thermal printer tested with 5 different printer models
□ Offline mode tested: complete 10 sales offline, sync all on reconnect
□ FBR receipt validated by a CA/tax consultant
□ Urdu translations reviewed by native Urdu speaker

RULES:
- PWA manifest must work on both iOS Safari and Android Chrome
- Landing page must load in < 2 seconds on 3G (Pakistan's common connection)
- All environment variables must be set in Vercel and Railway before deploy
- Database backups: verify Supabase point-in-time recovery is enabled
- The onboarding wizard should take < 10 minutes for a non-technical shop owner
```

---

## SECTION 5 — QUICK REFERENCE

### Running the Project

```bash
# Install all dependencies
pnpm install

# Run everything in development
pnpm dev                    # runs web + api concurrently

# Run individual apps
pnpm --filter web dev       # http://localhost:5173
pnpm --filter api dev       # http://localhost:3001
pnpm --filter mobile dev    # flutter run

# Database
npx supabase db push        # apply migrations to local Supabase
npx supabase db seed        # seed dev data
npx supabase start          # start local Supabase

# Tests
pnpm test                   # run all tests
pnpm --filter api test      # API tests only
pnpm --filter web test      # web tests only

# Typecheck
pnpm typecheck              # check all packages

# Build
pnpm build                  # build all packages
```

### PR Checklist (for every PR)
Before creating a PR, Copilot must verify:
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm test` passes with zero failures
- [ ] No `any` types introduced
- [ ] No `console.log` statements
- [ ] New API routes have auth middleware applied
- [ ] New DB tables have RLS policies in a migration file
- [ ] `.env.example` updated if new env vars added
- [ ] `updated_at` trigger applied to new tables

### Phase Order Summary

| Phase | PR # | What Gets Built | Estimated Time |
|---|---|---|---|
| 1A | #1 | Monorepo + DB Schema + Migrations | 3–4 days |
| 1B | #2 | Express API + Auth (OTP + JWT) | 4–5 days |
| 2 | #3 | React Web App + POS Screen (offline) | 7–10 days |
| 3 | #4 | Dashboard + Products + Inventory | 5–6 days |
| 4 | #5 | HR + Attendance + Shifts | 4–5 days |
| 5 | #6 | CRM + WhatsApp + FBR Compliance | 5–6 days |
| 6 | #7 | Flutter Mobile App | 10–14 days |
| 7 | #8 | AI + Procurement + Multi-Branch | 6–8 days |
| 8 | #9 | Launch Prep + PWA + Performance | 4–5 days |

**Total estimated build time (solo developer + Copilot): 18–22 weeks**

---

*Generated for Farhan Haroon — BizOS Co-Founder | May 2026*
*Architecture designed for Pakistan's SME market realities: offline-first, Urdu-native, FBR-compliant*
