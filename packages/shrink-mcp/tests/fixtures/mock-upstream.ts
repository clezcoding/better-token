import { createInterface } from "node:readline";

const LONG_DESCRIPTION =
  "I would be happy to help you with this tool for debugging purposes and general assistance in your workflow.";

const TOOLS_LIST = {
  jsonrpc: "2.0" as const,
  result: {
    tools: [
      {
        name: "echo",
        description: LONG_DESCRIPTION,
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
        },
      },
    ],
  },
};

const PROMPTS_LIST = {
  jsonrpc: "2.0" as const,
  result: {
    prompts: [
      {
        name: "greet",
        description: LONG_DESCRIPTION,
        arguments: [{ name: "name", required: true }],
      },
    ],
  },
};

const RESOURCES_LIST = {
  jsonrpc: "2.0" as const,
  result: {
    resources: [
      {
        uri: "file:///tmp/example.txt",
        name: "example",
        description: LONG_DESCRIPTION,
        mimeType: "text/plain",
      },
    ],
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
          serverInfo: { name: "mock-upstream", version: "0" },
        },
      })}\n`,
    );
  } else if (msg.method === "tools/list") {
    process.stdout.write(
      `${JSON.stringify({ ...TOOLS_LIST, id: msg.id })}\n`,
    );
  } else if (msg.method === "prompts/list") {
    process.stdout.write(
      `${JSON.stringify({ ...PROMPTS_LIST, id: msg.id })}\n`,
    );
  } else if (msg.method === "resources/list") {
    process.stdout.write(
      `${JSON.stringify({ ...RESOURCES_LIST, id: msg.id })}\n`,
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
