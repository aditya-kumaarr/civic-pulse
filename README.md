# CivicPulse

Hyperlocal civic-issue reporter. Snap a photo of a neighbourhood problem — a pothole, a broken streetlight, an overflowing bin — and AI instantly categorises it, estimates severity, and drops it on a live map. The community verifies reports, and authorities track them from **Reported → Verified → In Progress → Resolved**.

Built with **Next.js (App Router)**, **React 19**, **Tailwind CSS v4**, **Leaflet** (map), and **Recharts** (dashboard).

## Features

- **AI categorisation** — photo + optional note are classified into a category, department, severity (1–5), and a suggested title. Uses a real vision model when an API key is set (Mistral or OpenAI GPT-4o), and falls back to a deterministic on-device classifier so the app always works with zero config. Local uploads are inlined as base64 so the vision model can read them.
- **Live map** (`/`) — every active report as a category-coloured marker, with a searchable side list.
- **Report flow** (`/report`) — guided Photo → AI → Review → Done flow with live geolocation and duplicate detection.
- **Issue detail** (`/issues/[id]`) — community confirm/deny voting (drives a trust score), status timeline, comments, and demo authority actions.
- **Issues list** (`/issues`) — filter by status, category, and ward.
- **Impact dashboard** (`/dashboard`) — KPIs, reports-vs-resolutions trend, status breakdown, category mix, a contributor leaderboard, and AI-flagged predictive hotspots.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: enable a real vision model

Create a `.env.local` with **one** of the following. Mistral is recommended — it has a free tier and Pixtral is a strong vision model:

```
# Recommended (free tier): https://console.mistral.ai
MISTRAL_API_KEY=...
# MISTRAL_MODEL=mistral-small-latest   # optional override (vision-capable)

# Or OpenAI:
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o                 # optional override
```

The provider is auto-detected (Mistral preferred). Without any key, the app uses the built-in mock classifier (shown in the UI as "Smart classifier"); with a key, the badge shows "Mistral Vision" or "GPT-4o Vision".

## Data

The app talks to data through one interface (`src/lib/store.ts`) with two interchangeable backends, chosen automatically at load:

- **Local (default, zero-config)** — `src/lib/store.local.ts` seeds from `src/lib/seed.ts` into an in-memory store mirrored to `.data/db.json`. Runs fully self-contained with no external services.
- **Supabase (real, shared)** — `src/lib/store.supabase.ts`. Active whenever `SUPABASE_URL` + a secret key are present; reports from any device land in the same Postgres DB.

Shared logic (trust scoring, distance, dashboard stats) lives in `src/lib/store.shared.ts` so both backends behave identically.

### Enable the Supabase backend

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor (creates the tables).
3. Add to `.env.local` (Project Settings → API):
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_...        # or legacy SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
4. Restart, then seed: `curl -X POST http://localhost:3000/api/admin/reset`.

`POST /api/admin/reset` reseeds the database in either backend — handy for resetting demo state (optionally guard it with `ADMIN_TOKEN`).

## Project structure

```
src/
  app/            App Router pages + API routes (/api/*)
  components/     UI: MapView, IssuesList, IssueDetail, ReportFlow, Dashboard, Navbar
  lib/            store, seed data, AI categoriser, categories, types, utils
```

## Design system

A single set of CSS custom properties in `src/app/globals.css` (`--accent`, `--bg-canvas`, `--text`, …) drives the whole UI — a Stripe-inspired purple theme (`#4A36B3`) on a soft canvas (`#F6F9FC`).
