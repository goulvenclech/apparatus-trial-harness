# Contributing Guidelines

Guidelines for working on **apparatus-trial-harness**. This is a personal project — these notes are for me and my AI agents, to keep the code coherent and the experiment's invariants intact, not a call for outside contributions.

## Philosophy

The harness is a measurement instrument. Its one job is to make every run exact, reproducible, and archived: frozen inputs in, raw responses out, hashes to prove nothing moved. Scoring and analysis are a separate, blind step that does not belong here, and an odd API outcome (`pause_turn`, `refusal`, truncation) is a result to record, not an error to engineer around.

## Getting Started

Prerequisites: [Node.js](https://nodejs.org/) ≥ 22.12, then `npm install`. Authentication comes from the environment (`ANTHROPIC_API_KEY`, or the SDK's own resolution), never from the repo.

```sh
npm run harness              # perform the missing runs of the campaign
npm run harness -- --force   # re-run and overwrite existing runs (warns first)
npm run check                # tsc + oxlint + oxfmt --check + vitest
```

Each run is one turn, usually one `messages.create` call. When the server-side loop stops on `pause_turn`, the harness continues the turn as the Anthropic docs describe: the same request plus each paused response as an assistant message, in order, with the response's code-execution `container`, up to `maxContinuations` times (default 10). The request is built from the system template with `{DATE}` substituted, the arm file verbatim as the single user message, the server-side web search tool from config, `temperature` and `thinking` left at API defaults, and `effort` too unless `config.json` pins one. `promptCaching: true` adds a top-level `cache_control`, so the server-side search loop reads its growing context from cache: it changes the bill, not the output (per the Anthropic prompt-caching docs), and the cache fields stay in each run's archived `usage`. Every input is a file — the prompts in `prompts/`, everything else in `config.json`, whose strict parser is the config reference: unknown keys, `-latest` model aliases, and malformed values fail loudly.

`prompts/` holds the prompts as sent and published: the system prompt, and one file per arm. The case doc in [docs/cases/](./docs/cases) publishes only the task core, which must stay byte-identical to `prompts/arm-a.txt`; arms B and C open with that core and a blank line, and share the verdict scale. Tests pin all three. Arm C is the one generated prompt: `npm run arm-c` rebuilds `prompts/arm-c.txt` from `prompts/arm-a.txt` and the packaged skill, and `npm run arm-c -- <SKILL.md>` first copies a new skill version into `docs/skill/`; a test fails while the two are out of step. Running another case means swapping `prompts/` and `campaign` together, so each case lands in its own archive directory.

Each run archives `runs/<campaign>/arm-<arm>-<n>.json` — input hashes, the model the API actually served, and the full raw response, plus the earlier paused responses of a continued turn in `paused_responses`. A turn still paused after the last continuation is archived with `incomplete: true`. `index.jsonl` is a one-line-per-run summary regenerated from the archive on every invocation, even an aborted one; it sums tokens and searches over every response of the turn, and adds `continuations` and `incomplete` only when they apply. The record shapes live in [`src/archive.ts`](./src/archive.ts).

## Behaviour

- Idempotent and sequential: existing runs are skipped (`--force` overwrites, with a warning), calls are spaced by `delayMs`, and a `.lock` per campaign rejects concurrent invocations (released on Ctrl-C).
- A skipped run whose archived hashes no longer match the current files triggers an instrument-drift warning on stderr — warns, does not refuse.
- Exponential backoff on 429/5xx/transport errors; any other 4xx fails loudly. SDK auto-retry is off — the harness owns the policy. Writes are atomic, so a crash never leaves a half-written run.

## Quality Guidelines

- Self-documenting code first; comments explain *why*, not *how*.
- Tests assert observable behaviour, stay deterministic, and **never make live API calls** — parsing is pinned against `tests/fixtures/`.
- Strict at the edges, forgiving over archives: config parsing and index rebuild fail loudly on anything unexpected; extraction over archived responses never throws. Keep that split.
- Honor strict TypeScript rather than casting problems away, and keep the formatter scoped: `.oxfmtrc.json` ignores `docs/`, `prompts/`, `runs/` and `config.json` — frozen bytes are hashed and must never be rewritten by tooling.
- Run `npm run check` before committing; document user-facing changes in the [README](./README.md) and setup or behaviour changes here, in the same commit.

## Freeze checklist

To settle before the first real run, then freeze with the config:

1. **Model** — the protocol asks for a pinned model id (never an alias). Current-generation IDs carry no date suffix, so the bare ID is the pin, backed by the per-run archive of the `model` the API reports. Note that current Opus-tier models think by default; their blocks are archived as-is. Thinking can't be turned off on `claude-opus-5-5`: `effort` is the only lever, and its API default is `medium` where `claude-opus-5` (the pilot) defaulted to `high` — pin it in config if the campaign must not depend on that default.
2. **Web search tool version** (`webSearchToolType`) — part of the measured instrument: check the current variant against the Anthropic docs, freeze it with the model, and keep it consistent with the product comparison.
3. **Arm C** — task core + trigger sentence + the [SKILL.md](./docs/skill/epistemological-apparatus/SKILL.md) body (frontmatter stripped), verbatim, closing link included: it points to goulven-clech.dev, which `blockedDomains` keeps out of every arm's searches.
4. **Volume** — `runsPerArm` × 3 arms, each up to `maxUses` searches plus tokens, billed at the pinned model's current rates.
