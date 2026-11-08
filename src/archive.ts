import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type RunSummary, summarizeResponse } from "./parse.js";

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
  /** `request-id` of each paused request, in order, when the turn was continued. */
  paused_request_ids?: (string | null)[];
  /** Set when the turn ended cut short: still paused at the cap, or on max_tokens. */
  incomplete?: true;
}

export interface RunRecord {
  metadata: RunMetadata;
  /** Full raw Messages API response, every content block included: the last of the turn. */
  response: unknown;
  /** Earlier responses of the turn, each ended by pause_turn, in order. */
  paused_responses?: unknown[];
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
  continuations?: number;
  incomplete?: true;
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

// Continuation fields are omitted when unset, so the index entry of a run
// that never paused is unchanged.
export function buildIndexEntry(record: RunRecord): IndexEntry {
  const paused = record.paused_responses ?? [];
  const summaries = [...paused, record.response].map(summarizeResponse);
  const final = summaries.at(-1) as RunSummary;
  const sum = (count: (summary: RunSummary) => number) =>
    summaries.reduce((total, summary) => total + count(summary), 0);
  return {
    arm: record.metadata.arm,
    index: record.metadata.index,
    timestamp: record.metadata.timestamp,
    stop_reason: final.stop_reason,
    input_tokens: sum((summary) => summary.input_tokens),
    output_tokens: sum((summary) => summary.output_tokens),
    web_search_requests: sum((summary) => summary.web_search_requests),
    queries: summaries.flatMap((summary) => summary.queries),
    ...(paused.length > 0 ? { continuations: paused.length } : {}),
    ...(record.metadata.incomplete === true ? { incomplete: true as const } : {}),
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
  if ("paused_responses" in parsed && !Array.isArray(parsed["paused_responses"])) {
    throw new Error("paused_responses is present but not an array");
  }
  return parsed as unknown as RunRecord;
}

export interface RunFile {
  arm: Arm;
  index: number;
  name: string;
}

export async function listRunFiles(campaignDir: string): Promise<RunFile[]> {
  const runs: RunFile[] = [];
  for (const name of await readdir(campaignDir)) {
    const match = RUN_FILE_RE.exec(name);
    if (!match) continue;
    runs.push({ arm: match[1] as Arm, index: Number(match[2]), name });
  }
  return runs.toSorted((left, right) =>
    left.arm === right.arm ? left.index - right.index : left.arm.localeCompare(right.arm),
  );
}

export async function readRunRecord(campaignDir: string, run: RunFile): Promise<RunRecord> {
  const path = join(campaignDir, run.name);
  try {
    return validateRunRecord(JSON.parse(await readFile(path, "utf8")), run.arm, run.index);
  } catch (error) {
    throw new Error(
      `${path}: cannot parse archived run (${error instanceof Error ? error.message : String(error)}) — ` +
        "remove or repair the file, then re-run (with --force to redo the run)",
      { cause: error },
    );
  }
}

// Always regenerated, never appended: the archive is the source of truth, so
// the index self-heals after an interrupted invocation.
export async function rebuildIndex(campaignDir: string): Promise<number> {
  const runs = await listRunFiles(campaignDir);
  const lines: string[] = [];
  for (const run of runs) {
    lines.push(JSON.stringify(buildIndexEntry(await readRunRecord(campaignDir, run))));
  }

  await writeFileAtomic(
    join(campaignDir, "index.jsonl"),
    lines.map((line) => `${line}\n`).join(""),
  );
  return runs.length;
}
