# Homestead Tracker (Chickens)

Homestead expense tracker focused on chicken batches. The app consists of a Vite + React frontend and a small Express API backed by PostgreSQL (local or Docker).

---

## Setup (Start Here)

1) Install prerequisites

- Node.js 16+
- npm 8+
- PostgreSQL 14+ (or Docker Desktop)

2) Install dependencies

```bash
npm install
cp .env.example .env   # then edit values below
```

3) Environment variables (API prefers DATABASE_URL)

```
# Frontend → API base URL
VITE_API_URL=http://localhost:5174

# API → Postgres (PREFERRED: single connection string)
# IMPORTANT: Percent‑encode special chars in the password (e.g., # => %23)
DATABASE_URL=postgresql://postgres:your%23password@localhost:5432/homestead_tracker

# Optional alternative (discrete PG vars; quote special chars if used):
# PGHOST=localhost
# PGPORT=5432
# PGUSER=postgres
# PGPASSWORD="your#password"
# PGDATABASE=homestead_tracker

# Optional
API_PORT=5174
VITE_APP_URL=http://localhost:5173
```

4) Create the database and apply schema

- One-shot script (reads `.env` → uses DATABASE_URL):

```bash
npm run setup:db
```

- Or manual (psql):

```bash
psql -U postgres -h localhost -p 5432
CREATE DATABASE homestead_tracker;
\c homestead_tracker
psql -U postgres -d homestead_tracker -f db/local_postgres.sql
```

5) Run the app (API + UI)

```bash
# Both together
npm run dev:all

# Or in separate terminals
npm run server
npm run dev
```

---

## Architecture

```mermaid
graph LR
  A[React UI (Vite)] -- HTTP --> B[Express API]
  B -- SQL --> C[(PostgreSQL)]
  subgraph Frontend
    A
  end
  subgraph Backend
    B
  end
  subgraph Data
    C
  end
```

---

## Testing

We use Vitest + jsdom and React Testing Library. Coverage thresholds are set to 80% in `vitest.config.js`.

Global commands:

```bash
# watch all tests
npm run test

# run all tests once
npm run test:run

# run all tests with coverage (text + HTML in coverage/)
npm run test:coverage

# run all tests with coverage and color-coded per-file report
npm run test:report
```

By test type:

```bash
# Unit tests (storage)
npm run test:unit           # watch
npm run test:unit:run       # one-shot
npm run test:unit:coverage  # with coverage
npm run test:unit:report    # coverage + colored per-file report

# Integration tests (context)
npm run test:int
npm run test:int:run
npm run test:int:coverage
npm run test:int:report

# Component tests (Chicken* components)
npm run test:component
npm run test:component:run
npm run test:component:coverage
npm run test:component:report
```

Coverage report colors (custom script):

- Green – Passed files ≥ 80%
- Red – Files between 70–<80%
- Yellow – Files < 70%

The script that prints colors to the console is at `scripts/coverage-report.cjs`. HTML coverage can be found in the `coverage/` folder after running any coverage command.

![CI](https://img.shields.io/github/actions/workflow/status/Senuue/HomesteadTracker/ci.yml?branch=main)

## Project Structure

- `src/utils/storage.js` – `localStorage` data API (batches, feed logs, tags)
- `src/contexts/ChickenContext.jsx` – React context for app state
- `src/components/` – UI components (List, Form, Dashboard, Modals)
- `src/__tests__/` – Unit, integration, and component tests
- `.github/workflows/ci.yml` – GitHub Actions for tests + coverage

## Requirements

- Node.js 16.x
- npm 8.x

## Setup

```bash
npm install
```

If you forked/cloned without dependencies, the command above installs everything. The project already includes a `.gitignore` for common Node/Vite artifacts.

## Run the App

```bash
# start dev server (http://localhost:5173 by default)
npm run dev

# build for production
npm run build

# preview the production build locally
npm run preview
```

## Testing

We use Vitest + jsdom and React Testing Library. Coverage thresholds are set to 80% in `vitest.config.js`.

Global commands:

```bash
# watch all tests
npm run test

# run all tests once
npm run test:run

# run all tests with coverage (text + HTML in coverage/)
npm run test:coverage

# run all tests with coverage and color-coded per-file report
npm run test:report
```

By test type:

```bash
# Unit tests (storage)
npm run test:unit           # watch
npm run test:unit:run       # one-shot
npm run test:unit:coverage  # with coverage
npm run test:unit:report    # coverage + colored per-file report

# Integration tests (context)
npm run test:int
npm run test:int:run
npm run test:int:coverage
npm run test:int:report

# Component tests (Chicken* components)
npm run test:component
npm run test:component:run
npm run test:component:coverage
npm run test:component:report
```

Coverage report colors (custom script):

- Green – Passed files ≥ 80%
- Red – Files between 70–<80%
- Yellow – Files < 70%

The script that prints colors to the console is at `scripts/coverage-report.cjs`. HTML coverage can be found in the `coverage/` folder after running any coverage command.

## Continuous Integration

GitHub Actions workflow is defined in `.github/workflows/ci.yml`. It runs all test groups, enforces coverage, prints per-file color-coded coverage, and uploads HTML coverage as artifacts.

## Notes

- The app is responsive: full-width on large screens, condensed on mobile.
- Tag suggestions under the filter are clickable chips; selected tags include a small X to remove.

## Troubleshooting

- Windows psql paging shows `'more' is not recognized` when using `\l`:
  - In psql, run: `\pset pager off` then repeat the command.
- Passwords with `#` or other reserved characters in `DATABASE_URL`:
  - Percent-encode (e.g., `#` => `%23`) or switch to discrete `PG*` variables and quote the value (e.g., `PGPASSWORD="my#pass"`).
- Combined dev command fails due to shell issues:
  - Use separate terminals with `npm run server` and `npm run dev`.
- Frontend can’t reach API:
  - Ensure `VITE_API_URL` points to `http://localhost:5174` and CORS origin matches `VITE_APP_URL`.

---

## Architecture

```mermaid
flowchart LR
  A[React UI (Vite)] -- HTTP --> B[Express API]
  B -- SQL --> C[(PostgreSQL)]
  subgraph Frontend
    A
  end
  subgraph Backend
    B
  end
  subgraph Data
    C
  end
```

## Run with Docker (optional)

We provide a `docker-compose.yml` to run Postgres and the API together. The database is initialized with `db/local_postgres.sql` on first run.

### Requirements

- Docker Desktop
- Node.js (only if you want to run UI outside Docker)

### Start services

```bash
docker compose up --build
```

This starts:

- Postgres on port 5432 (initialized DB + schema)
- API on port 5174 (connected to `db` via `DATABASE_URL`)

Set your UI to point at the containerized API:

```
VITE_API_URL=http://localhost:5174
```

Run the frontend locally:

```bash
npm run dev
```

Stop services:

```bash
docker compose down
```

### Data persistence

- Database data persists in the named volume `pgdata`.
- To reset DB state:

```bash
docker compose down -v
docker compose up --build
```

## Run without Docker (local Postgres)

1) Install PostgreSQL and create DB `homestead_tracker`.

2) Apply schema: `psql -U postgres -d homestead_tracker -f db/local_postgres.sql`.

3) Set `.env` with `DATABASE_URL` (encode special chars) or `PG*` variables.

4) Start API and UI:

```bash
npm run dev:all
# or
npm run server & npm run dev
```
