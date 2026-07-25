import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const cliPath = resolve(repoRoot, "packages/core/src/cli.ts");
const filesystemFixturePath = resolve(
  repoRoot,
  "packages/core/tests/fixtures/filesystem-tools-descriptions.json",
);
const filesystemCorpus = JSON.parse(
  readFileSync(filesystemFixturePath, "utf-8"),
) as Array<{ name: string; description: string }>;

function sumDescriptionChars(descriptions: string[]): number {
  return descriptions.reduce((sum, d) => sum + d.length, 0);
}

const filesystemBaselineChars = sumDescriptionChars(
  filesystemCorpus.map((t) => t.description),
);

const LONG_DESCRIPTION =
  "I would be happy to help you with this tool for debugging purposes and general assistance in your workflow.";

interface ProxySession {
  child: ChildProcessWithoutNullStreams;
  stdoutLines: string[];
  stderrChunks: string[];
  upstreamStdinBytes: Buffer[];
}

function startProxySession(
  upstreamFixture = "mock-upstream.ts",
  envOverrides: Record<string, string> = {},
  cliArgs: string[] = [],
): Promise<ProxySession> {
  return new Promise((resolvePromise, reject) => {
    const upstreamPath = resolve(__dirname, "../fixtures", upstreamFixture);
    const proxy = spawn(
      "npx",
      [
        "tsx",
        cliPath,
        "proxy",
        ...cliArgs,
        "--",
        "npx",
        "tsx",
        upstreamPath,
      ],
      {
        cwd: repoRoot,
        env: { ...process.env, ...envOverrides },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const session: ProxySession = {
      child: proxy,
      stdoutLines: [],
      stderrChunks: [],
      upstreamStdinBytes: [],
    };

    let stdoutBuffer = "";

    proxy.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      let idx: number;
      while ((idx = stdoutBuffer.indexOf("\n")) !== -1) {
        const line = stdoutBuffer.slice(0, idx);
        stdoutBuffer = stdoutBuffer.slice(idx + 1);
        if (line.length > 0) {
          session.stdoutLines.push(line);
        }
      }
    });

    proxy.stderr.on("data", (chunk: Buffer) => {
      session.stderrChunks.push(chunk.toString("utf8"));
    });

    proxy.on("error", reject);

    // Give proxy time to spawn upstream
    setTimeout(() => resolvePromise(session), 500);
  });
}

function sessionStderr(session: ProxySession): string {
  return session.stderrChunks.join("");
}

function sendJsonRpc(
  session: ProxySession,
  message: Record<string, unknown>,
): void {
  session.child.stdin.write(`${JSON.stringify(message)}\n`);
}

function waitForStdoutLine(
  session: ProxySession,
  predicate: (line: string) => boolean,
  timeoutMs = 5000,
): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const startCount = session.stdoutLines.length;

    const check = () => {
      for (let i = startCount; i < session.stdoutLines.length; i++) {
        const line = session.stdoutLines[i]!;
        if (predicate(line)) {
          resolvePromise(line);
          return;
        }
      }
    };

    check();

    const interval = setInterval(() => {
      check();
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Timed out waiting for stdout line"));
    }, timeoutMs);

    const originalPush = session.stdoutLines.push.bind(session.stdoutLines);
    session.stdoutLines.push = (...items: string[]) => {
      const result = originalPush(...items);
      for (const item of items) {
        if (predicate(item)) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolvePromise(item);
        }
      }
      return result;
    };
  });
}

function killSession(session: ProxySession): void {
  session.child.kill("SIGTERM");
}

