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

// The answer is the trailing run of text blocks; earlier text is preamble.
// Citations are listed in one format for every arm so they do not reveal it.
export function extractFinalAnswer(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response["content"])) return "";
  const blocks: unknown[] = response["content"];
  let start = blocks.length;
  while (start > 0) {
    const block = blocks[start - 1];
    if (!isRecord(block) || block["type"] !== "text") break;
    start--;
  }

  let text = "";
  const cited: string[] = [];
  for (const block of blocks.slice(start)) {
    if (!isRecord(block)) continue;
    if (typeof block["text"] === "string") text += block["text"];
    const citations = block["citations"];
    if (!Array.isArray(citations)) continue;
    for (const citation of citations) {
      if (!isRecord(citation) || typeof citation["url"] !== "string") continue;
      const title = typeof citation["title"] === "string" ? citation["title"] : citation["url"];
      const entry = `- ${title} — ${citation["url"]}`;
      if (!cited.includes(entry)) cited.push(entry);
    }
  }
  return cited.length === 0 ? text : `${text}\n\nCited search results:\n${cited.join("\n")}`;
}
