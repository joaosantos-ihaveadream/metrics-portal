# Core KPI Hub

Insights & Performance portal of delivery metrics. Proof of concept on seeded dummy data, built so a real source (eazyBI exports) can replace it without touching metrics or pages. Full spec: `build-spec.md`.

## Measurement principles (non-negotiable)

- **Team type is first-class.** Scrum only: completion ratio (Say/Do), scope change, velocity variability, sprint goals. Kanban only: throughput variability. Flow, quality, health and forecasting apply to both.
- **Never compare velocity or story points across teams.** Velocity is shown only for a single team; for a group it is "not available". Throughput across teams carries a caveat.
- **Trusted partner, not oversight.** Signals are "On track", "Watch", "Needs attention", always icon + label, and traceable to their metrics. Insights are coaching questions, never blame.
- **Thresholds live in one place**: the metric catalogue, which also renders the Metric catalogue page.
- **Pooling.** Ratio metrics (completion ratio, scope change) are pooled and weighted by points. Variability metrics use the median team. Per-team scores (health index, pulse) are averaged so each team counts once.
- **Snapshot time.** "Current" is relative to the dataset's snapshot date, never the computer clock.
- **Naming.** UI says "team"/"teams". British English, sentence case.
- **Dummy data is labelled** with a banner on every page (proof of concept, snapshot date).

## Architecture rules

- Data flows one way: data source → canonical dataset → `metrics/*` pure functions → pages.
- Pages never compute metrics inline. Sources never leak past `data/`. Datasets are never mutated.
- A new metric = catalogue entry + pure function + scorecard value + unit test.

## Commands

```bash
npm install
npm run dev        # Vite dev server, port 5173
npm run typecheck  # tsc --noEmit
npm run build      # type check + production build
npm run preview    # serve the production build
npm test           # Vitest, run once
```
