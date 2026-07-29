import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sha256Hex } from "./hash.js";

export interface UserLocation {
  type: "approximate";
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface Config {
  campaign: string;
  model: string;
  campaignDate: string;
  runsPerArm: number;
  maxTokens: number;
  maxUses: number;
  delayMs: number;
  userLocation: UserLocation;
  webSearchToolType: string;
  /** Absolute path, resolved relative to the config file's directory. */
  promptsDir: string;
  /** Absolute path, resolved relative to the config file's directory. */
  outDir: string;
  retry: RetryConfig;
}

export interface LoadedConfig {
  config: Config;
  /** sha256 of the raw config file bytes. */
  configHash: string;
}

// Current server-side web search tool version per the Anthropic docs; older
// models need the basic variant web_search_20250305 — set it in config.
export const DEFAULT_WEB_SEARCH_TOOL_TYPE = "web_search_20260318";

const TOP_LEVEL_KEYS = new Set([
  "campaign",
  "model",
  "campaignDate",
  "runsPerArm",
  "maxTokens",
  "maxUses",
  "delayMs",
  "userLocation",
  "webSearchToolType",
  "promptsDir",
  "outDir",
  "retry",
]);

const USER_LOCATION_KEYS = new Set(["type", "city", "region", "country", "timezone"]);
const RETRY_KEYS = new Set(["maxAttempts", "baseDelayMs", "maxDelayMs"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(label: string, message: string): never {
  throw new Error(`config ${label}: ${message}`);
}

function requireString(raw: Record<string, unknown>, key: string, label: string): string {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(label, `\`${key}\` must be a non-empty string`);
  }
  return value;
}

function requireInt(
  raw: Record<string, unknown>,
  key: string,
  label: string,
  { min }: { min: number },
): number {
  const value = raw[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    fail(label, `\`${key}\` must be an integer >= ${min}`);
  }
  return value;
}

function rejectUnknownKeys(
  raw: Record<string, unknown>,
  known: Set<string>,
  label: string,
  context: string,
): void {
  const unknown = Object.keys(raw).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    fail(label, `unknown ${context} key(s): ${unknown.join(", ")}`);
  }
}

function parseUserLocation(raw: Record<string, unknown>, label: string): UserLocation {
  const value = raw["userLocation"];
  if (!isRecord(value)) fail(label, "`userLocation` must be an object");
  rejectUnknownKeys(value, USER_LOCATION_KEYS, label, "`userLocation`");
  if (value["type"] !== "approximate") {
    fail(label, '`userLocation.type` must be "approximate"');
  }
  const location: UserLocation = { type: "approximate" };
  for (const key of ["city", "region", "country", "timezone"] as const) {
    const field = value[key];
    if (field === undefined) continue;
    if (typeof field !== "string" || field.length === 0) {
      fail(label, `\`userLocation.${key}\` must be a non-empty string when present`);
    }
    location[key] = field;
  }
  if (location.country !== undefined && !/^[A-Za-z]{2}$/.test(location.country)) {
    fail(label, "`userLocation.country` must be a 2-letter ISO country code");
  }
  // The API requires at least one of the four location fields.
  if (
    location.city === undefined &&
    location.region === undefined &&
    location.country === undefined &&
    location.timezone === undefined
  ) {
    fail(label, "`userLocation` must set at least one of city, region, country, timezone");
  }
  return location;
}

function parseRetry(raw: Record<string, unknown>, label: string): RetryConfig {
  const value = raw["retry"];
  const retry: RetryConfig = { maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 60000 };
  if (value === undefined) return retry;
  if (!isRecord(value)) fail(label, "`retry` must be an object");
  rejectUnknownKeys(value, RETRY_KEYS, label, "`retry`");
  if (value["maxAttempts"] !== undefined) {
    retry.maxAttempts = requireInt(value, "maxAttempts", label, { min: 1 });
  }
  if (value["baseDelayMs"] !== undefined) {
    retry.baseDelayMs = requireInt(value, "baseDelayMs", label, { min: 1 });
  }
  if (value["maxDelayMs"] !== undefined) {
    retry.maxDelayMs = requireInt(value, "maxDelayMs", label, { min: 1 });
  }
  if (retry.maxDelayMs < retry.baseDelayMs) {
    fail(label, "`retry.maxDelayMs` must be >= `retry.baseDelayMs`");
  }
  return retry;
}

// Pure parser so tests can exercise validation without touching the filesystem.
export function parseConfig(rawText: string, configDir: string, label: string): Config {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    fail(label, `not valid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!isRecord(parsed)) fail(label, "must be a JSON object");
  rejectUnknownKeys(parsed, TOP_LEVEL_KEYS, label, "top-level");

  const campaign = requireString(parsed, "campaign", label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(campaign)) {
    fail(
      label,
      "`campaign` must be a safe directory name ([A-Za-z0-9._-], not starting with a dot)",
    );
  }

  const model = requireString(parsed, "model", label);
  if (model.endsWith("-latest")) {
    fail(
      label,
      "`model` must be the exact pinned model string, not a `-latest` alias " +
        "(the protocol requires a fixed model; note current-generation IDs carry no date suffix)",
    );
  }

  const webSearchToolType =
    parsed["webSearchToolType"] === undefined
      ? DEFAULT_WEB_SEARCH_TOOL_TYPE
      : requireString(parsed, "webSearchToolType", label);
  if (!/^web_search_\d{8}$/.test(webSearchToolType)) {
    fail(
      label,
      '`webSearchToolType` must match "web_search_YYYYMMDD" (e.g. "web_search_20260209")',
    );
  }

  const promptsDir =
    parsed["promptsDir"] === undefined ? "prompts" : requireString(parsed, "promptsDir", label);
  const outDir = parsed["outDir"] === undefined ? "runs" : requireString(parsed, "outDir", label);

  // Free-form on purpose (the protocol may prefer "29 July 2026" over ISO);
  // requiring a year only rules out "TBD"-style placeholders.
  const campaignDate = requireString(parsed, "campaignDate", label);
  if (!/\d{4}/.test(campaignDate)) {
    fail(
      label,
      "`campaignDate` must contain a 4-digit year (it is substituted verbatim for {DATE})",
    );
  }

  return {
    campaign,
    model,
    campaignDate,
    runsPerArm: requireInt(parsed, "runsPerArm", label, { min: 1 }),
    maxTokens: requireInt(parsed, "maxTokens", label, { min: 1 }),
    maxUses: requireInt(parsed, "maxUses", label, { min: 1 }),
    delayMs: requireInt(parsed, "delayMs", label, { min: 0 }),
    userLocation: parseUserLocation(parsed, label),
    webSearchToolType,
    promptsDir: resolve(configDir, promptsDir),
    outDir: resolve(configDir, outDir),
    retry: parseRetry(parsed, label),
  };
}

export async function loadConfig(path: string): Promise<LoadedConfig> {
  const bytes = await readFile(path);
  const config = parseConfig(bytes.toString("utf8"), dirname(resolve(path)), path);
  return { config, configHash: sha256Hex(bytes) };
}
