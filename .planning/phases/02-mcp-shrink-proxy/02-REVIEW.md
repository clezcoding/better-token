---
phase: 02-mcp-shrink-proxy
reviewed: 2026-07-25T05:11:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/core/src/compressor.ts
  - packages/core/src/index.ts
  - packages/core/src/cli.ts
  - packages/shrink-mcp/src/proxy.ts
  - packages/shrink-mcp/src/config.ts
  - packages/shrink-mcp/src/framing.ts
  - packages/shrink-mcp/src/shrink.ts
  - packages/shrink-mcp/src/index.ts
  - packages/core/tests/unit/mcp-descriptions.test.ts
  - packages/core/tests/unit/compressor.test.ts
  - packages/shrink-mcp/tests/unit/shrink.test.ts
  - packages/shrink-mcp/tests/unit/framing.test.ts
  - packages/shrink-mcp/tests/unit/config.test.ts
  - packages/shrink-mcp/tests/integration/proxy.test.ts
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report — MCP Shrink Proxy

**Reviewed:** 2026-07-25T05:11:00Z  
**Depth:** standard  
**Files Reviewed:** 14 (8 Quellmodule + 6 Testdateien)  
**Status:** issues_found

## Summary

Vollständige Phase-02-Implementierung (Pläne 02-01..02-04) geprüft: `@better-token/shrink-mcp`, CLI-Proxy-Integration, `BALANCED_MCP_PATTERNS` in `compressor.ts`, G-02-2-Corpus-Gates. Alle 57 relevanten Tests grün (37 shrink-mcp, 20 core MCP/compressor).

Kernverhalten stimmt mit PLAN/SUMMARY: List-Shrink, `tools/call`-Passthrough, Env-Config, Parse-Fallback, Exit-Code-Propagation, MCP-technische Prosa-Kompression (~13 % Corpus-Einsparung). Keine Security-Blocker (`shell: false`, kein stdout-Logging sensibler Daten, 4MB-Puffer-Cap).

Verbleibende Findings betreffen Robustheit (UTF-8-Framing, Signal/Pipe-Handling), Puffer-Semantik und unbeabsichtigte Nebenwirkung der MCP-Patterns auf allgemeinen Balanced-Modus.

## Critical Issues

Keine Critical-/Blocker-Findings.

## Warnings

### WR-01: UTF-8-Zeichen können an Chunk-Grenzen korrupt werden

**File:** `packages/shrink-mcp/src/proxy.ts:72-74`  
**Issue:** `chunk.toString("utf8")` ohne `StringDecoder` ersetzt unvollständige Multibyte-Sequenzen am Chunk-Ende durch U+FFFD. Folge-Chunk kann fehlerhaften JSON-Text erzeugen — `JSON.parse` schlägt fehl (Pass-through) oder liefert falsche Unicode-Strings in Beschreibungen.  
**Fix:**

```typescript
import { StringDecoder } from "node:string_decoder";

const decoder = new StringDecoder("utf8");
upstream.stdout!.on("data", (chunk: Buffer) => {
  for (const line of reader.push(decoder.write(chunk))) {
    handleUpstreamLine(line, config);
  }
});
// Im exit-Handler: decoder.end() verarbeiten und Restzeilen flushen
```

### WR-02: 4MB-Pufferlimit misst Zeichen, nicht Bytes

**File:** `packages/shrink-mcp/src/framing.ts:7-8`  
**Issue:** `MAX_BUFFER_BYTES` wird gegen `string.length` (UTF-16-Codeunits) geprüft, nicht gegen `Buffer.byteLength`. Bei Nicht-ASCII-Beschreibungen greift das Limit auf dem Draht früher/später als spezifiziert (T-02-01).  
**Fix:** Byte-Akkumulation mit `Buffer.byteLength(this.buffer, "utf8") + chunk.length` vergleichen.

### WR-03: Buffer-Overflow überspringt Newline-Splitting