describe("MCP shrink proxy integration", () => {
  it(
    "MCP-01: compresses tools/prompts/resources list descriptions via proxy",
    async () => {
    const session = await startProxySession();

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          const msg = JSON.parse(line) as { id?: number };
          return msg.id === 1;
        } catch {
          return false;
        }
      });

      sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
      const toolsLine = await waitForStdoutLine(
        session,
        (line) => {
          try {
            const msg = JSON.parse(line) as { id?: number };
            return msg.id === 2;
          } catch {
            return false;
          }
        },
      );
      const toolsMsg = JSON.parse(toolsLine) as {
        result: {
          tools: Array<{
            name: string;
            description: string;
            inputSchema: unknown;
          }>;
        };
      };

      expect(toolsMsg.result.tools[0]!.name).toBe("echo");
      expect(toolsMsg.result.tools[0]!.inputSchema).toEqual({
        type: "object",
        properties: { text: { type: "string" } },
      });
      expect(toolsMsg.result.tools[0]!.description.length).toBeLessThan(
        LONG_DESCRIPTION.length,
      );
      expect(toolsMsg.result.tools[0]!.description).not.toBe(LONG_DESCRIPTION);

      sendJsonRpc(session, { jsonrpc: "2.0", id: 3, method: "prompts/list" });
      const promptsLine = await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 3;
        } catch {
          return false;
        }
      });
      const promptsMsg = JSON.parse(promptsLine) as {
        result: {
          prompts: Array<{ name: string; description: string }>;
        };
      };
      expect(promptsMsg.result.prompts[0]!.name).toBe("greet");
      expect(promptsMsg.result.prompts[0]!.description.length).toBeLessThan(
        LONG_DESCRIPTION.length,
      );

      sendJsonRpc(session, { jsonrpc: "2.0", id: 4, method: "resources/list" });
      const resourcesLine = await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 4;
        } catch {
          return false;
        }
      });
      const resourcesMsg = JSON.parse(resourcesLine) as {
        result: {
          resources: Array<{ uri: string; name: string; description: string }>;
        };
      };
      expect(resourcesMsg.result.resources[0]!.uri).toBe(
        "file:///tmp/example.txt",
      );
      expect(resourcesMsg.result.resources[0]!.name).toBe("example");
      expect(resourcesMsg.result.resources[0]!.description.length).toBeLessThan(
        LONG_DESCRIPTION.length,
      );
    } finally {
      killSession(session);
    }
  },
    15000,
  );

  it(
    "MCP-04: BETTER_TOKEN_SHRINK_FIELDS=tools.description shrinks tools only",
    async () => {
      const session = await startProxySession("mock-upstream.ts", {
        BETTER_TOKEN_SHRINK_FIELDS: "tools.description",
      });

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
        const toolsLine = await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 2;
          } catch {
            return false;
          }
        });
        const toolsMsg = JSON.parse(toolsLine) as {
          result: { tools: Array<{ description: string }> };
        };
        expect(toolsMsg.result.tools[0]!.description.length).toBeLessThan(
          LONG_DESCRIPTION.length,
        );
        expect(toolsMsg.result.tools[0]!.description).not.toBe(LONG_DESCRIPTION);

        sendJsonRpc(session, { jsonrpc: "2.0", id: 3, method: "prompts/list" });
        const promptsLine = await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 3;
          } catch {
            return false;
          }
        });
        const promptsMsg = JSON.parse(promptsLine) as {
          result: { prompts: Array<{ description: string }> };
        };
        expect(promptsMsg.result.prompts[0]!.description).toBe(LONG_DESCRIPTION);

        sendJsonRpc(session, { jsonrpc: "2.0", id: 4, method: "resources/list" });
        const resourcesLine = await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 4;
          } catch {
            return false;
          }
        });
        const resourcesMsg = JSON.parse(resourcesLine) as {
          result: { resources: Array<{ description: string }> };
        };
        expect(resourcesMsg.result.resources[0]!.description).toBe(
          LONG_DESCRIPTION,
        );
      } finally {
        killSession(session);
      }
    },
    15000,
  );

  it(
    "MCP-02: tools/call request and response pass through byte-identical",
    async () => {
    const session = await startProxySession();

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 1;
        } catch {
          return false;
        }
      });

      const callRequest = {
        jsonrpc: "2.0" as const,
        id: 99,
        method: "tools/call",
        params: {
          name: "echo",
          arguments: { text: "hello world" },
        },
      };
      const requestBytes = Buffer.from(`${JSON.stringify(callRequest)}\n`, "utf8");
      session.child.stdin.write(requestBytes);

      const responseLine = await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 99;
        } catch {
          return false;
        }
      });

      const expectedResponse = JSON.stringify({
        jsonrpc: "2.0",
        id: 99,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(callRequest),
            },
          ],
        },
      });

      expect(responseLine).toBe(expectedResponse);
    } finally {
      killSession(session);
    }
  },
    15000,
  );
});

describe("MCP-03 parse pass-through", () => {
  it(
    "MCP-03: invalid JSON line passes through unchanged and valid list still shrinks",
    async () => {
      const session = await startProxySession("mock-upstream-bad-line.ts");

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });

        await waitForStdoutLine(session, (line) => line === "NOT VALID JSON LINE");

        const toolsLine = await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 2;
          } catch {
            return false;
          }
        });

        const toolsMsg = JSON.parse(toolsLine) as {
          result: { tools: Array<{ description: string }> };
        };
        expect(toolsMsg.result.tools[0]!.description.length).toBeLessThan(
          LONG_DESCRIPTION.length,
        );

        const stderr = sessionStderr(session);
        const passThroughLines = stderr
          .split("\n")
          .filter((l) => l.includes("pass-through") && l.includes("parse"));
        expect(passThroughLines).toHaveLength(1);
      } finally {
        killSession(session);
      }
    },
    15000,
  );

  it(
    "D-13: parse-error notice appears even when debug is false",
    async () => {
      const session = await startProxySession("mock-upstream-bad-line.ts", {
        BETTER_TOKEN_DEBUG: "0",
      });

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
        await waitForStdoutLine(session, (line) => line === "NOT VALID JSON LINE");

        expect(sessionStderr(session)).toMatch(/pass-through.*parse/i);
      } finally {
        killSession(session);
      }
    },
    15000,
  );
});

