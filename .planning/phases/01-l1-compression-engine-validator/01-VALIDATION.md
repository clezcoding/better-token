---
phase: 1
slug: l1-compression-engine-validator
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.0.0 |
| **Config file** | `packages/core/vitest.config.ts` |
| **Quick run command** | `npx vitest run packages/core/tests/unit` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/core/tests/unit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-00-01 | 00 | 0 | — | — | N/A | infra | `npx vitest run` | ❌ W0 | ⬜ pending |
| 01-01-01 | 01 | 1 | COMP-01 | — | Deterministic compress, no LLM | unit | `npx vitest run -t "COMP-01"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | COMP-02 | — | Modes safe/balanced/aggressive | unit | `npx vitest run -t "COMP-02"` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | COMP-04 | — | Idempotent fixed-point | unit | `npx vitest run -t "COMP-04"` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | SAFE-03 | — | Preserve user language | unit | `npx vitest run -t "SAFE-03"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | SAFE-01 | T-01-01 | Reject write on protected mismatch | unit | `npx vitest run -t "SAFE-01"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | SAFE-02 | T-01-01 | Code/URL/path/heading byte-identical | unit | `npx vitest run -t "SAFE-02"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | COMP-03 | — | Dry-run token delta, no write | integration | `npx vitest run -t "COMP-03"` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | COMP-05 | T-01-02 | Rollback via `.original` sidecar | integration | `npx vitest run -t "COMP-05"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/tests/unit/tokenizer.test.ts` — stubs for SAFE-02
- [ ] `packages/core/tests/unit/compressor.test.ts` — stubs for COMP-01, COMP-02, COMP-04, SAFE-03
- [ ] `packages/core/tests/unit/validator.test.ts` — stubs for SAFE-01
- [ ] `packages/core/tests/integration/cli.test.ts` — stubs for COMP-03, COMP-05
- [ ] `npm install -D vitest` — framework install
- [ ] `packages/core/vitest.config.ts` — Vitest config

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | All phase behaviors have automated verification. |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
