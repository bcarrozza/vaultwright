# Implementation ADRs

Product rules live in [REQUIREMENTS.md](../../REQUIREMENTS.md) as `DEC-001`–`DEC-052`. These ADRs freeze **how** v1 is built so agents do not re-invent the stack, folders, schema, physics, or analysis order.

Do not contradict a `DEC-*`. To change an ADR: edit the file, add a one-line log at the bottom of that file, and mention it in [STATUS.md](../../STATUS.md).

| ID | Topic | Decision |
|---|---|---|
| [ADR-001](001-stack.md) | Stack | TypeScript (strict) + Vite + React + SVG + Vitest |
| [ADR-002](002-folder-map.md) | Folders | `src/{model,geom,draw,masonry,analysis,physics,ui,persist,catalog}` |
| [ADR-003](003-json-schema.md) | Save format | SI in JSON; field names frozen in `project.schema.json` |
| [ADR-004](004-physics.md) | Drop-test | Planck.js (Box2D); no tension; overlay stays authoritative |
| [ADR-005](005-analysis-pipeline.md) | Order | Outline → 3D bond → slice → joints → loads → funicular → overlay → optimize preview → Apply |

When Brian asks to build, implement [S00](../slices/S00.md) first. Do not add libraries outside ADR-001/004 without a new ADR.
