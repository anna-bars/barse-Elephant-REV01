# Elephant Mood Tracker — Rive Integration Docs (Next.js)

Live state-machine demo + integration documentation for the elephant mascot.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Files

The `.riv` files are plain static assets, loaded straight from `public/` (no backend, no API route, no env vars):

```
public/elephant_bench.riv     artboard "Bench"   · state machine "Bench_SM"
public/elephant_header.riv    artboard "Header"  · state machine "Header_SM"
```

## Inputs

| State machine | Input | Type | Notes |
|---|---|---|---|
| `Bench_SM` | `Calm`, `Sad`, `Angry`, `Happy`, `Excited` | boolean | set one to `true` at a time |
| `Bench_SM` | `Blink` | trigger | fire every 3–6 s |
| `Header_SM` | `Expression` | number | 0 Angry · 100 Sad · 200 Calm · 300 Happy · 400 Excited |

## Structure

- `app/layout.js` — fonts (Space Grotesk + JetBrains Mono) and metadata
- `app/page.js` — live demo + documentation page
- `app/globals.css` — black documentation theme, `#4719EA` stage

## Deploy

Works as-is on Vercel: `vercel deploy`, or connect the repo in the Vercel dashboard.
