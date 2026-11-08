import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type Arm, listRunFiles, readRunRecord, writeFileAtomic } from "./archive.js";
import { sha256Hex } from "./hash.js";
import { extractFinalAnswer } from "./parse.js";

export type RandomInt = (maxExclusive: number) => number;

export const NORMALISED_SCHEMA = "normalised-run/2";

const SHUFFLE_METHOD =
  "Fisher-Yates over the run files sorted by arm then index, mulberry32 seeded with " +
  "sha256(seed)[0:8]; opaque ids drawn from the same generator after the shuffle";

// The pilot's generator: the same seed string reproduces its recorded shuffle,
// and lets the scoring pass redraw from the campaign seed.
export function seededRandomInt(seed: string): RandomInt {
  if (seed === "") throw new Error("blind export seed must not be empty");
  let state = Number.parseInt(sha256Hex(seed).slice(0, 8), 16);
  return (maxExclusive) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * maxExclusive);
  };
}

export interface BlindKeyRecord {
  id: string;
  arm: Arm;
  index: number;
  run: string;
  sha256: string;
}

// No 0/o, 1/i/l or u: ids stay unambiguous when read aloud or retyped.
const ID_ALPHABET = "23456789abcdefghjkmnpqrstvwxyz";
const ID_LENGTH = 4;

export function shuffle<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}

export function opaqueIds(count: number, randomInt: RandomInt): string[] {
  const ids = new Set<string>();
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    ids.add(id);
  }
  return [...ids];
}

export interface BlindExportOptions {
  campaign: string;
  campaignDir: string;
  blindDir: string;
  keyPath: string;
  expectedRuns: number;
  seed: string;
}

// The normaliser gets blindDir alone: ids must not encode the arm, and files
// are written in shuffled order. The mapping goes to keyPath, outside blindDir.
export async function exportBlind(options: BlindExportOptions): Promise<BlindKeyRecord[]> {
  const runs = await listRunFiles(options.campaignDir);
  if (runs.length !== options.expectedRuns) {
    throw new Error(
      `${options.campaignDir}: ${runs.length} archived run(s), expected ${options.expectedRuns} — ` +
        "export a complete campaign only, since an export is never redone",
    );
  }

  // Read and validate every run before writing anything, so a bad archive
  // fails without leaving a half export that would block the next attempt.
  const answers = new Map<string, { text: string; sha256: string }>();
  for (const run of runs) {
    const record = await readRunRecord(options.campaignDir, run);
    answers.set(run.name, {
      text: extractFinalAnswer(record.response),
      sha256: sha256Hex(await readFile(join(options.campaignDir, run.name))),
    });
  }

  // Refuse rather than overwrite: an existing key or export belongs to a
  // campaign that may already be normalised or scored.
  for (const path of [options.blindDir, options.keyPath]) {
    if (existsSync(path)) {
      throw new Error(`${path} already exists — refusing to overwrite a blind export or key`);
    }
  }
  await mkdir(options.blindDir, { recursive: true });
  await mkdir(dirname(options.keyPath), { recursive: true });

  const randomInt = seededRandomInt(options.seed);
  const shuffled = shuffle(runs, randomInt);
  const ids = opaqueIds(runs.length, randomInt);
  const records: BlindKeyRecord[] = [];
  for (const [position, run] of shuffled.entries()) {
    const id = ids[position] as string;
    const answer = answers.get(run.name) as { text: string; sha256: string };
    await writeFileAtomic(join(options.blindDir, `${id}.md`), answer.text);
    records.push({ id, arm: run.arm, index: run.index, run: run.name, sha256: answer.sha256 });
  }

  const key = {
    schema: "blind-key/1",
    campaign: options.campaign,
    generated: new Date().toISOString(),
    shuffle: { method: SHUFFLE_METHOD, seed: options.seed },
    normalised_schema: NORMALISED_SCHEMA,
    input:
      "the trailing text blocks of response.content, concatenated; thinking, tool-use, " +
      "search-result and code-execution blocks are not the answer and are left out",
    records,
  };
  await writeFileAtomic(options.keyPath, `${JSON.stringify(key, null, 2)}\n`);
  return records;
}
