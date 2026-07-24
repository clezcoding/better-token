---
phase: 01-l1-compression-engine-validator
verified: 2026-07-24T05:50:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 01: L1 Compression Engine & Validator — Verifikationsbericht

**Phasen-Ziel:** Nutzer können Regel-/Memory-Dateien deterministisch komprimieren und darauf vertrauen, dass keine technische Syntax beschädigt wurde.
**Verifiziert:** 2026-07-24T05:50:00Z
**Status:** passed
**Re-Verification:** Nein — Erstmessung

## Ziel-Erreichung (Goal Achievement)

### Observable Wahrheiten (Erfolgskriterien aus ROADMAP.md)

| # | Wahrheit (Success Criterion) | Status | Beweis |
|---|---|---|---|
| 1 | Nutzer kann `better-token compress` auf `CLAUDE.md`, `.cursorrules`, `AGENTS.md` oder `GEMINI.md` ausführen und erhält eine kleinere Datei ohne LLM-Aufrufe | ✓ VERIFIED | `cli.ts` `compress [path]`-Kommando; `detectCanonicalFiles` (compressor.ts:259-294) deckt alle kanonischen Basenames + `.cursor/rules/*.mdc`; `grep -rn 'anthropic\|openai\|fetch(' packages/core/src` = 0; CLI-Run auf Fixture: delta -11 Tokens, Datei tatsächlich verkleinert; `npm run build` erzeugt `dist/cli.js` (27.6kb) |
| 2 | Nutzer kann zwischen `safe`, `balanced`, `aggressive` wechseln (Default `balanced`); Validator in jedem Modus aktiv | ✓ VERIFIED | `compressSafe`/`compressBalanced`/`compressAggressive` (compressor.ts:94-225); Default `balanced` (cli.ts:333); `compressMarkdownWithValidation` ruft immer `validate` auf (compressor.ts:247); Tests `COMP-02` in unit + integration grün; CLI-Spotcheck: `--mode safe/balanced/aggressive` druckt jew. `mode: <mode>` + `validator: pass` |
| 3 | `--dry-run` zeigt Token-Delta ohne Datei-Schreiben | ✓ VERIFIED | `--dry-run` Option (cli.ts:334); Test `COMP-03` (cli.test.ts:43) — Fixture byte-identisch vor/nach dem Run; Test `D-06` — kein Sidecar in dry-run; CLI-Spotcheck: dry-run auf `/tmp/test-claude.md` verändert die Datei nicht |
| 4 | Nach jeder Kompression sind Code-Blöcke, Inline-Code, URLs, Pfade und Überschriften byte-identisch; bei Mismatch wird komprimierte Version verworfen und Original behalten | ✓ VERIFIED | `validate` (validator.ts) extrahiert + vergleicht Frontmatter, Code-Blöcke, Inline-Code, URLs, Pfade, Headings, Carve-Outs; `compressMarkdownWithValidation` gibt Original zurück bei `ok:false` (compressor.ts:250); `compressFile` schreibt nicht bei Validator-Failure (compressor.ts:315-324); Tests `SAFE-01` (validator.test.ts, compressor.test.ts, cli.test.ts) — Validator lehnt mutierte Code/URL/Pfad/Heading/Carve-out ab; Spotcheck: Fixture-Compression validiert mit `validator: pass` |
| 5 | Nutzer kann zu `.original`-Backup zurückrollen; erneutes Ausführen auf bereits komprimierter Datei ändert nichts weiter | ✓ VERIFIED | `rollback <path>`-Kommando (cli.ts:404); `restoreFromSidecar` (backup.ts:90); Fixed-Point-Check (compressor.ts:326-334) druckt `already compressed — no changes`; Tests `COMP-04`, `COMP-05` (cli.test.ts:100-193) — Re-Run No-Op, Rollback stellt wieder her, erholt gelöschtes Ziel, frischer Sidecar nach Rollback; CLI-Spotcheck bestätigt |

