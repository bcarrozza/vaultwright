# ADR-005 — Analysis pipeline

**Status:** locked  
**Product cites:** DEC-001, DEC-032, DEC-033, DEC-051, DEC-052, §8–§13

## Decision

Run in this order. Do not skip ahead inside a slice; later slices add stages.

1. **Outline** — labeled faces (invalid if dangling edges).
2. **3D bond** — fill extruded solids (`sliceDepth`) with catalog units + joints.
3. **Slice** — intersect at `sliceZ` → non-overlapping 2D polygons (DEC-026).
4. **Joints** — contact graph on those polygons; perpends are slide/open only (DEC-033).
5. **Loads** — dead from density × area × depth; live hatches; envelope §10.5.
6. **Funicular** — voussoir + tributary deck/fill/live resultants. **Pick H** so the line best stays in the **correct kern** (DEC-033, DEC-051). Continue down wall/buttress/footing.
7. **Overlay** — green / amber / red, sliding, crushing, spread. Design pass = all green, no slide, no crush, foundation green, spread off (§9.5).
8. **Optimize preview** — copy of outline; min `t` then min H; void + deck locked; default rise cap semicircle. **Apply** commits (DEC-052).
9. **Physics** — separate; collapse is a hard fail; standing does not pass an amber overlay (DEC-030).

**Three-hinged H** (hinges at centerline springings + crown) is an **educational reference** and the S04 numeric lock. Design status uses the kern-search H, not a random slider (§9.4).

**Kern thickness:** no core → full member; dry core → skins + ring only; lime-bound core → full wall including core (DEC-033).

## Why

Stops agents from coloring bricks, merging stacked-arch lines, or treating Heyman as a pass.

## Log

- 2026-08-16: Locked.
