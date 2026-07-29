import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { summarizeResponse } from "./parse.js";

export type Arm = "a" | "b" | "c";

export interface RunMetadata {
  campaign: string;
  arm: Arm;
  index: number;
  /** ISO 8601 UTC, taken when the response was received. */
  timestamp: string;
  model_requested: string;
  /** Reported by the API response — the ground truth for the pin. */
  model: string | null;
  /** `request-id` response header, for support/audit. */
  request_id: string | null;
  /** sha256 of the raw config file bytes. */
  config_hash: string;
  /** sha256 of the raw prompt file bytes (system.txt pre-substitution, arm file). */
  prompt_hashes: { system: string; arm: string };
}

export interface RunRecord {
  metadata: RunMetadata;
  /** Full raw Messages API response, every content block included. */
  response: unknown;
}

export interface IndexEntry {
  arm: Arm;
  index: number;
  timestamp: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  queries: string[];
}

export function runFileName(arm: Arm, index: number): string {
  return `arm-${arm}-${index}.json`;
}

// Write-then-rename so the idempotency check ("file exists = run archived")
// never sees a half-written run after a crash.
export async function writeFileAtomic(path: string, data: string): Promise<void> {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, path);
}

export async function writeRunRecord(campaignDir: string, record: RunRecord): Promise<string> {
  const path = join(campaignDir, runFileName(record.metadata.arm, record.metadata.index));
  await writeFileAtomic(path, `${JSON.stringify(record, null, 2)}\n`);
  return path;
}

export function buildIndexEntry(record: RunRecord): IndexEntry {
  const summary = summarizeResponse(record.response);
  return {
    arm: record.metadata.arm,
    index: record.metadata.index,
    timestamp: record.metadata.timestamp,
    ...summary,
  };
}

const RUN_FILE_RE = /^arm-([abc])-([0-9]+)\.json$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A well-formed-JSON-but-wrong-shape file (hand-saved raw response, truncated
// copy) must fail as loudly as unparsable JSON.
function validateRunRecord(parsed: unknown, arm: Arm, index: number): RunRecord {
  if (!isRecord(parsed) || !isRecord(parsed["metadata"]) || !("response" in parsed)) {
    throw new Error("not a { metadata, response } run record");
  }
  const metadata = parsed["metadata"];
  if (metadata["arm"] !== arm || metadata["index"] !== index) {
    throw new Error(
      `metadata says arm ${String(metadata["arm"])}, index ${String(metadata["index"])} — does not match the file name`,
    );
  }
  if (typeof metadata["timestamp"] !== "string") {
    throw new Error("metadata.timestamp is missing or not a string");
  }
  return parsed as unknown as RunRecord;
}

// Always regenerated, never appended: the archive is the source of truth, so
// the index self-heals after an interrupted invocation.
export async function rebuildIndex(campaignDir: string): Promise<number> {
  const names = await readdir(campaignDir);
  const runs: Array<{ arm: Arm; index: number; name: string }> = [];
  for (const name of names) {
    const match = RUN_FILE_RE.exec(name);
    if (!match) continue;
    runs.push({ arm: match[1] as Arm, index: Number(match[2]), name });
  }
  runs.sort((left, right) =>
    left.arm === right.arm ? left.index - right.index : left.arm.localeCompare(right.arm),
  );

  const lines: string[] = [];
  for (const run of runs) {
    const path = join(campaignDir, run.name);
    let record: RunRecord;
    try {
      record = validateRunRecord(JSON.parse(await readFile(path, "utf8")), run.arm, run.index);
    } catch (error) {
      throw new Error(
        `${path}: cannot parse archived run (${error instanceof Error ? error.message : String(error)}) — ` +
          "remove or repair the file, then re-run (with --force to redo the run)",
        { cause: error },
      );
    }
    lines.push(JSON.stringify(buildIndexEntry(record)));
  }

  await writeFileAtomic(
    join(campaignDir, "index.jsonl"),
    lines.map((line) => `${line}\n`).join(""),
  );
  return runs.length;
}
