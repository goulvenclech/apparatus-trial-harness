import { existsSync } from "node:fs";
import { copyFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { listRunFiles, writeFileAtomic } from "./archive.js";
import { loadConfig } from "./config.js";

// The skill goes in the user message, at the position of arm B's scaffolding
// (docs/protocol.md, "Harness").
export const ARM_C_TRIGGER = "Apply the epistemological apparatus.";

export const PACKAGED_SKILL_PATH = "docs/skill/epistemological-apparatus/SKILL.md";

export function armCPaths(promptsDir: string): { taskCore: string; armC: string } {
  return { taskCore: join(promptsDir, "arm-a.txt"), armC: join(promptsDir, "arm-c.txt") };
}

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

// The frontmatter is skill packaging (name, triggering description), not
// content the model is asked to apply, so it stays out of the prompt.
export function skillBody(skillMarkdown: string): string {
  if (!FRONTMATTER.test(skillMarkdown)) {
    throw new Error("SKILL.md has no leading --- frontmatter block — is this the packaged skill?");
  }
  return `${skillMarkdown.replace(FRONTMATTER, "").replace(/^\n+|\n+$/g, "")}\n`;
}

export function assembleArmC(taskCore: string, skillMarkdown: string): string {
  return `${taskCore.replace(/\n+$/, "")}\n\n${ARM_C_TRIGGER}\n\n${skillBody(skillMarkdown)}`;
}

// Refuses a campaign with archived runs: its prompt files are hashed into every run.
export async function rebuildArmC(
  configPath: string,
  skillSource?: string,
): Promise<{ path: string; armC: string }> {
  const { config } = await loadConfig(configPath);
  const campaignDir = join(config.outDir, config.campaign);
  if (existsSync(campaignDir) && (await listRunFiles(campaignDir)).length > 0) {
    throw new Error(`${config.campaign} has archived runs — its prompt set is frozen`);
  }
  if (skillSource !== undefined) await copyFile(resolve(skillSource), PACKAGED_SKILL_PATH);

  const paths = armCPaths(config.promptsDir);
  const armC = assembleArmC(
    await readFile(paths.taskCore, "utf8"),
    await readFile(PACKAGED_SKILL_PATH, "utf8"),
  );
  await writeFileAtomic(paths.armC, armC);
  return { path: paths.armC, armC };
}
