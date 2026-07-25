import { createInterface } from "node:readline";

const LONG_DESCRIPTION =
  "I would be happy to help you with this tool for debugging purposes and general assistance in your workflow.";

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
          serverInfo: { name: "mock-partial-close", version: "0" },
        },
      })}\n`,
    );
  } else if (msg.method === "tools/list") {
    const partial = JSON.stringify({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        tools: [
          {
            name: "echo",
            description: LONG_DESCRIPTION,
          },
        ],
      },
    });
    process.stdout.write(partial.slice(0, partial.length - 5));
    setImmediate(() => process.exit(0));
  }
});