**Score:** 5/5 Wahrheiten verifiziert (0 present, behavior-unverified)

### Anmerkung zum MVP-Modus

Die Phase ist als `mode: mvp` deklariert, das Ziel jedoch nicht im strengen User-Story-Format (`As a …, I want to …, so that ….`). Da die Success Criteria jedoch klar und beobachtbar definiert sind und der User explizit eine Verifikation angefordert hat, wurde die Goal-Backward-Verifikation gegen die 5 Success Criteria durchgeführt. Format-Diskrepanz ist informativ, kein Blocker.

### Anforderungen (Requirements Coverage)

| Anforderung | Source Plan | Beschreibung | Status | Beweis |
|---|---|---|---|---|
| COMP-01 | 01-01 | Deterministische Kompression, keine LLM | ✓ SATISFIED | `compressor.test.ts#COMP-01` (deterministisch); `grep`-Check: 0 LLM/Network-Imports |
| COMP-02 | 01-03 | Drei Modi, Validator immer an | ✓ SATISFIED | `compressor.test.ts#COMP-02` (unit) + `cli.test.ts#COMP-02` (integration) |
| COMP-03 | 01-01 | `--dry-run` ohne Schreiben | ✓ SATISFIED | `cli.test.ts#COMP-03`, `cli.test.ts#D-06` |
| COMP-04 | 01-02 | Idempotenz (Fixed-Point) | ✓ SATISFIED | `cli.test.ts#COMP-04` |
| COMP-05 | 01-02 | `.original`-Backup + Rollback | ✓ SATISFIED | `backup.test.ts`, `cli.test.ts#COMP-05` (4 Sub-Tests) |
| SAFE-01 | 01-01, 01-03 | Byte-exakter Validator, bei Mismatch Original behalten | ✓ SATISFIED | `validator.test.ts#SAFE-01` (7 Sub-Tests), `compressor.test.ts#SAFE-01` pro Modus, `cli.test.ts#SAFE-01` |
| SAFE-02 | 01-01 | Carve-Outs nie komprimieren | ✓ SATISFIED | `tokenizer.test.ts#SAFE-02` (Round-Trip), `carveouts.test.ts` (5 Kategorien), `compressor.test.ts#SAFE-02` |
| SAFE-03 | 01-01 | Sprache erhalten, keine Übersetzung | ✓ SATISFIED | `compressor.test.ts#SAFE-03` (Deutsch in allen 3 Modi) |

Alle 8 Requirements sind in PLAN-frontmatter deklariert und in REQUIREMENTS.md der Phase 1 zugeordnet. Keine verwaisten Requirements.

### Artefakte (Required Artifacts)

| Artefakt | Erwartet | Status | Details |
|---|---|---|---|
| `package.json` (npm workspaces root) | workspaces root | ✓ VERIFIED | `workspaces: ["packages/*"]`, scripts delegieren an `@better-token/core` |
| `tsconfig.json` (root) | root TS config | ✓ VERIFIED | existiert |
| `packages/core/package.json` | deps: bpe-lite, commander, zod | ✓ VERIFIED | deps + devDeps wie spezifiziert; `bin: better-token` |
| `packages/core/src/tokenizer.ts` | tokenizeMarkdown, detokenizeMarkdown, extractProtectedRegions | ✓ VERIFIED | alle 3 exportiert; substantive Implementierung (169 Zeilen) |
| `packages/core/src/carveouts.ts` | extractCarveOuts, CARVEOUT_CATEGORIES | ✓ VERIFIED | 5 Kategorien; substantive Implementierung (141 Zeilen) |
| `packages/core/src/compressor.ts` | compressMarkdown, compressProse, compressFile, detectCanonicalFiles | ✓ VERIFIED | alle exportiert; 356 Zeilen |
| `packages/core/src/validator.ts` | validate → { ok, errors, warnings } | ✓ VERIFIED | 72 Zeilen; vergleicht 7 Region-Typen |
| `packages/core/src/backup.ts` | sidecarPathFor, createSidecarIfMissing, readSidecar, restoreFromSidecar | ✓ VERIFIED | alle 4 exportiert; 99 Zeilen |
| `packages/core/src/cli.ts` | compress/validate/rollback + --mode/--dry-run/--diff/--yes | ✓ VERIFIED | 413 Zeilen; commander + zod |
| `packages/core/src/index.ts` | Barrel-Export der öffentlichen API | ✓ VERIFIED | exportiert alle öffentlichen Symbole |
| `packages/core/tests/fixtures/sample-claude.md` | repräsentative CLAUDE.md mit allen Region-Typen | ✓ VERIFIED | enthält Frontmatter, H1+H2, Code-Block, Inline-Code, URL, Pfad, alle 5 Carve-out-Kategorien |
| `packages/core/tests/unit/*.test.ts` | tokenizer, carveouts, validator, backup, compressor | ✓ VERIFIED | 5 Dateien, 38 Tests, alle grün |
| `packages/core/tests/integration/cli.test.ts` | COMP-03, COMP-01, SAFE-01, COMP-04, COMP-05, D-13/15/06/10/17/18/19 | ✓ VERIFIED | 27 Tests, alle grün |

