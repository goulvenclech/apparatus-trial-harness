import Anthropic, { APIConnectionError, APIError, RateLimitError } from "@anthropic-ai/sdk";
import { existsSync, rmSync } from "node:fs";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  type Arm,
  type RunMetadata,
  type RunRecord,
  buildIndexEntry,
  rebuildIndex,
  runFileName,
  writeRunRecord,
} from "./archive.js";
import { type Config, type RetryConfig, loadConfig } from "./config.js";
import { sha256Hex } from "./hash.js";
import { substituteDate } from "./template.js";

export interface RunnerOptions {
  configPath: string;
  force: boolean;
}

const ARMS: readonly Arm[] = ["a", "b", "c"];

function log(message: string): void {
  process.stderr.write(`${message}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

// Protocol policy: transient failures back off, everything else fails loudly.
export function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIError && typeof error.status === "number") {
    return error.status >= 500;
  }
  // A streamed request reports a server failure as an error event after the
  // HTTP 200, so the error carries a type and no status.
  if (error instanceof APIError && error.status === undefined) {
    return error.type === "overloaded_error" || error.type === "api_error";
  }
  return false;
}

function retryAfterMs(error: unknown): number | null {
  if (!(error instanceof APIError)) return null;
  const headers: unknown = error.headers;
  let value: string | null | undefined;
  if (headers instanceof Headers) {
    value = headers.get("retry-after");
  } else if (typeof headers === "object" && headers !== null) {
    value = (headers as Record<string, string | undefined>)["retry-after"];
  }
  const seconds = value === undefined || value === null ? NaN : Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

function describeError(error: unknown): string {
  if (error instanceof APIError) {
    return `${error.status ?? "connection"} ${error.name}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function computeBackoffDelay(error: unknown, attempt: number, retry: RetryConfig): number {
  const exponential = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 500);
  return Math.max(exponential + jitter, retryAfterMs(error) ?? 0);
}

export async function callWithBackoff<T>(
  fn: () => Promise<T>,
  retry: RetryConfig,
  label: string,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt >= retry.maxAttempts) throw error;
      const delay = computeBackoffDelay(error, attempt, retry);
      log(
        `${label}: ${describeError(error)} — backing off ${(delay / 1000).toFixed(1)}s ` +
          `(attempt ${attempt + 1}/${retry.maxAttempts})`,
      );
      await sleep(delay);
    }
  }
}

// A concurrent invocation would race the exists-check and pay twice for the same run.
async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(`pid ${process.pid}, started ${new Date().toISOString()}\n`);
    await handle.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `${lockPath} exists — another invocation appears to be running on this campaign ` +
          "(delete the file if it is a leftover from a crash)",
        { cause: error },
      );
    }
    throw error;
  }
  return async () => rm(lockPath, { force: true });
}

interface CurrentHashes {
  config: string;
  system: string;
  arm: string;
}

// Editing a prompt or the config mid-campaign silently mixes instruments,
// which is what the per-run hashes exist to catch. Warn; do not refuse.
async function warnOnInstrumentDrift(
  filePath: string,
  label: string,
  current: CurrentHashes,
): Promise<void> {
  let metadata: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return;
    const meta = (parsed as Record<string, unknown>)["metadata"];
    if (typeof meta !== "object" || meta === null) return;
    metadata = meta as Record<string, unknown>;
  } catch {
    return;
  }
  const drift: string[] = [];
  if (typeof metadata["config_hash"] === "string" && metadata["config_hash"] !== current.config) {
    drift.push("the config");
  }
  const promptHashes = metadata["prompt_hashes"];
  if (typeof promptHashes === "object" && promptHashes !== null) {
    const hashes = promptHashes as Record<string, unknown>;
    if (typeof hashes["system"] === "string" && hashes["system"] !== current.system) {
      drift.push("system.txt");
    }
    if (typeof hashes["arm"] === "string" && hashes["arm"] !== current.arm) {
      drift.push("the arm prompt");
    }
  }
  if (drift.length > 0) {
    log(
      `${label}: warning — archived under different bytes for ${drift.join(", ")} (hash mismatch); ` +
        "completing the campaign now would mix instruments",
    );
  }
}

// The tool type is config-driven (older models need the basic variant), so the
// object cannot be typed against the SDK's literal union without a cast.
function webSearchTool(config: Config): Anthropic.Messages.ToolUnion {
  return {
    type: config.webSearchToolType,
    name: "web_search",
    max_uses: config.maxUses,
    user_location: config.userLocation,
    ...(config.blockedDomains === undefined ? {} : { blocked_domains: config.blockedDomains }),
  } as unknown as Anthropic.Messages.ToolUnion;
}

