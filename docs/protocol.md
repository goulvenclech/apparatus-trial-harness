# Protocol

Applies to every case. Task cores, answer keys and boundary calls live in `docs/cases/`.

## Arms

The task core is identical across the three arms. Only the scaffolding varies.

- A, bare. The core alone.
- B, placebo. The core plus a carefully written request in continuous prose, with no breakdown into criteria.
- C, apparatus. The core plus a call to the skill.

A→B measures the effect of a careful request. B→C measures what the apparatus adds on top of it, which is what the article is about.

## Task core

The core names the domain and leaves the programmes to be found, as in real use. Naming them would hand the model the space of alternatives and switch off the fifth axis.

The core also carries the coverage requirement and the ranking request, so that the bare arm produces a list and an ordering comparable with the other two. The answer key fixes the level at which programmes are individuated (the pilot left open whether ΛCDM counts as one).

## Arm B

The five axes are the apparatus's thesis, so a placebo built on five criteria would contain the active ingredient. B is continuous prose, with no axes and no pathology vocabulary. It keeps the verdict field and the principal-problem field (free text), which scoring reads, and the closing lines, which give B's output the same shape as C's and are not scored.

B is the prior toolkit, Popperian and Lakatosian reflexes included, so a small gap would mean the apparatus adds little over a careful request.

The verdict scale is stated in the skill's own words, two inconclusive levels included, because scoring needs a common scale. The « (stagnant) » tag stays out, since it belongs to the diachronic axis.

Freeze B before the first run and publish it.

## System prompt

Identical across arms and inert. A role (research assistant with web search), the date (needed, or « currently » is ambiguous), the language and the sourcing rule, which makes verifiability scorable in the bare arm too. Nothing about rigour or caution, since that would scaffold all three arms and compress the gaps. The text lives in `prompts/system.txt` and is hashed with every run.

## Harness

The API runs are the measurement. The product runs check that the result carries over to everyday use of Claude.

Per case, 3 arms × 5 API runs, plus 3 runs each of B and C in the product.

API runs. Pinned model id (never an alias), the id the API reports archived per run. `max_uses` identical across arms and above what any arm consumes, counter logged (the pilot saturated at 8 of 8). Default temperature, since the variance is part of the measurement. Fixed `user_location` and campaign date. Prompt caching on, which changes the bill and not the output. A turn the server pauses (`pause_turn`) is continued with the same request and the paused responses, up to ten times. `max_tokens` 64,000, far above any observed run, and a turn cut by it or still paused after the last continuation is archived and marked incomplete. Full JSON archived, tool-use blocks included, since the queries show how each arm worked. B's scaffolding and the SKILL.md body for C sit at the same position in the user message, so arm C tests the skill's content. Triggering is checked on the first product run.

Product runs. Incognito, memory off, skill removed from the account, research mode on, a fresh conversation each time. If the B→C gap vanishes or reverses there, research mode already does part of the apparatus's work.

## Normalisation