### Key Link Verification (Wiring)

| From | To | Via | Status | Details |
|---|---|---|---|---|
| cli.ts compress | compressFile | `runCompress` → `compressFile` | ✓ WIRED | cli.ts:198 |
| compressFile | validator.validate | `compressMarkdownWithValidation` → `validate` | ✓ WIRED | compressor.ts:306 |
| compressFile | createSidecarIfMissing + atomicWriteFile | nach Validator-Pass | ✓ WIRED | compressor.ts:346-347 |
| cli.ts rollback | restoreFromSidecar | `runRollback` → `restoreFromSidecar` | ✓ WIRED | cli.ts:311 |
| cli.ts validate | validate | `runValidate` → `validate` | ✓ WIRED | cli.ts:251 |
| tokenizer.ts | carveouts.ts | `tokenizeMarkdown` → `extractCarveOuts` | ✓ WIRED | tokenizer.ts:143 |
| compressor.ts | tokenizer.ts + validator.ts | `compressMarkdownWithValidation` → tokenize/detokenize/validate | ✓ WIRED | compressor.ts:244-247 |

### Data-Flow Trace (Level 4)

| Artefakt | Daten-Variable | Quelle | Produziert echte Daten | Status |
|---|---|---|---|---|
| cli.ts dry-run | `before`/`after` | `countTokens(original)`/`countTokens(compressed)` via `bpe-lite.encode` | Ja — echtes Fixture, reales Token-Delta (-11) | ✓ FLOWING |
| compressFile | `compressed` | `compressMarkdownWithValidation(original, mode)` | Ja — echte Kompression, nicht statisch | ✓ FLOWING |
| validate | `errors` | extrahiert + vergleicht Regionen aus Original/Compressed | Ja — echte Extraktion | ✓ FLOWING |
| rollback | restored content | `readSidecar` → `atomicWriteFile` | Ja — liest echte Sidecar-Datei | ✓ FLOWING |

### Behavioral Spot-Checks