describe("D-14 debug shrink stats", () => {
  it(
    "D-14: with debug enabled stderr shows estimated before/after token figures",
    async () => {
      const session = await startProxySession(
        "mock-upstream.ts",
        { BETTER_TOKEN_DEBUG: "1" },
        ["--debug"],
      );

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 2;
          } catch {
            return false;
          }
        });

        const stderr = sessionStderr(session);
        expect(stderr).toMatch(/estimated before:/i);
        expect(stderr).toMatch(/estimated after:/i);
        expect(session.stdoutLines.every((l) => !l.includes("estimated before"))).toBe(
          true,
        );
      } finally {
        killSession(session);
      }
    },
    15000,
  );

  it(
    "D-14: with debug disabled no shrink-success stats on stderr",
    async () => {
      const session = await startProxySession("mock-upstream.ts", {
        BETTER_TOKEN_DEBUG: "0",
      });

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 2;
          } catch {
            return false;
          }
        });

        await new Promise((r) => setTimeout(r, 300));
        expect(sessionStderr(session)).not.toMatch(/estimated before:/i);
        expect(sessionStderr(session)).not.toMatch(/estimated after:/i);
      } finally {
        killSession(session);
      }
    },
    15000,
  );
});

describe("D-15 upstream exit propagation", () => {
  it(
    "D-15: proxy exits with upstream non-zero code and stderr mentions exit",
    async () => {
      const session = await startProxySession("mock-upstream-exit7.ts");

      try {
        sendJsonRpc(session, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        });

        await waitForStdoutLine(session, (line) => {
          try {
            return (JSON.parse(line) as { id?: number }).id === 1;
          } catch {
            return false;
          }
        });

        const exitCode = await new Promise<number>((resolvePromise) => {
          session.child.on("exit", (code) => resolvePromise(code ?? -1));
        });

        expect(exitCode).toBe(7);
        expect(sessionStderr(session)).toMatch(/upstream exited with code 7/i);
      } finally {
        killSession(session);
      }
    },
    15000,
  );
});

describe("batch and framing edge cases", () => {
  it("batch JSON-RPC array passes through original line unchanged", async () => {
    const session = await startProxySession("mock-upstream-batch.ts");

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 1;
        } catch {
          return false;
        }
      });

      sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
      const batchLine = await waitForStdoutLine(session, (line) => {
        try {
          const parsed = JSON.parse(line) as unknown;
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      });

      const reparsed = JSON.parse(batchLine) as unknown[];
      expect(reparsed).toHaveLength(2);
      expect(reparsed[0]).toMatchObject({ id: 2, result: { tools: expect.any(Array) } });
      expect(reparsed[1]).toMatchObject({
        method: "notifications/tools/list_changed",
      });
      expect(
        (reparsed[0] as { result: { tools: Array<{ description: string }> } })
          .result.tools[0]!.description,
      ).toBe(LONG_DESCRIPTION);
    } finally {
      killSession(session);
    }
  });

  it("partial trailing line without newline flushes on upstream close", async () => {
    const session = await startProxySession("mock-upstream-partial-close.ts");

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 1;
        } catch {
          return false;
        }
      });

      sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });

      const partialLine = await waitForStdoutLine(
        session,
        (line) => line.startsWith('{"jsonrpc":"2.0"') && !line.endsWith("}"),
        8000,
      );

      expect(partialLine.length).toBeGreaterThan(10);
      expect(() => JSON.parse(partialLine)).toThrow();
    } finally {
      killSession(session);
    }
  });

  it("nextCursor preserved on paginated tools/list while descriptions shrink", async () => {
    const session = await startProxySession("mock-upstream-paginated.ts");

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 1;
        } catch {
          return false;
        }
      });

      sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
      const toolsLine = await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 2;
        } catch {
          return false;
        }
      });

      const toolsMsg = JSON.parse(toolsLine) as {
        result: {
          nextCursor: string;
          tools: Array<{ description: string }>;
        };
      };
      expect(toolsMsg.result.nextCursor).toBe("page-2-token-abc123");
      expect(toolsMsg.result.tools[0]!.description.length).toBeLessThan(
        LONG_DESCRIPTION.length,
      );
    } finally {
      killSession(session);
    }
  });

  it("G-02-2: proxy shrinks filesystem corpus mock upstream", async () => {
    const session = await startProxySession("mock-upstream-filesystem.ts");

    try {
      sendJsonRpc(session, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      });

      await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 1;
        } catch {
          return false;
        }
      });

      sendJsonRpc(session, { jsonrpc: "2.0", id: 2, method: "tools/list" });
      const toolsLine = await waitForStdoutLine(session, (line) => {
        try {
          return (JSON.parse(line) as { id?: number }).id === 2;
        } catch {
          return false;
        }
      });

      const toolsMsg = JSON.parse(toolsLine) as {
        result: { tools: Array<{ description: string }> };
      };
      const shrunkChars = sumDescriptionChars(
        toolsMsg.result.tools.map((t) => t.description),
      );
      const savingsPct =
        ((filesystemBaselineChars - shrunkChars) / filesystemBaselineChars) *
        100;
      expect(shrunkChars).toBeLessThan(filesystemBaselineChars);
      expect(savingsPct).toBeGreaterThanOrEqual(8);
    } finally {
      killSession(session);
    }
  });
});
