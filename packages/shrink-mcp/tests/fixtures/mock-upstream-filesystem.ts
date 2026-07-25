import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(
  __dirname,
  "../../../core/tests/fixtures/filesystem-tools-descriptions.json",
);
const filesystemCorpus = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as Array<{ name: string; description: string }>;

const TOOLS_LIST = {
  jsonrpc: "2.0" as const,
  result: {
    tools: filesystemCorpus.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
      },
    })),
  },
};

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  let msg: { method?: string; id?: number | string };
  try {
    msg = JSON.parse(line) as { method?: string; id?: number | string };
  } catch {
    return;
  }

  if (msg.method === "initialize") {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          serverInfo: { name: "mock-upstream-filesystem", version: "0" },
        },
      })}\n`,
    );
  } else if (msg.method === "tools/list") {
    process.stdout.write(
      `${JSON.stringify({ ...TOOLS_LIST, id: msg.id })}\n`,
    );
  } else if (msg.method === "tools/call") {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id,
        result: { content: [{ type: "text", text: line }] },
      })}\n`,
    );
  }
});
