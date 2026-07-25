# Phase 2: MCP Shrink Proxy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 2-MCP Shrink Proxy
**Areas discussed:** Proxy-Start / CLI-Einstieg, Description-Compress-Mode, Env-Feld-Konfiguration, Proxy-Feedback bei Fehlern/Debug
**Mode:** interactive discuss; `--batch` enabled from Env-Feld onward

---

## Proxy-Start / CLI-Einstieg

### Q1: How start proxy in mcp.json?

| Option | Description | Selected |
|--------|-------------|----------|
| `better-token proxy -- <upstream>` | CLI subcommand; upstream child after `--` | ✓ |
| Dedicated bin `better-token-mcp` | Separate package binary | |
| Env-only wrapper | Inject without explicit proxy command | |

**User's choice:** `better-token proxy -- <upstream>`
**Notes:** User asked for explanation of “proxy” and exact mutation behavior before locking one-upstream vs hub.

### Q2: Upstream args / env

| Option | Description | Selected |
|--------|-------------|----------|
| Everything after `--` + env inheritance | mcp.json-friendly | ✓ |
| Explicit `--cmd` / `--arg` flags | Verbose in mcp.json | |
| Config file | Extra file for v1 | |

**User's choice:** Args after `--`, env inheritance

### Q3: One upstream vs hub

| Option | Description | Selected |
|--------|-------------|----------|
| One upstream per process | Multiple mcp.json entries | ✓ |
| Multi-upstream hub | Single process routes many servers | |
| You decide | | |

**User's choice:** One upstream per process
**Notes:** Hub deferred after tradeoff explanation (isolation vs central config).

### Q4: Package / bin placement

| Option | Description | Selected |
|--------|-------------|----------|
| CLI in core bin, logic in `packages/shrink-mcp` | One user-facing bin | ✓ |
| Separate bin from shrink-mcp only | Two entry points | |
| Everything in `packages/core` | Faster; fights research layout | |

**User's choice:** Core bin + shrink-mcp package

---

## Description-Compress-Mode

### Q1: Aggressiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Same L1 modes (default balanced) | Reuse Phase 1 mental model | ✓ |
| Fixed shrink default only | No mode switch in Phase 2 | |
| Always `safe` | Max safety, less savings | |

**User's choice:** Same L1 modes

### Q2: How set mode

| Option | Description | Selected |
|--------|-------------|----------|
| `BETTER_TOKEN_MODE` + optional `--mode` | Env for mcp.json, flag for CLI | ✓ |
| `--mode` only | | |
| Fixed balanced in Phase 2 | | |

**User's choice:** Env + optional `--mode`

### Q3: Validator

| Option | Description | Selected |
|--------|-------------|----------|
| Compressor + validator; fail keeps original description | Field-local rollback | ✓ |
| Compressor without byte validator | | |
| You decide | | |

**User's choice:** Compressor + validator

### Q4: Short descriptions

| Option | Description | Selected |
|--------|-------------|----------|
| Skip below min length | Threshold = Claude discretion | ✓ |
| Always run compressor | | |
| Never touch null; always compress others | | |

**User's choice:** Skip below min length

---

## Env-Feld-Konfiguration (--batch)

| # | Option | Selected |
|---|--------|----------|
| 1 Default lists | (a) tools+prompts+resources all on / (b) tools only / (c) tools+prompts | ✓ a |
| 2 Field config | (a) `BETTER_TOKEN_SHRINK_FIELDS` allowlist / (b) boolean flags / (c) JSON env | ✓ a |
| 3 Prefix | (a) `BETTER_TOKEN_*` / (b) `BT_*` / (c) you decide | ✓ a |
| 4 Invalid config | (a) stderr warn + safe defaults / (b) hard fail / (c) silent defaults | ✓ a |

**User's choice:** `1a, 2a, 3a, 4a`

---

## Proxy-Feedback bei Fehlern/Debug (--batch)

| # | Option | Selected |
|---|--------|----------|
| 1 Parse error visibility | (a) one stderr line / (b) silent / (c) only if debug | ✓ a |
| 2 Successful shrink logs | (a) debug only / (b) always stderr / (c) never in Phase 2 | ✓ a |
| 3 Upstream crash | (a) same exit code + stderr / (b) stay alive / (c) you decide | ✓ c → Claude locked (a) |
| 4 Debug activation | (a) env+flag / (b) VERBOSE env / (c) `--debug` only | ✓ c initially |

**Follow-up (conflict 2a vs 4c):** How enable debug?
| Option | Selected |
|--------|----------|
| Only `--debug` | |
| Only `BETTER_TOKEN_DEBUG=1` | |
| Either `--debug` OR env | ✓ |

**User's choice:** Dual debug path; upstream-crash behavior = Claude discretion → same exit code + stderr

---

## Claude's Discretion

- Min-length threshold for short descriptions
- Exact stderr / debug log wording
- JSON-RPC buffering implementation details
- Default `BETTER_TOKEN_SHRINK_FIELDS` literal when unset
- CLI `--mode` vs env precedence (recommend flag wins)
- Upstream non-zero exit handling details (locked outcome: same exit code + stderr)

## Deferred Ideas

- Multi-upstream hub (Phase 5+ / backlog)
- Aggregated L3 stats (Phase 4)
- Auto-install of mcp.json proxy entries (Phase 5)
