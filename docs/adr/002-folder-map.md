# ADR-002 — Folder map

**Status:** locked  
**Product cites:** §8 pipeline, §9 overlay, §14 physics, §16 UI, §18 model

## Decision

When code exists, keep these packages. Do not dump analysis into React components.

```
arch-optimizer/
  project.schema.json
  REQUIREMENTS.md, AGENTS.md, STATUS.md, README.md
  docs/slices/  docs/adr/  docs/fixtures/  docs/examples/
  src/
    app/         shell, routes, mode switch
    model/       types matching project.schema.json
    persist/     load/save/validate JSON
    catalog/     units, materials, brick sizes
    geom/        vertices, edges, faces, constraints, leftover height
    draw/        SVG outline editor
    masonry/     3D bond fill + sliceZ → 2D polygons
    analysis/    joints, funicular, envelope, optimize preview
    physics/     Planck wrapper, drop-test metric
    ui/          inspector, legend, warnings, schedule
  tests/
    slices/      s00.test.ts … s13.test.ts
    fixtures/    may symlink or import docs/fixtures
```

**Import rule:** `ui` and `draw` may call `model` / `analysis` / `masonry`. `analysis` MUST NOT import `ui`. `physics` consumes slice polygons only (DEC-001, §8.1 step 5).

## Why

Stops the data model from being rewritten every slice. S00 can add `model` + `persist` + empty `draw` without inventing `masonry`.

## Log

- 2026-08-16: Locked.
