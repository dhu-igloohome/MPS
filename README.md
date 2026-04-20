# Igloo Foretracker

（仓库目录名可能仍为 `MPS`，npm 包名为 `igloo-foretracker`。）

Interactive website for collecting monthly order forecast from 13 offices across 3 regions:
- APAC
- EU
- USA

Current release includes module 1:
- Login with bilingual toggle (English/Chinese)
- Role/region-based access control
- Forecast form (`product name`, `SKU`, `Build to order`, `Build to stock`, `forecast month`)
- Cockpit dashboard with month + region aggregation and latest records

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
