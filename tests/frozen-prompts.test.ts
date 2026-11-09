import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listRunFiles, readRunRecord } from "../src/archive.js";
import { loadConfig } from "../src/config.js";
import { sha256HexOfFile } from "../src/hash.js";

const CASE_DOC = "docs/cases/case-A-dark-matter-prompts.md";

// One config per campaign; archived campaigns' prompts are never rebuilt in place.
const CAMPAIGN_CONFIGS = ["config.json", "config.case-a-dark-matter-2.json"];

// Keeps the trailing newline the prompt files carry.
function fencedBlockAfter(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n${heading}\n`);
  if (start === -1) throw new Error(`heading not found: ${heading}`);
  const block = /\n```\n([\s\S]*?\n)```\n/.exec(markdown.slice(start));
  if (block === null) throw new Error(`no fenced block after: ${heading}`);
  return block[1] as string;
}

function verdictScale(prompt: string): string | undefined {
  return /^\*\*Verdict: \[([^\]]+)\]/m.exec(prompt)?.[1];
}

async function readPrompts(configPath: string) {
  const { config } = await loadConfig(configPath);
  const read = (name: string) => readFile(join(config.promptsDir, name), "utf8");
  const [core, armB, armC] = await Promise.all([
    read("arm-a.txt"),
    read("arm-b.txt"),
    read("arm-c.txt"),
  ]);
  return { core, armB, armC };
}

describe.each(CAMPAIGN_CONFIGS)("frozen prompts of %s", (configPath) => {
  it("keeps arm A identical to the task core published in the case doc", async () => {
    const [{ core }, doc] = await Promise.all([
      readPrompts(configPath),
      readFile(CASE_DOC, "utf8"),
    ]);
    expect(core).toBe(fencedBlockAfter(doc, "## Task core"));
  });

  it("opens arms B and C with the task core and a blank line", async () => {
    const { core, armB, armC } = await readPrompts(configPath);
    expect(armB.startsWith(`${core}\n`)).toBe(true);
    expect(armC.startsWith(`${core}\n`)).toBe(true);
  });

  it("gives arms B and C the same verdict scale", async () => {
    const { armB, armC } = await readPrompts(configPath);
    expect(verdictScale(armB)).toBeDefined();
    expect(verdictScale(armB)).toBe(verdictScale(armC));
  });

  it("still hashes to what the campaign's archived runs recorded", async () => {
    const { config, configHash } = await loadConfig(configPath);
    const campaignDir = join(config.outDir, config.campaign);
    if (!existsSync(campaignDir)) return;
    const systemHash = await sha256HexOfFile(join(config.promptsDir, "system.txt"));
    const runs = await listRunFiles(campaignDir);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      const { metadata } = await readRunRecord(campaignDir, run);
      expect(metadata.config_hash).toBe(configHash);
      expect(metadata.prompt_hashes).toEqual({
        system: systemHash,
        arm: await sha256HexOfFile(join(config.promptsDir, `arm-${run.arm}.txt`)),
      });
    }
  });
});
