# case-a-dark-matter: unblinded comparison

Computed after unblinding, from the fixed per-run scores, as `docs/protocol.md` L72–83 prescribes. Full figures, per-pair and per-programme tables, and the input hashes are in `unblinded.json`. n = 5 runs per arm.

Stability reading of record (Goulven, 8 November 2026): conditional, with a minimum support. A pair counts for ordering stability only when at least 3 of the arm's 5 runs rank both programmes. A programme counts for verdict stability only when at least 3 runs give it a verdict. Anything below that is « insufficient data » and is left out of the mean. Thresholds use ≥. The two earlier readings are kept in the appendix.

Mapping: A = q4n5 q6ah txfx wmqn y8yz, B = 4mn5 9gtx a3m9 bs68 m5mq, C = 3hkv 4x5f jsea pn4y revp. The seed reproduces the shuffle and the ids, the 15 run-file hashes match the key, and each blind file equals its run's final answer. The five A ids are the five records with every verdict « not stated ».

## Per arm

| Metric | A | B | C |
|---|---|---|---|
| Sources verified, over all | 116/119 = 0.975 | 159/163 = 0.975 | 132/136 = 0.971 |
| Sources verified, over decidable | 116/116 = 1.000 | 159/162 = 0.981 | 132/133 = 0.992 |
| Not found as given / unverifiable | 0 / 3 | 3 / 1 | 1 / 3 |
| Sampled support, supports / partial / does not / unverifiable (of 25) | 19 / 5 / 0 / 1 | 21 / 4 / 0 / 0 | 17 / 5 / 2 / 1 |
| Coverage | 21/25 = 0.84 | 23/25 = 0.92 | 20/25 = 0.80 |
| Hidden-sector identified | 1/5 | 3/5 | 0/5 |
| Programme count, mean (range) | 6.6 (6–8) | 7.4 (7–8) | 5.8 (5–6) |
| Fabrication: level errors (MOND + ΛCDM ranked) | 5 (5 + 0) | 8 (5 + 3) | 7 (5 + 2) |
| Fabrication: invented or wrongly described | 0 | 0 | 0 |
| Discrimination, protocol rate | 21/22 = 0.955 | 22/26 = 0.846 | 19/20 = 0.950 |
| Discrimination on the four pairs B and C both rank | — | 19/20 | 19/20 |
| Ordering stability (lowest) | 1.00 (all 1.00) | 0.98 (PBH/sterile 4/5) | 0.90 (PBH/WIMP 3/5) |
| Ordering pairs included / insufficient data | 6 / 4 (the hidden-sector pairs, 1 run each) | 10 / 0 | 6 / 4 (the hidden-sector pairs, 0 runs) |
| Verdict stability (lowest) | n/a, no verdicts | 0.84 (PBH, WIMP 3/5) | 0.90 (PBH, WIMP 4/5) |
| Verdict programmes included / insufficient data | 0 / 5 | 5 / 0 | 4 / 1 (hidden-sector) |
| Web searches per run | 31–37 | 30–45 | 20–30 |

Discrimination per firm pair (correct/eligible, A / B / C):

- axion > WIMP: 5/5, 5/5, 5/5
- axion > sterile: 5/5, 5/5, 5/5
- axion > PBH: 5/5, 5/5, 5/5
- hidden-sector > WIMP: 0/1, 0/3, 0/0
- hidden-sector > sterile: 1/1, 3/3, 0/0
- PBH > sterile: 5/5, 4/5, 4/5

The whole B→C discrimination gap (+0.104) comes from hidden-sector > WIMP, which B gets wrong in 3 of 3 runs and C never ranks, because no C run identifies the hidden sector. On the pairs both arms rank, B and C are tied. Every run that ranks hidden-sector and WIMP puts WIMP first.

Modal verdicts, for reading only (the protocol scores stability, not agreement with the key). B: axion defensible 5/5, hidden-sector inconclusive (evidence) 3/3, PBH fragile 3/5, WIMP defensible 3/5, sterile fragile 5/5. C: axion defensible 5/5, PBH defensible 4/5, WIMP fragile 4/5, sterile fragile 5/5. Key: defensible, defensible, inconclusive (evidence), fragile, fragile.

## Gaps

