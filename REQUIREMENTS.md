# Arch Optimizer — Product Requirements

This file is the source of truth for the **product**. Humans: start with [README.md](README.md). Agents: start with [AGENTS.md](AGENTS.md) and [STATUS.md](STATUS.md), then the current [slice card](docs/slices/README.md). Open sections of this file only when a slice cites them, or when changing a `DEC-*`.

If a decision changes, **edit this file** (locked table + decision log) rather than leaving the new rule only in chat. Implementation stack/schema/physics: [docs/adr/](docs/adr/README.md), not chat.

**Spec version:** `requirementsVersion` **1.4** (JSON saves must match). Last reviewed 2026-08-16. Locked decisions: **DEC-001** through **DEC-052**. Field names: [project.schema.json](project.schema.json).

## 0. How an LLM (or a future session) should use this document

**Build work:** [AGENTS.md](AGENTS.md) → [STATUS.md](STATUS.md) → current `docs/slices/Sxx.md` → only the sections cited there. Compaction: [docs/compaction.md](docs/compaction.md). Do not paste this whole file into context.

**Product-rule work:**

1. Read **§1 Locked decisions** before proposing features or changing behavior.
2. Do not contradict a `DEC-*` row. To change a decision: update that row, add a **Decision log** entry, and fix any section that cites it.
3. `MUST` / `MUST NOT` / `SHOULD` / `MAY` are binding language.
4. **v1** is the first shippable desktop web app. **Later** is allowed in the data model only if it does not complicate v1.
5. Do not implement product code from this file until the user asks to build. Then follow **§23** (vertical slices), one slice per loop.

---

## 1. Locked decisions

Stable IDs. Last reviewed: 2026-08-16.

| ID | Topic | Decision |
|---|---|---|
| DEC-001 | Dimensionality | **2D analysis only** (forces in the slice plane). **3D masonry bond** is used to *place* bricks; the drawing is the cut of that 3D layout (DEC-032). |
| DEC-002 | Platform | Desktop web app. Precision drawing; not a mobile-first UI. |
| DEC-003 | Purpose | Design **visualizer** for **new** compression masonry: dwellings first, bridges/arcades as the same diagram. Student now; designer later if it proves useful. |
| DEC-004 | Joint materials | Two modes: **dry stone** and **lime mortar**. Same thrust rule in both (no tension). Lime adds joint thickness + cohesion against sliding. |
| DEC-005 | Safety rule | **Navier middle-third is the design goal.** Heyman (thrust merely inside the masonry) is **amber**: informative, not “safe.” |
| DEC-006 | Color legend | **Green** = thrust in middle third. **Amber** = inside masonry but outside middle third. **Red** = thrust leaves the masonry, or sliding, or crushing. |
| DEC-007 | Conservatism | Prefer safer / more conservative defaults (factored loads, middle third, no tensile mortar, no soil passive resistance). Load factors follow **ASCE 7 / IBC-style** combinations (DEC-043). |
| DEC-008 | User-locked thicknesses | User **defines wall thickness and deck thickness**. Typical intent: **1–2 m** (about 3–6.5 ft) for both. Thermal mass is a goal; walls ≥ ~6 ft (1.8 m) are desirable in many climates. |
| DEC-009 | Fill | **Do not minimize fill.** Fill is mass and may be rubble. User draws fill/rubble regions. |
| DEC-010 | Ring thickness | **Minimize structural ring thickness** (honest funicular). A thick ring can make any curve “work”; that hides the optimal arch. |
| DEC-011 | Horizontal thrust H | **Minimize H** by moving the arch curve and the **buttress**. Flag an **over-thick buttress**. |
| DEC-012 | What optimize may move | Arch **curve** (shape, within rise cap) and **buttress** (ground width + outer-face mode). **Not** wall thickness, deck thickness, fill, the usable **void**, or foundations (unless the user unlocks them). |
| DEC-013 | Abutments | New construction: **abutments / piers / walls are masonry blocks**, not infinite rock. |
| DEC-014 | Centering | **Paused gravity = centering (falsework).** Visible centering object; removing it / enabling gravity is the drop test. |
| DEC-015 | Rubble | User **draws rubble regions**. Rubble has its own density and friction/cohesion. Optional discrete rubble in physics. |
| DEC-016 | Course snapping | Default **snap region height to whole courses**, with a **visible leftover height**. Toggle to allow a cut/leveling course. |
| DEC-017 | Keystone | Always an **odd** number of voussoirs (keystone assumed necessary for this tool). |
| DEC-018 | Arch default | **Cut voussoirs**, joints perpendicular to the curve. Not corbels. |
| DEC-019 | Units | **US customary default** (ft/in, psf, lbf). Metric toggle. Intended for use in America (DEC-043). |
| DEC-020 | Live loads | Yes, including **asymmetric** (e.g. cart on one side). Ring and checks use a **load envelope**. |
| DEC-021 | Crushing | **MUST** show when compressive stress exceeds the material limit. |
| DEC-022 | 3D force analysis | **Out of scope for v1.** No 3D viewport, no out-of-plane bending, no groin-vault force network. Bonding still follows 3D practice (DEC-032). |
| DEC-023 | Water / scour | **Out of scope.** This is not a hydraulic-bridge tool. |
| DEC-024 | Wind / seismic / out-of-plane | **Out of scope for v1.** The UI MUST warn that gravity + live load in 2D is not a complete building design. |
| DEC-025 | Outline vs stones | Draw/edit the **outline**; generate blocks. **No hand-dragging of individual stones in v1.** Any future custom stone edits **invalidate** when the outline changes. |
| DEC-026 | Overlap | Generated blocks **MUST NOT** overlap. |
| DEC-027 | Construction sequence | Walls/abutments → centering → voussoirs from both springings → keystone → fill → remove centering. |
| DEC-028 | Inspector | Persistent inspector panel (units, materials, forces, leftover height, warnings). |
| DEC-029 | View | **Internal structural slice** (section). User draws XY only. Masonry in that cut comes from 3D bond (DEC-032). Skins + rubble core are in-plane in this view. |
| DEC-030 | Authoritative check | **Middle-third overlay + crushing + sliding + foundation** is the design verdict. Physics drop-test is a demonstration and a hard fail if it collapses. |
| DEC-031 | Rebar | **MUST NOT** model reinforcement. Foundations and masonry are unreinforced. |
| DEC-032 | 3D-then-slice generation | **v1 MUST** populate drawn faces using real **3D brick/block bonding** (wythes, headers, stretchers, through-stones, vault rings), then take a **2D slice**. Do not fake a 2D-only running bond that ignores how masonry is actually laid. |
| DEC-033 | Middle-third target | Color the **full member thickness** (ring, solid wall, pier, buttress, footing) along the thrust path — **not** each brick — **unless a core is drawn**. If a core is drawn, DEC-034 applies: dry core ⇒ kern is **cut-stone skins only** (core does not fake a wide wall); lime-bound core ⇒ full wall including core may take compression as a mass, still no tension. Perpends get slide/open checks only. |
| DEC-034 | What carries thrust | **Cut stone:** yes. **Coursed `fill`:** compression, no tension. **Dry rubble:** dead load + interface friction only; **not** a funicular path. **Lime-bound rubble:** compression as a mass, no tension. |
| DEC-035 | Void + rise cap | Optimizer **MUST NOT shrink the usable void**. **MUST NOT** pierce the user deck. Rise cap: see §13.5. Default mode = **semicircle** (\(r_\text{opt} \le \text{span}/2\)). |
| DEC-036 | Buttress | **No flying buttresses.** Free variable = **width at the ground**. Outer face mode: **vertical**, **taper**, or **tiered** (giant steps). |
| DEC-037 | Foundations | **Auto-generate** a stepped spread footing under every wall/pier/buttress that lacks one. **Auto footings update** when H/loads change. Do not overwrite a **user-edited** footing (it may go red). **Regenerate footings** rebuilds non-edited ones, or all if the user confirms. |
| DEC-038 | Ground (physics) | Ground line = **soil surface**. Ground is a **fixed** frictional plane (soil μ). Foundations may extend below it. |
| DEC-039 | Centering scope | Centering supports the **intrados only**. It MUST NOT brace abutments or hide spread. |
| DEC-040 | Stone editing | v1: generate from outline only. No custom stone dragging. |
| DEC-041 | Mixed units | **Yes** — e.g. brick skins + ashlar ring in one model. |
| DEC-042 | Joint + crushing numbers | Dry pack joint **2 mm**; lime **10 mm**. Allowable compression: §7.5. |
| DEC-043 | Locale + lineage | Built for **use in America**. Defaults: US units, US modular brick, ASCE/IBC live loads and 1.2D+1.6L. Construction inspiration: **Roman** (voussoirs, thick walls, optional lime-bound or dry cores) and other long-lived unreinforced masonry. Modern numbers are occupancy/load **derivatives**; geometry still follows the middle-third tradition. If a modern habit contradicts proven compression masonry, **course-correct toward the older rule**. |
| DEC-044 | Default thick wall | Default = **solid** bonded masonry for the full drawn thickness. Cores are **only** what the user draws. **Do not auto-generate cores or skins.** |
| DEC-045 | Dry vs lime core | **Both** first-class when the user draws a core. Default binder for a newly drawn core = **dry**. Lime-bound is the *opus caementicium* upgrade. Inspector MUST compare cost proxy and structural result when switching. |
| DEC-046 | Skin thickness | When the user draws a core, they **define** the remaining skins. **No auto skin.** Skin thickness **snaps to the nearest wythe** (show leftover like course snap). |
| DEC-047 | Joint vs core binder | **Independent.** Lime facing joints do not force a lime core, and a lime core does not force lime facing joints. |
| DEC-048 | Default soil | **Stiff clay / firm sand**, 150 kPa, μ_soil 0.40. |
| DEC-049 | Frost display | Project has a **frost-line depth** (user value or US preset). Inspector **MUST** show required frost line vs actual footing depth (OK / too shallow). Default footing depth **4 ft**. No frost-heave simulation. |
| DEC-050 | Lime mix / cost | Educational mix **1:3 lime:aggregate by volume**. Lime unit price is an inspector number. |
| DEC-051 | Thrust method | Funicular from voussoir self-weight + tributary deck/fill/live; resultant continues down wall/buttress/footing. Choose H so the line best stays in the **correct kern** (DEC-033). |
| DEC-052 | Optimize apply | Live **preview** of curve and buttress. Outline changes only on **Apply**. |

