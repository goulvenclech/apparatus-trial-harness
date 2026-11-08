import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { type Arm, writeRunRecord } from "../src/archive.js";
import {
  type BlindExportOptions,
  exportBlind,
  NORMALISED_SCHEMA,
  opaqueIds,
  seededRandomInt,
  shuffle,
} from "../src/blind.js";

async function archiveRun(campaignDir: string, arm: Arm, index: number): Promise<void> {
  await writeRunRecord(campaignDir, {
    metadata: {
      campaign: "test",
      arm,
      index,
      timestamp: "2026-11-08T10:00:00.000Z",
      model_requested: "claude-opus-5-5",
      model: "claude-opus-5-5",
      request_id: null,
      config_hash: "c",
      prompt_hashes: { system: "s", arm: "a" },
    },
    response: {
      content: [
        { type: "text", text: `arm ${arm} preamble` },
        { type: "server_tool_use", name: "web_search", input: { query: "q" } },
        { type: "thinking", thinking: "" },
        { type: "text", text: `Answer ${arm}${index}` },
      ],
    },
  });
}

describe("shuffle and opaqueIds", () => {
  it("permutes without losing or duplicating items", () => {
    const shuffled = shuffle([1, 2, 3, 4, 5], seededRandomInt("one"));
    expect(shuffled.toSorted()).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled).not.toEqual([1, 2, 3, 4, 5]);
  });

  it("draws distinct four-character ids", () => {
    const ids = opaqueIds(15, seededRandomInt("two"));
    expect(new Set(ids).size).toBe(15);
    for (const id of ids) expect(id).toMatch(/^[2-9a-hjkmnp-tv-z]{4}$/);
  });

  it("reproduces the pilot's recorded shuffle from its recorded seed", async () => {
    const pilot = JSON.parse(await readFile("keys/case-a-pilot.json", "utf8"));
    const recorded: string[] = pilot.records.map((record: { run: string }) => record.run);
    expect(shuffle(recorded.toSorted(), seededRandomInt(pilot.shuffle.seed))).toEqual(recorded);
  });

  it("refuses an empty seed", () => {
    expect(() => seededRandomInt("")).toThrow(/seed/);
  });
});

describe("exportBlind", () => {
  let root: string;
  let options: BlindExportOptions;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "blind-"));
    const campaignDir = join(root, "runs", "test");
    await mkdir(campaignDir, { recursive: true });
    for (const arm of ["a", "b", "c"] as const) await archiveRun(campaignDir, arm, 1);
    options = {
      campaign: "test",
      campaignDir,
      blindDir: join(root, "blind", "test"),
      keyPath: join(root, "keys", "test.json"),
      expectedRuns: 3,
      seed: "test-seed",
    };
  });

  it("writes only the final answers, under ids the key maps back to their runs", async () => {
    const records = await exportBlind(options);

    const files = (await readdir(options.blindDir)).toSorted();
    expect(files).toEqual(records.map((record) => `${record.id}.md`).toSorted());
    for (const record of records) {
      const text = await readFile(join(options.blindDir, `${record.id}.md`), "utf8");
      expect(text).toBe(`Answer ${record.arm}${record.index}`);
    }

    const key = JSON.parse(await readFile(options.keyPath, "utf8"));
    expect(key.campaign).toBe("test");
    expect(key.records).toEqual(records);
    expect(records.map((record) => record.arm).toSorted()).toEqual(["a", "b", "c"]);
  });

  it("records the seed and the normalised-run schema in the key", async () => {
    await exportBlind(options);
    const key = JSON.parse(await readFile(options.keyPath, "utf8"));
    expect(key.shuffle.seed).toBe("test-seed");
    expect(key.normalised_schema).toBe(NORMALISED_SCHEMA);
  });

  function exportInto(name: string, seed: string) {
    return exportBlind({
      ...options,
      blindDir: join(root, name, "blind"),
      keyPath: join(root, name, "key.json"),
      seed,
    });
  }

  it("draws the same shuffle and ids from the same seed", async () => {
    const first = await exportInto("first", "test-seed");
    expect(await exportInto("second", "test-seed")).toEqual(first);
    expect(await exportInto("third", "other-seed")).not.toEqual(first);
  });

  it("refuses to overwrite an existing key, before writing anything", async () => {
    await mkdir(join(root, "keys"), { recursive: true });
    await writeFile(options.keyPath, "{}");
    await expect(exportBlind(options)).rejects.toThrow(/already exists/);
    await expect(readdir(options.blindDir)).rejects.toThrow();
  });

  it("refuses an incomplete campaign", async () => {
    await expect(exportBlind({ ...options, expectedRuns: 15 })).rejects.toThrow(/expected 15/);
  });
});
