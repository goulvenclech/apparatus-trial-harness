# Agents Guide

apparatus-trial-harness is a TypeScript CLI harness for a controlled A/B/C prompt experiment against the Anthropic Messages API — it collects and archives runs, nothing else 🔬

## Useful Commands

```sh
npm run harness              # perform the missing runs of the campaign (costs money — see guardrails)
npm run harness -- --help    # CLI usage
npm run arm-c -- <SKILL.md>  # swap in a skill version and rebuild prompts/arm-c.txt (pre-freeze only)
npm run blind                # export a finished campaign's final answers for blind normalisation
npm run check                # tsc + oxlint + oxfmt --check + vitest (run before committing)
npm test                     # unit tests only — never makes live API calls
npm run fmt                  # format src/ and tests/ only; frozen inputs are excluded
npm run typecheck            # tsc --noEmit
npm run lint                 # oxlint
```

## Useful Resources

- In [CONTRIBUTING.md](./CONTRIBUTING.md): [Quality Guidelines](./CONTRIBUTING.md#quality-guidelines) applies to agents and humans equally, [Getting Started](./CONTRIBUTING.md#getting-started) covers setup, the config reference and the output formats, [Behaviour](./CONTRIBUTING.md#behaviour) the runtime invariants, [Freeze checklist](./CONTRIBUTING.md#freeze-checklist) the pre-run decisions, and [Philosophy](./CONTRIBUTING.md#philosophy) is the project's north star.
- The [README](./README.md) is the project overview and layout. [docs/protocol.md](./docs/protocol.md) is the authority on experiment design — arms, what stays out of B, what the harness must fix and log, scoring and metrics — with per-case task cores and answer keys in [docs/cases/](./docs/cases) and the skill under test in [docs/skill/](./docs/skill/epistemological-apparatus/SKILL.md).
- Anthropic Messages API and the server-side web search tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

## Agent Guardrails

- Do not create new documentation files to explain implementation.
- Do not add external dependencies without justification. Prefer the standard library and existing utilities.
- Match the current project structure, naming, and style; do not create parallel patterns and avoid duplication.
- All code, comments, documentation, commit messages, and user-facing output must be in English.
- Never edit the frozen inputs — `prompts/`, `docs/`, and `config.json` once frozen — and never touch anything under `runs/`: raw bytes are hashed, and the archived runs are the experiment's primary data.
- Never run the formatter outside `src/` and `tests/`; `.oxfmtrc.json` ignores the frozen paths — keep it that way.
- The harness only collects and archives: do not add scoring, analysis, or summarisation code — that happens elsewhere, blind.
- Tests must never make live API calls; response parsing is pinned against the recorded fixtures in `tests/fixtures/`.
- Do not launch `npm run harness` against the real config unless explicitly instructed — runs cost real money and write into the archive.
