# Quick Task 260725-a9t — Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Task Boundary

1. Fix all 6 open Code scanning (CodeQL) alerts — real code fixes, no dismissals.
2. Audit local tree for lost/deleted important files; restore accidental deletes.

</domain>

<decisions>
## Implementation Decisions

### Code scanning alerts (all `js/polynomial-redos`, high)
| # | File | Sink | Vulnerable pattern |
|---|------|------|-------------------|
| 1,2 | compressor.ts | bullet match | `/^(\s*[-*+]\s+)(.+)$/` — `\s*`/`\s+` overlap on spaces |
| 3,6 | tokenizer.ts | HEADING_REGEX.exec | `/^(#{1,6})\s+(.*)$/` — `\s+` vs `.*` space backtracking |
| 4,5 | tokenizer.ts | PATH_REGEX | `[\w\-/\\.]+` allows `/` and `-` repetition backtracking |

Fix approach (GitHub ReDoS guidance): rewrite to linear-time string parsers / non-overlapping character classes — do **not** dismiss alerts.

### Other security surfaces
- Dependabot open: 0
- Classic Issues open: 0

### Local integrity (Task 2)
- Accidental WT delete: `.claude/.cursor/rules/gsd.md` → restore via `git restore` (done before branch switch; also ensure present on phase-02 after stash pop)
- No package loss; phase-02 behind main for PR#14 files is branch lag, not deletion

### Claude's Discretion
- Prefer explicit parsers over "safer regex" when CodeQL still flags space/`.*` overlap
- Keep compression/tokenize semantics identical; full unit test suite must pass
- Open PR to main; do not dismiss CodeQL alerts

</decisions>
