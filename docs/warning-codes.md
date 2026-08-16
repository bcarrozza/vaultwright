# Warning codes

Frozen `Warning.code` values for JSON and the inspector. Severity: `info` | `amber` | `red`. Do not invent codes in chat; add a row here (and a decision-log line if product behavior changes).

| Code | Severity | When |
|---|---|---|
| `THRUST_AMBER` | amber | Resultant inside masonry, outside middle third (DEC-005). Not a pass. |
| `THRUST_RED` | red | Resultant leaves the masonry. |
| `SLIDING` | red | \|V\| exceeds Coulomb / Mohr–Coulomb capacity. |
| `CRUSHING` | red | Peak compressive stress > allowable (DEC-021). |
| `SPREAD_RISK` | red | §12.1 (kern leave on terminator, footing slide, overturning, bearing). |
| `GROUND_ANGLE_AMBER` | amber | Terminator resultant > 15° from vertical (§12.2). |
| `GROUND_ANGLE_RED` | red | Terminator resultant > 25° from vertical. |
| `BUTTRESS_EXCESS` | info | Ground width > 120% of minimum green width (§13.2). |
| `FROST_SHALLOW` | amber | Footing depth < project frost line (DEC-049). |
| `NO_FOUNDATION` | red | Support has no foundation face after generate. |
| `FOOTING_USER_EDITED` | info | `userEdited`; auto-update skipped (DEC-037). May also go red on checks. |
| `COLLAR_JOINT` | amber | Stretcher-course slice: continuous collar through more than two wythes (§8.3). |
| `OVERLAP` | red | 2D polygons intersect after slice (DEC-026). Do not emit intersections. |
| `DANGLING_EDGE` | red | Sketch left with dangling edges (§6.3). |
| `RING_OVERLAP` | red | Two `archRing` faces overlap; block generation (§11.4). |
| `UNBONDED_RINGS` | amber | User picked unbonded multi-ring; delamination risk (§8.5). |
| `VOID_LOCK` | red | Optimize would shrink usable void or pierce deck (DEC-035). Preview must refuse. |
| `WHOLE_UNITS_GAP` | info | Whole-units-only left a visible gap (§7.1). |
| `PHYSICS_WARN` | amber | Drop-test WARN band (§14.3). |
| `PHYSICS_FAIL` | red | Drop-test collapse (§14.3). |
| `LOAD_UNBALANCE` | amber | Multi-span H cancellation fails (asymmetric / missing neighbor) (§11.1). |
| `SCOPE_2D` | info | Disclaimer: gravity + live load in-plane only (DEC-024). Always shown in v1 UI. |

Labels/patterns MUST accompany color (DEC-006 + §21 accessibility).
