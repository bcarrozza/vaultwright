# ADR-003 — JSON schema and units

**Status:** locked  
**Product cites:** DEC-019, §6.6, §18

## Decision

1. Field **names** are frozen in [`project.schema.json`](../../project.schema.json). §18 is the human summary; the schema wins on spelling.
2. JSON stores **SI**: metres, newtons, pascals, kg/m³, seconds. `units` is **display only** (`us-customary` default, `metric` toggle). Toggling units MUST NOT change stored numbers (DEC-019).
3. Every save MUST include `"requirementsVersion": "1.4"`. Reject load if missing or different (until a future spec bump).
4. Generated `units3D` / `stones2D` MAY be omitted in the save and rebuilt on load; if present they MUST match the schema and are invalid when outline/bond/`sliceZ` changes (DEC-025).
5. IDs are strings (`v0`, `e0`, `f0`, `a0`, …). Coordinates are `[x, y]` in metres, **+x right, +y up**, ground line at `y = 0`.

## Why

“Names may vary” caused redrive. SI storage plus a display flag matches “do not silently change the physical model when toggling.”

## Not in v1 saves

Shareable URLs, binary caches, 3D meshes, physics world state (recompute drop-test).

## Log

- 2026-08-16: Locked.