| Verhalten | Kommando | Result | Status |
|---|---|---|---|
| dry-run druckt `estimated`, `mode: balanced`, `validator: pass`, Delta | `npx tsx …/cli.ts compress <fixture> --dry-run` | exit 0, stdout enthält alle Labels, delta -11 | ✓ PASS |
| dry-run schreibt nicht | `--dry-run` auf Kopie | Datei byte-identisch, kein Sidecar | ✓ PASS |
| echte Kompression schreibt + erzeugt Sidecar | `compress <file>` | Datei verkleinert, `.original` enthält Original | ✓ PASS |
| Re-Run ist No-Op | `compress <file>` auf bereits komprimiert | `already compressed — no changes`, exit 0 | ✓ PASS |
| Rollback stellt wieder her | `rollback <file>` | `restored from …original`, Sidecar entfernt | ✓ PASS |
| `--force` abgelehnt | `compress <file> --force` | `error: unknown option '--force'`, exit 1 | ✓ PASS |
| drei Modi laufen, Validator in jedem an | `--mode safe/balanced/aggressive` | jew. `mode: <mode>` + `validator: pass` | ✓ PASS |
| Build erzeugt dist/cli.js | `npm run build` | `dist/cli.js` 27.6kb, `dist/index.js` 18.8kb | ✓ PASS |
| Test-Suite komplett grün | `npm test` | 6 Dateien, 65 Tests, 0 Failures (23.61s) | ✓ PASS |

### Probe Execution

Keine `scripts/*/tests/probe-*.sh` vorhanden. Phase verwendet vitest als Test-Executor; alle 65 Tests grün.

### Anti-Patterns Found

| Datei | Zeile | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | — | — | — |

Keine `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`-Marker in `packages/core/src/`. `PLACEHOLDER_REGEX` in `compressor.ts:57` ist ein legitimer Regex-Name zum Erkennen von Token-Platzhaltern, kein Stub-Marker. Keine `fetch(`/`anthropic`/`openai`/`child_process`/`execSync`-Aufrufe in `packages/core/src/`. Kein `<!-- compressed -->`-Marker in komprimierter Ausgabe (Test bestätigt).

### Advisory Review Findings (nicht blockierend)

Der Code-Review (`01-REVIEW.md`) hat 4 Critical- und 6 Warning-Findings gemeldet. Per User-Anweisung werden diese als **advisory** behandelt und nicht als Blocker, da sie die Must-Haves unter normaler Operation nicht falsifizieren. Sie sind hier der Vollständigkeit halber dokumentiert:

| ID | Severity | Issue | Warum nicht blockierend |
|---|---|---|---|
| CR-01 | Critical (advisory) | Sidecar `createSidecarIfMissing` ohne `wx`-Flag → TOCTOU-Race bei konkurrierenden Runs | Phase-1-Ziel ist Single-User-CLI; Konkurrenz nicht in Success Criteria. Tests laufen seriell. |
| CR-02 | Critical (advisory) | `compressFile` übergibt in-memory `original` nicht an `createSidecarIfMissing`; Sidecar liest Datei erneut → könnte verlorene Original bei zwischenzeitlichem Writer bedeuten | Single-User-Szenario; kein zwischenzeitlicher Writer in Tests oder Success Criteria. |
| CR-03 | Critical (advisory) | Validator sortiert URLs/Pfade/Inline-Code (Multiset) → Reorder würde `ok:true` passieren | Kompressor selbst erhält Reihenfolge via Platzhalter (immer in Einfüge-Reihenfolge); Sortieren ist Defense-in-Depth-Schwäche, keine aktive Korruption. |
| CR-04 | Critical (advisory) | `detokenizeMarkdown` macht globales `split().join()` → Kollision wenn Nutzer-Prosa literal `__URL_0__` enthält | Edge-Case; Fixture und reale Regel-Dateien enthalten keine solchen Literale; kein Test triggert es. |

Diese Findings sollten in einer Folge-Phase adressiert werden, blockieren aber das Phasen-Ziel nicht.

### Human Verification Required

Keine. Alle Wahrheiten sind verifiziert, alle Artefakte vorhanden/wired/data-flowing, alle Tests grün. Review-Findings sind per User-Anweisung advisory.

### Gaps Summary

Keine Gaps. Phasen-Ziel erreicht. Alle 5 Success Criteria verifiziert, alle 8 Requirements erfüllt, alle Artefakte vorhanden und verkabelt, 65 Tests grün, Build funktionsfähig, CLI end-to-end funktionsfähig.

---

_Verified: 2026-07-24T05:50:00Z_
_Verifier: Claude (gsd-verifier)_
