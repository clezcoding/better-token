---
phase: quick-260725-a0s
plan: 01
subsystem: infra
tags: [github-actions, dependabot, vitest, vite, esbuild, kodiak, mega-linter]

requires: []
provides:
  - Cherry-picked labels/automerge/CI tooling from 9tg branch onto main lineage
  - vitest 4.1.10 with vite 8.1.5 and esbuild 0.28.1 (all Dependabot alerts remediable)
  - Branch ready for orchestrator push + PR
affects: [github-automation, security-remediation]

tech-stack:
  added: []
  patterns:
    - "Dependabot PRs get dependencies+automerge labels; Kodiak merges major/minor/patch"
    - "MegaLinter VALIDATE_ALL_CODEBASE=false on pull_request, true otherwise"

key-files:
  created:
    - .github/workflows/automerge-label.yml
  modified:
    - .github/dependabot.yml
    - .github/labels.yml
    - .github/workflows/label-sync.yml
    - .github/workflows/mega-linter.yml
    - .kodiak.toml
    - packages/core/package.json
    - package-lock.json

key-decisions:
  - "Cherry-pick 70d7ced + cd77d6e only — do not merge 9tg branch (forked from phase-02)"
  - "Bump vitest to 4.1.10 (latest stable) rather than 3.2.6 from Dependabot PR #12"
  - "Do not dismiss Dependabot alerts — remediate by version bump for auto-close on merge"

patterns-established:
  - "automerge-label workflow restricts to Dependabot/ImgBot actors with least-privilege GITHUB_TOKEN"

requirements-completed: [QUICK-260725-a0s]

coverage:
  - id: D1
    description: "Labels/automerge/CI tooling cherry-picked from 9tg onto main lineage"
    requirement: QUICK-260725-a0s
    verification:
      - kind: other
        ref: "grep automerge-label.yml, kodiak major, dependabot automerge, mega-linter PR conditional"
        status: pass
    human_judgment: false
  - id: D2
    description: "vitest 4.1.10 with vite ≥6.4.3 and no nested esbuild 0.21.x"
    requirement: QUICK-260725-a0s
    verification:
      - kind: unit
        ref: "npm test — 66 passed"
        status: pass
      - kind: other
        ref: "npm ls vitest@4.1.10, vite@8.1.5, esbuild@0.28.1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Build passes on updated dependency tree"
    requirement: QUICK-260725-a0s
    verification:
      - kind: other
        ref: "npm run build — esbuild bundle exit 0"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-25
status: complete
---

# Quick Task 260725-a0s: Push Labels/Automerge/CI + Security Remediation Summary

**Cherry-picked 9tg GitHub tooling onto main lineage and remediated all six Dependabot alerts via vitest 4.1.10 → vite 8.1.5 → esbuild 0.28.1**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-25T05:15:00Z
- **Completed:** 2026-07-25T05:30:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Cherry-picked `70d7ced` (labels, Dependabot/Kodiak automerge, automerge-label workflow) and `cd77d6e` (MegaLinter PR-diff mode) cleanly onto `origin/main` lineage
- Bumped `packages/core` vitest from ^2.0.0 to ^4.1.10; lockfile resolves vite 8.1.5 and esbuild 0.28.1 — no vulnerable nested paths
- All 66 tests pass; build green; branch ready for orchestrator push + PR (executor did not `gh pr create` or push)

## Cherry-Pick Source Commits

| Source SHA | Branch commit | Description | Files touched |
|------------|---------------|-------------|---------------|
| `70d7ced` | `9ec9fd7` | Labels expand, Dependabot `dependencies+automerge` labels, label-sync `issues: write`, Kodiak major automerge, automerge-label workflow | `.github/dependabot.yml`, `.github/labels.yml`, `.github/workflows/automerge-label.yml`, `.github/workflows/label-sync.yml`, `.kodiak.toml` |
| `cd77d6e` | `85b5ab9` | MegaLinter `VALIDATE_ALL_CODEBASE` conditional on event type | `.github/workflows/mega-linter.yml` |

## Dependabot Alert Disposition

Alerts remediated by version bump — **not dismissed**. GitHub should auto-close on merge.

