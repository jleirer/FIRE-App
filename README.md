# FIRE App

FIRE App is a single-page financial independence calculator built with React and Vite. It helps users explore traditional FIRE and Coast FIRE scenarios, compare multiple profiles, and visualize outcomes with deterministic projections and Monte Carlo simulations.

The app is entirely client-side. There is no backend, no database, and no API integration. User data and theme preferences are stored in `localStorage`.

## Features

- Traditional FIRE projection with estimated FIRE age, FIRE number, and portfolio runway
- Coast FIRE projection with coast age, today's coast number, and retirement target tracking
- Monte Carlo simulation using bootstrapped historical S&P 500 annual returns from 1928-2024
- Multiple users and scenarios stored locally in the browser
- Three built-in themes: `dark`, `light`, and `high-contrast`
- Recharts-based visualizations for deterministic and probabilistic outcomes

## Tech Stack

- React 19
- Vite
- Recharts
- Plain JSX
- `localStorage` for persistence

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Vite will print a local URL, typically `http://127.0.0.1:5173/`.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Project Structure

The app intentionally keeps most product logic in one place.

- `src/FIREApp.jsx`
  Core application UI, themes, calculators, Monte Carlo logic, chart data, and local state handling
- `src/App.jsx`
  Thin wrapper that renders `FIREApp`
- `src/main.jsx`
  React entry point
- `src/index.css`
  Global styles
- `src/App.css`
  Additional app-level styles

## How the App Works

### Data Model

Each scenario uses this shape:

```js
{
  age,
  netWorth,
  spending,
  annualContributions,
  retirementAge,
  inflation,
  growth,
  swr
}
```

Defaults:

```js
{
  age: 30,
  netWorth: 150000,
  spending: 60000,
  annualContributions: 20000,
  retirementAge: 65,
  inflation: 3,
  growth: 7,
  swr: 4
}
```

### Deterministic Calculators

`calcFIRE()` projects annual net worth growth until a maximum age, detects when the portfolio first crosses the FIRE threshold, and estimates whether the portfolio is eventually depleted.

`calcCoastFIRE()` estimates when the current portfolio can coast to the retirement target without additional contributions.

### Monte Carlo Simulation

`runMonteCarlo()` simulates annual paths using bootstrap resampling from historical nominal S&P 500 returns. It reports:

- `overallSuccessRate`: share of all simulated paths that both reach FIRE and avoid depletion through the projection window
- `reachFireRate`: share of paths that reach FIRE at all
- `surviveAfterFireRate`: share of FIRE-reaching paths that avoid depletion afterward

The Monte Carlo model is annual by design because the rest of the app is annual too:

- annual contributions
- annual spending
- annual retirement logic
- age-based charts

`runCoastMonteCarlo()` applies the same historical-return resampling approach to Coast FIRE scenarios.

## Persistence

The app stores data only in the browser:

- `fire-app-data`: users, scenarios, and inputs
- `fire-app-theme`: selected theme

Clearing browser storage will reset the app.

## Design Constraints

This project intentionally avoids a more fragmented architecture.

- Keep the main calculator logic in `src/FIREApp.jsx` unless there is a strong reason to split it
- Keep theming inline through theme token objects
- Avoid introducing TypeScript unless explicitly desired
- Avoid adding backend dependencies or external APIs

## Notes on Accuracy

This tool is best used for planning and comparison, not as financial advice.

- Deterministic mode uses a single constant growth assumption
- Monte Carlo mode uses historical annual return bootstrapping, not a regime-aware market model
- Results are sensitive to spending, inflation, contribution rates, and withdrawal assumptions

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint

## License

Add a project license here if you want to distribute the app publicly.
