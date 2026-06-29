<div align="center">

# 🛰️ CivicPulse

### Snap a photo. AI maps the problem. Your community fixes it.

CivicPulse turns a single photo into an actionable, geolocated, community‑verified civic complaint — AI categorises it, scores its severity, routes it to the right department, and drops it on a live map.

[![Next.js](https://img.shields.io/badge/Next.js%2016-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React%2019-149ECA?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Mistral AI](https://img.shields.io/badge/Mistral%20Vision-FA520F?logo=mistralai&logoColor=white)](https://mistral.ai)
[![Google Cloud Run](https://img.shields.io/badge/Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

**[🌐 Live App](https://civic-pulse-mlk53ngtxq-el.a.run.app)** · built for the **Vibe2Ship Hackathon**

</div>

---

## 📸 What it recognises from a photo

CivicPulse's vision model identifies civic issues like these and assigns each a category, department and severity:

<table>
  <tr>
    <td align="center"><img src="public/img/pothole.jpg" width="150" height="100" style="object-fit:cover"><br><sub>🕳️ Pothole</sub></td>
    <td align="center"><img src="public/img/garbage.jpg" width="150" height="100"><br><sub>🗑️ Garbage</sub></td>
    <td align="center"><img src="public/img/electric.jpg" width="150" height="100"><br><sub>⚡ Electrical hazard</sub></td>
    <td align="center"><img src="public/img/water_leak.jpg" width="150" height="100"><br><sub>🚰 Water leak</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="public/img/drainage.jpg" width="150" height="100"><br><sub>🌊 Drainage / flood</sub></td>
    <td align="center"><img src="public/img/streetlight.jpg" width="150" height="100"><br><sub>💡 Streetlight</sub></td>
    <td align="center"><img src="public/img/tree.jpg" width="150" height="100"><br><sub>🌳 Fallen tree</sub></td>
    <td align="center"><img src="public/img/signage.jpg" width="150" height="100"><br><sub>🚏 Damaged sign</sub></td>
  </tr>
</table>

> 👉 **See the real UI live:** https://civic-pulse-mlk53ngtxq-el.a.run.app

---

## 🧭 Why

Most neighbourhood problems never get fixed because **reporting them is painful** — which department owns it? how serious is it? where exactly? has someone already reported it? People give up, and the pothole stays. CivicPulse collapses the whole process into **one action: take a photo.** Everything else — triage, routing, verification, tracking — is automated, turning a stream of complaints into transparent, measurable accountability.

## ✨ Features

- 📷 **Photo‑first reporting** — camera *or* gallery, with automatic geolocation
- 🤖 **AI vision triage** — category, department, **severity (1–5)**, suggested title & summary, with confidence
- 🗺️ **Live map** — every report as a category‑coloured marker, centred on the user
- 🤝 **Community verification** — confirm/deny voting → **trust score** → auto‑verify at consensus
- ⏱️ **Live SLA accountability** — per‑issue countdown and "overdue" flags
- 📊 **Impact dashboard** — KPIs, **department SLA scorecard**, area breakdown, trends, **predictive hotspots**, activity feed
- 📍 **Location‑aware** — city/area scoping (Indiranagar / Cyber City) with "be the first to report" empty states
- 🏆 **Gamified** — civic points + leaderboard · 🔁 **duplicate detection** · 📱 fully responsive

## 🔄 How it works

```
📷 Photo  →  🤖 AI categorises + scores + routes  →  🗺️ Live map
                                                        ↓
        📊 Dashboard & SLA  ←  🏛️ Authority tracks  ←  🤝 Community verifies
```

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Leaflet, Recharts |
| **AI** | Mistral vision model (`mistral-small-latest`) — with a zero‑config on‑device fallback classifier |
| **Backend** | Supabase — Postgres + Storage (with a local file‑store fallback) |
| **Deploy** | Google Cloud Run (Docker + Cloud Build) |

A single data‑access layer (`src/lib/store.ts`) auto‑selects the **Supabase** backend when configured, or a **local file store** otherwise — so the app is both production‑real and runnable with zero setup. Uploaded photos are inlined as base64 so the AI reads *real* user images.

## 🚀 Getting started

```bash
git clone https://github.com/aditya-kumaarr/civic-pulse.git
cd civic-pulse
npm install

# optional: enable real AI + shared backend (otherwise it runs fully on mock + local store)
cp .env.example .env.local   # then fill in the values you want

npm run dev                  # http://localhost:3000
```

Configuration is documented in [`.env.example`](.env.example) — every key is **optional**; with none set, the app runs on a deterministic mock AI and a local file store. To enable the real backend, run `supabase/schema.sql` in your Supabase SQL editor and add the keys.

## ☁️ Deployment (Google Cloud Run)

Containerised via the included multi‑stage `Dockerfile` (Next.js standalone output) and deployed with Cloud Build:

```bash
gcloud run deploy civic-pulse --source . --region asia-south1 --allow-unauthenticated
```

Secrets are injected as Cloud Run **environment variables** — never committed to the repo.

## 🔗 Links

- **Live app:** https://civic-pulse-mlk53ngtxq-el.a.run.app
- **Source:** https://github.com/aditya-kumaarr/civic-pulse

---

<div align="center"><sub>Built with ☕ for the Vibe2Ship Hackathon.</sub></div>
