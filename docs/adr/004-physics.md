# ADR-004 — Physics engine

**Status:** locked  
**Product cites:** DEC-013, DEC-014, DEC-038, DEC-039, §14, §19

## Decision

- Engine: **Planck.js** (Box2D port). Metres, kilograms, seconds. No WASM.
- Bodies: 2D polygons from the slice (DEC-032). Friction contacts. **No tension** (no distance/weld/rope that pulls).
- Ground: one **static** frictional edge on `y = 0` (DEC-038). Foundations below ground still rest on that plane.
- Centering: **kinematic/static** supports under the **intrados only** (DEC-039) while paused. Removing centering enables dynamic bodies (DEC-014). Abutments are dynamic (DEC-013).
- Lime **cohesion** is authoritative on the **overlay** (Mohr–Coulomb). Physics MAY raise contact friction as a crude stand-in; it MUST NOT glue faces in tension. Document that approximation in the inspector when cohesion > 0.
- Pass/fail: exactly §14.3 (`T` default 8 s, `E_quiet`, 0.5% / 2% span, 30° rotation). Solver iterations MUST be high enough that the three S11 fixtures are stable run-to-run (record seed + iteration counts in that slice).

## Why

§19 allows a game engine if contacts are honest at masonry scale. Planck is inspectable Box2D, student-debuggable, and does not pull (unlike many game joints). Overlay remains the design verdict (DEC-030).

## MUST NOT

Matter.js as the v1 engine (weaker stacking). 3D physics. Re-picking an engine in chat without editing this ADR.

## Log

- 2026-08-16: Locked.
