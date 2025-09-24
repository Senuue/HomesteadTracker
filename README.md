# Homestead Tracker (Chickens)

Homestead expense tracker focused on chicken batches. Built with Vite + React, using `localStorage` for persistence. Features per-batch feed logs, tags, status, dashboard visualizations, and robust testing with Vitest + React Testing Library.

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
- Data is stored in the browser; you can export/import later if needed. TODO: Use a proper database.
