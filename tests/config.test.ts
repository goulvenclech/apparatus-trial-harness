import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_CONTINUATIONS, parseConfig } from "../src/config.js";

const VALID = {
  campaign: "case-a-pilot",
  model: "claude-opus-5-5",
  campaignDate: "2026-07-29",
  runsPerArm: 5,
  maxTokens: 16000,
  maxUses: 8,
  delayMs: 5000,
  userLocation: { type: "approximate", city: "Paris", country: "FR", timezone: "Europe/Paris" },
};

function parse(overrides: Record<string, unknown> = {}, remove: string[] = []) {
  const raw: Record<string, unknown> = { ...VALID, ...overrides };
  for (const key of remove) delete raw[key];
  return parseConfig(JSON.stringify(raw), "/tmp/project", "test");
}

describe("parseConfig", () => {
  it("parses a valid config and applies defaults", () => {
    const config = parse();
    expect(config.campaign).toBe("case-a-pilot");
    expect(config.model).toBe("claude-opus-5-5");
    expect(config.webSearchToolType).toBe("web_search_20260318");
    expect(config.promptsDir).toBe(resolve("/tmp/project", "prompts"));
    expect(config.outDir).toBe(resolve("/tmp/project", "runs"));
    expect(config.retry).toEqual({ maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 60000 });
  });

  it("accepts an explicit web search tool type matching the versioned pattern", () => {
    expect(parse({ webSearchToolType: "web_search_20250305" }).webSearchToolType).toBe(
      "web_search_20250305",
    );
    expect(() => parse({ webSearchToolType: "web_search_latest" })).toThrow(/webSearchToolType/);
  });

  it("rejects -latest model aliases (the model must be pinned)", () => {
    expect(() => parse({ model: "claude-3-5-sonnet-latest" })).toThrow(/pinned model string/);
  });

  it("rejects missing required keys", () => {
    expect(() => parse({}, ["runsPerArm"])).toThrow(/runsPerArm/);
    expect(() => parse({}, ["userLocation"])).toThrow(/userLocation/);
    expect(() => parse({}, ["campaignDate"])).toThrow(/campaignDate/);
  });

  it("rejects unknown keys, catching config typos", () => {
    expect(() => parse({ maxUse: 5 })).toThrow(/unknown top-level key\(s\): maxUse/);
    expect(() =>
      parse({ userLocation: { type: "approximate", city: "Paris", zip: "75" } }),
    ).toThrow(/unknown `userLocation` key\(s\): zip/);
  });

  it("rejects non-integer or out-of-range numbers", () => {
    expect(() => parse({ runsPerArm: 0 })).toThrow(/runsPerArm/);
    expect(() => parse({ runsPerArm: 2.5 })).toThrow(/runsPerArm/);
    expect(() => parse({ delayMs: -1 })).toThrow(/delayMs/);
  });

  it("rejects a userLocation without any location field or with a bad country code", () => {
    expect(() => parse({ userLocation: { type: "approximate" } })).toThrow(/at least one/);
    expect(() => parse({ userLocation: { type: "exact", city: "Paris" } })).toThrow(
      /userLocation.type/,
    );
    expect(() => parse({ userLocation: { type: "approximate", country: "FRA" } })).toThrow(
      /2-letter/,
    );
  });

  it("rejects placeholder campaignDate values, accepts free-form dates with a year", () => {
    expect(() => parse({ campaignDate: "TBD" })).toThrow(/4-digit year/);
    expect(parse({ campaignDate: "29 July 2026" }).campaignDate).toBe("29 July 2026");
  });

  it("rejects campaign names that are not safe directory names", () => {
    expect(() => parse({ campaign: "cas A/2026" })).toThrow(/campaign/);
    expect(() => parse({ campaign: ".hidden" })).toThrow(/campaign/);
  });

  it("validates the optional retry block", () => {
    const config = parse({ retry: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 400 } });
    expect(config.retry).toEqual({ maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 400 });
    expect(() => parse({ retry: { baseDelayMs: 1000, maxDelayMs: 10 } })).toThrow(/maxDelayMs/);
    expect(() => parse({ retry: { attempts: 3 } })).toThrow(/unknown `retry` key\(s\)/);
  });

  it("defaults maxContinuations and accepts only a non-negative integer", () => {
    expect(parse().maxContinuations).toBe(DEFAULT_MAX_CONTINUATIONS);
    expect(parse({ maxContinuations: 0 }).maxContinuations).toBe(0);
    expect(() => parse({ maxContinuations: -1 })).toThrow(/maxContinuations/);
    expect(() => parse({ maxContinuations: 1.5 })).toThrow(/maxContinuations/);
  });

  it("leaves prompt caching off by default and accepts only a boolean", () => {
    expect(parse().promptCaching).toBe(false);
    expect(parse({ promptCaching: true }).promptCaching).toBe(true);
    expect(() => parse({ promptCaching: "yes" })).toThrow(/promptCaching/);
  });

  it("leaves effort unset by default and accepts only the API's effort levels", () => {
    expect(parse().effort).toBeUndefined();
    expect(parse({ effort: "high" }).effort).toBe("high");
    expect(() => parse({ effort: "extreme" })).toThrow(/effort/);
    expect(() => parse({ effort: null })).toThrow(/effort/);
  });

  it("accepts bare blocked domains with an optional path, rejects URLs and empty lists", () => {
    expect(parse().blockedDomains).toBeUndefined();
    expect(
      parse({ blockedDomains: ["github.com/goulvenclech", "goulven-clech.dev"] }).blockedDomains,
    ).toEqual(["github.com/goulvenclech", "goulven-clech.dev"]);
    expect(() => parse({ blockedDomains: ["https://goulven-clech.dev"] })).toThrow(
      /blockedDomains/,
    );
    expect(() => parse({ blockedDomains: ["localhost"] })).toThrow(/blockedDomains/);
    expect(() => parse({ blockedDomains: [] })).toThrow(/blockedDomains/);
  });

  it("fails loudly on invalid JSON", () => {
    expect(() => parseConfig("{not json", "/tmp", "test")).toThrow(/not valid JSON/);
  });
});