| Alert | Package | Severity | GHSA | Disposition | Resolved version |
|-------|---------|----------|------|-------------|------------------|
| #6 | vitest | critical | GHSA-5xrq-8626-4rwp | **Fixed** — bumped to 4.1.10 | vitest@4.1.10 |
| #3 | vitest | critical | GHSA-5xrq-8626-4rwp | **Fixed** — bumped to 4.1.10 | vitest@4.1.10 |
| #5 | vite | medium | GHSA-v6wh-96g9-6wx3 | **Fixed** — transitive via vitest 4 | vite@8.1.5 (≥6.4.3) |
| #4 | vite | high | GHSA-fx2h-pf6j-xcff | **Fixed** — transitive via vitest 4 | vite@8.1.5 (≥6.4.3) |
| #2 | vite | high | GHSA-4w7w-66w2-5vf9 | **Fixed** — transitive via vitest 4 | vite@8.1.5 (≥6.4.3) |
| #1 | esbuild | medium | GHSA-67mh-4wv8-2f99 | **Fixed** — nested 0.21.x path gone | esbuild@0.28.1 (direct + via vite) |

Previous vulnerable tree: `vitest@2.1.9 → vite@5.4.21 → esbuild@0.21.5`

## Dependabot PR Disposition

| PR | Title (approx) | Disposition | Post-PR action |
|----|----------------|-------------|----------------|
| #11 | vite + vitest multi-bump | **Supersede** — this branch completes full lockfile refresh | Close with comment linking new PR after orchestrator opens it |
| #12 | vitest → 3.2.6 | **Supersede** — insufficient vs latest 4.1.10 | Close with comment linking new PR |
| #13 | vitest → 4.1.10 core-only | **Supersede** — CI failed / incomplete lock; this branch verifies green | Close with comment linking new PR |

Executor did **not** close PRs #11–#13 — orchestrator closes after new PR exists.

## GitHub Issues Status

| Category | Count | Notes |
|----------|-------|-------|
| Classic Issues | **0 open** | None open at execution time |
| Code scanning alerts | **0 open** | None open |
| Secret scanning alerts | **0 open** | None open |

## Task Commits

Each task committed atomically (Task 3 SUMMARY written but not committed per orchestrator protocol):

1. **Task 1: Cherry-pick labels/automerge/CI tooling** — `9ec9fd7` (feat, source `70d7ced`) + `85b5ab9` (feat, source `cd77d6e`)
2. **Task 2: Bump vitest to 4.1.10** — `a5b05f5` (fix)

## Verification Evidence

```bash
# vitest version
npm ls vitest -w @better-token/core --depth=0
# → vitest@4.1.10

# vite under vitest (≥6.4.3 required)
npm ls vite -w @better-token/core --all
# → vite@8.1.5 (via vitest@4.1.10)

# no nested esbuild 0.21.x
npm ls esbuild -w @better-token/core --all
# → esbuild@0.28.1 (direct + deduped via vite/tsx); no esbuild@0.21.x

# tests
npm test
# → 6 test files, 66 tests passed (vitest v4.1.10)

# build
npm run build
# → esbuild bundle exit 0 (dist/cli.js 30.8kb, dist/index.js 21.3kb)
```

## Files Created/Modified

- `.github/workflows/automerge-label.yml` — Adds `automerge` label to Dependabot/ImgBot PRs
- `.github/dependabot.yml` — `labels: [dependencies, automerge]` on npm + gha ecosystems
- `.github/labels.yml` — Expanded labels (help wanted, invalid, question, priority:*)
- `.github/workflows/label-sync.yml` — Added `issues: write` permission
- `.github/workflows/mega-linter.yml` — `VALIDATE_ALL_CODEBASE: ${{ github.event_name != 'pull_request' }}`
- `.kodiak.toml` — `versions = ["major", "minor", "patch"]`
- `packages/core/package.json` — vitest ^4.1.10
- `package-lock.json` — Refreshed dependency tree

## Decisions Made

- Cherry-pick only two commits from 9tg branch — avoid phase-02 package tree contamination
- vitest 4.1.10 over 3.2.6 (Dependabot PR #12) for latest security patches
- No vitest.config.ts changes needed — vitest 4 compatible with existing config
- Executor did not dismiss alerts, did not `gh pr create`, did not push

## Deviations from Plan

None — plan executed exactly as written. Cherry-picks applied cleanly with no conflicts. vitest 4 required no test/config fixes.

## Issues Encountered

None

## Orchestrator Handoff

- **Branch:** `gsd/quick-260725-a0s-push-labels-automerge-ci-branch-as-pr-th`
- **Ready to push:** yes
- **Executor did not:** push, `gh pr create`, dismiss Dependabot alerts, close PRs #11–#13
- **Post-PR follow-up:** Close #11/#12/#13 with "Superseded by #N" comment after orchestrator opens PR

---
*Phase: quick-260725-a0s*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: .planning/quick/260725-a0s-push-labels-automerge-ci-branch-as-pr-th/260725-a0s-SUMMARY.md
- FOUND: commit 9ec9fd7
- FOUND: commit 85b5ab9
- FOUND: commit a5b05f5
- FOUND: .github/workflows/automerge-label.yml
