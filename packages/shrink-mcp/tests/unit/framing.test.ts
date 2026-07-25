import { describe, it, expect } from "vitest";
import { NdjsonReadBuffer, writeNdjsonLine } from "../../src/framing.js";

describe("NdjsonReadBuffer", () => {
  it("splits partial chunks on newline boundaries", () => {
    const buffer = new NdjsonReadBuffer();
    expect(buffer.push('{"a":1}')).toEqual([]);
    expect(buffer.push('\n{"b":2}\n')).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("skips empty lines", () => {
    const buffer = new NdjsonReadBuffer();
    expect(buffer.push("\n\n{\"c\":3}\n\n")).toEqual(['{"c":3}']);
  });

  it("flush returns remainder without trailing newline", () => {
    const buffer = new NdjsonReadBuffer();
    buffer.push('{"partial":');
    expect(buffer.flush()).toBe('{"partial":');
    expect(buffer.flush()).toBeUndefined();
  });

  it("accumulates partial chunks until newline then flush emits remainder", () => {
    const buffer = new NdjsonReadBuffer();
    expect(buffer.push('{"a":1,')).toEqual([]);
    expect(buffer.push('"b":2')).toEqual([]);
    expect(buffer.push("\n")).toEqual(['{"a":1,"b":2}']);
    buffer.push('{"tail":true');
    expect(buffer.flush()).toBe('{"tail":true');
  });

  it("flush after partial without newline returns full buffered bytes", () => {
    const buffer = new NdjsonReadBuffer();
    buffer.push('not-json-partial');
    expect(buffer.flush()).toBe("not-json-partial");
  });
});

describe("writeNdjsonLine", () => {
  it("appends newline when missing", () => {
    const chunks: string[] = [];
    const stream = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    } as NodeJS.WritableStream;

    writeNdjsonLine(stream, '{"x":1}');
    expect(chunks).toEqual(['{"x":1}\n']);
  });

  it("preserves existing trailing newline", () => {
    const chunks: string[] = [];
    const stream = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    } as NodeJS.WritableStream;

    writeNdjsonLine(stream, '{"x":1}\n');
    expect(chunks).toEqual(['{"x":1}\n']);
  });
});
