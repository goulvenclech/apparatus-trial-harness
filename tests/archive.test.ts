import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  type Arm,
  type RunRecord,
  rebuildIndex,
  runFileName,
  writeFileAtomic,
  writeRunRecord,
} from "../src/archive.js";

function makeRecord(arm: Arm, index: number): RunRecord {
  return {
    metadata: {
      campaign: "test",
      arm,
      index,
      timestamp: `2026-07-29T10:0${index % 10}:00.000Z`,
      model_requested: "claude-opus-5-5",
      model: "claude-opus-5-5",
      request_id: "req_test",
      config_hash: "c".repeat(64),
      prompt_hashes: { system: "s".repeat(64), arm: "a".repeat(64) },
    },
    response: {
      content: [
        { type: "server_tool_use", name: "web_search", input: { query: `q-${arm}-${index}` } },
        { type: "text", text: "…" },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20, server_tool_use: { web_search_requests: 1 } },
    },
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "apparatus-trial-harness-archive-"));
});

describe("writeFileAtomic", () => {
  it("writes the content and leaves no temp file behind", async () => {
    const path = join(dir, "out.json");
    await writeFileAtomic(path, "payload\n");
    expect(await readFile(path, "utf8")).toBe("payload\n");
    expect((await readdir(dir)).toSorted()).toEqual(["out.json"]);
  });
});

describe("rebuildIndex", () => {
  it("indexes archived runs sorted by arm then numeric index", async () => {
    await writeRunRecord(dir, makeRecord("a", 10));
    await writeRunRecord(dir, makeRecord("b", 1));
    await writeRunRecord(dir, makeRecord("a", 2));
    // Noise the index must ignore: derived index, stray notes, crash leftovers.
    await writeFile(join(dir, "index.jsonl"), "stale\n", "utf8");
    await writeFile(join(dir, "notes.txt"), "not a run", "utf8");
    await writeFile(join(dir, "arm-a-5.json.tmp"), "{", "utf8");

    expect(await rebuildIndex(dir)).toBe(3);

    const lines = (await readFile(join(dir, "index.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { arm: string; index: number; queries: string[] });
    expect(lines.map((entry) => [entry.arm, entry.index])).toEqual([
      ["a", 2],
      ["a", 10],
      ["b", 1],
    ]);
    expect(lines[0]?.queries).toEqual(["q-a-2"]);
  });

  it("sums a continued turn over all its responses and marks it incomplete", async () => {
    const record = makeRecord("c", 1);
    const paused = {
      content: [{ type: "server_tool_use", name: "web_search", input: { query: "q-paused" } }],
      stop_reason: "pause_turn",
      usage: { input_tokens: 5, output_tokens: 7, server_tool_use: { web_search_requests: 2 } },
    };
    await writeRunRecord(dir, {
      ...record,
      metadata: { ...record.metadata, paused_request_ids: ["req_paused"], incomplete: true },
      paused_responses: [paused],
    });
    await rebuildIndex(dir);
    expect(JSON.parse(await readFile(join(dir, "index.jsonl"), "utf8"))).toMatchObject({
      stop_reason: "end_turn",
      input_tokens: 15,
      output_tokens: 27,
      web_search_requests: 3,
      queries: ["q-paused", "q-c-1"],
      continuations: 1,
      incomplete: true,
    });
  });

  it("adds no continuation fields for a turn that never paused", async () => {
    await writeRunRecord(dir, makeRecord("a", 1));
    await rebuildIndex(dir);
    const entry = JSON.parse(await readFile(join(dir, "index.jsonl"), "utf8"));
    expect(Object.keys(entry)).toEqual([
      "arm",
      "index",
      "timestamp",
      "stop_reason",
      "input_tokens",
      "output_tokens",
      "web_search_requests",
      "queries",
    ]);
  });

  it("writes an empty index for an empty campaign", async () => {
    expect(await rebuildIndex(dir)).toBe(0);
    expect(await readFile(join(dir, "index.jsonl"), "utf8")).toBe("");
  });

  it("fails loudly, naming the file, on unparsable JSON", async () => {
    await writeFile(join(dir, runFileName("c", 1)), "not json{{{", "utf8");
    await expect(rebuildIndex(dir)).rejects.toThrow(/arm-c-1\.json: cannot parse archived run/);
  });

  it("fails as loudly on valid JSON that is not a run record", async () => {
    await writeFile(join(dir, runFileName("c", 1)), "null", "utf8");
    await expect(rebuildIndex(dir)).rejects.toThrow(/cannot parse archived run/);
    await writeFile(join(dir, runFileName("c", 1)), JSON.stringify({ id: "msg_raw" }), "utf8");
    await expect(rebuildIndex(dir)).rejects.toThrow(/not a \{ metadata, response \} run record/);
  });

  it("rejects a record filed under the wrong name", async () => {
    await writeFile(join(dir, runFileName("b", 1)), JSON.stringify(makeRecord("a", 1)), "utf8");
    await expect(rebuildIndex(dir)).rejects.toThrow(/does not match the file name/);
  });
});
