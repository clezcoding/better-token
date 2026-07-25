---
phase: quick-260725-bhw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shrink-mcp/package.json
  - package-lock.json
  - package.json
autonomous: true
requirements:
  - QUICK-260725-bhw
must_haves:
  truths:
    - "packages/shrink-mcp nutzt vitest ^4.1.10 (mindestens ^3.2.6)"
    - "Lockfile enthält kein vitest < 3.2.6, kein vite ≤ 6.4.2, kein esbuild ≤ 0.24.2"
    - "npm test für alle Workspace-Pakete besteht"
    - "Keine Dependabot-/Security-Alerts wurden dismissed/snoozed/ignored — nur Versionsfixes"
  artifacts:
    - path: packages/shrink-mcp/package.json
      provides: "vitest DevDependency auf sichere Version angehoben"
    - path: package-lock.json
      provides: "Aufgelöste sichere vitest/vite/esbuild-Bäume"
  key_links:
    - from: packages/shrink-mcp/package.json
      to: package-lock.json
      via: "npm install am Repo-Root aktualisiert shrink-mcp vitest und entfernt vite@5/esbuild@0.21.5 Nesting"
      pattern: "packages/shrink-mcp/node_modules/vitest"
    - from: package-lock.json
      to: Dependabot alerts #7,#3,#4,#5,#2,#1
      via: "Bump schließt kritische vitest- und transitive vite/esbuild-Advisories"
---