---

## 2. One-sentence product

A desktop web tool, for use in America, where you draw a dimensioned 2D masonry slice, fill it with blocks laid by **real 3D bond** then cut to that slice (dry or lime), see conservative thrust-line colors, size a thin honest ring plus user-thick walls/decks in the Roman thick-wall tradition, and then remove centering to watch whether the blocks stand. Forces stay 2D; the joint pattern is 3D-realistic. Geometry follows long-lived compression masonry (middle third, voussoirs, thick cores — dry or lime-bound); modern US loads are occupancy numbers on top of that.

---

## 3. Glossary

| Term | Meaning in this project |
|---|---|
| **Slice / 2D model** | A vertical **cut plane**: left–right = span / wall thickness, up–down = height. The user draws this plane. Bricks are placed in 3D, then this plane cuts them. |
| **Wythe** | One leaf of masonry thickness (about one brick width). A 1–2 m wall is many wythes. |
| **Stretcher** | Unit laid with its **length along the wall** (into the page, Z). In the slice you see its **end**: width × height. |
| **Header** | Unit laid with its **length through the wall** (in the slice, X). Ties wythes together. In the slice you see length × height. |
| **Through-stone** | Header or longer stone that ties as many wythes as its length allows; required at intervals in thick walls. |
| **Closer / bat** | Cut unit used to keep bond at ends, openings, and skewbacks. |
| **Collar joint** | A vertical joint running through the wall thickness. A continuous collar joint is a split plane (wythes peel). 3D bond exists to **break** these. |
| **Bond pattern** | 3D laying rule (English, Flemish, Common, coursed ashlar, vault ring type). |
| **Slice Z** | Position of the cut along the barrel / wall length, within one repeating bond cell. Changes which courses you section. |
| **Gravity vector** | The direction gravity pulls. In this app it is always **straight down**, toward the ground line. There is no tilt control in v1. \(g = 9.81\,\mathrm{m/s^2}\) (inspector). |
| **Ground line** | Horizontal datum. Blocks and foundations sit on or below it. Always visible. |
| **Intrados** | Inner (soffit) curve of the arch. |
| **Extrados** | Outer curve of the arch ring. |
| **Arch ring** | The structural curved band of voussoirs. This is what we **minimize**. It is *not* the whole deck. |
| **Deck** | User-defined thick floor/roof/road layer above fill. Thermal mass; typically 1–2 m. |
| **Fill / spandrel** | Material between extrados and deck, or inside a thick wall around an opening. Not minimized. |
| **Rubble** | Irregular fill (drawn region). Different density/friction from cut blocks. May be dry or lime-bound. |
| **Voussoir** | Tapered arch stone; bed joints roughly perpendicular to compression. |
| **Keystone** | Center voussoir; odd count so one stone is centered. |
| **Skewback** | Angled seat on the wall/pier where the first voussoir bears. |
| **Springing** | Where the arch meets the support. |
| **Thrust line** | Path of the resultant compression through a member. |
| **H** | Horizontal component of thrust (kN, or kN per metre of slice depth). |
| **Middle third / kern** | Central third of a joint’s thickness. If the resultant stays here, the joint is all in compression (Navier). |
| **Centering** | Temporary falsework that holds the arch until the keystone is in. In-app: paused gravity. |
| **Abutment / pier / wall** | Vertical masonry that takes arch thrust. All are blocks. End supports are **terminating** abutments; interior supports of a multi-span are **piers**. |
| **Buttress** | Extra masonry to carry leftover H into the ground. |
| **Stereotomy** | How stones are cut and joints oriented. |
| **Funicular** | The hanging-chain / compression-only curve for a given load pattern. Thin self-weight → catenary-like; heavy level deck → more parabolic; point loads → kinks. |
| **Load envelope** | The set of load cases; the design must satisfy **all** of them. |
| **Spread** | Supports moving apart under H, flattening/failing the arch. |
| **Sagitta / initial rise** \(r_0\) | Distance from the **chord** (straight line between the two springings) up to the crown of the **initial** arch. Not the same as wall height. |

---

## 4. Users and use cases

**Primary user (now):** student learning why arch shape, thickness, fill, and buttressing matter.

**Possible later user:** designer exploring unreinforced masonry dwellings in the US (thick thermal-mass walls, vaulted rooms, no rebar), in the lineage of Roman and other long-lived masonry — not as a copy of a code diagram.

**Typical v1 models**

- Barrel-vaulted room: 1–2 m walls, 1–2 m deck, thin optimized ring, rubble or masonry fill.
- Thick wall with one or more arched openings (doors/windows).
- Multi-bay arcade / “bridge-like” section, including a **bridge on a bridge** (stacked arches).
- End buttresses sized so terminating thrust arrives steeply into the ground.

**Not a use case in v1:** code-stamped construction documents, seismic design, river bridges, 3D groin vaults.

### 4.1 Lineage (DEC-043)

