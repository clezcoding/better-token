import { createInterface } from "node:readline";

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
          serverInfo: { name: "mock-exit7", version: "0" },
        },
      })}\n`,
    );
    setImmediate(() => process.exit(7));
  }
});