<objective>
Alle offenen Dependabot-Alerts (#7, #3, #4, #5, #2, #1) durch echte Dependency-Fixes schließen — Root Cause ist `vitest ^2.0.0` in shrink-mcp.

Purpose: Kritische Vitest-UI-Advisory und transitive Vite/esbuild-Lücken entfernen, ohne Alerts zu dismissen.
Output: Aktualisierte `packages/shrink-mcp/package.json`, frisches `package-lock.json`, ggf. Root-`overrides` nur als Fallback, grüne Tests, SUMMARY.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260725-bhw-fix-all-dependabot-alerts-and-github-sec/260725-bhw-INVESTIGATION.md
@packages/shrink-mcp/package.json
@packages/core/package.json
@package.json

# Autoritative Inventory (INVESTIGATION.md — nicht neu inventarisieren)
- #7 shrink-mcp vitest critical (&lt;3.2.6) — direct ^2.0.0 → 2.1.9
- #3 vitest lockfile critical — gleiche Kette
- #4/#5/#2 vite lockfile — brauchen ≥6.4.3 (derzeit 5.4.21 unter shrink-mcp)
- #1 esbuild nested 0.21.5 — brauchen ≥0.25.0 (vite@5 → esbuild@0.21.5)
- #6 core vitest bereits fixed (^4.1.10)
- Code scanning / Issues / secret scanning: 0 open — keine Extra-Arbeit erfinden

# Lockfile-Ist (Branch)
- packages/shrink-mcp/node_modules/vitest @ 2.1.9
- packages/shrink-mcp/node_modules/vite @ 5.4.21
- packages/shrink-mcp/node_modules/vite/node_modules/esbuild @ 0.21.5
- node_modules/vite-node/node_modules/{vite@5.4.21,esbuild@0.21.5}
- Root/core bereits vitest 4.1.10, vite 8.1.5, esbuild 0.28.1
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: shrink-mcp vitest anheben und Lockfile bereinigen</name>
  <files>packages/shrink-mcp/package.json, package-lock.json, package.json</files>
  <action>
Gemäß INVESTIGATION.md: In `packages/shrink-mcp/package.json` `devDependencies.vitest` von `^2.0.0` auf `^4.1.10` setzen (Alignment mit `packages/core`; Minimum wäre `^3.2.6` — nur wenn ^4.1.10 Tests unrettbar bricht, dann `^3.2.6`, nicht darunter).

Am Repo-Root `npm install` ausführen, damit `package-lock.json` neu auflöst.

Danach Lockfile prüfen (Node-Skript oder `npm ls`): es darf **kein** Eintrag mit vitest &lt; 3.2.6, vite ≤ 6.4.2 oder esbuild ≤ 0.24.2 verbleiben (inkl. nested unter `packages/shrink-mcp` und `vite-node`).

Nur wenn nach dem direkten Bump noch unsichere transitive Reste bleiben: Root-`package.json` `overrides` für `vite` und/oder `esbuild` auf sichere Versionen setzen und erneut `npm install`. Overrides sind Last Resort, nicht erster Schritt. Keine anderen Dependencies anfassen. Keine Alerts dismissen/snoozen/ignoren.
  </action>
  <verify>
    <automated>node -e 'const p=require("./packages/shrink-mcp/package.json"); const v=p.devDependencies.vitest; if(v!=="^4.1.10"&&v!=="^3.2.6"){console.error("bad vitest range",v);process.exit(1);} const lock=require("./package-lock.json"); const bad=[]; for(const [k,meta] of Object.entries(lock.packages||{})){const name=k.split("node_modules/").pop(); const ver=meta.version; if(!ver) continue; const [a,b,c]=ver.split(".").map(Number); if(name==="vitest"&&(a<3||(a===3&&b<2)||(a===3&&b===2&&c<6))) bad.push(k+"@"+ver); if(name==="vite"&&(a<6||(a===6&&b<4)||(a===6&&b===4&&c<=2))) bad.push(k+"@"+ver); if(name==="esbuild"&&(a===0&&b<=24)) bad.push(k+"@"+ver);} if(bad.length){console.error(bad.join("\n"));process.exit(1);} console.log("lockfile OK");'</automated>
  </verify>
  <done>shrink-mcp vitest ist ^4.1.10 (oder bewiesen ^3.2.6); Lockfile frei von vitest&lt;3.2.6, vite≤6.4.2, esbuild≤0.24.2.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Tests grün machen und Alert-Status prüfen</name>
  <files>packages/shrink-mcp/tests/**/*.ts, packages/shrink-mcp/package.json, package-lock.json</files>
  <action>
`npm test` am Repo-Root ausführen (baut shrink-mcp, dann core- und shrink-mcp-Tests). Bei Vitest-2→4-Brüchen nur notwendige Test-/Config-Anpassungen in shrink-mcp (Import-API, Config-Keys) — keine Feature-Änderungen.

Danach Alert-Status nur lesen:

`gh api repos/{owner}/{repo}/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'`

sowie optional Liste der offenen Alerts. Erwartung: nach Push/Scan-Lag fallen #7/#3/#4/#5/#2/#1 weg; falls Scan noch offen zeigt, in SUMMARY vermerken dass Fix im Lockfile liegt und Re-Scan abwarten.

HARD RULE: Niemals Dependabot dismiss/snooze/ignore API oder UI nutzen. Code-scanning/Issues/secret-scanning nicht anfassen außer Re-Check zeigt neue Offene (aktuell 0).
  </action>
  <verify>
    <automated>npm test</automated>
  </verify>
  <done>Alle Workspace-Tests grün; Dependabot nur via Versionsfix adressiert; SUMMARY dokumentiert Lockfile-Gates und gh-api Open-Count (ohne Dismiss).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → lockfile | Untrusted package tarballs/version resolution cross into the build/test toolchain |
| Dev toolchain → repo | Vulnerable vitest/vite/esbuild could enable local file read / path traversal during `vitest run` |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-bhw-01 | Tampering | packages/shrink-mcp vitest&lt;3.2.6 | critical | mitigate | Bump to ^4.1.10 (min ^3.2.6); closes GHSA-5xrq-8626-4rwp |
| T-bhw-02 | Elevation | nested vite≤6.4.2 under shrink-mcp | high | mitigate | Vitest bump pulls vite≥6.4.3; verify lockfile; overrides only if leftovers |
| T-bhw-03 | Information Disclosure | nested esbuild≤0.24.2 | medium | mitigate | Remove vite@5→esbuild@0.21.5 chain via vitest upgrade / override |
| T-bhw-04 | Tampering | False “fixed” via dismiss API | high | mitigate | Executor must never call dismiss; only version/code fixes |
| T-bhw-SC | Tampering | npm installs during bump | medium | accept | Nur bestehende Pakete (vitest/vite/esbuild) Versionsbump — keine neuen Package-Namen |
</threat_model>

<verification>
1. `packages/shrink-mcp/package.json` zeigt vitest ^4.1.10 (oder dokumentiert ^3.2.6 mit Testbegründung).
2. Lockfile-Gate-Skript: keine unsicheren vitest/vite/esbuild-Versionen.
3. `npm test` exit 0.
4. `gh api .../dependabot/alerts` — keine Dismiss-Calls; Open-Count dokumentieren.
</verification>

<success_criteria>
- Alle sechs Inventar-Alerts (#7,#3,#4,#5,#2,#1) durch Lockfile-/Manifest-Fixes adressiert
- Keine dismiss/snooze/ignore-Aktionen
- Tests grün; shrink-mcp mit core auf gleicher Vitest-Major-Linie soweit möglich
</success_criteria>

<output>
Create `.planning/quick/260725-bhw-fix-all-dependabot-alerts-and-github-sec/260725-bhw-SUMMARY.md` when done
</output>
