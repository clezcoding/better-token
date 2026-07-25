# Dependabot / Security Investigation (2026-07-25)

**Rule:** Real fixes only. Do NOT dismiss, snooze, or ignore alerts.

## Open Dependabot alerts (6)

| # | Package | Manifest | Severity | Patched | State | Root cause on main |
|---|---------|----------|----------|---------|-------|--------------------|
| 7 | vitest | packages/shrink-mcp/package.json | critical | 3.2.6 | open | direct `vitest: ^2.0.0` → 2.1.9 |
| 3 | vitest | package-lock.json | critical | 3.2.6 | open | same lock entry |
| 4 | vite | package-lock.json | high | 6.4.3 | open | vitest@2 pulls vite@5.4.21 |
| 5 | vite | package-lock.json | medium | 6.4.3 | open | same |
| 2 | vite | package-lock.json | medium | 6.4.2+ | open | same (need ≥6.4.3 for #4/#5) |
| 1 | esbuild | package-lock.json | medium | 0.25.0 | open | nested `vite@5 → esbuild@0.21.5` under shrink-mcp / vite-node |

Alert #6 (vitest in packages/core) already **fixed** (core on vitest ^4.1.10).

## Already clean

- Code scanning open: **0**
- Classic GitHub Issues open: **0**
- Secret scanning open: **0**

## Safe packages on main

- `packages/core`: vitest ^4.1.10, esbuild ^0.28.1, vite 8.1.5 (root lock)
- Direct esbuild in shrink-mcp already ^0.28.1 (PR #18) — nested 0.21.5 remains via vitest2/vite5

## Required remediation

1. Bump `packages/shrink-mcp` `vitest` from `^2.0.0` to at least `^3.2.6` (prefer align with core `^4.1.10` if tests pass).
2. `npm install` at repo root; refresh lockfile.
3. Verify lockfile contains **no**:
   - vitest < 3.2.6
   - vite ≤ 6.4.2
   - esbuild ≤ 0.24.2
4. If transitive leftovers remain after vitest bump, add root `overrides` for `vite`/`esbuild` — last resort, not first.
5. Run `npm test` (all workspace packages). Fix any test/API breakage from vitest 2→3/4.
6. Confirm via `gh api .../dependabot/alerts` that open count drops (may lag until scan re-runs on push). **Never** call dismiss API.

## Advisories

- GHSA-5xrq-8626-4rwp / CVE-2026-47429 — Vitest UI arbitrary file read/exec
- GHSA-fx2h-pf6j-xcff / CVE-2026-53571 — vite server.fs.deny bypass (Windows)
- GHSA-v6wh-96g9-6wx3 / CVE-2026-53632 — launch-editor NTLMv2 via UNC
- GHSA-4w7w-66w2-5vf9 / CVE-2026-39365 — Vite path traversal in optimized deps .map
- GHSA-67mh-4wv8-2f99 — esbuild dev server CORS/request smuggling