| Metric | A→B | B→C |
|---|---|---|
| Sources over all | +0.001 | −0.005 |
| Sources over decidable | −0.019 | +0.011 |
| Sampled « supports » | +0.08 (19 → 21 of 25) | −0.16 (21 → 17 of 25) |
| Coverage | +0.08 | −0.12 |
| Fabrication count | +3 | −1 |
| Discrimination, protocol rate | −0.108 | +0.104 |
| Discrimination, pairs both arms rank | −0.108 (same six pairs) | 0 |
| Ordering stability | −0.02 | −0.08 |
| Verdict stability | n/a | +0.06 |

## Thresholds

| Arm | Ordering ≥ 0.80 | Verdict ≥ 0.80 | Sources ≥ 0.95 | Coverage ≥ 0.80 |
|---|---|---|---|---|
| A | pass (1.00) | n/a | pass (0.975) | pass (0.84) |
| B | pass (0.98) | pass (0.84) | pass (0.975) | pass (0.92) |
| C | pass (0.90) | pass (0.90) | pass (0.971) | pass (0.80, boundary) |
| Pilot calibration (L83) | A 1.00, B 1.00, C 0.87 | B 0.87, C 0.87 | 0.98–1.00 | 1.00 |

The article's claim (L76) needs C above all four thresholds and ahead of B on discrimination. On the protocol's numbers it is met, with two conditions met only at the margin:

- C clears all four thresholds, with coverage exactly at 0.80 because every C run misses the same programme (hidden-sector).
- C leads B on discrimination, 0.950 against 0.846, but the whole lead comes from one pair C never ranks. On the pairs both arms rank, they tie at 19/20, and L76 says a tie is reported as one.
- C's stability rests on 6 of the 10 key pairs and 4 of the 5 key programmes. B's rests on all 10 pairs and all 5 programmes.

Points the rule leaves open:

- **Threshold wording.** L76 asks for C « above » all four thresholds, while L78–81 define them as « ≥ ». The table applies ≥. Under a strict « above », C's coverage of 0.80 would not meet the claim.
- **Arm A.** A has no verdicts by design (L61), so verdict stability is undefined for it, not below the threshold. L76 does not say how to treat an undefined value.

## Sensitivity: hidden-sector credited for q6ah, txfx and wmqn

All three ids are arm A, so B, C and B→C are unchanged.

| A | As scored | Credited |
|---|---|---|
| Coverage | 21/25 = 0.84 | 24/25 = 0.96 |
| Discrimination | 21/22 = 0.955 | 24/28 = 0.857 (three more hidden-sector > WIMP errors) |
| Ordering stability | 1.00 (6 pairs, 4 insufficient data) | 1.00 (10 pairs) |
| A→B coverage gap | +0.08 | −0.04 |
| A→B discrimination gap | −0.108 | −0.011 |

What flips: the sign of the A→B coverage gap. No threshold verdict changes. A stays ahead of B on discrimination either way, by a margin that nearly vanishes. Nothing about B, C, or the article's claim changes.

## Caveats

- **Sample size.** n = 5 per arm, so one run moves a pair's stability share by 0.20. The B→C discrimination gap rests on three pair outcomes in B, and the support sample on 25 references per arm. No difference here is tested for significance, and none should be read as one.
- **Underspecified sources.** The verified counts include references the scorer could identify only through their claim (A 50/116, B 48/159, C 45/132). Under a stricter rule that counts these as unverifiable, no arm would reach 0.95. That is not the protocol's rule, and it was not applied.
- **Pooled rates.** The rates above pool all five runs of each arm. Three individual runs fall below 0.95 on sources (q4n5 0.929, 9gtx 0.943, 4x5f 0.926), but the thresholds apply per arm. Averaging the per-run rates instead gives the same pass/fail results and the same ordering of arms: sources A 0.977, B 0.979, C 0.971; discrimination A 0.967, B 0.850, C 0.950.
- **Unscored claim mismatches.** The scorer noticed claim mismatches outside the support sample but did not score them: A 2, B 3, C 3.
- **Fabrication.** Every fabrication counted is a level error. MOND is ranked in all 15 runs, ΛCDM in 3 B and 2 C runs. No programme was invented.
- **Search conditions.** C ran fewer web searches (20–30) than A (31–37) and B (30–45). This is a difference in conditions inside the campaign, not a measured effect.
- **Scoring setup.** There was one normaliser and one blind scorer, both Claude sessions. Their judgement calls are listed in `summary.json` (`ambiguities`) and in their hand-over notes. The hidden-sector call is the only one tested here.
- **Product runs.** The product runs (3 B + 3 C, L39–43) have not been done.

