import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";
import { buildMessageParams, runTurn } from "../src/runner.js";

const BASE = {
  campaign: "case-a",
  model: "claude-opus-5-5",
  campaignDate: "8 November 2026",
  runsPerArm: 5,
  maxTokens: 16000,
  maxUses: 8,
  delayMs: 5000,
  userLocation: { type: "approximate", city: "Paris", country: "FR" },
};

function config(overrides: Record<string, unknown> = {}) {
  return parseConfig(JSON.stringify({ ...BASE, ...overrides }), "/tmp/project", "test");
}

describe("buildMessageParams", () => {
  it("sends the system prompt, the arm text as the single user message, and the web search tool", () => {
    expect(buildMessageParams(config(), "SYSTEM", "ARM")).toEqual({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: "SYSTEM",
      messages: [{ role: "user", content: "ARM" }],
      tools: [
        {
          type: "web_search_20260318",
          name: "web_search",
          max_uses: 8,
          user_location: { type: "approximate", city: "Paris", country: "FR" },
        },
      ],
    });
  });

  it("sends blocked_domains on the web search tool when the config sets them", () => {
    const params = buildMessageParams(config({ blockedDomains: ["goulven-clech.dev"] }), "S", "A");
    expect(params.tools).toEqual([
      expect.objectContaining({ name: "web_search", blocked_domains: ["goulven-clech.dev"] }),
    ]);
  });

  // A refusal fallback would answer some runs with another model and mix instruments.
  it("never requests a model fallback", () => {
    const params = buildMessageParams(config({ effort: "high" }), "S", "A");
    expect(params).not.toHaveProperty("fallbacks");
    expect(params).not.toHaveProperty("betas");
  });

  it("sends a top-level cache_control only when promptCaching is on", () => {
    expect(buildMessageParams(config({ promptCaching: true }), "S", "A").cache_control).toEqual({
      type: "ephemeral",
    });
    expect(buildMessageParams(config({ promptCaching: false }), "S", "A")).not.toHaveProperty(
      "cache_control",
    );
    expect(buildMessageParams(config(), "S", "A")).not.toHaveProperty("cache_control");
  });

  it("sends output_config.effort only when the config pins one", () => {
    expect(buildMessageParams(config(), "S", "A")).not.toHaveProperty("output_config");
    expect(buildMessageParams(config({ effort: "high" }), "S", "A").output_config).toEqual({
      effort: "high",
    });
  });
});

function response(stopReason: string, text: string): Anthropic.Messages.Message {
  return {
    content: [{ type: "text", text }],
    stop_reason: stopReason,
    container: { id: `container_${text}`, expires_at: "2026-11-08T12:00:00Z" },
  } as unknown as Anthropic.Messages.Message;
}

function build(paused: readonly Anthropic.Messages.Message[]) {
  return buildMessageParams(config(), "S", "A", paused);
}

function scripted(stopReasons: string[]) {
  const sent: Anthropic.Messages.MessageCreateParamsNonStreaming[] = [];
  const send = async (params: Anthropic.Messages.MessageCreateParamsNonStreaming) => {
    const stopReason = stopReasons[sent.length] ?? "end_turn";
    sent.push(params);
    return { message: response(stopReason, `r${sent.length}`), requestId: `req_${sent.length}` };
  };
  return { sent, send };
}

describe("continuing a paused turn", () => {
  it("resends the original request plus each paused response, with the last container", () => {
    const first = response("pause_turn", "one");
    const second = response("pause_turn", "two");
    const original = buildMessageParams(config({ promptCaching: true }), "S", "A");
    expect(buildMessageParams(config({ promptCaching: true }), "S", "A", [first, second])).toEqual({
      ...original,
      messages: [
        ...original.messages,
        { role: "assistant", content: first.content },
        { role: "assistant", content: second.content },
      ],
      container: "container_two",
    });
  });

  it("sends one request when the turn does not pause", async () => {
    const { sent, send } = scripted(["end_turn"]);
    const turn = await runTurn(send, build, 10);
    expect(turn.complete).toBe(true);
    expect(turn.responses.map((r) => r.requestId)).toEqual(["req_1"]);
    expect(sent).toHaveLength(1);
  });

  it("continues once after a pause, then stops on end_turn", async () => {
    const { sent, send } = scripted(["pause_turn", "end_turn"]);
    const turn = await runTurn(send, build, 10);
    expect(turn.complete).toBe(true);
    expect(turn.responses.map((r) => r.message.stop_reason)).toEqual(["pause_turn", "end_turn"]);
    expect(sent[1]).toEqual(build([turn.responses[0]?.message as Anthropic.Messages.Message]));
  });

  it("stops after maxContinuations and reports the turn incomplete", async () => {
    const { sent, send } = scripted(["pause_turn", "pause_turn", "pause_turn", "end_turn"]);
    const turn = await runTurn(send, build, 2);
    expect(turn.complete).toBe(false);
    expect(sent).toHaveLength(3);
    expect(sent[2]?.messages).toHaveLength(3);
  });

  it("treats a pause as incomplete when no continuation is allowed", async () => {
    const { sent, send } = scripted(["pause_turn"]);
    expect((await runTurn(send, build, 0)).complete).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