// A continuation resends the turn so far: the user message, then every paused
// response as its own assistant message, in order, with the code-execution
// container of the last one (Anthropic docs, server tools, "pause_turn").
export function buildMessageParams(
  config: Config,
  system: string,
  userText: string,
  paused: readonly Anthropic.Messages.Message[] = [],
): Anthropic.Messages.MessageStreamParams {
  const containerId = paused.at(-1)?.container?.id;
  return {
    model: config.model,
    max_tokens: config.maxTokens,
    system,
    messages: [
      { role: "user", content: userText },
      ...paused.map((response) => ({ role: "assistant" as const, content: response.content })),
    ],
    tools: [webSearchTool(config)],
    ...(containerId === undefined ? {} : { container: containerId }),
    ...(config.effort === undefined ? {} : { output_config: { effort: config.effort } }),
    // Top-level caching also makes the API cache each server tool result, so
    // later steps of the search loop read the growing context from cache.
    ...(config.promptCaching ? { cache_control: { type: "ephemeral" } } : {}),
  };
}

export interface SentRequest {
  message: Anthropic.Messages.Message;
  requestId: string | null;
}

export interface StreamingClient {
  messages: {
    stream(params: Anthropic.Messages.MessageStreamParams): {
      finalMessage(): Promise<Anthropic.Messages.Message>;
      request_id?: string | null | undefined;
    };
  };
}

// Streaming is what lets maxTokens exceed the SDK's non-streaming limit.
export async function sendStreaming(
  client: StreamingClient,
  params: Anthropic.Messages.MessageStreamParams,
): Promise<SentRequest> {
  const stream = client.messages.stream(params);
  const message = await stream.finalMessage();
  return { message, requestId: stream.request_id ?? null };
}

export interface Turn {
  /** Every response of the turn, in order; all but the last ended in pause_turn. */
  responses: SentRequest[];
  /** False when the last allowed continuation still paused. */
  complete: boolean;
}

export async function runTurn(
  send: (params: Anthropic.Messages.MessageStreamParams) => Promise<SentRequest>,
  buildParams: (
    paused: readonly Anthropic.Messages.Message[],
  ) => Anthropic.Messages.MessageStreamParams,
  maxContinuations: number,
): Promise<Turn> {
  const responses: SentRequest[] = [];
  for (;;) {
    const sent = await send(buildParams(responses.map((response) => response.message)));
    responses.push(sent);
    if (sent.message.stop_reason !== "pause_turn") return { responses, complete: true };
    if (responses.length > maxContinuations) return { responses, complete: false };
  }
}

export type RunIdentity = Omit<
  RunMetadata,
  "model" | "request_id" | "paused_request_ids" | "incomplete"
>;

// A turn cut short by the continuation cap or max_tokens has a partial answer.
export function buildRunRecord(identity: RunIdentity, turn: Turn): RunRecord {
  const final = turn.responses.at(-1) as SentRequest;
  const paused = turn.responses.slice(0, -1);
  const incomplete = !turn.complete || final.message.stop_reason === "max_tokens";
  return {
    metadata: {
      ...identity,
      model: typeof final.message.model === "string" ? final.message.model : null,
      request_id: final.requestId,
      ...(paused.length > 0
        ? { paused_request_ids: paused.map((response) => response.requestId) }
        : {}),
      ...(incomplete ? { incomplete: true as const } : {}),
    },
    response: final.message,
    ...(paused.length > 0 ? { paused_responses: paused.map((response) => response.message) } : {}),
  };
}

interface PromptFile {
  text: string;
  hash: string;
}

async function readPromptFile(promptsDir: string, name: string): Promise<PromptFile> {
  const bytes = await readFile(join(promptsDir, name));
  return { text: bytes.toString("utf8"), hash: sha256Hex(bytes) };
}