## Pilot

The protocol uses the pilot only to calibrate the thresholds (L83), so the pilot values appear only in the threshold table. Gaps are not compared. Conditions differ on almost every input:

- model: claude-opus-5 → claude-opus-5-5;
- `max_uses`: 8 → 50. The pilot used 8 of 8 in all 15 runs; this campaign used 20–45 and never reached the limit;
- prompts: the arm A file is byte-identical, but the system prompt, arm B and arm C (the new skill) all differ;
- answer key: v1 → v2, from 3 programmes and 3 firm pairs to 5 programmes, 6 firm and 4 contested pairs;
- verdict vocabulary: the pilot records use « defensible with reservations » and « inconclusive-by-evidence / -by-balance »;
- normalisation schema: `normalised-run/1` → `/2`;
- normaliser and scorer: different.

## Appendix: earlier stability readings

These two readings are superseded by the reading of record above.

L72 says « the share of the arm's runs following the majority order of each answer-key pair, averaged over pairs », and the same for verdicts over programmes. The pilot never had to choose a denominator: its coverage was 1.00 (L83), so every pilot run ranked every key pair. Here the hidden-sector programme is missing from 4 A runs, 2 B runs and all 5 C runs, so the reading matters:

- **Conditional.** The share is taken over the runs that rank both programmes, or give the programme a verdict. It is averaged over the pairs or programmes that at least one run covers. A missed programme then shows up only in coverage. A's four hidden-sector pairs rest on one run each, so they score 1.00 by construction.
- **Literal.** The share is taken over all five runs. It is averaged over all 10 key pairs (6 firm, 4 contested) and all 5 programmes. A run that does not rank the pair, or omits the programme, does not count as following the majority.

### Thresholds under each reading

| Arm | Ordering ≥ 0.80 | Verdict ≥ 0.80 | Sources ≥ 0.95 | Coverage ≥ 0.80 |
|---|---|---|---|---|
| A, conditional | pass (1.00) | n/a | pass (0.975) | pass (0.84) |
| A, literal | **fail (0.68)** | n/a | pass | pass |
| B, conditional | pass (0.98) | pass (0.84) | pass (0.975) | pass (0.92) |
| B, literal | pass (0.82) | **fail (0.76)** | pass | pass |
| C, conditional | pass (0.90) | pass (0.90) | pass (0.971) | pass (0.80, boundary) |
| C, literal | **fail (0.54)** | **fail (0.72)** | pass | pass (0.80, boundary) |
| Pilot calibration (L83) | A 1.00, B 1.00, C 0.87 | B 0.87, C 0.87 | 0.98–1.00 | 1.00 |

The article's claim (L76) needs C above all four thresholds and ahead of B on discrimination.

- **Conditional reading: met on the protocol's numbers, with two conditions met only at the margin.** C clears all four thresholds, with coverage exactly at 0.80 because every C run misses the same programme (hidden-sector). C leads B on discrimination, 0.950 against 0.846. That lead comes entirely from one pair C never ranks. On the pairs both arms rank, they are tied at 19/20, and L76 says a tie is reported as one.
- **Literal reading: not met.** C fails ordering and verdict stability, so it is left out of the comparison (L76). B fails verdict stability and is left out too.
- **Threshold wording.** L76 asks for C « above » all four thresholds, while L78–81 define them as « ≥ ». The table applies L78–81. Under a strict « above », C's coverage of 0.80 would not meet the claim in either reading.
- **Arm A.** A has no verdicts by design (L61), so verdict stability is undefined for it, not below the threshold. L76 does not say how to treat an undefined value.

| | A | B | C |
|---|---|---|---|
| Ordering, conditional / literal | 1.00 / 0.68 | 0.98 / 0.82 | 0.90 / 0.54 |
| Verdict, conditional / literal | n/a | 0.84 / 0.76 | 0.90 / 0.72 |
| B→C gap, ordering, conditional / literal | | | −0.08 / −0.28 |
| B→C gap, verdict, conditional / literal | | | +0.06 / −0.04 |
