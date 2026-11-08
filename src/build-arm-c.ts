import { copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { writeFileAtomic } from "./archive.js";
import { assembleArmC } from "./arm-c.js";
import { sha256Hex } from "./hash.js";

export const PACKAGED_SKILL_PATH = "docs/skill/epistemological-apparatus/SKILL.md";
export const TASK_CORE_PATH = "prompts/arm-a.txt";
export const ARM_C_PATH = "prompts/arm-c.txt";

const HELP = `Rebuild prompts/arm-c.txt from the task core and the packaged skill.

Usage:
  npm run arm-c                    # rebuild from ${PACKAGED_SKILL_PATH}
  npm run arm-c -- <SKILL.md>      # copy a new skill version there first, then rebuild

Arm C = ${TASK_CORE_PATH} + the trigger sentence + the SKILL.md body (frontmatter stripped).
Run it before the freeze only: prompts/ and docs/ are hashed into every archived run.
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { help: { type: "boolean" } },
    allowPositionals: true,
  });
  if (values.help === true || positionals.length > 1) {
    process.stdout.write(HELP);
    return;
  }
  const source = positionals[0];
  if (source !== undefined) {
    await copyFile(resolve(source), PACKAGED_SKILL_PATH);
    process.stderr.write(`copied ${source} → ${PACKAGED_SKILL_PATH}\n`);
  }

  const armC = assembleArmC(
    await readFile(TASK_CORE_PATH, "utf8"),
    await readFile(PACKAGED_SKILL_PATH, "utf8"),
  );
  await writeFileAtomic(ARM_C_PATH, armC);
  process.stderr.write(
    `wrote ${ARM_C_PATH} (${Buffer.byteLength(armC)} bytes, sha256 ${sha256Hex(armC)})\n`,
  );
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`\nfatal: ${detail}\n`);
  process.exitCode = 1;
});