**File:** `packages/shrink-mcp/src/framing.ts:7-17`  
**Issue:** Bei Überschreitung von 4MB wird `buffer + chunk` als **eine** Zeile zurückgegeben, ohne `\n`-Split. Mehrzeilige NDJSON-Blobs landen in einem `handleUpstreamLine`-Aufruf; `JSON.parse` scheitert → Pass-through mit eingebetteten Newlines. Abweichend vom normalen Ein-Zeile-pro-Record-Pfad.  
**Fix:** Nach Overflow zuerst an `\n` splitten; nur die letzte unvollständige Zeile im Buffer behalten.

### WR-04: Kein Signal-Handler — Upstream-Kind kann bei SIGINT verwaist bleiben

**File:** `packages/shrink-mcp/src/proxy.ts:61-107`  
**Issue:** `runProxy` registriert keine Handler für `SIGINT`/`SIGTERM`. Bei IDE-Abbruch kann Upstream-Prozess weiterlaufen (orphan).  
**Fix:**

```typescript
const onSignal = () => {
  upstream.kill("SIGTERM");
  resolvePromise(1);
};
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);
// In exit/error-Handler: Listener entfernen
```

### WR-05: Kein Error-Handler auf stdin→upstream-Pipe (EPIPE)

**File:** `packages/shrink-mcp/src/proxy.ts:68`  
**Issue:** `process.stdin.pipe(upstream.stdin!)` ohne `'error'`-Listener. Stirbt Upstream, während Client noch schreibt, kann unbehandeltes `EPIPE` den Proxy-Prozess crashen.  
**Fix:** `process.stdin.on("error", () => {})` oder `upstream.stdin?.destroy()` im exit-Handler; Pipe-Fehler gezielt abfangen.

### WR-06: MCP-Patterns wirken global auf Balanced-Modus, nicht nur MCP-Beschreibungen

**File:** `packages/core/src/compressor.ts:58-64,131-142`  
**Issue:** `BALANCED_MCP_PATTERNS` (z. B. „Only works within allowed directories.“, „Use this tool when you need to “) werden in `compressBalanced()` angewendet — also auch bei `compressFile`/`compressMarkdown` auf CLAUDE.md, `.cursorrules` etc. D-05 legte das fest, aber Nicht-MCP-Prosa kann unbeabsichtigt gekürzt werden, solange der Validator noch `ok` liefert.  
**Fix:** MCP-Patterns nur in dediziertem Pfad anwenden (z. B. `compressBalancedMcp()` aus `compressDescription`), oder Feature-Flag/`mode`-Variante `balanced-mcp`.

## Info

### IN-01: CLI erlaubt Upstream ohne `--`-Separator (Dokumentations-Drift)

**File:** `packages/core/src/cli.ts:479-482`  
**Issue:** Usage verlangt `proxy -- <upstream>`, aber Fallback `command.args[0]` akzeptiert `better-token proxy node script.js` ohne `--`. Funktioniert, widerspricht D-01-Dokumentation.  
**Fix:** Fallback entfernen und nur `extractUpstreamFromArgv()` akzeptieren, oder Usage anpassen.

### IN-02: Shrinkable List-Responses werden immer re-serialisiert

**File:** `packages/shrink-mcp/src/proxy.ts:46-54`  
**Issue:** Sobald `isShrinkableListResponse` true ist, geht Output via `JSON.stringify` — auch wenn keine Description geändert wurde. Key-Reihenfolge/Whitespace kann vom Upstream abweichen. Per Plan akzeptiert.  
**Fix:** Optional Original-`line` zurückgeben wenn `beforeJson === afterJson`.

### IN-03: `shrinkListResponse` mutiert Eingabe-Objekt in-place

**File:** `packages/shrink-mcp/src/shrink.ts:47-71`  
**Issue:** Beschreibungen werden direkt am übergebenen `message`-Objekt geändert. Im Proxy-Flow unkritisch (frisch geparst), aber API überrascht bei Wiederverwendung desselben Objekts.  
**Fix:** Shallow-Copy von `message` und Item-Arrays vor Mutation, oder Mutationsverhalten dokumentieren.

---

_Reviewed: 2026-07-25T05:11:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
