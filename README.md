# BizOS — Business Operating System for Pakistani SMEs

A multi-tenant, offline-first SaaS platform for Pakistani SMEs. Includes POS, Inventory, HR, CRM, Procurement, and AI analytics.

## Monorepo Structure

```
bizos/
├── apps/
│   ├── web/          # React + Vite + TypeScript (Owner dashboard + POS web)
│   └── mobile/       # Flutter (Cashier POS app + Employee self-service)
├── packages/
│   ├── api/          # Node.js + Express + TypeScript (REST API)
│   ├── shared/       # Shared types, constants, Zod schemas
│   └── fbr/          # Standalone FBR compliance service
├── supabase/
│   ├── migrations/   # Numbered SQL migrations (never edited after merge)
│   └── seed/         # Dev seed data
└── .github/
    └── workflows/    # CI/CD pipelines
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | Zustand + TanStack Query v5 |
| Mobile | Flutter 3.x |
| Backend | Node.js 20 + Express + TypeScript |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (Phone OTP) |
| Offline | Dexie.js (IndexedDB) + Workbox |

## Getting Started

```bash
# Install all dependencies
pnpm install

# Run everything in development
pnpm dev

# Run individual apps
pnpm --filter web dev       # http://localhost:5173
pnpm --filter api dev       # http://localhost:3001

# Database
npx supabase start          # start local Supabase
npx supabase db push        # apply migrations

# Tests
pnpm test

# Typecheck
pnpm typecheck
```

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values.

## Build Phases

| Phase | What Gets Built |
|-------|----------------|
| 1A | Monorepo + DB Schema + Migrations |
| 1B | Express API + Auth (OTP + JWT) |
| 2  | React Web App + POS Screen (offline) |
| 3  | Dashboard + Products + Inventory |
| 4  | HR + Attendance + Shifts |
| 5  | CRM + WhatsApp + FBR Compliance |
| 6  | Flutter Mobile App |
| 7  | AI + Procurement + Multi-Branch |
| 8  | Launch Prep + PWA + Performance |
