import { parseArgs } from "node:util";
import { PACKAGED_SKILL_PATH, rebuildArmC } from "./arm-c.js";
import { sha256Hex } from "./hash.js";

const HELP = `Rebuild a campaign's arm-c.txt from its task core and the packaged skill.

Usage:
  npm run arm-c -- --config <path>               # rebuild from ${PACKAGED_SKILL_PATH}
  npm run arm-c -- --config <path> <SKILL.md>    # copy a new skill version there first, then rebuild

Arm C = the campaign's arm-a.txt + the trigger sentence + the SKILL.md body (frontmatter stripped).
Refuses a campaign that already has archived runs: the prompt files and the config are hashed into every run.
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { config: { type: "string" }, help: { type: "boolean" } },
    allowPositionals: true,
  });
  if (values.help === true || values.config === undefined || positionals.length > 1) {
    process.stdout.write(HELP);
    if (values.help !== true) process.exitCode = 1;
    return;
  }
  const { path, armC } = await rebuildArmC(values.config, positionals[0]);
  process.stderr.write(
    `wrote ${path} (${Buffer.byteLength(armC)} bytes, sha256 ${sha256Hex(armC)})\n`,
  );
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`\nfatal: ${detail}\n`);
  process.exitCode = 1;
});
