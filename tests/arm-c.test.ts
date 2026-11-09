import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARM_C_TRIGGER,
  PACKAGED_SKILL_PATH,
  armCPaths,
  assembleArmC,
  rebuildArmC,
  skillBody,
} from "../src/arm-c.js";
import { loadConfig } from "../src/config.js";

// Campaign 1 is excluded: built from an older skill than the packaged one.
const PACKAGED_SKILL_CAMPAIGNS = [
  "config.case-a-dark-matter-2.json",
  "config.case-b-americas.json",
];

const SKILL = '---\nname: "skill"\ndescription: "Use it."\n---\n\n# Skill\n\nBody.';

describe("assembleArmC", () => {
  it("appends the trigger and the skill body to the task core", () => {
    expect(assembleArmC("Core task.\n", SKILL)).toBe(
      `Core task.\n\n${ARM_C_TRIGGER}\n\n# Skill\n\nBody.\n`,
    );
  });

  it("ends with exactly one newline whatever the skill file's ending", () => {
    expect(skillBody(`${SKILL}\n\n`)).toBe("# Skill\n\nBody.\n");
  });

  it("fails loudly on a file without frontmatter", () => {
    expect(() => skillBody("# Skill\n\nBody.")).toThrow(/frontmatter/);
  });

  it.each(PACKAGED_SKILL_CAMPAIGNS)(
    "reproduces the arm-c.txt of %s byte for byte",
    async (configPath) => {
      const { config } = await loadConfig(configPath);
      const paths = armCPaths(config.promptsDir);
      const [core, skill, armC] = await Promise.all([
        readFile(paths.taskCore, "utf8"),
        readFile(PACKAGED_SKILL_PATH, "utf8"),
        readFile(paths.armC, "utf8"),
      ]);
      expect(assembleArmC(core, skill)).toBe(armC);
    },
  );
});

async function campaignFixture(withRun: boolean): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "apparatus-trial-harness-arm-c-"));
  const config = JSON.parse(await readFile("config.case-b-americas.json", "utf8"));
  await writeFile(join(dir, "config.json"), JSON.stringify({ ...config, promptsDir: "prompts" }));
  await mkdir(join(dir, "prompts"));
  await writeFile(join(dir, "prompts", "arm-a.txt"), "Core task.\n");
  if (withRun) {
    await mkdir(join(dir, "runs", config.campaign), { recursive: true });
    await writeFile(join(dir, "runs", config.campaign, "arm-a-1.json"), "{}");
  }
  return join(dir, "config.json");
}

describe("rebuildArmC", () => {
  it("writes arm-c.txt into the campaign's prompt set", async () => {
    const configPath = await campaignFixture(false);
    const { path, armC } = await rebuildArmC(configPath);
    expect(path).toBe(join(configPath, "..", "prompts", "arm-c.txt"));
    expect(await readFile(path, "utf8")).toBe(armC);
    expect(armC.startsWith(`Core task.\n\n${ARM_C_TRIGGER}\n\n`)).toBe(true);
  });

  it("refuses a campaign that already has archived runs", async () => {
    await expect(rebuildArmC(await campaignFixture(true))).rejects.toThrow(/frozen/);
  });
});
