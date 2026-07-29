import {
  APIConnectionError,
  BadRequestError,
  InternalServerError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { callWithBackoff, computeBackoffDelay, isRetryable } from "../src/runner.js";

// Fast retry settings so the real setTimeout path runs in milliseconds.
const FAST = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 };
const JITTER_MAX = 500;

function rateLimit(headers: Record<string, string> = {}): RateLimitError {
  return new RateLimitError(
    429,
    { type: "error", error: { type: "rate_limit_error", message: "slow down" } },
    "slow down",
    new Headers(headers),
  );
}

function serverError(status: number): InternalServerError {
  return new InternalServerError(
    status,
    { type: "error", error: { type: "api_error", message: "boom" } },
    "boom",
    new Headers(),
  );
}

function badRequest(): BadRequestError {
  return new BadRequestError(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "bad param" } },
    "bad param",
    new Headers(),
  );
}

describe("isRetryable", () => {
  it("retries 429, 5xx (incl. 529) and connection errors", () => {
    expect(isRetryable(rateLimit())).toBe(true);
    expect(isRetryable(serverError(500))).toBe(true);
    expect(isRetryable(serverError(529))).toBe(true);
    expect(isRetryable(new APIConnectionError({ message: "socket hang up" }))).toBe(true);
  });

  it("fails loudly on other 4xx and on non-API errors", () => {
    expect(isRetryable(badRequest())).toBe(false);
    expect(isRetryable(new Error("not an API error"))).toBe(false);
  });
});

describe("computeBackoffDelay", () => {
  const retry = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 400 };

  it("grows exponentially with bounded jitter", () => {
    const first = computeBackoffDelay(serverError(500), 1, retry);
    expect(first).toBeGreaterThanOrEqual(100);
    expect(first).toBeLessThanOrEqual(100 + JITTER_MAX);
    const second = computeBackoffDelay(serverError(500), 2, retry);
    expect(second).toBeGreaterThanOrEqual(200);
    expect(second).toBeLessThanOrEqual(200 + JITTER_MAX);
  });

  it("caps the exponential part at maxDelayMs", () => {
    const capped = computeBackoffDelay(serverError(500), 10, retry);
    expect(capped).toBeGreaterThanOrEqual(400);
    expect(capped).toBeLessThanOrEqual(400 + JITTER_MAX);
  });

  it("never waits less than the server's retry-after", () => {
    const delay = computeBackoffDelay(rateLimit({ "retry-after": "2" }), 1, retry);
    expect(delay).toBeGreaterThanOrEqual(2000);
  });

  it("ignores non-numeric retry-after values", () => {
    const delay = computeBackoffDelay(
      rateLimit({ "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }),
      1,
      retry,
    );
    expect(delay).toBeLessThanOrEqual(100 + JITTER_MAX);
  });
});

describe("callWithBackoff", () => {
  it("retries retryable errors until the call succeeds", async () => {
    let attempts = 0;
    const result = await callWithBackoff(
      () => {
        attempts++;
        return attempts < 3 ? Promise.reject(rateLimit()) : Promise.resolve("ok");
      },
      FAST,
      "test",
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("gives up after maxAttempts and rethrows the last error", async () => {
    let attempts = 0;
    await expect(
      callWithBackoff(
        () => {
          attempts++;
          return Promise.reject(serverError(529));
        },
        FAST,
        "test",
      ),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(attempts).toBe(FAST.maxAttempts);
  });

  it("throws non-retryable errors immediately", async () => {
    let attempts = 0;
    await expect(
      callWithBackoff(
        () => {
          attempts++;
          return Promise.reject(badRequest());
        },
        FAST,
        "test",
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(attempts).toBe(1);
  });
});
