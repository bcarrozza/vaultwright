# Arch Optimizer

A **desktop web** visualizer for designing **unreinforced compression masonry**: thick-walled dwellings, barrel vaults, and arcade/bridge-like sections. You draw a 2D slice, it fills with realistic brick/block bond, shows whether a thrust line stays in the middle third, and can drop gravity after you remove the centering.

This is **not** a building-code stamp, a 3D CAD model, or a river-bridge tool. It is a student (and later designer) tool inspired by **Roman and other long-lived masonry**, for use in **America**.

## Status

**Agent contract complete. No application code yet.** Spec version **1.4** (`DEC-001`–`DEC-052`). When you ask to build, the agent starts at **S00** only.

| File | Who it is for |
|---|---|
| [README.md](README.md) | You (human overview) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Product source of truth. Change `DEC-*` here. |
| [AGENTS.md](AGENTS.md) | Next Cursor session — read order, compaction, locks |
| [STATUS.md](STATUS.md) | Current slice and last tests (compactable handoff) |
| [docs/slices/](docs/slices/README.md) | S00–S13: Given / When / Then + test command |
| [docs/adr/](docs/adr/README.md) | Stack, folders, schema, physics, analysis order |
| [project.schema.json](project.schema.json) | Frozen JSON field names (SI storage) |

## What you do with it (when built)

1. Draw a dimensioned **section** (walls, openings, deck, optional cores, buttresses).
2. The tool **lays 3D brick bond**, then shows the **cut** through that bond. Forces stay 2D.
3. A **thrust line** is colored green / amber / red (middle third is the goal).
4. **Optimize** previews a thinner honest arch (and less sideways thrust) without eating the room. **Apply** commits it.
5. **Foundations** generate under walls; frost line vs depth is shown.
6. Pause gravity = **centering**. Turning gravity on is the drop test.

Typical walls and decks you had in mind: about **1–2 m** (around 6 ft) for thermal mass. The **arch ring** is kept as thin as the conservative check allows. Fill is not minimized.

## Design rules in plain language

- **Green** = thrust in the middle third (Navier). **Amber** = inside the stone but not conservative. **Red** = leaves the masonry, slides, or crushes.
- **No core drawn:** the whole wall thickness is the section that gets colored.
- **Dry core drawn:** only the **skins** count. Dry rubble cannot fake a wide, safe wall.
- **Lime-bound core drawn:** the core may take compression as a mass (still no tension). You draw cores yourself; nothing auto-inserts them. Skin thickness snaps to the nearest wythe.
- Facing mortar (dry vs lime joints) is **independent** of whether the core is dry or lime-bound.
- Default max rise for an optimized arch: no taller than a **semicircle** on the same span (and never through the deck).
- No flying buttresses. Buttress extra width is at the **ground**; the outer face can be vertical, tapered, or giant steps.
- **US units** and US modular brick by default. Metric is a toggle. No rebar.

## Changing a decision

**Product** — edit [REQUIREMENTS.md](REQUIREMENTS.md): update the `DEC-*` row, fix citing sections, append the **Decision log**.

**Stack / schema / physics** — edit the ADR in [docs/adr/](docs/adr/README.md) and its log.

Do not leave the new rule only in chat.

## Building

When you want code, say **build**. The agent starts at [S00](docs/slices/S00.md). On a green slice it compacts and continues; on a failed slice it stops. Do not skip the spec.

This tool does **not** replace a licensed engineer. v1 does not check wind, earthquakes, or out-of-plane slenderness.
