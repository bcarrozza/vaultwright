# Worked examples (numeric locks)

SI in JSON (ADR-003). US customary shown for Brian. **Inch = 0.0254 m, foot = 0.3048 m.**  
Catalog: US modular **7⅝ × 3⅝ × 2¼ in**, lime joint **3/8 in** (DEC-042).

These numbers are the S01–S04 fixtures. If code disagrees, the code is wrong unless REQUIREMENTS/ADR/this file are edited together.

## 1. Module (lime, US modular)

| Pitch | Formula | in | m |
|---|---|---|---|
| Course height | 2.25 + 0.375 | **2.625** | 0.066675 |
| Stretcher wythe (X) | 3.625 + 0.375 | **4.000** | 0.101600 |
| Header through-wall (X) | 7.625 + 0.375 | **8.000** | 0.203200 |
| Stretcher along Z | 7.625 + 0.375 | 8.000 | 0.203200 |
| Header along Z | 3.625 + 0.375 | 4.000 | 0.101600 |

## 2. Wall leftover (S01)

Drawn face: **72 in** high × **24 in** thick (6 ft × 2 ft) = **1.8288 m × 0.6096 m**. Joint mode **lime**. Snap default = **floor** to whole courses (do not grow the outline).

- `floor(72 / 2.625) = 27` courses
- Filled height = 27 × 2.625 = **70.875 in** = 1.800225 m
- Leftover (unfilled) = **1.125 in** = **0.028575 m**
- To next course = **1.5 in** = 0.038100 m
- Thickness: 24 / 4 = **exactly 6 stretcher wythes**; 24 / 8 = **exactly 3 headers**. No thickness closers.

## 3. Bond then slice (S02)

Same wall. Bond **`common`** (5 stretchers + 1 header). **Bottom course is a header** (ties to footing). `sliceZMode`: `header-course`.

Vertical courses 0..26 (27 total): headers at **0, 6, 12, 18, 24** (5 header courses). Other 22 are stretchers.

At the default header `sliceZ` (cut through tying units):

| Course type | Blocks through 24 in | Stone size in slice (X × Y actual) |
|---|---|---|
| Header | **3** | 7.625 in × 2.25 in |
| Stretcher | **6** | 3.625 in × 2.25 in (ends) |

Slice polygon count = 5×3 + 22×6 = **147**. Overlap = 0. `COLLAR_JOINT` **off** on this slice. Stretcher-course `sliceZ` preset: `COLLAR_JOINT` **on** (6 wythes).

## 4. Circular ring (S03)

- Span **10 ft** = 3.048 m; semicircle; \(r_0 = 5\) ft = 1.524 m
- Ashlar radial **8 in** = 0.2032 m (`ashlar-12` depth); **N = 1** ring; **Nv = 7** (odd, DEC-017)
- Joint included angle = 180°/7 = **25.7143°**; joints **normal to the curve**
- Slice depth **1 m**; default `sliceZ` through the keystone ring

## 5. Dead-load reference H (S04)

Limestone **2400 kg/m³**, g = 9.81 m/s², depth 1 m, seven **equal annular sectors** (not thin-arc rectangles).

- Rin = 1.4224 m, Rout = 1.6256 m, dφ = π/7
- Volume each = 0.13898262 m³; **W each = 3272.207 N**; **W tot = 22905.448 N**
- Centroid radius r̄ = 1.526258 m

**Three-hinged reference** (hinges on **centerline** at left/right springing and crown) — educational lock, ±**2%**:

| Quantity | SI | US |
|---|---|---|
| H | **18631.581 N** | 4188.6 lbf |
| VA = VB | 11452.724 N | 2574.9 lbf |
| Angle of resultant at springing from vertical | 58.421° | — |

By construction **e = 0** at those three hinges. Haunch eccentricity **must be computed and reported**; do not assume all-green.

**Design H** (ADR-005): search H so the line best stays in the **full-ring kern** (no core). Three-hinged H is the regression check, not automatically the design status. Factored dead-only uses **1.4D** on the same weights (DEC-007): reference H × 1.4 = **26084.214 N** if loads are factored before the funicular.

Springing angle 58° is **not** the ground-angle check; that applies at the **terminator/ground** after the line continues down the wall (§12.2). S04 still draws the line through the abutments.