This tool is for **new work in America**, but the **geometry** is the old rule that kept unreinforced masonry standing:

- **Roman:** cut voussoirs, thick walls, brick or stone facing, abutments as mass, no steel. Cores were **not always lime**. Major imperial work often used *opus caementicium* (rubble + lime, frequently pozzolana). Cheaper, earlier, and many non-Roman long-lived walls used **dry** or weakly mortared rubble. Spandrel fill above arches was often loose rubble/earth even when the ring was mortared.
- **Navier middle third:** 19th-century statement of “keep the joint all in compression.” Conservative vs Heyman; that is what we want.
- **Modern US (IBC / ASCE 7):** occupancy live loads (e.g. 40 psf dwelling) and load *combinations* (1.2D+1.6L). These are **how heavy people and furniture are**, not a replacement for the middle-third path.
- If a modern detailing habit (thin unreinforced walls, tensile mortar as if it were rebar, flying props, hoop iron) contradicts that lineage, **do not copy it**. Course-correct toward mass, voussoirs, and a thrust line in the kern.

Default thick-wall construction is **solid** full-thickness masonry (DEC-044). A core exists **only if the user draws it**. English/Flemish/Common remain presets for facing bond.

**Disclaimer (MUST appear in UI):** educational visualizer; not a substitute for a licensed engineer or a building-code check. v1 analyzes **gravity + live load in the slice plane only**. Brick layout follows 3D bond, but wind, earthquakes, and out-of-plane slenderness are not checked. IBC/ASCE numbers are occupancy and load **factors**, not permission to ignore middle-third geometry.

---

## 5. Scope

### 5.1 v1 MUST

- Constrained 2D outline editor with real dimensions, ortho lines, arch edges, face union/delete.
- Region labels: void, arch opening, arch ring, masonry wall/pier, fill, rubble, deck, buttress, foundation, centering.
- Generate non-overlapping 2D blocks by **3D bond then slice** (DEC-032): wythes, headers/stretchers, through-stones, vault rings — not a fake in-plane-only running bond.
- Dry and lime joint modes.
- Live analysis overlay (thrust, colors, sliding, crushing, spread, foundations).
- Full-length thrust line per arch, distinct colors; initial vs optimized curves.
- Optimize: min ring thickness + min H (curve + buttress), user-locked walls/deck/fill.
- Live loads including asymmetric; max point-load readout.
- Visible ground line; centering; gravity drop-test with a defined pass/fail.
- Inspector, stone schedule, leftover-height readout, save/load.
- Metric/Imperial toggle (US customary default).

### 5.2 v1 MUST NOT

- 3D **force** analysis, 3D viewport, or editable 3D model. The user still draws only the 2D slice.
- Rebar, steel ties, poured lead, hoop iron.
- Water, scour, frost **heave simulation**. Frost **line vs footing depth is displayed** (DEC-049), not simulated.
- Wind, seismic, soil liquefaction.
- Minimize fill or silently thin the user’s walls/deck.
- Auto-generate cores or skins (DEC-044, DEC-046).
- Treat amber (Heyman) as a passing design.
- Populate masonry as if it were a 2D video-game stack that ignores wythes and through-bonding.

### 5.3 Later (do not build now)

- Interactive 3D view / orbit; out-of-plane force analysis (DEC-022).
- Groin/cross vaults (true 3D intersection of two barrels).
- Corbel mode (unattractive to the user; omit unless requested).
- Wind/seismic.
- Full thermal/energy simulation (v1 may show **mass and thickness only**).
- DXF shop drawings, code combinations beyond the simple factors in §10.

---

## 6. Geometry, drawing, editing

### 6.1 Model

A planar map: **vertices, edges, faces**. Faces have a `RegionKind` (see §5.1). The masonry generator and the analyzer consume faces, not raw ink.

### 6.2 Draw tools (MUST)

- Polyline; snap to grid, vertices, midpoints, intersections, ground line.
- **Ortho mode** (0°/90°). Optional 45°.
- Typed length on the selected edge.
- **Arch edge:** two springings + rise, or span + included angle. Default shape family = **180° circular**.
- Constraints: horizontal, vertical, perpendicular, equal length.
- Undo/redo.

### 6.3 Boolean-style edit (MUST)

To add a rectangular volume onto existing masonry:

1. Draw three sides that close against an existing edge.
2. Shared edge becomes internal.
3. Command **Union faces** (remove shared edge).
4. Inverse: draw a closed loop, label **void** or **arch opening**.

Also: delete vertex, split edge, merge collinear edges. Dangling edges are illegal when leaving sketch mode.

### 6.4 Edit mode vs masonry mode (MUST)

- **Edit mode:** pure outline (optional faded ghost of last stones).
- **Masonry mode:** generated blocks; outline locked except add-volume / cut-opening.
- Adding a layer = union new faces, regenerate **new faces only** when possible; if topology of old faces changes, invalidate those stones (DEC-025).

### 6.5 Course snap (DEC-016)

- Default: snap face heights to integer courses of the active unit.
- Always show **leftover height** (how much was snapped, and remaining mm/in to the next course).
- Toggle: **allow cut/leveling course** (exact outline).

### 6.6 Units (DEC-019, DEC-043)

- **Default: US customary** — ft/in on the sheet, in for units, psf / lbf for loads.
- Metric toggle: m / mm / kN / kPa.
- Scale bar always visible.
- Catalog sizes convert for display; do not silently change the physical model when toggling.

### 6.7 Slice depth and slice Z (DEC-032)

- `sliceDepth`: how far the structure repeats into the page (default **3.281 ft** / **1 m**). Forces: **total** for that depth or **per foot / per metre**.
- `sliceZ`: where the cut sits inside one **bond period** along Z (user-visible, default = **bonding / header course** — the cut that shows tying units).
- Stone schedule counts from the **3D layout** over `sliceDepth`, not from extruding the 2D polygons.
- Optional second preset: slice through a **stretcher course** (may show more collar joints). Educational: compare weak vs tied cuts. Design default remains the header/bonding cut.

---

## 7. Materials and joints

### 7.1 Unit catalog (MUST)

House bricks are too small to be a single-stone vault ring; they are valid as **multi-ring** brickwork or as **facing** on a lime-bound core. Default for new files: **US modular brick** (DEC-043). UK metric remains in the catalog, not the default.

| ID | Name | Actual size | Notes |
|---|---|---|---|
| `us-modular-brick` | US modular brick **(default)** | 7⅝ × 3⅝ × 2¼ in (194 × 92 × 57 mm) | ASTM modular; 3/8 in mortar when lime |
| `us-roman-brick` | Roman brick (US) | typically 12 × 4 × 2 in nominal (~12 × 3⅝ × 1⅝ in actual) | Longer, thinner facing; common in US “Roman” work |
| `uk-metric-brick` | UK metric brick | 215 × 102.5 × 65 mm | Catalog only |
| `ashlar-12` | Small ashlar | 12 × 8 × 6 in (300 × 200 × 150 mm) | |
| `ashlar-24` | Medium ashlar | 24 × 12 × 8 in (600 × 300 × 200 mm) | |
| `custom` | Custom | user | |

**Half-bats and closures:** required at springings, jambs, and wherever 3D bond needs a closer. Toggle **whole units only** (may leave a visible gap).

**Mixed catalogs in one model: yes** (DEC-041) — e.g. brick skins, ashlar voussoirs, lime-bound rubble core.

### 7.2 Brick / block orientation in the ring (3D vault practice)

Ring thickness is an integer number of unit dimensions, laid as a **3D vault**, then sliced (§8).

