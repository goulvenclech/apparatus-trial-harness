# case-a-dark-matter-2: unblinded comparison

Computed after unblinding from the fixed per-run scores, as `docs/protocol.md` prescribes (Scoring, after unblinding; Thresholds). Full figures, per-pair and per-programme tables, sensitivity runs and input hashes are in `unblinded.json`. n = 5 runs per arm. Stability uses campaign 1's reading of record: a pair or programme counts only when at least 3 of the arm's 5 runs rank or rate it, otherwise « insufficient data ». Thresholds use ≥.

Mapping: A = 688p 65n9 pcwk 49dk qczx, B = 2tyf 6hcn s7rg scck 9ams, C = bpg8 an5x 3tsf t7hq f899. All 15 run-file hashes match the key, each blind file equals its run's trailing text blocks byte for byte, and the five A ids are the five records with every verdict « not stated ».

## Per arm

| Metric | A | B | C | C, campaign 1 |
|---|---|---|---|---|
| Sources verified, over all | 117/118 = 0.992 | 167/167 = 1.000 | 157/158 = 0.994 | 132/136 = 0.971 |
| Sources verified, over decidable | 117/117 = 1.000 | 167/167 = 1.000 | 157/158 = 0.994 | 132/133 = 0.992 |
| Sampled support, supports / partial / does not / unverifiable (of 25) | 20 / 2 / 1 / 2 | 22 / 0 / 2 / 1 | 20 / 5 / 0 / 0 | 17 / 5 / 2 / 1 |
| Coverage | 21/25 = 0.84 | 22/25 = 0.88 | 25/25 = 1.00 | 20/25 = 0.80 |
| Hidden-sector identified (ranked) | 1/5 (1) | 2/5 (2) | 5/5 (1) | 0/5 |
| Programme count, mean (range) | 7.0 (7–7) | 7.6 (7–8) | 11.6 (11–13) | 5.8 (5–6) |
| Level errors (MOND + ΛCDM ranked) | 5 (5 + 0) | 7 (5 + 2) | 9 (5 + 4) | 7 (5 + 2) |
| Invented or wrongly described | 0 | 0 | 0 | 0 |
| Discrimination | 21/22 = 0.955 | 22/24 = 0.917 | 22/22 = 1.000 | 19/20 = 0.950 |
| Ordering stability (lowest) | 1.00 (all 1.00) | 1.00 (all 1.00) | 0.967 (PBH/WIMP 4/5) | 0.90 |
| Ordering pairs included / insufficient | 6 / 4 (hidden-sector pairs, 1 run) | 6 / 4 (hidden-sector pairs, 2 runs) | 6 / 4 (hidden-sector pairs, 1 run) | 6 / 4 |
| Verdict stability (lowest) | n/a, no verdicts | 0.90 (PBH, WIMP 4/5) | 0.893 (hidden-sector 2/3) | 0.90 |
| Verdict programmes included / insufficient | 0 / 5 | 4 / 1 (hidden-sector, 2 runs) | 5 / 0 | 4 / 1 |
| Web searches per run, mean (range) | 29.4 (23–38) | 36.8 (33–42) | 37.0 (28–45) | 26.2 (20–30) |
| Cost per run, mean (range) | $0.815 (0.712–0.918) | $1.022 (0.924–1.119) | $1.151 (0.839–1.307) | $0.859 |

Cost = (input × 4 + 5-min cache writes × 5 + 1-h cache writes × 8 + cache reads × 0.20 + output × 20) / 10⁶ + searches × $0.01, at claude-opus-5-5 list prices. Campaign 1's report has no cost formula; its C figures for searches and cost were computed here from its run files with the same formula.

Discrimination per firm pair (correct/eligible, A / B / C):

- axion > WIMP: 5/5, 5/5, 5/5
- axion > sterile: 5/5, 5/5, 5/5
- axion > PBH: 5/5, 5/5, 5/5
- hidden-sector > WIMP: 0/1, 0/2, 1/1
- hidden-sector > sterile: 1/1, 2/2, 1/1
- PBH > sterile: 5/5, 5/5, 5/5

Every error is on hidden-sector > WIMP. On the other five firm pairs all three arms are perfect. C's one ranked hidden-sector unit is bpg8's merged « Dark sectors and SIDM » unit; the other four C runs treat the hidden sector without ranking it.

Modal verdicts, for reading only. B: axion defensible 5/5, hidden-sector inconclusive (evidence) 2/2, PBH fragile 4/5, WIMP defensible 4/5, sterile fragile 5/5. C: axion defensible 5/5, hidden-sector inconclusive (evidence) 2/3, PBH defensible 4/5, WIMP fragile 5/5, sterile fragile 5/5. Key: defensible, defensible, inconclusive (evidence), fragile, fragile.

## Gaps

| Metric | A→B | B→C |
|---|---|---|
| Sources over all | +0.008 | −0.006 |
| Sampled « supports » | +2 of 25 | −2 of 25 |
| Coverage | +0.04 | +0.12 |
| Level errors | +2 | +2 |
| Discrimination | −0.038 | +0.083 |
| Ordering stability | 0 | −0.033 |
| Verdict stability | n/a | −0.007 |
| Searches per run | +7.4 | +0.2 |
| Cost per run | +$0.21 | +$0.13 |

