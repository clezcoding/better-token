# API Coverage — MCP (JSON-RPC over stdio)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
>
> Surface: Model Context Protocol as consumed by `better-token proxy` —
> raw NDJSON stdio interceptor in front of one upstream MCP server.
> No `@modelcontextprotocol/sdk`; bytes in / bytes out except list `description` shrink.

| capability | decision | reason |
|---|---|---|
| stdio NDJSON transport | INTEGRATE | |
| single-upstream child process (`better-token proxy -- …`) | INTEGRATE | |
| tools/list description shrink | INTEGRATE | |
| prompts/list description shrink | INTEGRATE | |
| resources/list description shrink | INTEGRATE | |
| tools/call request+response byte-identical pass-through | INTEGRATE | |
| initialize / initialized lifecycle | INTEGRATE | |
| prompts/get pass-through | INTEGRATE | |
| resources/read pass-through | INTEGRATE | |
| resources/templates/list pass-through | INTEGRATE | |
| resources/subscribe + notifications pass-through | INTEGRATE | |
| notifications/* pass-through | INTEGRATE | |
| ping pass-through | INTEGRATE | |
| JSON-RPC batch array pass-through (no shrink) | INTEGRATE | |
| pagination `nextCursor` preservation on list responses | INTEGRATE | |
| parse-error → original bytes on stdout + stderr notice | INTEGRATE | |
| NDJSON buffer overflow → pass-through flush | INTEGRATE | |
| partial trailing line flush on upstream close | INTEGRATE | |
| upstream non-zero exit code propagation | INTEGRATE | |
| `BETTER_TOKEN_SHRINK_FIELDS` allowlist | INTEGRATE | |
| BETTER_TOKEN_MODE / CLI --mode (safe, balanced, aggressive) | INTEGRATE | |
| `BETTER_TOKEN_DEBUG` / `--debug` estimated token stats | INTEGRATE | |
| validator-fail keeps original description (per-field) | INTEGRATE | |
| `@modelcontextprotocol/sdk` client/server | OPT-OUT | raw NDJSON only — no MCP SDK in v1 |
| HTTP / SSE / Streamable HTTP transport | OPT-OUT | stdio only in Phase 2 |
| multi-upstream hub / mux | OPT-OUT | one upstream per process (D-03); not needed yet |
| shrink non-description fields (name, uri, inputSchema, …) | OPT-OUT | explicitly out of scope — descriptions only |
| invent missing/null descriptions | OPT-OUT | explicitly out of scope (D-08) |
| mutate tools/call payloads | OPT-OUT | explicitly out of scope (MCP-02) |
| sampling | OPT-OUT | not needed — proxy never initiates sampling |
| roots client | OPT-OUT | not needed — no roots client in proxy |
| elicitation | OPT-OUT | not needed yet |
| L3 honest stats package | OPT-OUT | deferred to Phase 4 |
| Claude Code / Cursor adapters | OPT-OUT | deferred to Phase 3 |
| profile compiler / installer | OPT-OUT | deferred to Phase 5 |