| 3D orientation | Radial thickness per course | Typical vault use |
|---|---|---|
| **Rowlock / header ring** (default for small units) | Unit **length** (~215 mm) | Concentric rings of headers; next ring along Z is another arch. Adjacent Z-rings **stagger joints** by half a brick. |
| **On edge** | Unit **width** (~102 mm) | Thinner per course; more rings |
| **Bed / on flat** | Unit **height** (~65 mm) | Many rings; generally worse; allowed |
| **Stretcher along barrel** | Unit **width** or **height** in the slice | Length runs in Z; slice shows brick ends following the curve |
| **Ashlar voussoir** | Stone **radial depth** | **Preferred** when `t_min` is large: **one** ring of large stones, bonded along Z |

**Bonded multi-ring (block-in-course):** when `N > 1`, default is **headers tying concentric rings** (units that span two rings at intervals), not stacked unbonded rings. Unbonded rings can **delaminate**. v1 has **no hoop iron** (DEC-031).

**What is “best”?** Same as before: compute `t_min`, prefer one ashlar ring, else `N = ceil(t_min / d_orient)` **bonded** brick rings, odd `N_v`. Extra mass in fill/deck/walls, not a fat ring.

### 7.3 Densities (presets, user-overridable)

| Material | Typical density | Default |
|---|---|---|
| Sandstone | ~2200 kg/m³ | 2200 |
| Limestone | ~2400 kg/m³ | 2400 |
| Granite | ~2700 kg/m³ | 2700 |
| Fired brick | ~1800 kg/m³ | 1800 |
| Dry rubble (voidy) | ~1600–2000 kg/m³ | 1800 |
| Lime-bound rubble | ~2000–2200 kg/m³ | 2100 |

Rubble **MUST** be allowed a different density from cut stone (DEC-015).

### 7.4 Friction and cohesion

**Dry joints (DEC-004, DEC-042)**

- Packing joint thickness **2 mm** (~1/16 in) so generator geometry is not coincident.
- Coulomb: \(|V| \le \mu N\). No tension. No cohesion.
- μ presets (rough dry): low 0.45, medium 0.60, high 0.75 (limestone/granite-ish).

**Lime mortar (DEC-004, DEC-042, DEC-047)**

- Joint thickness default **10 mm** (3/8 in, US brickwork).
- Still **no tension** for thrust (mortar is not rebar). Middle-third still governs (DEC-005).
- Sliding: Mohr–Coulomb \(|V| \le cA + \mu N\).
- Default cohesion **c = 0.05 MPa** (~7 psi). User-overridable.
- **Independent of core binder** (DEC-047): lime joints do not imply a lime core.

Rubble **MUST** affect horizontal shear at its interfaces (weight + friction/cohesion). Dry rubble **MUST NOT** pin an arch that would otherwise go red (DEC-034).

### 7.5 Compressive strength (DEC-021, DEC-042)

Educational **allowables** (already ÷3 on typical published crushing). User-overridable.

| Material | Default allowable |
|---|---|
| Fired brick | 5 MPa (~725 psi) |
| Sandstone | 6 MPa (~870 psi) |
| Limestone | 8 MPa (~1160 psi) |
| Granite | 12 MPa (~1740 psi) |
| Lime-bound rubble (mass) | 2 MPa (~290 psi) |

Show **crushing** when peak compressive stress on the **member section** (linear Navier if in middle third; triangular/kern-edge if amber) exceeds the allowable.

Inspector: max stress, allowable, ratio, location.

---

## 8. Masonry generation (3D bond, then 2D slice)

This is the rule that makes the 2D contacts honest. A naive pack of rectangles in the drawing would align joints that **do not exist** in real brickwork, or miss headers that **do** stitch the wall. v1 therefore **lays 3D masonry first**, then cuts.

### 8.1 Pipeline (MUST, DEC-032)

Coordinates:

- **X** — in the drawing, horizontal (span and wall *thickness*).
- **Y** — in the drawing, vertical.
- **Z** — into the page (barrel length / wall length). User does not draw Z except `sliceDepth` and `sliceZ`.

Steps:

1. Read each labeled face in the 2D outline (wall, deck, ring, fill, …). Extrude that face along Z for `sliceDepth` as the 3D solid to fill (barrel prism).
2. Fill that solid with **3D units** using the active **bond pattern**, unit catalog, joint thickness, and leftover-height snap (DEC-016).
3. Intersect those 3D units with the cut plane at `sliceZ` (plane parallel to XY).
4. Each non-negligible intersection becomes one **2D rigid block** (polygon). Discard slivers below a small area threshold (default 10% of a bed face); do not emit overlapping 2D polygons (DEC-026).
5. 2D physics and joint checks use **only** those polygons. Thrust analysis stays in XY (DEC-001, DEC-022).

The user still only draws the outline in XY. Bond pattern and `sliceZ` are inspector controls, not a 3D editor.

### 8.2 Why this changes the 2D forces

| If we faked 2D-only packing | What 3D bond does in the slice |
|---|---|
| Stack of stretchers across a thick wall → continuous **collar joint** (wythes can split) | **Headers / through-stones** appear as long blocks in X and **break** that plane |
| Concentric arch rings with aligned radial joints → rings peel (delaminate) | **Block-in-course** ties and **Z-stagger** so the slice joints do not form a clean ring-split |
| Smooth circular cut between ring and wall | **Toothing / skewback bonding**: wall courses interlock the first voussoirs |
| Every course identical | Header courses and stretcher courses **look different**; default `sliceZ` is the tied (header) cut |

That joint graph is what friction and the drop-test actually feel. The thrust *line* is still a 2D resultant; the *blocks it runs through* are laid as in the building.

### 8.3 Wall, pier, buttress, deck bond

User-specified thickness (DEC-008), snapped to courses (DEC-016). Thick walls (1–2 m / ~6 ft) are **solid wythes by default**. A rubble core exists **only if the user draws one** (DEC-044, DEC-046).

**Bond presets (MUST):**

| ID | Pattern | 3D rule | What the default slice shows |
|---|---|---|---|
| `english` | English bond | Alternate stretcher / header courses. Strong through-bonding. | Header-course slice: longer rectangles through the facing. |
| `flemish` | Flemish bond | Stretcher–header in each course. | Mix of short and long units in the same course. |
| `common` | Common / American bond | Several stretcher courses (default 5) then one header course. Typical US brickwork. | Default `sliceZ` on the header course. |
| `ashlar-through` | Coursed ashlar | Horizontal beds; **through-stones** at a set grid. | Long ties as far as the stone reaches. |

**Default facing bond:** **Common / American** (`common`) when using US brick; **English** still available (better tying, more headers).

**Through-stones (MUST in thick masonry and at cores):**

- A single house brick cannot cross a 1–2 m wall. Use a **line of headers** with joints **staggered** from the course above/below, plus longer catalog stones as through-stones when available.
- Maximum spacing default: a bonding course every **1–2 courses** (English) or every **5–6** (Common); along Z, stagger by half-brick.
- Inspector warning if a stretcher-course slice shows a **continuous collar joint** through more than two wythes.

**Openings and junctions:** bats/closers at jambs; **toothing** where a buttress meets a wall; no stack of aligned perpends at the junction.

**Decks:** same bond as walls, beds horizontal. Edge of a vaulted deck MAY use a header/soldier course where it meets the ring.

### 8.4 User-drawn cores and skins (DEC-044, DEC-045, DEC-046)

**Do not auto-generate cores. Do not auto-generate skins.**

A wall is **solid** until the user draws a `rubble` (core) face inside it.

When drawing a core:

- The user **defines skin thickness** (inner and/or outer remainder). Typed or by placing the core pocket.
- Skin thickness **MUST snap to the nearest wythe** of the facing unit. Show leftover (same idea as course snap).
- Core binder: `dry` (default for a new core) or `lime-bound` (DEC-045). Independent of facing joint mode (DEC-047).

