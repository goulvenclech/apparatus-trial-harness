import { parseArgs } from "node:util";
import { run } from "./runner.js";

const HELP = `apparatus-trial-harness — collect and archive A/B/C prompt-experiment runs (Anthropic Messages API)

Usage:
  npm run harness -- [--config <path>] [--force]

Options:
  --config <path>  Config file (default: config.json)
  --force          Re-run and overwrite runs whose output file already exists
  --help           Show this help

Behaviour:
  Sequential runs (arm a, b, c × runsPerArm), one messages.create call per run.
  A run whose runs/<campaign>/arm-<arm>-<n>.json exists is skipped unless --force.
  Exponential backoff on 429/5xx/connection errors; any other 4xx aborts loudly.
  runs/<campaign>/index.jsonl is rebuilt from the archived files on every invocation.

The harness only collects and archives. No scoring, no analysis, no summarisation.
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      config: { type: "string" },
      force: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help === true) {
    process.stdout.write(HELP);
    return;
  }
  await run({ configPath: values.config ?? "config.json", force: values.force === true });
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`\nfatal: ${detail}\n`);
  process.exitCode = 1;
});
