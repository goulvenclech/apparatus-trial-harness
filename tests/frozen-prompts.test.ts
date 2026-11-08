import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const CASE_DOC = "docs/cases/case-A-dark-matter-prompts.md";

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

async function readPrompts() {
  const [core, armB, armC] = await Promise.all([
    readFile("prompts/arm-a.txt", "utf8"),
    readFile("prompts/arm-b.txt", "utf8"),
    readFile("prompts/arm-c.txt", "utf8"),
  ]);
  return { core, armB, armC };
}

describe("frozen prompts", () => {
  it("keeps arm A identical to the task core published in the case doc", async () => {
    const [{ core }, doc] = await Promise.all([readPrompts(), readFile(CASE_DOC, "utf8")]);
    expect(core).toBe(fencedBlockAfter(doc, "## Task core"));
  });

  it("opens arms B and C with the task core and a blank line", async () => {
    const { core, armB, armC } = await readPrompts();
    expect(armB.startsWith(`${core}\n`)).toBe(true);
    expect(armC.startsWith(`${core}\n`)).toBe(true);
  });

  it("gives arms B and C the same verdict scale", async () => {
    const { armB, armC } = await readPrompts();
    expect(verdictScale(armB)).toBeDefined();
    expect(verdictScale(armB)).toBe(verdictScale(armC));
  });
});
