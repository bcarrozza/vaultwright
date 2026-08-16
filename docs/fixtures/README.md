# Golden fixtures

Spec inputs for slice tests. **SI in `project.json`** (ADR-003). Numbers locked in [worked-examples.md](../examples/worked-examples.md).

S00–S04 exist now. S05–S13 add a folder when that slice starts — do not invent results in chat.

| Folder | Slice | What it proves |
|---|---|---|
| [s00-empty](s00-empty/) | S00 | Schema + `requirementsVersion` 1.4 roundtrip |
| [s01-one-wall](s01-one-wall/) | S01 | Course leftover 1.125 in on a 72×24 in wall |
| [s02-bond-slice](s02-bond-slice/) | S02 | 147 polygons, 6 wythes / 3 headers, Common bond |
| [s03-circular-arch](s03-circular-arch/) | S03 | Nv=7, t=8 in, semicircle 10 ft |
| [s04-dead-load-thrust](s04-dead-load-thrust/) | S04 | Three-hinged H 18631.581 N ± 2% |

`expected.json` is the oracle. If implementation differs, fix the code or edit REQUIREMENTS + this fixture + worked examples together.
