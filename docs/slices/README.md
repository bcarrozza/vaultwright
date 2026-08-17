# Slice cards

Vertical slices for v1. Product rules stay in REQUIREMENTS.md. Each card is one short loop with a test.

**Do not start until Brian asks to build.** Then S00, then each later slice in order.

- Slice test **fails:** update `STATUS.md`, stop. Do not start S(n+1).
- Slice test **passes:** update `STATUS.md`, compact ([compaction.md](../compaction.md)), continue S(n+1). Do not wait for a new Build prompt.
- **S13** green: v1 slices complete; stop.

| Slice | Card | Fixture |
|---|---|---|
| S00 | [Project shell](S00.md) | [s00-empty](../fixtures/s00-empty/) |
| S01 | [One wall outline](S01.md) | [s01-one-wall](../fixtures/s01-one-wall/) |
| S02 | [Bond then slice](S02.md) | [s02-bond-slice](../fixtures/s02-bond-slice/) |
| S03 | [Circular arch](S03.md) | [s03-circular-arch](../fixtures/s03-circular-arch/) |
| S04 | [Dead-load thrust](S04.md) | [s04-dead-load-thrust](../fixtures/s04-dead-load-thrust/) |
| S05 | [Joints and crushing](S05.md) | (add with slice) |
| S06 | [Load envelope](S06.md) | (add with slice) |
| S07 | [Optimize Apply](S07.md) | (add with slice) |
| S08 | [Buttress and min H](S08.md) | (add with slice) |
| S09 | [Multi-span / stacked](S09.md) | (add with slice) |
| S10 | [Auto footings](S10.md) | (add with slice) |
| S11 | [Drop-test](S11.md) | (add with slice) |
| S12 | [User-drawn cores](S12.md) | (add with slice) |
| S13 | [Schedule and presets](S13.md) | (add with slice) |

Worked numbers: [examples/worked-examples.md](../examples/worked-examples.md). Compaction: [compaction.md](../compaction.md).
