---
phase: quick-260725-1my
plan: 01
subsystem: infra
tags: [gitignore, github-actions, megalinter, dependabot, kodiak, imgbot, gsd-config]

requires: []
provides:
  - Root .gitignore with deps, secrets, IDE, and planning cache exclusions
  - GitHub CI, MegaLinter, Dependabot, Kodiak, ImgBot, labels, PR template
  - Verified GSD Cursor + phase branching config
affects: [phase-01, main]

tech-stack:
  added: [MegaLinter javascript flavor, Dependabot, Kodiak, ImgBot, EndBug/label-sync]
  patterns: [hashFiles package.json CI guard, APPLY_FIXES none, least-privilege workflow permissions]

key-files:
  created:
    - .gitignore
    - .github/workflows/ci.yml
    - .github/workflows/mega-linter.yml
    - .github/workflows/label-sync.yml
    - .mega-linter.yml
    - .github/dependabot.yml
    - .kodiak.toml
    - .imgbotconfig
    - .github/labels.yml
    - .github/PULL_REQUEST_TEMPLATE.md
  modified: []

key-decisions:
  - "MegaLinter APPLY_FIXES none to avoid noisy auto-commits before stable"
  - "CI guarded by hashFiles('package.json') so main skips cleanly until phase merge"
  - "No config.json changes — audit confirmed cursor runtime and phase branching"

patterns-established:
  - "Workflow permissions: contents read only; concurrency cancel-in-progress"
  - "Research cache ignored but .planning/ docs remain tracked (commit_docs true)"

requirements-completed: [QUICK-260725-1my]

coverage:
  - id: D1
    description: ".gitignore excludes deps, secrets, IDE noise, planning cache; cache untracked"
    requirement: QUICK-260725-1my
    verification:
      - kind: other
        ref: "git ls-files '.planning/research/.cache/' && git check-ignore node_modules/ .env"
        status: pass
    human_judgment: false
  - id: D2
    description: "GitHub automation stack (CI, MegaLinter, Dependabot, Kodiak, ImgBot, labels, PR template)"
    requirement: QUICK-260725-1my
    verification:
      - kind: other
        ref: "grep hashFiles package.json ci.yml && grep APPLY_FIXES .mega-linter.yml"
        status: pass
    human_judgment: false
  - id: D3
    description: "Kodiak and ImgBot GitHub App installation"
    requirement: QUICK-260725-1my
    verification: []
    human_judgment: true
    rationale: "Third-party GitHub Apps require manual org/repo install — config files alone do not activate bots"

duration: 5min
completed: 2026-07-25
status: complete
---

# Quick Task 260725-1my: Repo Hygiene & GitHub Automation Summary

**Root .gitignore with research cache untracked, full GitHub CI/lint/dependency stack, GSD Cursor config verified unchanged**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-24T23:13:45Z
- **Completed:** 2026-07-25
- **Tasks:** 3
- **Files modified:** 10 created

## Accomplishments

- Expanded `.gitignore` and removed six tracked `.planning/research/.cache/` files from the git index (working-tree cache preserved)
- Added CI (package.json guard), MegaLinter javascript flavor, Dependabot, Kodiak, ImgBot, label sync, and PR template
- Verified GSD `config.json` — no changes required

## Task Commits

Each task was committed atomically (code only):

1. **Task 1: Expand .gitignore and untrack ignored artifacts** — `0c5d981` (chore)
2. **Task 2: Add GitHub CI, MegaLinter, Dependabot, Kodiak, ImgBot, labels, PR template** — `22a9bdc` (chore)
3. **Task 3: Verify GSD config and document manual setup** — no commit (verification + SUMMARY only; config unchanged)

**Plan metadata:** skipped (orchestrator handles docs commit)

## GSD Config Verification

| Setting | Value | Verdict |
|---------|-------|---------|
| `runtime` | `cursor` | ✅ Correct — no change |
| `git.branching_strategy` | `phase` | ✅ Correct — no change |
| `git.base_branch` | `main` | ✅ Correct |
| `git.phase_branch_template` | `gsd/phase-{phase}-{slug}` | ✅ Correct |
| `git.quick_branch_template` | `gsd/quick-{quick}-{slug}` | ✅ Correct |
| `workflow.use_worktrees` | unset (false) | ✅ Correct — Cursor unsupported |
| `commit_docs` | `true` | ✅ Matches project |

## Files Created/Modified

- `.gitignore` — deps, build, env, IDE, planning cache, logs
- `.github/workflows/ci.yml` — Node 22 build/test; skips when no `package.json`
- `.github/workflows/mega-linter.yml` — javascript flavor v8 on push/PR/dispatch
- `.github/workflows/label-sync.yml` — syncs `.github/labels.yml` on main push
- `.mega-linter.yml` — APPLY_FIXES none; TS/JSON/YAML/MD/Actions/Gitleaks enabled
- `.github/dependabot.yml` — weekly npm + github-actions with dependency groups
- `.kodiak.toml` — squash automerge for dependabot patch/minor with `automerge` label
- `.imgbotconfig` — weekly image optimization, min 10 KB reduction
- `.github/labels.yml` — OSS + GSD labels including `automerge`, `phase`, `quick-task`
- `.github/PULL_REQUEST_TEMPLATE.md` — short checklist

## Decisions Made

None — followed plan and RESEARCH.md as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**CI note:** The CI workflow uses `if: hashFiles('package.json') != ''` — on `main` today (no `package.json` yet), CI jobs skip cleanly. Full build/test runs after the phase branch merges `package.json` to `main`.

### Kodiak (auto-merge Dependabot PRs)

1. Install the Kodiak GitHub App: https://github.com/apps/kodiak-headless → **Configure** → select this repository
2. Enable branch protection on `main` with required status checks: **CI**, **MegaLinter**
3. Add the `automerge` label to Dependabot PRs you want Kodiak to squash-merge after checks pass

### ImgBot (weekly image optimization)

1. Install the ImgBot GitHub App: https://github.com/apps/imgbot → **Install** → select this repository
2. ImgBot reads `.imgbotconfig` automatically — weekly PRs for committed image assets

## Next Phase Readiness

- Repo hygiene and GitHub automation in place before phase branches merge to `main`
- Manual Kodiak + ImgBot App installs remain before bots are active

---
*Phase: quick-260725-1my*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: .gitignore
- FOUND: .github/workflows/ci.yml
- FOUND: .github/workflows/mega-linter.yml
- FOUND: .mega-linter.yml
- FOUND: .github/dependabot.yml
- FOUND: .kodiak.toml
- FOUND: .imgbotconfig
- FOUND: .github/labels.yml
- FOUND: .github/workflows/label-sync.yml
- FOUND: .github/PULL_REQUEST_TEMPLATE.md
- FOUND: 0c5d981
- FOUND: 22a9bdc