Headers / through-stones **MUST** project into or through a drawn core at bonding courses so the skins are not two independent leaves. This is **more** important for a dry core.

This is not a veneer hidden behind the drawing. Out-of-plane-only faces are not a v1 drawing mode.

### 8.5 Arch ring stereotomy (DEC-018) in 3D

For each span, build a **barrel** (extruded arch) then slice:

1. Intrados = current curve; extrados = offset by `t = N * d_orient`.
2. Odd `N_v` along the axis (DEC-017). Equal **arc length** divisions; joints **normal to the curve**.
3. **Along Z:** repeat rings (or stretcher vault) with **half-brick stagger** so radial joints do not form a continuous plane along the barrel.
4. **Through the ring thickness:** if `N > 1`, **bond rings together** (block-in-course / headers spanning two rings). Do not generate independent nested arches unless the user picks “unbonded rings” (discouraged; warn delamination).
5. **Skewback:** first voussoir sits on an angled abutment; adjacent wall bond **teeth into** the springing (not a circular saw-cut against a straight joint).
6. Default brick vault: **rowlock header rings**, bonded. Default ashlar: **single voussoir ring**.
7. Cut trapezoid voussoirs in the ring (gauged/axed). Uncut rectangles: not v1 unless cheap.

Default `sliceZ` for arches: through a **keystone ring** (odd voussoir centered in the cut).

### 8.6 Fill vs rubble (DEC-015, DEC-034, DEC-045)

| Region | Generation | Thrust |
|---|---|---|
| `fill` | Coursed 3D bond (like a wall/deck infill) | Compression OK, no tension |
| `rubble` (dry) | Irregular / optional discrete pack | **Surcharge + interface friction only** — not a funicular path |
| `rubble` (lime-bound) | Mass with cohesion | Compression as a mass, no tension |

- User draws these faces (including cores in §8.4). **No generator inset.**
- Analysis of dry rubble: continuum surcharge unless “fill with rubble blocks” is on for physics.
- Rubble **MUST NOT** overlap cut-stone units or voids.

#### 8.6.1 Dry core vs lime-bound core (how both ways work)

Romans did **not** always bind the core with lime. *Opus caementicium* (rubble + lime, often pozzolana) is the high-performance imperial method for walls and vaults. Dry or scant-mortar rubble is older, cheaper, and common in other long-lived work. Loose fill above an arch (spandrel) was often dry even in Roman bridges.

| | **Dry core (default)** | **Lime-bound core** |
|---|---|---|
| Cost | Stone + labor only | Plus kiln lime. Mix **1:3 lime:aggregate by volume** (DEC-050). Inspector **cost proxy**: lime volume × user lime-unit price. |
| Thrust / kern | Stays in **cut-stone skins and ring**. Core is weight. **Must not** color a 6 ft kern on a dry core. | Core can carry **compression** as a mass (still no tension). Kern may use **full wall thickness** including the core. |
| Sliding / leaves | Skins can split without through-stones. Friction only. | Cohesion + weight; still require through-stones (conservative). |
| Settlement in physics | Granular pack can slump; drop-test may be harsher. | More monolithic; still no tensile glue. |
| When to use | Cheaper thermal mass; conservative design check. | Roman analog; better if you want the core to share compression. |

**MUST:** changing only the core binder re-runs analysis (and optional physics) without redrawing the outline. Inspector shows before/after: H, max eccentricity, crushing, spread risk, lime volume, cost proxy. That is the “both ways” comparison.

### 8.7 Invalidation (DEC-025, DEC-026)

- Outline, bond pattern, unit, joint mode, or `sliceZ` change → regenerate affected solids and slice.
- Overlap in 2D after slice ⇒ fail visibly, do not emit intersections.

### 8.8 Bond period diagram (English wall, for implementers)

Header-course slice (default) — X is wall thickness:

```
Y ↑  stretcher course (not default slice):  [w][w][w][w][w][w]   ← brick width each
     header course (default slice):         [====][====][====]   ← brick length each
     stretcher:                             [w][w][w][w][w][w]
     header:                                [====][====][====]
```

Perpends in successive header courses are offset by a closer so vertical joints do not stack through the height. That stagger **must** appear in the 2D polygons.

---

## 9. Analysis overlay (authoritative design check)

### 9.1 Always-on while paused

For the **active load case** and as a summary of the **envelope**:

- Thrust line(s) full length of each arch, continuing **down through pier/wall/buttress into the foundation** (not only the curved ring).
- The line is a 2D resultant through the **member envelope** (DEC-033, DEC-051). Color is evaluated on **load-bearing joints**: radial beds of the ring, horizontal beds of walls/piers/buttresses on that path, footing base. **Not** every perpend.
- **Kern thickness (DEC-033):**
  - **No core drawn:** middle third of the **full** wall / ring / buttress / footing thickness.
  - **Dry core drawn:** middle third of the **cut-stone skins** (and of the ring). The core width does **not** count. Dry cores cannot fake safety.
  - **Lime-bound core drawn:** middle third of the **full wall** including the core (compression mass, no tension).
- Method: funicular from voussoir weights + tributary deck/fill/live; pick H so the line best stays in that kern (DEC-051).
- Green / amber / red (DEC-006) on the line and on joints.
- Sliding ticks where \(|V|\) exceeds capacity.
- Crushing marks (DEC-021).
- Spread-risk indicator (§12).
- Numeric H at each springing and at the ground.

### 9.2 One line per arch, different colors (MUST)

- Each arch member gets a **stable color**.
- Legend: “Arch A, Arch B, …”
- Stacked or adjacent arches keep **separate** lines. They do not merge into one polyline just because they touch.

### 9.3 Initial vs optimized curve (MUST)

Two geometric overlays, independent of thrust color:

- **Initial arch** (default: circular / user-drawn) — dashed, muted.
- **Optimized funicular / ring axis** — solid, strong.

Inspector: max deviation (mm and % of span), change in rise, change in `t`, change in H. This is how large the difference is.

### 9.4 Horizontal thrust slider (SHOULD)

Because the problem is statically indeterminate, a slider for trial H (per arch or global) is educational. **Design status uses the envelope and the optimized state**, not a random slider position, unless the user has locked a trial.

### 9.5 Conservatism stack (DEC-007)

Default **factored**, ASCE 7 / IBC-style (DEC-043):

- Dead + live: **1.2D + 1.6L**
- Dead-only case: **1.4D**

Toggle **unfactored** (D+L) for teaching. Default remains factored.

Design pass for a load case: **all joints green**, no slide, no crushing, foundation green, spread-risk off.

Amber anywhere ⇒ **not a pass** (DEC-005), but the model may still stand in physics (DEC-030).

---

## 10. Loads

### 10.1 Automatic dead load

Density × area × `sliceDepth`. Includes walls, ring, deck, fill, rubble, buttresses.

### 10.2 User-drawn load regions

Hatches on deck/fill: occupancy, snow/roof, custom kN/m² (psf).

### 10.3 Live load presets (educational, not a code)

| Preset | US (default) | SI |
|---|---|---|
| Dwelling occupancy | 40 psf | 2.0 kN/m² |
| Crowd / assembly | 80 psf | 4.0 kN/m² |
| Light roof/snow (optional hatch) | 20 psf | 1.0 kN/m² |
| Cart / light vehicle **point** | ~2250 lbf on ~12 in patch | 10 kN on a 300 mm patch |

**Important teaching fact:** a 1.5 m limestone deck is already on the order of **36 kN/m²** of dead load — often much larger than people. Live load still matters for **asymmetric** cases and **point** loads (local thrust bump + crushing).

