# Forest Fire Risk Predictor - Frontend

> **A live map of Canadian wildfire danger, built on the Canadian Fire Weather Index (FWI1987) System**

A Next.js application that renders the country's real fire-danger grid as a single thematic map plate — every one of 7,537 grid cells individually colored, hoverable, and clickable — followed by a scrolling report on today's highest readings, national overview, and official emergency information.

**Live:** [forestfirepredictor.com](https://forestfirepredictor.com) · **API:** [forest-fire-predictor-api.onrender.com](https://forest-fire-predictor-api.onrender.com)

---

## Overview

The official **Canadian Forest Fire Weather Index (FWI1987)** system is the one classification this app ever shows the public: six fixed danger tiers (Very Low through Extreme), read live from the backend rather than hardcoded, so a future change to the tier system is a data update, not a rewrite. A newer ML model is being validated by the backend in shadow mode (see the [backend README](https://github.com/taimoor789/Forest-Fire-Predictor/blob/main/README.md)) — its fields exist on the API but are intentionally never surfaced here; whether it's ever promoted to primary is a separate decision.

### **Key Capabilities**
- 🗺️ **7,537 grid cells**, individually rendered on a canvas map layer — not an averaged or sampled subset
- 🎯 **Every cell interactive**: hover for a quick reading, click for its full Fire Weather Index breakdown
- 📡 **38 named weather stations** as an aggregated secondary view, colored and filterable the same way
- 🔍 **Tap a danger class to isolate it** on the map, in either view
- 📍 **Smart geolocation** — cached 7 days, falls back gracefully without it
- ⚠️ **Honest failure**: if the live API is unreachable, the app says so rather than falling back to invented data

---

## Features

### **The Map**

- **Grid mode** (default): all 7,537 cells as flat color fields on a single canvas layer, styled after a mid-century thematic atlas plate. Hovering shows a quick FWI readout; clicking opens the cell's full detail below and scrolls you to it.
- **Stations mode**: the same data aggregated to 38 named cities, as a lighter-weight overview.
- **Danger-class legend**, collapsible to a compact swatch strip so it doesn't cover the map — expand it for per-class counts, FWI ranges, and distribution bars. Tapping a class dims everything else, on the map and in the station markers alike.

### **Today's Readings**

- Selected cell or station: city, province, FWI value and tier, then **Conditions** (temperature, humidity, wind, 24h precipitation) ahead of the full **Fire Weather Indices** breakdown (FFMC, DMC, DC, ISI, BUI, DSR) — conditions first, since that's what a visitor actually feels outside.
- With nothing selected: today's five highest readings nationwide, plus the reading nearest the visitor (distance in km), so the page always has something to show even on a calm day.

### **National Overview**

Grid cells monitored, weather station count, and the national low-danger / high-danger split, as animated counters.

### **Emergency & About**

A 911 emergency callout, and a collapsible explainer of what FWI actually measures and its component codes.

---

## Danger Classes

The same official FWI1987 boundaries the backend computes against (`GET /api/danger-classes` is this frontend's source of truth — the six tiers below are its fallback, not a second hardcoded copy):

| FWI Range | Class | Color |
|-----------|-------|-------|
| 0-2 | Very Low | 🟢 Green |
| 2-4 | Low | 🟡 Yellow-Green |
| 4-8 | Moderate | 🟡 Yellow |
| 8-18 | High | 🟠 Orange |
| 18-30 | Very High | 🔴 Red |
| 30+ | Extreme | 🟣 Purple |

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 15 (App Router) + React 19 | Client-rendered app, single route |
| **Language** | TypeScript | Type safety end to end |
| **Styling** | Tailwind CSS 4 | CSS-first design tokens (`app/globals.css`) |
| **Mapping** | Leaflet (vanilla) | Custom canvas field renderer for the 7,537-cell grid, not a marker-per-cell approach |
| **Basemap** | Esri World Light Gray Canvas (base + reference labels) | Free, no API key; labels render above the color field |
| **Fonts** | Archivo (display), JetBrains Mono (tabular data) | Self-hosted via `next/font` |
| **Testing** | Jest + Testing Library | Unit tests for FWI/geo utilities and API parsing |

---

## Data Flow

- Fetches `GET /api/predict/fire-risk` and `GET /api/danger-classes` from the live backend, client-side, with no server-side caching (`cache: 'no-store'`) — every load gets current data.
- A local cache in `localStorage` gives an instant first paint on repeat visits, refreshed hourly with a 60-second poll for new data in between.
- ML shadow-mode fields (`ml_danger_class`, `ml_risk_probability`) are dropped at the API-parsing boundary and never reach a component — see `app/lib/api.ts`.
- On a connection failure, the app shows its actual state (stale cached data with a notice, or an explicit "unable to reach the live system" message) rather than silently substituting fabricated numbers.

---

## Development

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` (see `.env.local`) points at the backend to use — either a locally running copy of the [backend](https://github.com/taimoor789/Forest-Fire-Predictor) on `localhost:8000`, or the live API directly for frontend-only work.

```bash
npm test        # unit tests
npm run build   # production build
```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest | ✅ Full |
| Firefox | Latest | ✅ Full |
| Safari | Latest | ✅ Full |
| Edge | Latest | ✅ Full |
| Mobile Safari | iOS 13+ | ✅ Full |
| Chrome Mobile | Latest | ✅ Full |

---

## Acknowledgments

- **Van Wagner, C.E.** and the **Canadian Forest Service** — FWI System
- **Natural Resources Canada** and **Environment and Climate Change Canada** — fire weather data and research
- **Esri** — basemap tiles
- **OpenStreetMap Nominatim** — geocoding
- **Leaflet** — mapping engine

---

<div align="center">

![Fire Risk](https://img.shields.io/badge/Fire%20Risk-Monitoring-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)
![Updates](https://img.shields.io/badge/Updates-Hourly-blue?style=for-the-badge)

</div>
