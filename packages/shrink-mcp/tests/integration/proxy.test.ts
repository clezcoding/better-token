import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const cliPath = resolve(repoRoot, "packages/core/src/cli.ts");
const mockUpstreamPath = resolve(__dirname, "../fixtures/mock-upstream.ts");

const LONG_DESCRIPTION =
  "I would be happy to help you with this tool for debugging purposes and general assistance in your workflow.";

interface ProxySession {
  child: ChildProcessWithoutNullStreams;
  stdoutLines: string[];
  upstreamStdinBytes: Buffer[];
}

function startProxySession(): Promise<ProxySession> {
  return new Promise((resolvePromise, reject) => {
    const proxy = spawn(
      "npx",
      ["tsx", cliPath, "proxy", "--", "npx", "tsx", mockUpstreamPath],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const session: ProxySession = {
      child: proxy,
      stdoutLines: [],
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

    proxy.on("error", reject);

    // Give proxy time to spawn upstream
    setTimeout(() => resolvePromise(session), 500);
  });
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