export async function run(options: RunnerOptions): Promise<void> {
  const { config, configHash } = await loadConfig(options.configPath);

  const systemFile = await readPromptFile(config.promptsDir, "system.txt");
  const system = substituteDate(systemFile.text, config.campaignDate);
  const armFiles = new Map<Arm, PromptFile>();
  for (const arm of ARMS) {
    armFiles.set(arm, await readPromptFile(config.promptsDir, `arm-${arm}.txt`));
  }

  const campaignDir = join(config.outDir, config.campaign);
  await mkdir(campaignDir, { recursive: true });

  // Lazy so an invocation with nothing left to run works without credentials.
  // The harness owns retries, so SDK auto-retry is off.
  let client: Anthropic | null = null;
  const getClient = (): Anthropic => {
    if (client === null) {
      if (process.env["ANTHROPIC_API_KEY"] === undefined) {
        log(
          "note: ANTHROPIC_API_KEY is not set — relying on the SDK's credential resolution " +
            "(ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile)",
        );
      }
      client = new Anthropic({ maxRetries: 0 });
    }
    return client;
  };

  const lockPath = join(campaignDir, ".lock");
  const releaseLock = await acquireLock(lockPath);

  // Ctrl-C mid-campaign is routine (delays and backoffs are minute-scale), so
  // release the lock on the way out and let the next invocation resume.
  const onSignal = (signal: NodeJS.Signals): void => {
    rmSync(lockPath, { force: true });
    process.stderr.write(
      `\n[${config.campaign}] interrupted by ${signal} — lock released; ` +
        "re-invoke to resume (index.jsonl is rebuilt then)\n",
    );
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  let calls = 0;
  let skips = 0;
  let loopFailed = false;
  let loopError: unknown;
  const total = ARMS.length * config.runsPerArm;

  try {
    try {
      for (const arm of ARMS) {
        const armFile = armFiles.get(arm);
        if (armFile === undefined) throw new Error(`missing prompt for arm ${arm}`);

        for (let index = 1; index <= config.runsPerArm; index++) {
          const label = `[${config.campaign}] arm-${arm} run ${index}/${config.runsPerArm}`;
          const filePath = join(campaignDir, runFileName(arm, index));

          const exists = existsSync(filePath);
          if (exists && !options.force) {
            skips++;
            await warnOnInstrumentDrift(filePath, label, {
              config: configHash,
              system: systemFile.hash,
              arm: armFile.hash,
            });
            log(`${label}: ${runFileName(arm, index)} exists, skipping (use --force to redo)`);
            continue;
          }
          if (exists) {
            log(`${label}: warning — --force: overwriting the previously archived run`);
          }

          if (calls > 0 && config.delayMs > 0) await sleep(config.delayMs);
          log(
            `${label}: calling ${config.model}, effort ${config.effort ?? "API default"} ` +
              `(${calls + skips + 1}/${total})…`,
          );

          const turn = await runTurn(
            (params) =>
              callWithBackoff(
                async () => {
                  const sent = await sendStreaming(getClient(), params);
                  calls++;
                  return sent;
                },
                config.retry,
                label,
              ),
            (paused) => {
              if (paused.length > 0) {
                log(
                  `${label}: pause_turn — continuing the turn (${paused.length}/${config.maxContinuations})…`,
                );
              }
              return buildMessageParams(config, system, armFile.text, paused);
            },
            config.maxContinuations,
          );
          const record = buildRunRecord(
            {
              campaign: config.campaign,
              arm,
              index,
              timestamp: new Date().toISOString(),
              model_requested: config.model,
              config_hash: configHash,
              prompt_hashes: { system: systemFile.hash, arm: armFile.hash },
            },
            turn,
          );
          await writeRunRecord(campaignDir, record);

          const summary = buildIndexEntry(record);
          log(
            `${label}: saved ${runFileName(arm, index)} — stop_reason=${summary.stop_reason ?? "null"} ` +
              `requests=${turn.responses.length} searches=${summary.web_search_requests} ` +
              `in=${summary.input_tokens} out=${summary.output_tokens}`,
          );
          if (!turn.complete) {
            log(
              `${label}: warning — still paused after ${config.maxContinuations} continuation(s); ` +
                "archived and indexed as incomplete",
            );
          } else if (summary.stop_reason === "refusal") {
            log(`${label}: warning — refusal: safety classifiers declined; archived as-is`);
          } else if (summary.stop_reason === "max_tokens") {
            log(
              `${label}: warning — max_tokens: output cut by the maxTokens cap; ` +
                "archived and indexed as incomplete",
            );
          }
        }
      }
    } catch (error) {
      loopFailed = true;
      loopError = error;
    }

    // The index is derived data: rebuild it even when a run aborted, so it
    // never drifts from the archive on disk.
    try {
      const indexed = await rebuildIndex(campaignDir);
      log(
        `[${config.campaign}] ${loopFailed ? "aborted" : "done"}: ${calls} API call(s), ` +
          `${skips} skipped, index.jsonl rebuilt from ${indexed} archived run(s)`,
      );
    } catch (rebuildError) {
      if (!loopFailed) throw rebuildError;
      log(
        `[${config.campaign}] warning: index rebuild also failed — ` +
          (rebuildError instanceof Error ? rebuildError.message : String(rebuildError)),
      );
    }
    if (loopFailed) throw loopError;
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    await releaseLock();
  }
}
