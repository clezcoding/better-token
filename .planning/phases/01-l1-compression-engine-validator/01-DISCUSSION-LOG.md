# Phase 1: L1 Compression Engine & Validator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 1-L1 Compression Engine & Validator
**Areas discussed:** Heuristik-Stufen pro Mode, Backup- & Rollback-Konvention, Dry-run- & CLI-Feedback, Idempotenz-Erkennung, Datei-Scope in Phase 1
**Mode:** `--batch`, language de, recommendations marked

---

## Heuristik-Stufen pro Mode

| Option | Description | Selected |
|--------|-------------|----------|
| safe: only whitespace | Whitespace / blank lines only | |
| safe: WS + filler | Whitespace + obvious filler, nothing semantic | ✓ |
| safe: + synonyms | Also synonym short forms | |
| balanced: more filler | Slightly more filler than safe | |
| balanced: + deflate | Filler + shorten inflation; rules unchanged | ✓ |
| balanced: structure | Also densify paragraphs/lists | |
| aggressive: louder balanced | Only more of balanced | |
| aggressive: structure, no invented abbr | Densify structure; ban invented abbreviations | ✓ |
| aggressive: max synonyms | Max shortening including aggressive synonyms | |
| headings: never | Heading text untouchable | |
| headings: prose only | Never change heading content; prose only | ✓ |
| headings: aggressive OK | Allow heading shorten in aggressive | |

**User's choice:** 1b, 2b, 3b, 4b (all recommendations)
**Notes:** —

---

## Backup- & Rollback-Konvention

| Option | Description | Selected |
|--------|-------------|----------|
| `file.original` | Suffix `.original` beside source | ✓ |
| `file.original.md` | Markdown-recognizable sidecar (recommended) | |
| `.better-token/backups/` | Hidden backup dir | |
| Write once if missing | Before first successful write; no dry-run write | ✓ (final) |
| Overwrite every run | Refresh sidecar each compress | initially chosen, then revoked |
| Always write incl. dry-run | | |
| Manual restore only | | |
| `rollback <file>` | Dedicated subcommand | ✓ |
| `compress --rollback` | Flag instead of subcommand | |
| Never overwrite existing sidecar | First original remains truth | ✓ |

**User's choice:** Initially 1a, 2b, 3b, 4a — conflict 2b↔4a resolved as option 1 (create if missing, never overwrite)
**Notes:** User preferred `.original` suffix over recommended `.original.md`.

---

## Dry-run- & CLI-Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| One-line delta only | | |
| Stats + optional `--diff` | Tokens/mode/validator + optional unified diff | ✓ |
| Always full diff + stats | | |
| chars/4 heuristic | | |
| Offline tokenizer, labeled estimated | | ✓ |
| Byte/char delta only | | |
| Only `compress` | | |
| `compress` + `rollback` + `validate` | | ✓ |
| compress + rollback, no validate | | |
| Default `balanced` | | ✓ |
| Interactive ask for mode | | |
| Default `safe` despite requirements | | |

**User's choice:** 1b, 2b, 3b, 4a
**Notes:** —

---

## Idempotenz-Erkennung

| Option | Description | Selected |
|--------|-------------|----------|
| In-file marker comment | | |
| Fixed-point recompress | output ≡ input → no-op | ✓ |
| Sidecar hash compare | | |
| Mode switch from sidecar | Recompress from `.original` | ✓ |
| Stack on current file | | |
| Reject until rollback | | |
| Silent exit 0 | | |
| Message + exit 0 | `already compressed — no changes` | ✓ |
| Non-zero exit | | |
| No `--force` in Phase 1 | | ✓ |
| `--force` from current | | |
| `--force` deletes sidecar | | |

**User's choice:** 1b, 2a, 3b, 4a
**Notes:** —

---

## Datei-Scope in Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Exact four filenames only | | |
| Canonicals + equivalents; any MD path | Docs list canonicals | ✓ |
| Any file incl. non-MD | | |
| Path required (error if missing) | | |
| Auto-detect all canonicals | recommended | |
| Always interactive when no path | | ✓ |
| Whitelist only for explicit paths | | |
| Any MD + warning if non-canonical | | ✓ |
| Any MD silent | | |
| Hard reject non-MD | | ✓ |
| Best-effort non-MD | | |
| Ignore non-MD exit 0 | | |
| Non-TTY: path or `--yes` required | | ✓ |
| Non-TTY: silent all canonicals | | |
| Non-TTY: no-op | | |

**User's choice:** 1b, 2c, 3b, 4a; non-TTY follow-up → 1
**Notes:** Interactive-first diverges from auto-detect recommendation; CI escape via `--yes` or explicit path.

---

## Claude's Discretion

- Filler lists / synonym tables within mode bounds
- Offline tokenizer package choice
- `packages/core` internal API shape
- Parser implementation (regex vs AST)

## Deferred Ideas

None
