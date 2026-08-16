# ADR-001 — Stack

**Status:** locked  
**Product cites:** DEC-002 (desktop web), DEC-022 (no 3D viewport), §19

## Decision

v1 is a **TypeScript** desktop web app:

| Layer | Choice |
|---|---|
| Language | TypeScript, `strict: true` |
| Bundler / dev | Vite |
| UI | React (inspector, chrome). Drawing sheet is **SVG**, not a 3D engine |
| Tests | Vitest; one file `tests/slices/sxx.test.ts` per slice |
| Package manager | npm (`package-lock.json`) |
| Styling | CSS modules or a single app CSS file. No CSS-in-JS requirement |

**MUST NOT:** Three.js / R3F / WebGL viewport, native apps, Python UI, mobile-first layout.

## Why

- DEC-002 is a precision drawing tool in the browser. SVG hit-tests and dimensions without a CAD plugin.
- Strict TS matches `project.schema.json` field names (ADR-003).
- Vitest golden tests are the slice done-when (prevents redrive after compact).

## Consequences

- First product files appear only when Brian asks to build S00: `package.json`, Vite/React entry, schema-valid JSON I/O.
- New runtime libraries need a new ADR (or an edit here), not a chat-only choice.

## Log

- 2026-08-16: Locked.
