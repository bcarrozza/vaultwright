# Session status

**Spec:** `requirementsVersion` **1.4** (DEC-001–DEC-052).  
**Phase:** B. **S00 green.** Do not start S01 until Brian asks.  
**Current slice:** [S00](docs/slices/S00.md) (done)  
**Last tests:** pass.  
**Parked questions:** none.

## Compact here

When context is near **100,000 tokens**, or before ending a session: update this file, then stop. After compact, read [AGENTS.md](AGENTS.md), this file, and only the current slice card.

## Pointers

| Item | Value |
|---|---|
| Slice | S00 — Project shell (**green**) |
| Fixture | [docs/fixtures/s00-empty/](docs/fixtures/s00-empty/) |
| Cite | REQUIREMENTS §6.6, §16.1, §16.4, §18; ADR-001, ADR-002, ADR-003 |
| Last command | `npx vitest run tests/slices/s00.test.ts` |
| Last result | pass — 7 tests (round-trip, schema 1.4, US display / SI storage, ground line y=0, scale bar) |
| Files touched this slice | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/app/`, `src/model/`, `src/persist/`, `src/catalog/`, `src/geom/`, `src/draw/`, `src/ui/`, `tests/slices/s00.test.ts` |
| Next | Wait for Brian. Then S01: `npx vitest run tests/slices/s01.test.ts` |

## Loop (every slice)

1. Read AGENTS.md, this file, current `docs/slices/Sxx.md`.
2. Open **cited** REQUIREMENTS sections and ADRs only.
3. Smallest change that can fail the slice test → make it pass.
4. Record command + result here. Do not start S(n+1) in a window about to compact.

Current slice: S00 (green)
Last command: `npx vitest run tests/slices/s00.test.ts`
Last result (pass/fail + one line): pass — 7 tests; empty fixture round-trips; schema + `requirementsVersion` 1.4; US customary display, SI storage; ground line y=0 and scale bar in SVG
Files touched: Vite/React/Vitest shell; `src/model`, `src/persist`, `src/catalog/units.ts`, `src/geom/coords.ts`, `src/draw/Sheet.tsx`, `src/app`, `src/ui/Inspector.tsx`, `tests/slices/s00.test.ts`
Parked (must be a DEC/ADR edit or stay parked): none
Next three commands: (when Brian asks) read S01 card + cited sections; implement leftover-height wall; `npx vitest run tests/slices/s01.test.ts`
