const MAX_BUFFER_BYTES = 4 * 1024 * 1024;

function byteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

export class NdjsonReadBuffer {
  private buffer = "";

  push(chunk: string): string[] {
    if (byteLength(this.buffer) + byteLength(chunk) > MAX_BUFFER_BYTES) {
      const overflow =
        byteLength(this.buffer) + byteLength(chunk) - MAX_BUFFER_BYTES;
      process.stderr.write(
        `better-token proxy: NDJSON buffer exceeded 4MB; flushing pass-through (${overflow} bytes over limit)\n`,
      );

      // Emit any already-complete lines first so overflow does not swallow them.
      const lines: string[] = [];
      let idx: number;
      while ((idx = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        if (line.length > 0) {
          lines.push(line);
        }
      }

      // Bound the overflow payload: flush remainder + chunk as pass-through, then reset.
      const remainder = this.buffer + chunk;
      this.buffer = "";
      if (remainder.length > 0) {
        lines.push(remainder);
      }
      return lines;
    }

    this.buffer += chunk;
    const lines: string[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (line.length > 0) {
        lines.push(line);
      }
    }
    return lines;
  }

  flush(): string | undefined {
    if (this.buffer.length === 0) {
      return undefined;
    }
    const rest = this.buffer;
    this.buffer = "";
    return rest;
  }
}

export function writeNdjsonLine(
  stdout: NodeJS.WritableStream,
  line: string,
): void {
  stdout.write(line.endsWith("\n") ? line : `${line}\n`);
}
