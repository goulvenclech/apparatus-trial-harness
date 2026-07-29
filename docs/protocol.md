# Protocol

Applies to every case. Task cores, answer keys and boundary calls live in the `cases/` folder.

## Arms

The task core is strictly identical across the three arms; only the scaffolding varies.

- **A — bare**: the core alone.
- **B — written placebo**: the core plus a carefully written request, in continuous prose, with no breakdown into criteria.
- **C — apparatus**: the core plus a call to the skill.

A→B measures the effect of a carefully written request. **B→C measures what the apparatus adds over one** — the only quantity that justifies the article.

## Task core

Names the domain, not the programmes: that is the real condition of use, and naming them would supply the space of alternatives and neutralise the Stanford meta-criterion.

The coverage requirement and the ranking request belong to the core, so all three arms carry them. Without them the bare arm, which has no format constraint, would produce coverage and an implicit ordering not comparable with B and C.

## Arm B

Breaking the assessment into five axes is not presentation — it is the conclusion drawn from the literature, the apparatus's thesis. A placebo built on five criteria would contain the active ingredient, so B is continuous prose. The closed vocabulary of eight pathologies is out for the same reason: a taxonomy is content.

What stays in, because mechanical scoring needs it: the verdict field, the principal-problem field (free text in B), the closing lines.

B represents the prior toolkit, not a straw man: Popperian and Lakatosian notions belong in it. The bar for C is therefore high, and a small gap would mean the margin over a careful request is thin, not that the apparatus is useless. Freeze B's text before the first run and publish it.

Declared concession: the five-level verdict scale distinguishes *inconclusive-by-evidence* from *inconclusive-by-balance*, which is substantive epistemology. It is kept because scoring requires a common scale.

## System prompt

Identical across arms.

```
You are a research assistant with web search available. Today's date is {DATE}.

Answer in British English. State the sources behind your factual claims, with enough detail to identify them: author or organisation, title, venue, year.

Write for a reader who is not a specialist in the field but is comfortable with technical material. Be concise — no preamble, no restating the question.
```

Deliberately inert: language, date, sourcing. Sourcing is a channel condition, identical across arms, and it makes the verifiability metric computable in the bare arm too. Add nothing about rigour, caution or seeking criticism — that would inject scaffolding into all three arms and compress the gaps. The date must be filled in, or « currently » is ambiguous.

## Harness

API to measure, product to demonstrate.

Per case: 3 arms × 5 API runs, plus 3 runs each of B and C in the product.

Fix and log: dated model string, never an alias; `max_uses` identical across arms, with the actual counter logged per run; temperature left at default, since the variance is what is being measured; `user_location`; campaign date; fresh session every run; no memory; no rephrasing between runs. Archive the complete JSON including tool-use blocks — the search queries are evidence of *how* each arm works, not just what it concludes.

B's scaffolding and the SKILL.md text for C both go in the user message at the same position, system prompt held identical. Arm C therefore tests the skill's content, not its triggering — check triggering separately on the first product run.

The product runs check that the direction of the B→C gap matches the API. Reversed or vanished means research mode already does part of the apparatus's work — the most interesting result available.

## Normalisation

Extract mechanically from each raw run into a fixed schema: programmes identified, their order, verdict per programme (« not stated » where the arm imposed none), principal problem, sources cited, number of programmes treated.

This is the blinding mechanism, not just extraction. Arm C's axis headings, arm B's closing lines and arm A's free prose are each recognisable on sight, so the schema must render all three identically.

Raw JSON stays in `runs/`, where the arm is visible. Normalised records go to `normalised/`, one file per run, named by an opaque identifier that does not encode the arm, written in shuffled order. The identifier → arm mapping goes in a single key file kept outside `normalised/`.

## Scoring

Two passes.

**Blind, per run.** Score from `normalised/` alone, one record at a time, without opening the key.

- *Source verifiability* (priority): references that (i) exist and (ii) say what they are made to say. No expertise needed, verification certain, failure disqualifying.
- *Coverage*: answer-key programmes identified. Read alongside the programme count, since breadth and depth trade off.
- *Fabrication*: programmes invented or wrongly described.
- *Discrimination*: pairs correctly ordered, over the intersection with the answer key.

**After unblinding.** Open the key, group runs by arm, aggregate. No fresh judgement is made on any run here — the per-run scores are already fixed — so unblinding cannot bias this pass.

- Per-arm rates for the four metrics above, and the A→B and B→C gaps.
- *Stability*: modal agreement across the runs of one arm on list, order and verdicts. Necessarily post-unblinding, since it requires grouping runs by arm.

## Thresholds — fix before the first run

Minimum modal agreement on ordering and on verdict per programme; floor rates for verifiable sources and for coverage. If B equals C on discrimination and coverage, say so.

Committed in advance: the effect cannot be split between the breakdown into axes and the particular choice of axes — within the apparatus these are two descriptions of one contribution, not two factors.
