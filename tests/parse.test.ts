import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildIndexEntry, type RunRecord } from "../src/archive.js";
import { extractSearchQueries, summarizeResponse } from "../src/parse.js";

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(join(import.meta.dirname, "fixtures", name), "utf8");
  return JSON.parse(raw) as unknown;
}

describe("extractSearchQueries", () => {
  it("extracts every web_search query in emission order", async () => {
    const response = await loadFixture("response-web-search.json");
    expect(extractSearchQueries(response)).toEqual([
      "WIMP direct detection LZ 2024 results dark matter",
      "axion haloscope ADMX ORGAN parameter space 2025",
    ]);
  });

  it("returns an empty list when the response contains no searches", async () => {
    const response = await loadFixture("response-no-search.json");
    expect(extractSearchQueries(response)).toEqual([]);
  });

  it("ignores malformed blocks and non-web_search server tools", () => {
    const response = {
      content: [
        null,
        "text",
        { type: "server_tool_use", name: "code_execution", input: { query: "not a search" } },
        { type: "server_tool_use", name: "web_search", input: { query: 42 } },
        { type: "server_tool_use", name: "web_search" },
        { type: "server_tool_use", name: "web_search", input: { query: "kept" } },
      ],
    };
    expect(extractSearchQueries(response)).toEqual(["kept"]);
  });
});

describe("summarizeResponse", () => {
  it("reads stop_reason, token usage and the server-side search count", async () => {
    const response = await loadFixture("response-web-search.json");
    expect(summarizeResponse(response)).toEqual({
      stop_reason: "end_turn",
      input_tokens: 12894,
      output_tokens: 2417,
      web_search_requests: 2,
      queries: [
        "WIMP direct detection LZ 2024 results dark matter",
        "axion haloscope ADMX ORGAN parameter space 2025",
      ],
    });
  });

  it("defaults the search count to 0 when usage.server_tool_use is absent", async () => {
    const response = await loadFixture("response-no-search.json");
    expect(summarizeResponse(response)).toEqual({
      stop_reason: "max_tokens",
      input_tokens: 1043,
      output_tokens: 4096,
      web_search_requests: 0,
      queries: [],
    });
  });

  it("never throws on garbage input", () => {
    for (const garbage of [null, undefined, 42, "x", [], { usage: "nope" }]) {
      expect(summarizeResponse(garbage)).toEqual({
        stop_reason: null,
        input_tokens: 0,
        output_tokens: 0,
        web_search_requests: 0,
        queries: [],
      });
    }
  });
});

describe("buildIndexEntry", () => {
  it("combines run metadata with the parsed response summary", async () => {
    const response = await loadFixture("response-web-search.json");
    const record: RunRecord = {
      metadata: {
        campaign: "case-a-pilot",
        arm: "b",
        index: 3,
        timestamp: "2026-07-29T10:00:00.000Z",
        model_requested: "claude-opus-5",
        model: "claude-opus-5",
        request_id: "req_test",
        config_hash: "deadbeef",
        prompt_hashes: { system: "aa", arm: "bb" },
      },
      response,
    };
    expect(buildIndexEntry(record)).toEqual({
      arm: "b",
      index: 3,
      timestamp: "2026-07-29T10:00:00.000Z",
      stop_reason: "end_turn",
      input_tokens: 12894,
      output_tokens: 2417,
      web_search_requests: 2,
      queries: [
        "WIMP direct detection LZ 2024 results dark matter",
        "axion haloscope ADMX ORGAN parameter space 2025",
      ],
    });
  });
});