## Thresholds

| Arm | Ordering ≥ 0.80 | Verdict ≥ 0.80 | Sources ≥ 0.95 | Coverage ≥ 0.80 |
|---|---|---|---|---|
| A | pass (1.00) | n/a | pass (0.992) | pass (0.84) |
| B | pass (1.00) | pass (0.90) | pass (1.000) | pass (0.88) |
| C | pass (0.967) | pass (0.893) | pass (0.994) | pass (1.00) |

The protocol's condition for the article's claim, C at or above all four thresholds and ahead of B on discrimination, is met: C 1.000 against B 0.917. The lead rests on one pair, hidden-sector > WIMP: B gets it wrong in its 2 runs that rank it, and C's single run that ranks it, through a merged unit, gets it right. On every other pair the arms tie.

## Sensitivity

- **pcwk strict (merged hidden-sector/SIDM unit not credited).** pcwk is arm A, so B, C and B→C are unchanged. A coverage 0.84 → 0.80 (still passes, at the boundary), hidden-sector 1/5 → 0/5, A discrimination 21/22 → 20/20 = 1.000. A→B coverage gap +0.04 → +0.08, A→B discrimination gap −0.038 → −0.083. No verdict flips.
- **Verlinde ranked counts as a level error.** Both cases are C (an5x, f899): C level errors 9 → 11, B→C +2 → +4. Level errors have no threshold; nothing flips.
- **Unranked ΛCDM baseline in 6hcn counts.** 6hcn is B: B level errors 7 → 8, A→B +2 → +3, B→C +2 → +1. Nothing flips.
- **All three together.** No threshold verdict or claim condition changes.
- **Not requested, added because C's only ranked hidden-sector unit is merged: no SIDM-merged unit credited (pcwk A, scck B, bpg8 C).** Coverage A 0.80, B 0.84, C 0.96, all pass. Discrimination A 20/20, B 21/22 = 0.955, C 20/20 = 1.000; C stays ahead (+0.045). C verdict stability 0.95 over 4 programmes (hidden-sector drops to 2 runs). The claim condition still holds.

## Against campaign 1

A and B are byte-identical reruns, so their change between campaigns is run-to-run noise. It also includes normaliser and scorer differences, since different sessions did each campaign. C's change counts as beyond noise only where it exceeds both.

| Metric | ΔA | ΔB | ΔC | C beyond A/B noise? |
|---|---|---|---|---|
| Sources over all | +0.017 | +0.025 | +0.023 | no |
| Sampled « supports » (of 25) | +1 | +1 | +3 | slightly, on 25 draws |
| Coverage | 0 | −0.04 | +0.20 | yes |
| Hidden-sector identified | 0 | −1 | +5 | yes |
| Programme count, mean | +0.4 | +0.2 | +5.8 | yes |
| Level errors | 0 | −1 | +2 | marginal |
| Discrimination | 0 | +0.071 | +0.050 | no |
| Ordering stability | 0 | +0.02 | +0.067 | no (one run on one pair) |
| Verdict stability | n/a | +0.06 | −0.007 | no |
| Searches per run | −4.0 | +0.4 | +10.8 | yes |
| Cost per run | −$0.06 | −$0.02 | +$0.29 | yes |

What the revised skill visibly changed is breadth and search effort. C now finds the hidden sector in every run (0/5 before), treats about twice as many programmes, searches as much as B (26 → 37 a run, where campaign 1 C searched the least), and costs about a third more. Everything else stays within the band that A and B move by on their own. Campaign 1's B→C discrimination lead came from a pair C never ranked. This campaign's comes from a pair C ranks once.

## Caveats

- **Sample size.** n = 5 per arm, and nothing here is tested for significance. A single run moves a pair's stability share by 0.20, and the B→C discrimination gap rests on three pair outcomes.
- **Ranking the hidden sector.** C identifies the hidden sector in all five runs but ranks it in one. In 3tsf, an5x, f899 and t7hq it is treated as an unranked programme, so it adds to C's coverage but contributes nothing to discrimination or ordering stability.
- **Breadth.** C's breadth also raises its level errors: it ranks ΛCDM in 4 of 5 runs, against 2 in B and 0 in A, and ranks Verlinde twice.
- **Scorer leniency.** Sources sit at 0.99–1.00 for every arm, higher than campaign 1, partly because this scorer's existence rules are lenient. Author order and month are not checked, and an identifier-only reference passes when it resolves to a work on the topic. Both campaigns pass the 0.95 threshold either way.
- **Hidden-sector credit rule.** The rule differs between the two scorers. Campaign 1 did not credit three A records whose labels named the hidden sector (crediting them was its sensitivity, which moved A coverage to 0.96). This campaign credits such labels, merged SIDM units included. So ΔA and ΔB on coverage and hidden-sector carry a rule change as well as run noise. C's gain survives the strict rule: with no merged unit credited, C coverage is 0.96 and hidden-sector 4/5, still well beyond the A/B band.
- **Inputs beyond the brief.** Campaign 1 searches and cost were computed from `runs/case-a-dark-matter/arm-*.json`, which were not among the listed inputs. The campaign 1 report gives search ranges only and no cost.
- **Product runs.** The product runs (3 B + 3 C) have not been done.
