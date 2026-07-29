// Extraction over archived responses is defensive by design: the archive is the
// source of truth and may hold shapes this code never anticipated (tool errors,
// refusals, future block types) — it must never throw on them.

export interface RunSummary {
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  queries: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Result blocks are deliberately ignored: their shape varies with success or
// failure, and neither form carries the query string.
export function extractSearchQueries(response: unknown): string[] {
  if (!isRecord(response) || !Array.isArray(response["content"])) return [];
  const queries: string[] = [];
  for (const block of response["content"]) {
    if (!isRecord(block)) continue;
    if (block["type"] !== "server_tool_use" || block["name"] !== "web_search") continue;
    const input = block["input"];
    if (isRecord(input) && typeof input["query"] === "string") {
      queries.push(input["query"]);
    }
  }
  return queries;
}

export function summarizeResponse(response: unknown): RunSummary {
  const record = isRecord(response) ? response : {};
  const usage = isRecord(record["usage"]) ? record["usage"] : {};
  const serverToolUse = isRecord(usage["server_tool_use"]) ? usage["server_tool_use"] : {};
  return {
    stop_reason: typeof record["stop_reason"] === "string" ? record["stop_reason"] : null,
    input_tokens: typeof usage["input_tokens"] === "number" ? usage["input_tokens"] : 0,
    output_tokens: typeof usage["output_tokens"] === "number" ? usage["output_tokens"] : 0,
    web_search_requests:
      typeof serverToolUse["web_search_requests"] === "number"
        ? serverToolUse["web_search_requests"]
        : 0,
    queries: extractSearchQueries(response),
  };
}