### 10.4 Point / patch loads (MUST)

- No mathematical points (infinite stress). Minimum patch width **300 mm** (12 in) unless the user sets a tire/contact width.
- Placeable on the deck.
- **Max point load** readout at a selected deck location: the largest patch load that keeps the **envelope** all-green (and the load at first amber, and at first red). This is the “what can show up later on top” number (DEC-020).

### 10.5 Load envelope (MUST)

At least:

1. Dead only (factored).
2. Dead + uniform live on all decks.
3. Dead + **asymmetric** live (one span or one side — cart).
4. MAY: one adjacent span unloaded (construction / multi-span unbalance).

Ring thickness and buttress optimization use the **worst** case.

---

## 11. Intersecting arches (what the thrust lines do)

v1 is 2D, so “intersection” means **in this slice**, not a groin vault.

### 11.1 Adjacent arches sharing a pier (MUST)

- Each arch has its own full-length thrust line (different colors).
- At the pier, show **vector addition**: \( \vec{R} = \vec{T}_\text{left} + \vec{T}_\text{right} + \vec{W}_\text{pier} \).
- If spans and loads match, **H cancels**; the resultant in the pier is nearly vertical. Interior piers can then be thinner than end buttresses — but only if this remains true in the **asymmetric** load case.
- If not, **residual H** must stay in the **middle third of the pier** all the way to the foundation.

This is the “multi-span piers” decision: **v1 supports multiple spans.** Interior piers are ordinary masonry. The tool MUST warn when cancellation fails (live load on one bay, unequal spans, missing neighbor).

### 11.2 Stacked arches (arch on arch / storey on storey) (MUST)

- Upper supports become **loads on the lower extrados** (patch or pier footprints).
- Compute the **lower** funicular **including** those loads; compute the **upper** funicular from its own loads.
- Draw **both** full-length lines. They interact through forces, not by becoming one curve.
- Optimizing the lower curve will usually change more than the upper when decks are thick.

### 11.3 Relieving arch over an opening in a thick wall (SHOULD in v1)

Two labeled arch regions, one above the other in the same wall. Two lines. The masonry between them is fill/wall, not a third arch, unless labeled.

### 11.4 Overlapping ring geometry (true crossing in-plane)

If two `arch ring` faces overlap:

- MUST detect and **block generation** until the user resolves labels (which ring is continuous, which frames in).
- Do not auto-boolean voussoirs in v1.
- 3D crossing vaults = Later.

### 11.5 One resultant in shared masonry

At any joint there is **one** force resultant. Multiple thrust lines are a **load-path diagram** for identified members. In shared regions, draw member lines **and** the resultant (thicker, neutral color) used for the green/amber/red test of that joint.

---

## 12. Spread, terminating geometry, foundations

### 12.1 Abutment spread (MUST indicate)

Spread = H pushing supports apart.

**Spread risk ON** when any of:

- Resultant leaves the middle third of the **terminating** wall/buttress before the footing; or
- Footing sliding: \( H > \mu_\text{soil} N \) (no passive earth — conservative); or
- Footing resultant outside the middle third of the base (overturning); or
- Bearing pressure > allowable.

Show a labeled warning and the thrust line through the support in red/amber as appropriate.

### 12.2 User intent: steep arrival at the ground

The user wants terminating springing/thrust **near perpendicular to the ground** where the structure meets the ground.

- Inspector: **angle of resultant at the ground** from vertical.
- **Warn** if more than **15°** from vertical (amber) or **25°** (red) at a terminator. These thresholds are educational defaults; user-overridable.
- Optimizer (min H + move buttress) SHOULD try to steepen this, without thinning user walls/decks.

The user will not know if this is achievable until they use it — the indicator is the feature.

### 12.3 Foundations without rebar (DEC-037, DEC-038)

**Auto-generate** a stepped masonry spread footing under every wall, pier, and buttress that does not already have a foundation face.

- Size so the checks below pass (bearing, middle third of the base, sliding with soil μ only).
- Step projection default: **60°** from horizontal (conservative vs 45°).
- Ground line = soil surface; default **foundation depth = 4 ft** (DEC-049), user-editable.
- **Frost (DEC-049):** project `frostLineDepth` from a US educational preset or a typed value. Inspector **MUST** display: required frost line, actual footing depth, OK / too shallow. No frost-heave physics.
- **Auto footings update** when H or loads change (DEC-037). If the user **edits** a footing, mark `userEdited` — do not overwrite; it may go red. **Regenerate footings** rebuilds non-edited ones, or all if the user confirms.
- Heavy masonry historically used geometry and mass, not steel. No piles, no rebar, no grade beams.
- **Rubble trench / lime-concrete mass** remains an optional region the user can substitute for a generated step-footing.
- **Inverted arches** between piers: **MAY**; MUST still check end-span H (they push outward; we have **no** iron ties).

**Checks (MUST)** on generated or edited footings:

1. Average bearing ≤ soil allowable;
2. Resultant in **middle third of the base**;
3. Sliding OK with soil μ only (no passive earth);
4. Footing depth vs displayed frost line (warn if shallow);
5. Warn if a support still has no foundation (should not happen after generate).

**Soil presets (allowable bearing, educational). Default = stiff clay / firm sand (DEC-048):**

| Soil | Default allowable | Default μ_soil |
|---|---|---|
| Soft clay | 75 kPa | 0.30 |
| Stiff clay / firm sand **(default)** | 150 kPa (~3100 psf) | 0.40 |
| Dense sand / gravel | 250 kPa | 0.50 |
| Bedrock / very dense | 500 kPa | 0.60 |

No piles, no reinforced concrete, no grade beams with rebar.

**Frost-line presets (educational, not a code map). User may type any value:**

| Preset | Frost line |
|---|---|
| Mild (e.g. Deep South) | 12 in |
| Moderate | 30 in |
| Default / many US interiors | **36 in** |
| Cold (e.g. Upper Midwest) | 42 in |
| Colder | 60 in |

---

## 13. Optimization

### 13.1 Locked vs free (DEC-008–012)

| Quantity | Role |
|---|---|
| Wall thickness | **User lock** (1–2 m typical) |
| Deck thickness | **User lock** (1–2 m typical) |
| Fill / rubble layout | **User lock** (do not minimize) |
| Span, ground, openings, **void** | **User lock** |
| **Foundations** | **Auto-generated**, then user-editable (DEC-037) |
| Arch **curve** | **Optimizer**, inside §13.5 rise cap |
| Ring thickness `t` | **Minimize** (then snap up to integer rings / unit orientation) |
| Buttress **width at ground** | **Optimizer**; outer face = user mode (DEC-036) |

### 13.2 Objectives (in order)

1. **Feasibility:** all envelope cases **green** (middle third), no slide, no crush, foundations OK.
2. **Minimize `t`** of each arch ring (honest shape). Snap up to constructible `N * d_orient`.
3. **Minimize H** at terminating supports (steeper funicular *within the rise cap*, then smallest ground-width that still keeps the descending line green).
4. **Buttress excess flag:** if user buttress ground-width > **120%** of the minimum green width, show **“buttress thicker than needed.”** Do **not** auto-thin a locked thermal-mass **wall**.

Do **not** shrink fill to win the objective.

### 13.3 Why min `t` and min H together

- Min `t` shows the real funicular: thick rings lie about the shape.
- Min H shows how much **side mass** the arch really needs.
- User-thick walls/decks are **occupancy/thermal** choices, not structural cheating.

### 13.4 Output

- Live **preview** of optimized axis vs initial (§9.3), `t`, H, and suggested buttress. **Apply** commits outline changes (DEC-052). Outer face keeps the chosen mode (vertical / taper / tiered).
- `t_min`, `N`, orientation, `N_v`.
- H before/after; \(r_0\) vs \(r_\text{opt}\); active rise-cap mode.
- Max point load at midspan (and at user pick).

