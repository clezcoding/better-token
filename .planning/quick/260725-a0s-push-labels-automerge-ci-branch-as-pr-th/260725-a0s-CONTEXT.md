# Quick Task 260725-a0s — Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Task Boundary

1. Open a PR that lands the prior labels/automerge/CI tooling work (from 260725-9tg) onto `main` — cherry-picked cleanly from `origin/main` (9tg branch incorrectly forked from phase-02).
2. Thoroughly remediate **all** open Dependabot security alerts and Dependabot PRs — bump to latest stable, verify with tests, close superseded PRs. Do not dismiss/ignore alerts.

</domain>

<decisions>
## Implementation Decisions

### PR strategy
- One PR from branch `gsd/quick-260725-a0s-push-labels-automerge-ci-branch-as-pr-th` based on `origin/main`.
- Include: cherry-picked tooling from 9tg (`70d7ced`, `cd77d6e`) + security dependency remediation + this quick-task docs.

### Security / Dependabot (complete, not defer)
Open alerts (must all be addressed by version bumps, not dismissals):

| Alert | Package | Severity | Patched | Action |
|-------|---------|----------|---------|--------|
| #6, #3 | vitest | critical | ≥3.2.6 or ≥4.1.0 | Bump to **4.1.10** (latest stable) in `packages/core` |
| #5, #4, #2 | vite | medium/high | ≥6.4.3 | Resolved transitively via vitest 4 → vite ≥6.4.3; verify lockfile |
| #1 | esbuild | medium | ≥0.25.0 | Nested under old vite 5.4.21 (`0.21.5`); clears when vite upgrades |

Open Dependabot PRs (supersede after fix lands):
- #11 vite+vitest multi
- #12 vitest → 3.2.6 (insufficient vs latest)
- #13 vitest → 4.1.10 core-only (CI failed; incomplete lock)

### Other GitHub Issues
- Open classic Issues: **none** — document in SUMMARY.
- Code scanning / secret scanning: none open.

### Claude's Discretion
- Prefer `npm install vitest@4.1.10 -w @better-token/core` (or package.json `^4.1.10` + npm install) so lockfile updates correctly.
- If tests break on vitest 4, fix minimally (API/config only).
- After PR opened: close #11/#12/#13 with comment "Superseded by #" linking new PR.
- Do not dismiss Dependabot alerts manually — let GitHub auto-close on merge when fixed.

</decisions>

<specifics>
## Specific Ideas

- Cherry-pick commits: `70d7ced`, `cd77d6e` from `gsd/quick-260725-9tg-github-labels-automerge-fix-security-dep`
- Main currently has only `packages/core` (no shrink-mcp) — bump only what exists on main
- Latest: vitest 4.1.10, vite 8.1.5, esbuild 0.28.1 (direct already OK)

</specifics>

<canonical_refs>
## Canonical References

- GHSA-5xrq-8626-4rwp (vitest)
- GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff, GHSA-4w7w-66w2-5vf9 (vite)
- GHSA-67mh-4wv8-2f99 (esbuild)
- Vitest 4 migration: https://vitest.dev/guide/migration.html

</canonical_refs>
