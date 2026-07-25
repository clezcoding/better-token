---
phase: 02-mcp-shrink-proxy
reviewed: 2026-07-25T03:52:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/shrink-mcp/src/proxy.ts
  - packages/shrink-mcp/src/config.ts
  - packages/shrink-mcp/src/framing.ts
  - packages/shrink-mcp/src/shrink.ts
  - packages/shrink-mcp/src/index.ts
  - packages/core/src/cli.ts
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
advisory: true
---

# Phase 02: Code Review Report — MCP Shrink Proxy

**Reviewed:** 2026-07-25T03:52:00Z  
**Depth:** standard  
**Files Reviewed:** 6  
**Status:** issues_found (advisory — kein Ship-Blocker)

## Summary

Phase-02-Implementierung unter `packages/shrink-mcp/` und CLI-Integration in `packages/core/src/cli.ts` wurde gegen PLAN/SUMMARY (02-01..02-03) geprüft. Kernverhalten (List-Shrink, `tools/call`-Passthrough, Config-Env, Parse-Fallback, Exit-Code-Propagation) ist konsistent mit den Anforderungen. Keine Sicherheits-Blocker (kein `shell:true`, kein MCP-SDK, kein stdout-Logging).

Es bleiben robustheitsrelevante Lücken: UTF-8-Chunk-Grenzen, fehlende Signal-/Pipe-Fehlerbehandlung, und ein CLI-Dokumentations-Drift. Alle Findings sind **advisory** — Phase kann shipen, Fixes sind empfohlen.

## Critical Issues

Keine Critical-/Blocker-Findings.

## Warnings

### WR-01: UTF-8-Zeichen können an Chunk-Grenzen korrupt werden

**File:** `packages/shrink-mcp/src/proxy.ts:72-74`  
**Issue:** `chunk.toString("utf8")` ohne `StringDecoder` ersetzt unvollständige Multibyte-Sequenzen am Chunk-Ende durch U+FFFD. Folge-Chunk kann dann fehlerhaften JSON-Text erzeugen — `JSON.parse` schlägt fehl (Pass-through) oder liefert falsche Strings in seltenen Fällen.  
**Fix:**

```typescript
import { StringDecoder } from "node:string_decoder";

const decoder = new StringDecoder("utf8");
upstream.stdout!.on("data", (chunk: Buffer) => {
  for (const line of reader.push(decoder.write(chunk))) {
    handleUpstreamLine(line, config);
  }
});
// Im exit-Handler: decoder.end() verarbeiten
```

### WR-02: 4MB-Pufferlimit misst Zeichen, nicht Bytes

**File:** `packages/shrink-mcp/src/framing.ts:7-8`  
**Issue:** `MAX_BUFFER_BYTES` wird gegen `string.length` (UTF-16-Codeunits) geprüft, nicht gegen `Buffer.byteLength`. Bei Nicht-ASCII-Beschreibungen kann das Limit auf dem Draht früher/später greifen als spezifiziert (T-02-01).  
**Fix:** Byte-Akkumulation mit `Buffer.concat` oder `Buffer.byteLength(this.buffer, "utf8") + chunk.length` vergleichen.

### WR-03: Buffer-Overflow überspringt Newline-Splitting

**File:** `packages/shrink-mcp/src/framing.ts:7-17`  
**Issue:** Bei Überschreitung von 4MB wird `buffer + chunk` als **eine** Zeile zurückgegeben, ohne `\n`-Split. Mehrzeilige NDJSON-Blobs landen in einem `handleUpstreamLine`-Aufruf; `JSON.parse` scheitert → Pass-through mit eingebetteten Newlines. Meist vom Client toleriert, aber abweichend vom normalen Ein-Zeile-pro-Record-Pfad und schwer debugbar.  
**Fix:** Nach Overflow zuerst an `\n` splitten; nur die letzte unvollständige Zeile im Buffer behalten.

### WR-04: Kein Signal-Handler — Upstream-Kind kann bei SIGINT verwaist bleiben

**File:** `packages/shrink-mcp/src/proxy.ts:61-107`  
**Issue:** `runProxy` registriert keine Handler für `SIGINT`/`SIGTERM`. Bei IDE-Abbruch kann Upstream-Prozess weiterlaufen (orphan), bis manuell beendet.  
**Fix:**

```typescript
const onSignal = () => {
  upstream.kill("SIGTERM");
  resolvePromise(1);
};
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);
// In exit/error-Handler: process.off("SIGINT", onSignal) etc.
```

### WR-05: Kein Error-Handler auf stdin→upstream-Pipe (EPIPE)

**File:** `packages/shrink-mcp/src/proxy.ts:68`  
**Issue:** `process.stdin.pipe(upstream.stdin!)` ohne `'error'`-Listener. Stirbt Upstream, während Client noch schreibt, kann unbehandeltes `EPIPE` den Proxy-Prozess crashen.  
**Fix:** `process.stdin.on("error", () => {})` oder explizit `upstream.stdin?.destroy()` im exit-Handler; optional `pipe` mit `{ end: true }` und Fehler swallowen.

## Info

### IN-01: CLI erlaubt Upstream ohne `--`-Separator (Dokumentations-Drift)

**File:** `packages/core/src/cli.ts:479-482`  
**Issue:** Usage verlangt `proxy -- <upstream>`, aber Fallback `command.args[0]` akzeptiert `better-token proxy node script.js` ohne `--`. Funktioniert, widerspricht D-01-Dokumentation.  
**Fix:** Fallback entfernen und nur `extractUpstreamFromArgv()` akzeptieren, oder Usage anpassen.

### IN-02: Shrinkable List-Responses werden immer re-serialisiert

**File:** `packages/shrink-mcp/src/proxy.ts:46-54`  
**Issue:** Sobald `isShrinkableListResponse` true ist, geht Output via `JSON.stringify` — auch wenn keine Description geändert wurde. Key-Reihenfolge/Whitespace kann vom Upstream abweichen. Per Plan akzeptiert, aber für byte-parity-sensitive Clients relevant.  
**Fix:** Optional Original-`line` zurückgeben wenn `beforeJson === afterJson`.

---

_Reviewed: 2026-07-25T03:52:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_  
_Advisory: true — Findings blockieren Phase-Abschluss nicht_
