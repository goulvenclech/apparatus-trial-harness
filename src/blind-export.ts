import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { exportBlind } from "./blind.js";
import { loadConfig } from "./config.js";

const HELP = `Export a finished campaign for blind normalisation.

Usage:
  npm run blind -- [--config <path>]

Writes blind/<campaign>/<id>.md (the final answer of each run, under an opaque
id, in shuffled order) and keys/<campaign>.json (the id -> arm mapping, the
shuffle seed and the normalised-run schema version). Hand
blind/<campaign>/ alone to the normaliser; keep runs/ and keys/ away from it.
Refuses to overwrite an existing export or key file.
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { config: { type: "string" }, help: { type: "boolean" } },
  });
  if (values.help === true) {
    process.stdout.write(HELP);
    return;
  }
  const configPath = values.config ?? "config.json";
  const { config } = await loadConfig(configPath);
  const root = dirname(resolve(configPath));
  const blindDir = join(root, "blind", config.campaign);
  const keyPath = join(root, "keys", `${config.campaign}.json`);

  const records = await exportBlind({
    campaign: config.campaign,
    campaignDir: join(config.outDir, config.campaign),
    blindDir,
    keyPath,
    expectedRuns: 3 * config.runsPerArm,
    seed: randomBytes(16).toString("hex"),
  });
  process.stderr.write(
    `[${config.campaign}] ${records.length} final answers → ${blindDir}; key → ${keyPath}\n`,
  );
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`\nfatal: ${detail}\n`);
  process.exitCode = 1;
});
