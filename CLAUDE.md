# FIRE App Project

## What This Is
A single-page financial independence calculator built in React + Vite. No backend. All state lives in `localStorage`. No TypeScript — plain JSX.

## Stack
- **React** + **Vite** (JSX, not TSX)
- **Recharts** for all charts (`AreaChart`, `ReferenceLine`, etc.)
- **localStorage** for persistence (`fire-app-data`, `fire-app-theme`)
- No routing, no state management library, no external API calls

## Key Files
- `src/FIREApp.jsx` — entire app in one file (components, calculations, themes)
- `src/main.jsx` — entry point
- `src/index.css` / `src/App.css` — global styles

## Architecture
Everything is in `FIREApp.jsx`. Key sections:

### Themes
Three themes (`dark`, `light`, `high-contrast`) defined as plain objects in `THEMES`. All styling is inline via theme tokens — no CSS classes for theming.

### Calculation Functions
- `calcFIRE()` — standard FIRE projection; detects FIRE age and ruin age
- `calcCoastFIRE()` — Coast FIRE; calculates coast number per year and today's coast target
- `runMonteCarlo()` — bootstrap simulation from `HISTORICAL_RETURNS` (Damodaran S&P 500 1928–2024 nominal total returns); returns percentile bands (p5/p25/p50/p75/p95) and success rate

### Data Model
```js
{
  age, netWorth, spending, annualContributions,
  retirementAge, inflation, growth, swr
}
```
Stored per-user profile in localStorage. Multiple user profiles supported.

### Chart Data Shape
Monte Carlo stacked area uses delta encoding for Recharts:
- `mc_base` = p5
- `mc_p5_p25` = p25 - p5
- `mc_p25_p75` = p75 - p25
- `mc_p75_p95` = p95 - p75

## Formatting Conventions
- `fmt(n)` — formats dollar amounts: `$1.23M`, `$456K`, `$789`
- `pct(n)` — formats percentages: `7.0%`
- Inline styles throughout (no CSS modules, no Tailwind)

## Default Parameters
```js
{ age: 30, netWorth: 150000, spending: 60000, annualContributions: 20000,
  retirementAge: 65, inflation: 3, growth: 7, swr: 4 }
```

## What to Preserve
- Single-file structure — keep everything in `FIREApp.jsx` unless there's a strong reason to split
- Inline theming pattern — don't introduce CSS variables or Tailwind
- No TypeScript migration unless explicitly requested
