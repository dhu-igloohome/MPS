# MPS Forecast Platform

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

## Persistent Database (Vercel Postgres or Supabase)

Set one connection variable:
- `POSTGRES_URL` (recommended on Vercel Postgres), or
- `DATABASE_URL` (Supabase Postgres)

Optional:
- `SESSION_SECRET` for cookie signing

Use `.env.example` as template.

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
