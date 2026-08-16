# Compaction protocol

Trigger: context near **100,000 tokens**, Cursor compaction warning, or end of session.

## Before compact (MUST)

1. Update [STATUS.md](../STATUS.md): slice ID, last test command + pass/fail, files touched, parked questions, next commands.
2. If a product rule changed, it is already in `REQUIREMENTS.md` (DEC row + log). If an implementation rule changed, it is already in `docs/adr/`.
3. Stop. Do not start the next slice in this window.

## After compact (MUST)

Read, in order:

1. [AGENTS.md](../AGENTS.md)
2. [STATUS.md](../STATUS.md)
3. The current slice card named in STATUS
4. Only the REQUIREMENTS sections and ADRs **cited** by that slice

Do **not** paste or re-read all of `REQUIREMENTS.md`. Do **not** reopen a green slice. Do **not** re-derive a `DEC-*` or `ADR-*`.

## What counts as memory

| Durable | Ephemeral (safe to drop) |
|---|---|
| DEC table, ADRs, slice cards, fixtures, tests, STATUS.md | Chat exploration, failed attempts, full spec dump |

Tests + STATUS are the handoff. If the slice test is green, the slice is done.
