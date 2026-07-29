# apparatus-trial-harness

> **Work in progress** — a running experiment, supporting an upcoming blog article.

CLI harness for a controlled A/B/C prompt experiment against the Anthropic Messages API: does an epistemological apparatus (arm C) beat a carefully written placebo (arm B) and a bare task prompt (arm A)? One `messages.create` call per run, with server-side web search, and the full raw response archived. The harness only collects and archives — scoring and analysis happen separately, and blind.

TypeScript (strict, ESM) on the official [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk), tested with [vitest](https://vitest.dev), linted and formatted with [oxlint and oxfmt](https://oxc.rs).

## Layout

| Path | Description |
| --- | --- |
| [`config.json`](./config.json) | Experiment parameters — frozen before the first run |
| [`prompts/`](./prompts) | System template and the three arm prompts, sent verbatim |
| `runs/<campaign>/` | Archived raw responses plus `index.jsonl` — the data, committed |
| `normalised/<campaign>/` | One record per run in a fixed schema, under an opaque id — what the blind scoring pass reads |
| `keys/<campaign>.json` | The id → arm mapping and the extraction rules — kept out of `normalised/`, opened only after scoring |
| [`docs/protocol.md`](./docs/protocol.md) | The frozen experiment protocol, applying to every case |
| [`docs/cases/`](./docs/cases) | Per-case task cores, answer keys and boundary calls |
| [`docs/skill/`](./docs/skill/epistemological-apparatus/SKILL.md) | The epistemological-apparatus skill, as packaged |
| [`src/`](./src), [`tests/`](./tests) | The harness and its unit tests |

Setup, usage, the config reference, runtime behaviour, and the freeze checklist live in [CONTRIBUTING.md](./CONTRIBUTING.md).