### 13.5 Void lock and max rise (DEC-035)

**Sagitta** \(r_0\): distance from the springing **chord** to the crown of the **initial** arch.

**Always (all modes):**

- Do **not** shrink the usable void (room, door, clearance under the soffit).
- Do **not** pierce the user-drawn deck (or a user max-Y if set).
- Span and springing X stay put.

**Rise-cap modes (user picks one; inspector):**

| ID | Rule | When it is useful |
|---|---|---|
| `percent-sagitta` | \( r_\text{opt} \le r_0 \times (1 + p) \). Default **\(p = 25\%\)** if this mode is chosen. | Extra height scales with the arch already drawn. |
| `percent-span` | \( r_\text{opt} \le p \times \text{span} \). Preset \(p = 50\%\) = semicircle. | Cap by proportion, independent of how flat the start was. |
| `sagitta-plus-span` | \( r_\text{opt} \le r_0 + p \times \text{span} \). Default \(p = 5\%\). | Helps a **flat** start: 25% of a tiny \(r_0\) is almost no room; adding a slice of span is. |
| `semicircle` **(default)** | \( r_\text{opt} \le \text{span}/2 \) | Roman proportion: no taller than a 180° arch on that chord. |
| `deck-only` | Only the void + deck box | No extra percent; as tall as the storey you drew. |
| `shape-only` | \( r_\text{opt} \le r_0 \) (\(p = 0\)) | Change **shape** (circle vs funicular), not height. Honest overlay, least room for min-H. |

Default locked for v1: **`semicircle`**, still clipped by void + deck. If the initial arch is already 180°, the optimizer may **flatten or change shape** but not grow taller than that semicircle. If the deck is lower than the semicircle, the deck wins. User can switch mode without a spec change.

**Note:** min-H usually wants **more rise**. The semicircle cap is the Roman ceiling. A very flat start can still steepen up to span/2 (unless the deck is in the way).

### 13.6 Buttress shape (DEC-036)

**MUST NOT** generate flying buttresses (no open-air arch-struts).

Free variable for the optimizer: **width at the ground** (and the stepped/tapered outer face needed to reach that width).

User picks **outer-face mode** (kept during optimize):

| Mode | Geometry |
|---|---|
| `vertical` | Outer face plumb. Extra width is a rectangular thickening. |
| `taper` | Single batter. User sets max slope (default not steeper than **1:3** horizontal:vertical, i.e. ~18° from vertical). Optimizer picks ground width and the matching slope ≤ max. |
| `tiered` | Giant steps. Step **height** = integer courses (default 4). Step **depth** = one wythe of the facing unit (or one ashlar). Optimizer adds steps until ground width is enough. |

Suggested outline is applied only if the user hits **Apply** (DEC-052).

---

## 14. Physics drop-test (centering)

### 14.1 What “pause gravity” means (DEC-014)

Paused: blocks **kinematic**; centering is present (visible falsework under the **intrados only** — DEC-039). It MUST NOT connect to abutments in a way that prevents spread.

Unpaused / “remove centering”: rigid-body **2D** simulation on the **slice polygons** from §8, contacts, Coulomb (and lime cohesion on shear only), **no tension**. Those polygons already contain headers/through-stones as they occur in the cut, so wythe split and ring delamination can appear in 2D if the bond is weak.

Abutments are blocks and **can move** (DEC-013). The ground line is a **fixed** frictional plane at soil surface (DEC-038). Foundations below it rest on that plane (or on soil contact along their base).

### 14.2 Why a pass/fail metric exists

“It looks like it stood up” is not enough (slow lean, one fallen stone, hinge-but-stable). The metric is a **numeric definition** of standing.

### 14.3 Drop-test metric (locked)

After simulation time `T` (default 8 s) or when kinetic energy stays below `E_quiet` for 1 s:

| Result | Criteria |
|---|---|
| **Collapse (FAIL)** | Any block CM drops below ground − 0.5 m, or max CM displacement > **2% of span**, or a block rotates past 30°, or energy does not settle |
| **Stands (physics PASS)** | Settled, max CM displacement ≤ **0.5% of span**, no block fallen |
| **Physics WARN** | Settled, displacement between 0.5% and 2% of span |

Combined with overlay (DEC-030):

| Overlay | Physics | UI verdict |
|---|---|---|
| All green | PASS | **Conservative pass** |
| Amber present, no red | PASS | **Stands, not conservative** (Heyman-ish) |
| Red | PASS | **Stands in the toy, fails design** |
| Any | FAIL | **Collapse** |

The student should design for **row 1**. Physics is the centering-removal demo and a sanity check.

Rubble-block mode uses the same metric.

---

## 15. Thermal mass (v1 = information only)

No climate engine.

Inspector / schedule SHOULD show, per material region: thickness, area, mass, mass per m² of envelope. User’s 1–2 m walls and decks are the mass. The optimizer must not steal that mass (DEC-008, DEC-009).

---

## 16. UI (desktop)

### 16.1 MUST show

- Ground line.
- Sheet with dimensions and scale bar.
- Mode: Edit outline | Masonry | Analyze | Physics.
- Joint mode: Dry | Lime.
- Units: **US customary (default)** | Metric.
- Bond pattern and `sliceZ`; facing vs skins+core.
- Arch shape: Circular (default) | Optimized.
- Rise-cap mode (default semicircle).
- Core binder: dry | lime-bound (A/B compare) — only when a core is **drawn**.
- Frost line vs footing depth.
- Buttress outer face: vertical | taper | tiered.
- Color legend (DEC-006).
- Thrust on/off, per-arch colors, initial vs optimized curves.
- Centering visible when paused.
- Leftover height.
- Spread risk, crushing, buttress-excess, steepness-at-ground.
- Disclaimer (DEC-024).

### 16.2 Inspector panel (DEC-028)

Selected object + global:

- Units, `g`, `sliceDepth`, `sliceZ`, bond pattern, joint mode, μ, c, densities, strengths.
- Span, rise \(r_0\), \(r_\text{opt}\), rise-cap mode, `t`, `N`, orientation, `N_v`.
- Core binder (if a core is drawn), skin thickness (wythe-snapped), lime volume, cost proxy.
- Buttress mode + ground width.
- H, angle at ground, bearing pressure, max stress.
- Foundation depth vs **frost line** (OK / too shallow).
- Leftover height.
- Max point load.
- Load case in view vs envelope status.
- Warnings list.

### 16.3 Stone schedule (MUST)

A table, exportable CSV:

- Count by **3D role** over `sliceDepth`: stretchers, headers, through-stones, closers/bats, voussoirs (inner/outer length, radial depth, taper), rubble volume.
- How many of those **appear in the current slice** (cut count vs 3D count).
- Rubble **volume**.
- Cut-stone **volume** vs rubble volume.
- Total mass; **heaviest piece** (lifting).
- Course count; leftover height per face.

### 16.4 Persistence

- Save/load JSON of outline, labels, units, materials, loads, last generation seed.
- Undo.

---

## 17. Presets (v1)

Parametric, with honesty notes:

1. Empty semicircular ring, thick walls, no fill.
2. Same + user-thick deck + fill (circular vs optimized overlay).
3. Thick-walled room, vaulted deck 1–2 m, rubble fill.
4. Two-span wall/arcade (show H cancellation + cart on one span).
5. Two-tier stacked arches (upper piers as loads).
6. Same as 5 with lime vs dry.

Historical shapes may be added later with captions (many famous “stone” works used mortar or iron). Do not imply they were dry if they were not.

---

## 18. Data model (for implementers)

