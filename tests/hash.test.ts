import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Hex, sha256HexOfFile } from "../src/hash.js";

describe("sha256Hex", () => {
  it("matches the SHA-256 reference vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is byte-sensitive: whitespace-only config changes yield a new hash", () => {
    expect(sha256Hex('{"a":1}')).not.toBe(sha256Hex('{ "a": 1 }'));
  });

  it("hashes strings and their UTF-8 bytes identically", () => {
    const text = "arm-a — matière noire";
    expect(sha256Hex(text)).toBe(sha256Hex(new TextEncoder().encode(text)));
  });
});

describe("sha256HexOfFile", () => {
  it("hashes the raw file bytes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "apparatus-trial-harness-hash-"));
    const path = join(dir, "prompt.txt");
    const content = "Identify the main research programmes…\n";
    await writeFile(path, content, "utf8");
    expect(await sha256HexOfFile(path)).toBe(sha256Hex(content));
  });
});
