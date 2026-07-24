# Quick Task 260725-1my — Research

**Gathered:** 2026-07-25  
**Sources:** Context7 (`/oxsecurity/megalinter`, `/websites/github_en_actions`), Wigolo (megalinter.io, kodiakhq.com, imgbot.net, docs.github.com)

## Repo context

- npm workspaces monorepo: root `package.json` + `packages/core`
- Current `.gitignore` minimal: `node_modules/`, `dist/`, `*.original`, `.DS_Store`
- Critical gap: `node_modules/` untracked locally but only partially covered; research cache under `.planning/research/.cache/` is committed — should ignore
- Phase-01 source lives on `gsd/phase-01-…`; `main` is planning-heavy. CI must work when `package.json` + workspaces exist
- Stack: TypeScript, Vitest, tsx (`@better-token/core`)

## Task 1 — .gitignore (recommended)

Ignore at minimum:

```
# deps / build
node_modules/
dist/
*.tsbuildinfo
coverage/
.turbo/
*.original

# env / secrets
.env
.env.*
!.env.example

# OS / IDE
.DS_Store
.idea/
*.swp
.vscode/*
!.vscode/extensions.json

# planning noise
.planning/research/.cache/
.planning/**/HANDOFF.json

# logs / misc
*.log
npm-debug.log*
.nyc_output/
```

Keep committing: source, lockfile, `.planning/` docs (config has `commit_docs: true`), `.github/`, workflow configs.

## Task 2 — GitHub automation stack

### CI (`ci.yml`)

- Triggers: `push` + `pull_request` to `main`
- `permissions: contents: read` (least privilege)
- `concurrency: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`
- Node 22 (or 20 LTS): `actions/setup-node` with `cache: npm`
- Steps: `npm ci` → `npm run build` → `npm test`
- Use pinned major actions (`actions/checkout@v4` or current stable; Context7 shows checkout@v6 in newer docs — pin to latest stable major)

### MegaLinter (`mega-linter.yml` + `.mega-linter.yml`)

- Action: `oxsecurity/megalinter/flavors/javascript@v8` (or `@v9` if available) — JS/TS flavor = faster than full flavor
- Config file `.mega-linter.yml` at repo root
- Efficiency knobs:
  - `APPLY_FIXES: none` initially (avoid noisy auto-commits until stable)
  - `FILTER_REGEX_EXCLUDE: (node_modules|dist|coverage|\.planning/research/\.cache)`
  - Enable: TypeScript, JSON, YAML, Markdown, GitHub Actions, Gitleaks, Dockerfile (if present)
  - Disable heavy unused: PHP, Java, etc. (flavor handles most)
- Permissions: `contents: read`, `pull-requests: write` only if applying fixes later
- Artifact upload for reports on failure

### Dependabot (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 10
    groups:
      production-deps:
        dependency-type: production
      dev-deps:
        dependency-type: development
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
```

### Kodiak (`.kodiak.toml`)

- GitHub App install (manual post-setup note)
- Minimal + dependency automerge:

```toml
version = 1

[merge]
automerge_label = "automerge"
method = "squash"
delete_branch_on_merge = true

[merge.automerge_dependencies]
versions = ["minor", "patch"]
usernames = ["dependabot", "dependabot[bot]"]
```

- Requires branch protection + required checks (CI + MegaLinter)
- Label `automerge` must exist

### ImgBot (`.imgbotconfig`)

- GitHub App install (manual)
- Config:

```json
{
  "schedule": "weekly",
  "aggressiveCompression": false,
  "minKBReduced": 10
}
```

### Labels (`.github/labels.yml` + sync workflow)

Standard set for OSS + GSD:

- `automerge` (Kodiak)
- `bug`, `enhancement`, `documentation`, `dependencies`, `security`
- `ci`, `good first issue`, `wontfix`, `duplicate`
- GSD-ish: `phase`, `quick-task`, `blocked`

Sync via `EndBug/label-sync@v2` (or `micnncim/action-label-syncer`) on push to `main` when labels file changes + `workflow_dispatch`.

### Extra useful (include)

- `CODEOWNERS` stub optional — skip unless owners known
- PR template (`.github/PULL_REQUEST_TEMPLATE.md`) — short checklist
- `permissions` + concurrency on all workflows
- Do **not** add secrets to repo; document App installs in SUMMARY

### Skip / defer

- Renovate (Dependabot enough)
- Codecov (no coverage service configured yet)
- Release-please (no release cadence yet)
- Self-hosted runners

## Task 3 — GSD config audit (already verified)

| Setting | Current | Verdict |
|---------|---------|---------|
| `runtime` | `cursor` | ✅ Correct |
| `git.branching_strategy` | `phase` | ✅ Correct for phased GSD |
| `git.base_branch` | `main` | ✅ |
| `git.phase_branch_template` | `gsd/phase-{phase}-{slug}` | ✅ |
| `git.quick_branch_template` | `gsd/quick-{quick}-{slug}` | ✅ |
| `workflow.use_worktrees` | unset/`false` | ✅ Required: worktrees unsupported on Cursor |
| `model_profile` | `inherit` | ✅ Sensible for Cursor |
| `commit_docs` | `true` | ✅ Matches project |

No config change required unless user wants different branching (`none` / `milestone`).

## Pitfalls

1. MegaLinter full flavor = slow + expensive minutes → use `javascript` flavor
2. APPLY_FIXES=commit needs write token + can fight with Kodiak → start with `none`
3. ImgBot/Kodiak are Apps — config files alone do nothing until installed on org/repo
4. CI on `main` today has no `package.json` until phase branch merges — use `if: hashFiles('package.json') != ''` or document that CI activates after merge
5. Do not commit `node_modules` or `packages/*/dist`

## Recommended plan shape (1–3 tasks)

1. Expand `.gitignore` + scrub research cache from tracking if still tracked
2. Add CI + MegaLinter + Dependabot + Kodiak + ImgBot + labels (+ PR template)
3. Document manual App installs + GSD config verification in SUMMARY (no config.json change if already correct)