Each arm is recognisable on sight (C's axis headings, B's closing lines, A's free prose). Normalisation rewrites every run into one schema that hides this from the scorer.

The normaliser works from the final answer text of each run (trailing text blocks only), in shuffled order, without the key, and writes one record per run to `normalised/<campaign>/<id>.json` under an opaque id. The id → arm mapping, the shuffle seed and the schema version go to `keys/<campaign>.json`. Raw JSON stays in `runs/`.

Rules (schema `normalised-run/2`).

- *programmes*. One entry per unit the answer treats as a programme in its own right, in order of presentation, counted in `programme_count`. An item ranked but never treated has position null and is not counted. An item listed as a programme with at least one line of its own is an entry, « surveyed but not graded » sections included. Its verdict is « not stated » unless the answer gives one, a verdict on the section heading applying to each item, and unranked it has position null but still counts in `programme_count` and for coverage, not for discrimination. A passing mention inside another programme is not an entry. This was fixed before campaign 2 was normalised. One campaign-1 answer had a short « not audited » note on boundary-call programmes, left as normalised under the earlier reading, so only that run's programme count differs (6, or 8 under this rule).
- *label*. The answer's own name, stripped of markdown, numbering and evaluative adjectives, head term plus at most three of its own parenthetical exemplars. Never canonicalised, merged or split.
- *verdict*. One of *solid*, *defensible*, *fragile*, *inconclusive (evidence)*, *inconclusive (balance)*, or « not stated ». The parenthesis is part of the level. A tag such as « (stagnant) », a qualification or a split go to `verdict_note`.
- *principal_problem*. A neutral noun phrase of at most fifteen words, expanded from the answer's reasoning when it gives a closed-vocabulary label. « none » where the answer says none, « not stated » where it gives no such field.
- *ranking*. The final ranking, best to worst. An answer that numbers its programmes best to worst with no separate list is ranked in that order.
- *sources*. Every reference supporting a factual claim, in order of first appearance, where a mention identifies a specific work (a title, a venue, an arXiv id, or an author or organisation plus a single year). *ref* as given, in the form « Author/Organisation, "Title", Venue, Year » with only the parts supplied. *claim*, the proposition it supports, in neutral prose of at most twenty words.
- Nothing else. No axis text, closing lines, section structure, arm-specific vocabulary or quotation.

A record with every verdict « not stated » is the bare arm, so blinding only separates A from B and C, and the B→C contrast is the one that stays blind.

## Scoring

Blind, per run, from `normalised/` only.

- *Verifiability*. The work exists under the author, title, venue and year given. Whether it supports the claim is checked on five references per run, drawn with the campaign seed, and reported alongside.
- *Coverage*. Answer-key programmes identified, read with the programme count, since breadth and depth trade off.
- *Fabrication*. Programmes invented or wrongly described.
- *Discrimination*. Pairs correctly ordered, over the intersection with the answer key.

After unblinding, with the per-run scores fixed. Group by arm, compute the rates, the A→B and B→C gaps (discrimination with its per-pair breakdown) and stability. Ordering stability is the share of the arm's runs following the majority order of each answer-key pair, averaged over pairs. Verdict stability is the share of runs giving the modal verdict of each answer-key programme, averaged over programmes. Each share is taken over the runs that rank both programmes of the pair, or give the programme a verdict. A pair or programme counts only when at least 3 of the arm's 5 runs do so; below that it is reported as « insufficient data » and left out of the mean. Report the lowest pair and programme next to each mean.

## Thresholds

Per arm. An arm below any of them is reported but left out of the comparison. The article's claim needs C at or above all four and ahead of B on discrimination. A tie between B and C is reported as one.

- Ordering stability ≥ 0.80.
- Verdict stability ≥ 0.80.
- Verifiable sources ≥ 0.95.
- Coverage ≥ 0.80.

Calibrated on the pilot (ordering 1.00 for A and B, 0.87 for C, verdicts 0.87 for B and C, sources 0.98 to 1.00, coverage 1.00). At full support, chance on ordering is near 0.69 with five runs, and with three key pairs ordering takes only seven values, so the next key should individuate five or six programmes.

The trial cannot separate the effect of splitting the assessment into axes from the effect of these particular axes. They count as one contribution.

## Campaigns

Each campaign has its own config and prompt set. Earlier ones stay as archived.

- `case-a-dark-matter` (`config.json`, `prompts/`). The skill as packaged on 8 November 2026 (commit f3b16d1, its body verbatim in `prompts/arm-c.txt`). The minimum-support stability rule and the « at or above » reading of the thresholds were fixed after this campaign was unblinded; its figures of record use them, with the earlier readings kept in `scores/case-a-dark-matter/unblinded.md`.
- `case-a-dark-matter-2` (`config.case-a-dark-matter-2.json`, `prompts/case-a-dark-matter-2/`). Same model, settings and campaign date, with the revised skill. In the first campaign C ran fewer web searches than A and B (20–30 against 31–37 and 30–45), with fewer follow-up rounds. No arm searched for rivals beyond the familiar candidates, the closest being generic « candidates review » queries. C missed the hidden-sector programme in all five runs. The revision keeps conciseness to the write-up, asks for a survey of the field when no artefact is under review, and makes axis 5 a search for rivals.
