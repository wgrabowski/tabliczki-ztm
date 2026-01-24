## 1. Project name

**Tabliczki ZTM (MVP)** — live stop-board dashboards for ZTM Gdańsk

![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5.x-ff3e00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-22.14.0-339933?logo=node.js&logoColor=white)

## Table of contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. API Testing with Postman](#6-api-testing-with-postman)
- [7. Test plan](#7-test-plan)
- [8. Project scope](#8-project-scope)
- [9. Project status](#9-project-status)
- [10. License](#10-license)

## 2. Project description

Tabliczki ZTM is a web app for **tracking real-time departures from multiple public transport stops in Gdańsk (ZTM Gdańsk)**. It aggregates data from the **Open Gdańsk / Otwarty Gdańsk public API** and presents it as customizable dashboards (sets of stop boards).

The core idea is to make it fast to monitor **several boards at once**, plus provide a **TV / high-readability view** that can run passively on a monitor/TV.

- **Product requirements (PRD)**: see `.ai/prd.md`
- **Tech stack notes**: see `.ai/tech-stack.md`
- **QA / Test plan**: see `.ai/test-plan.md`

## 3. Tech stack

- **Frontend**
  - **Astro 5**: routing and server-side rendering (SSR)
  - **Svelte 5**: interactive UI (dashboard, widgets, search, management views)
  - **TypeScript 5**
  - **CSS**: modern, native CSS (Custom Properties, Grid, Flexbox) — no heavy UI framework
  - **UI approach**: minimally styled native HTML elements (`<dialog>`, `<form>`, `<button>`, `<input>`)
- **Backend**
  - **Supabase**: PostgreSQL + Auth + RLS (used for user-owned sets and set items)
  - **Server API (Astro)**: REST endpoints for auth/sets/items and ZTM proxy endpoints (with caching/timeouts)
  - **Supabase Edge Functions (optional / future)**: alternative place for ZTM proxy/aggregation/caching
- **Infrastructure (planned)**
  - **Vercel** (recommended)
  - **CI/CD**: GitHub Actions
- **Data source**
  - Open Gdańsk (ZTM Gdańsk): `https://ckan.multimediagdansk.pl/dataset/tristar`

## 4. Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (from `.nvmrc`)
- **npm**: comes with Node.js

### Install & run

```bash
nvm use
npm install
npm run dev
```

Then open the dev server URL printed by Astro (typically `http://localhost:4321`).

### Project structure (high level)

```text
src/
  components/     # Astro + Svelte components
  layouts/        # Astro layouts
  lib/            # services and helpers
  pages/          # Astro pages (incl. pages/api for endpoints)
  styles/         # global styles
public/           # static public assets
```

## 5. Available scripts

From `package.json`:

- **`npm run dev`**: start the Astro dev server
- **`npm run build`**: build for production
- **`npm run preview`**: preview the production build locally
- **`npm run astro`**: run the Astro CLI
- **`npm run lint`**: run ESLint on the repo
- **`npm run lint:fix`**: auto-fix ESLint issues where possible
- **`npm run format`**: format with Prettier

## 6. API Testing with Postman

### Quick Start

You can test the REST API endpoints locally using Postman (or any HTTP client). This repo does not include a Postman collection/environment yet, so configure the base URL manually (e.g. `http://localhost:4321`).

1. **Authenticate**:
   - Protected endpoints use **Supabase session cookies**.
   - In Postman: call `POST /api/auth/login` first and keep cookies enabled for subsequent requests.

### What's Included

#### Endpoints

- **Sets Management**: GET, POST, PATCH, DELETE operations on sets
- **Set Items Management**: GET, POST, DELETE operations on items within sets
- **ZTM (public)**: stops and departures endpoints for testing upstream integration

#### Features

- ✅ Works with the local dev server (`npm run dev`)
- ✅ Supports testing both protected and public endpoints

### Documentation

For detailed setup instructions, authentication methods, and troubleshooting, see:

- **[.ai/api-plan.md](./.ai/api-plan.md)** - Full API specification

### Running Tests

```bash
# 1. Start the dev server
npm run dev
```

Recommended checks for API responses:

- HTTP status codes
- Response structure
- Error codes and messages
- Business logic constraints (max 6 sets, max 6 items, etc.)

## 7. Test plan

The project’s QA assumptions, scenarios, and acceptance criteria are described in:

- **[.ai/test-plan.md](./.ai/test-plan.md)**

## 8. Project scope

### MVP functional scope (from PRD)

- **Authentication**
  - Email/password sign-up and sign-in
  - No email verification required by default in MVP (but UI supports environments that require confirmation)
  - Session persistence (“remember me” behavior)
- **Stop-board sets**
  - Up to **6 sets** per user
  - Set name up to **10 characters**
  - Rename inline on the sets list (save on Enter / blur)
  - Delete sets (with their content)
- **Dashboard**
  - Grid of widgets: up to **6 stop boards per set**
  - Stop search with autocomplete (name, pole number, direction)
  - Widget shows: line, direction, arrival time (relative/absolute), accessibility icons (bike, stroller/wheelchair)
  - Show first **6 departures**, scroll to see more
  - Special messages ticker/marquee when API returns messages
- **Refreshing & resiliency**
  - Auto refresh every **60 seconds**
  - Shared refresh progress bar at the top of the screen (under header)
  - On refresh errors: warnings and retry on the next cycle; after **3 consecutive failures** the refresh cycle is stopped with a “Try again” CTA
  - Refresh is paused while dialogs are open and when the browser tab is hidden; on return it refreshes immediately and resets the error counter
- **TV mode (public, no login)** ✅ **IMPLEMENTED**
  - Accessible via `/tv/{stopId}` route
  - High readability: large stop name, clock (HH:mm), list of departures
  - Passive view with minimal interaction (theme toggle, reload on error)
  - Auto-refresh every 60 seconds with retry mechanism (max 3 attempts)
  - Optimized for large screens (responsive typography up to 3rem)
- **UI**
  - Header: current time, set switcher (dashboard), links to set/account management
  - Theme switcher: Light / Dark / System (default), persisted locally (fallback to `prefers-color-scheme` when unset)
  - Responsive layout (RWD)

### Out of scope (explicit PRD boundaries)

- Offline mode (requires a constant API connection)
- Social features and sharing sets between users
- Push notifications for disruptions
- Map-based stop search
- Manual reordering of boards in the grid (only add/remove)
- Advanced filtering of lines within a single board

## 9. Project status

**MVP: in progress.** Requirements are defined in `.ai/prd.md`; implementation may be partial and will evolve as features are built and integrated.

## 10. License

**MIT** (as currently stated by the repository).

If you want this to be explicit for GitHub tooling, add a `LICENSE` file with the MIT text.