Field **names are frozen** in [project.schema.json](project.schema.json) (ADR-003). JSON stores **SI**; `units` is display only. This section is the human summary — if it disagrees with the schema, the schema wins and this section must be edited.

```
Project
  requirementsVersion          // MUST be "1.4"
  units                        // us-customary | metric (display)
  sliceDepth, sliceZ, sliceZMode, bondPattern, wallConstruction, jointMode
  loadFactorsOn, soilPreset, frostLineDepth, riseCapMode, riseCapPercent
  buttressFaceMode, coreBinderDefault, foundationDepthDefault
  vertices[], edges[], faces[]
  loadCases[]
  materials[]
  unitCatalogId, orientations  // face.unitCatalogId MAY override (DEC-041)

Edge
  kind: line | arch
  archFamily: circular | funicular
  constraints[]

Face
  regionKind
  materialId
  loop[]               // edge ids, CCW
  unitCatalogId?       // DEC-041 override
  lockedThickness?     // walls, decks
  ringThickness?       // archRing radial t (m)
  leftoverHeight
  coreBinder?          // dry | lime-bound; only if user drew a core
  skinThicknessWythes? // snapped; user-defined when core is drawn
  units3D[]            // 3D placements (pose + role: stretcher|header|through|voussoir|closer)
  stones2D[]           // slice polygons; invalidated with outline/bond/sliceZ

ArchMember
  id, color
  initialCurve, optimizedCurve
  t, N, orientation, Nv
  vaultBond: rowlock-rings | stretcher-barrel | ashlar-ring
  r0, rOpt
  thrustPolylineByLoadCase[]

JointResult
  N, V, eccentricity, color, crushing, sliding
  // eccentricity vs FULL member thickness, not brick size

Foundation
  autoGenerated, userEdited, steps[], bearing, resultantOffset, spreadRisk

Warning
  code, severity, message, targetId   // codes: docs/warning-codes.md
```

JSON save MUST include `requirementsVersion: "1.4"` matching this file’s decision-log version. Validate against [project.schema.json](project.schema.json).

---

## 19. Performance and environment

- Target: one slice with on the order of **500–1000** bodies; overlay interactive while dragging.
- Modern desktop browsers; no plugin CAD.
- Physics: **Planck.js** (ADR-004). MUST support friction, no-tension contacts; lime cohesion is authoritative on the overlay. Game-engine substitutes need a new ADR.

---

## 20. Non-goals (explicit)

- Not a video game with scoring.
- Not a mortar-strength lab.
- Not an energy-code thermal model.
- Not a river-bridge / falsework / crane planner (beyond centering as pause).
- Not “any curve works if the ring is fat enough” as a success state.

---

## 21. Remaining gaps (small; defaults given)

Use the default unless this file is edited.

| Gap | Default for v1 | Why it can wait |
|---|---|---|
| Exact city frost map | Presets + typed frost line (DEC-049) | Not a legal frost atlas |
| Snow by climate | Optional 20 psf hatch | User can add |
| Precise lime `c` tests | 0.05 MPa | Inspector knob |
| Lime unit price | Inspector number; mix 1:3 (DEC-050) | Educational proxy |
| Taper max batter | 1:3 | Inspector |
| Tier step height | 4 courses | Inspector |
| Shareable URL | Later; JSON file is enough | |
| Accessibility beyond visible colors | MUST not rely on color alone: also labels/patterns on joints | Implement with colors |

Rise-cap **mode** is user-selectable; only the **default** (`semicircle`) is locked. Switching modes is not a spec change.

If a future session needs a new capability (wind, 3D **forces**, corbels, flying buttresses), add a `DEC-*` row and a log entry **before** coding it. Do not add a 3D viewport in v1; do not revert generation to 2D-only packing.

---

## 22. Decision log

| Date | Change |
|---|---|
| 2026-08-16 | Initial requirements from product discussion. Locked 2D desktop visualizer for dwellings/thermal-mass masonry; dry + lime; Navier middle-third (green/amber/red); min ring `t` + min H; user-locked 1–2 m walls/decks; do not min fill; abutments as blocks; centering = pause; rubble regions; snap + leftover height; odd keystone; voussoirs; imperial toggle; live + point loads; crushing; no water; no rebar; 3D force analysis out of scope; foundations as unreinforced spread/stepped masonry; multi-span residual H; full-length colored thrust lines; initial vs optimized curves; drop-test metric defined; student user. |
| 2026-08-16 | **DEC-032:** populate with **3D masonry bond**, then cut the 2D slice. 2D **forces** only; 3D **layout** in v1. |
| 2026-08-16 | **DEC-033–044:** member-level middle-third; thrust-carrying materials; void lock + rise-cap modes; no flying buttresses, ground-width free, vertical/taper/tiered faces; foundations; fixed frictional ground; centering = intrados only; no custom stone edits; mixed catalogs; dry 2 mm / lime 10 mm joints + allowable stresses; **US locale** (customary units, US modular brick, ASCE 1.2D+1.6L) with Roman thick-wall skins+core. |
| 2026-08-16 | **DEC-033 rewritten; DEC-044–052:** Full-wall kern **unless a core is drawn**. Dry core cannot fake a wide kern (DEC-034). **No auto cores/skins**; user draws core and defines skin thickness, snap to wythe. Joint mode ⊥ core binder. Auto footings **update** with H/loads unless user-edited. Frost **line vs depth displayed**. Default soil stiff clay/firm sand; footing depth 4 ft. Thrust = funicular + tributary loads. Optimize **Apply**. Lime mix 1:3. |
| 2026-08-16 | Handoff files: [README.md](README.md) (human), [AGENTS.md](AGENTS.md) (next session). Spec still **1.4**; no application code. |
| 2026-08-16 | **Agent contract (Phase A):** §23 is vertical slices S00–S13 ([docs/slices/](docs/slices/README.md)). §18 field names frozen in [project.schema.json](project.schema.json); “names may vary” removed. Implementation ADRs 001–005. Compaction via [STATUS.md](STATUS.md). Product DECs unchanged. |

---

## 23. Implementation order (when build is requested)

Do not start until the user asks. Then **one vertical slice at a time**. Cards, Given/When/Then, and test commands: [docs/slices/README.md](docs/slices/README.md). Fixtures: [docs/fixtures/](docs/fixtures/README.md).

| Slice | Path | Done when (short) |
|---|---|---|
| S00 | Project shell | JSON 1.4 roundtrip, ground line, US display |
| S01 | One wall outline | Leftover **1.125 in** on 72×24 in wall |
| S02 | Bond then slice | 147 polygons, Common bond, no overlap |
| S03 | Circular arch | Nv=7, t=8 in, joints normal to curve |
| S04 | Dead-load thrust | Three-hinged H **18631.581 N ± 2%**; correct kern |
| S05 | Joints + crushing | Dry Coulomb; lime Mohr–Coulomb; crushing marks |
| S06 | Load envelope | 1.2D+1.6L, asymmetric, max point load |
| S07 | Optimize Apply | Preview then Apply; void lock; semicircle cap |
| S08 | Buttress + min H | Ground width; no flyers; excess flag; ground angle |
| S09 | Multi-span / stacked | Separate colored lines; residual H |
| S10 | Auto footings | Update unless `userEdited`; frost display |
| S11 | Drop-test | §14.3 PASS/WARN/FAIL; centering intrados only |
| S12 | User-drawn cores | Dry kern = skins; no auto cores |
| S13 | Schedule + presets | 3D counts; six presets; disclaimer |

Do not start S(n+1) until S(n) tests are green and [STATUS.md](STATUS.md) is updated. If context is near 100k tokens, compact first ([docs/compaction.md](docs/compaction.md)).
