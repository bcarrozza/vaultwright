# Agent instructions — Arch Optimizer

This repo is **spec-only** until Brian asks to build. Product code is forbidden until then.

## Read (in this order)

1. This file.
2. [STATUS.md](STATUS.md) — current slice, last tests, compaction pointer.
3. The **current slice card** named in STATUS (`docs/slices/Sxx.md`).
4. Only the REQUIREMENTS sections and ADRs **cited** by that card.
5. [REQUIREMENTS.md](REQUIREMENTS.md) **§1** if you might change a product decision.

Do **not** paste or re-read the whole requirements file every turn. Humans: [README.md](README.md).

## Rules

- Do **not** contradict a `DEC-*` row or an `ADR-*`. Product changes: edit the DEC row, fix citing sections, append the **Decision log**. Implementation changes: edit the ADR and its log.
- `MUST` / `MUST NOT` / `SHOULD` / `MAY` in the requirements are binding.
- **v1** is a desktop web app. **Later** items stay out of the first build.
- JSON saves must include `requirementsVersion: "1.4"` and validate against [project.schema.json](project.schema.json).
- When implementing, follow [docs/slices/](docs/slices/README.md) **in order** (indexed in REQUIREMENTS **§23**). One slice per loop. Do not start S(n+1) until S(n) tests are green and STATUS is updated.

## Compaction (~100k tokens)

Follow [docs/compaction.md](docs/compaction.md). **Before** compact or ending a session: update STATUS.md. After compact: read this file, STATUS, current slice only. Tests + STATUS are memory. Do not reopen a green slice. Do not re-derive DECs/ADRs.

## Do not

- 3D force analysis, 3D viewport, or groin vaults
- Auto-generate cores or skins
- Treat a dry core as extra kern thickness
- Flying buttresses, rebar, hoop iron, water/scour, wind/seismic
- Fake 2D-only running bond that ignores wythes and through-stones
- Hand-placed individual stones in v1
- Commit unless Brian asks
- Re-pick the stack, physics engine, or JSON field names in chat (ADR-001–005)

## Quick locks (do not rediscover)

- 2D **forces**; 3D **bond then slice**
- Middle-third goal; amber is informative, not a pass
- Full-wall kern **unless** a user-drawn core exists (dry core → skins only)
- Optimize: min ring `t` + min H; void and deck locked; default rise cap = **semicircle**; **preview then Apply**
- Auto footings; update with H unless `userEdited`; show frost line vs depth
- US customary default; US modular brick; ASCE 1.2D+1.6L
- Stack: TypeScript + Vite + React + SVG + Vitest; physics: Planck.js
- User: Brian, student; dwellings / thermal mass; Roman-inspired, America
