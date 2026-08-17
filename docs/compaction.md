# Compaction protocol

Trigger: context near **100,000 tokens**, Cursor compaction warning, end of a **green** slice (then continue), or end of session.

## Before compact (MUST)

1. Update [STATUS.md](../STATUS.md): slice ID, last test command + pass/fail, files touched, parked questions, next commands.
2. If a product rule changed, it is already in `REQUIREMENTS.md` (DEC row + log). If an implementation rule changed, it is already in `docs/adr/`.

## After a green slice

Compact, then **continue S(n+1)** with the read order below. Do not reopen the green slice. Do not wait for a new Build prompt. If the test **failed**, stop here — do not continue.

## After compact (MUST)

Read, in order:

1. [AGENTS.md](../AGENTS.md)
2. [STATUS.md](../STATUS.md)
3. The current slice card named in STATUS
4. Only the REQUIREMENTS sections and ADRs **cited** by that slice

Do **not** paste or re-read all of `REQUIREMENTS.md`. Do **not** reopen a green slice. Do **not** re-derive a `DEC-*` or `ADR-*`.

## Mid-slice at ~100k

Update STATUS, compact, resume the **same** slice. Do not start S(n+1) unless that slice’s test is already green.

## What counts as memory

| Durable | Ephemeral (safe to drop) |
|---|---|
| DEC table, ADRs, slice cards, fixtures, tests, STATUS.md | Chat exploration, failed attempts, full spec dump |

Tests + STATUS are the handoff. If the slice test is green, the slice is done.
