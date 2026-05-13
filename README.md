# Igloo Foretracker

（仓库目录名可能仍为 `MPS`，npm 包名为 `igloo-foretracker`。）

Interactive website for collecting monthly order forecast from 13 offices across 3 regions:
- APAC
- EU
- USA

## Current release (what the app ships today)

**Foundation (all signed-in areas)**

- Login with bilingual toggle (English/Chinese)
- Role/region-based access control (forecasts and many lists respect the user’s regions)
- Session-backed APIs and a shared app shell (`components/shared/app-shell.tsx`)

**Forecast & cockpit**

- Forecast form: `product name`, `SKU`, `Build to order`, `Build to stock`, `forecast month`
- Dashboard (`/dashboard`): forecast aggregation, forecast cash-flow style views (aligned with cost-control data), order progress, logistics, suppliers, and unit-cost quote context; CSV export via `/api/dashboard/export-csv`

**Supply chain**

- Cost control, contracts (with detail and print views), and supplier management under `/supply-chain/*`
- Legacy paths `/contracts` and `/suppliers` redirect into the supply-chain module

**Order progress**

- Order lines (`/order-progress`), mass production Kanban, production management

**Logistics**

- Logistics overview, shipping report, global inventory, landed cost consolidate, order fulfillments

**NPI**

- BOM, tooling & fixture, ECN, SOP
- Super admins also see **Product database** (`/admin/products`) from the NPI submenu

**Quality**

- Test cases, certifications, ORT reports, 8D reports

**Cost control**

- Standalone cost control hub at `/cost-control` (in addition to supply-chain cost control)

**Administration**

- User management (`/admin/users`) for **super_admin** only

**Public**

- `/potentials` — lightweight lead / interest form (no login; listed in `proxy.ts` public paths)

> **Note:** Feature depth varies by screen (some flows are richer than others). This list matches the primary navigation and major routes in `app/` as of the current codebase.

## Default Accounts

- `david / david123` (super admin, all regions)
- `apac_admin / apac123`
- `eu_admin / eu123`
- `usa_admin / usa123`
- `jessie / jessie123` (regional admin, all regions)

## Persistent Database (Vercel Postgres or Supabase)

Set one connection variable:
- `POSTGRES_URL` (recommended on Vercel Postgres), or
- `DATABASE_URL` (Supabase Postgres)

Optional:
- `SESSION_SECRET` for cookie signing
- `SEED_SYNC_PASSWORDS=true` — **one-time recovery**: on the next DB bootstrap, overwrite `password_hash` for every user listed in `lib/accounts.ts` (`USER_ACCOUNTS`) from the repo defaults. Remove this variable after a successful login so passwords changed in the admin UI are not reset on every cold start.

Use `.env.example` as template.

### Locked out (cannot reach admin to reset passwords)

**Typical root cause:** `USER_ACCOUNTS` is upserted without updating `password_hash` on conflict, so the database can drift from the documented defaults; a misleading “wrong password” also appears when the API returns 5xx (e.g. DB unreachable) — the login page now distinguishes server errors from bad credentials.

Anyone with database access can set a new password (same SHA256 scheme as the app):

```bash
# With POSTGRES_URL or DATABASE_URL set (e.g. from Vercel / Supabase dashboard):
npm run db:reset-password -- david david123
```

If you cannot run Node against the DB, print SQL only and run it in the host’s SQL editor:

```bash
node scripts/reset-user-password.mjs david david123 --sql-only
```

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy and Auto Sync

This project is connected to GitHub + Vercel auto deploy.

From Cursor/local changes to production:

```bash
npm run sync:vercel
```

It will add, commit, and push to `main`, and Vercel will deploy automatically.

## One-Click Complaints Scraper (No Reddit)

- Double-click `run_reddit_scraper.bat`
- Data sources:
  - Hacker News (new stories)
  - GitHub Issues (selected product/tool repositories)
- Time filter: last 1 year
- Keywords:
  - `I wish there was`
  - `I hate when`
  - `too complex`
  - `someone please build`
- Output file: `complaints_ideas.csv` (project root)

Optional:

- Set `GITHUB_TOKEN` in your environment to increase GitHub API rate limits.
