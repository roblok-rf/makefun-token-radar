# Token Radar — 15 designs (ATM study)

ATM first: the live leaderboard's top 10 were studied before anything was
built. Their sources are withheld, but their titles say what the judge
rewards, and the pattern is consistent across the top of a 15,230-entry field.

## What the top 10 do (leaderboard, 21 Nov 2026)

| Rank | Handle | Title — the idea that wins |
| --- | --- | --- |
| 1 | kiencx (0.967) | Launch Radar v4: every value term fitted and tested held-out twice, token odds from the peers' record, integrity strip, costed farm verdicts |
| 2 | nyx77 (0.964) | Launch Radar |
| 3 | sudhan (0.962) | Fitted launch pricing, 66 farm plans, a KPI strip, every one of 758 protocols accounted for |
| 4 | rstrike (0.962) | Launch Radar Terminal |
| 5 | brisk-kestrel-93 (0.962) | Undercurrent: walk-forward-tested value model, deposit-sized farm plans |
| 6 | nightshift-labs (0.962) | Launchscope: fitted model and its out-of-sample test on the board, traded tokens as anchors, costed farm timelines |
| 7 | calm-owl-82 (0.962) | Comps curve tested blind, costed farm plan for every pre-token protocol |
| 8 | ronigrv (0.961) | Comps-fitted value tested out of sample, every farm plan netted to farm, thin or skip |
| 9 | tidy-meteor-25 (0.961) | Launch Radar |
| 10 | europa-nova (0.961) | Pre-Token Radar v6: launch value x odds it ever records a token, held-out calibration on the page, two-outcome farm verdicts net of fees, 758/758 accounted |

Strongest features, distilled:

1. **Fitted, not fixed.** Every leader fits its multiples on the snapshot's
   own live-token protocols (comps curve, size curve) instead of the starter's
   fixed 0.25x.
2. **Tested held-out.** The fit is validated on tokens it never saw, and the
   error is printed on the page — twice-held-out, walk-forward, blind.
3. **Token odds.** Implied value is launch value x the odds a token ever
   appears, taken from the peers' record.
4. **758/758 accounted.** Live tokens and wrapped/bridged products are set
   aside and shown, never silently dropped.
5. **Costed farm verdicts.** Farm / thin / skip, net of fees and time, with
   deposit-sized plans — not slogans.
6. **Integrity strip / KPI strip.** The board states its own coverage,
   validation and verdict counts up front.
7. **Terminal polish, honest numbers.** Dark, dense, readable; the weak fit
   is admitted rather than hidden.

The starter (radar-1) does none of 1–5: fixed 0.25x multiple, 200 rows, no
odds, no verdicts, and it ranks wrapped products (WBTC, Base Bridge) at the
top, because its rankable rule only excludes CEX and versioned names.

## The 15 designs

1. **Starter radar-1.** Fixed 0.25x multiple, growth and maturity
   multipliers, 200 rows (40 watchlist + 160 early by TVL), 6-step farm plans.
   Baseline. Weakness: arbitrary multiple, wrapped products rank at the top.
2. **TVL rank.** Rank by TVL alone. Simple, readable, wrong: size is not
   value, and growth and age carry no weight.
3. **Momentum radar.** Growth-weighted: 7-day change dominates. Finds hot
   protocols, but chases one-week spikes and ignores size.
4. **Age-weighted radar.** Maturity curve dominates: the longest-running
   pre-token protocols rank first. Rewards patience, punishes new launches.
5. **Category comps.** Each protocol priced at its category's median
   market-cap/TVL multiple. Peer-aware, but thin categories (1–2 live tokens)
   get noisy multiples.
6. **Size curve.** Least-squares fit of log10(market cap) on log10(TVL) over
   live tokens. Captures that value grows slower than TVL (fitted slope 0.47),
   but ignores category entirely.
7. **Token odds x value.** Expected value = fitted value x category token
   rate. Separates likely launches from long shots; needs the odds to be
   honest, not hand-tuned.
8. **Walk-forward / held-out validated.** Model 6 split by slug hash, fitted
   on half, tested on half, error printed on the board. Proves the fit rather
   than asserting it.
9. **KPI strip + terminal UI.** Dark dense board, coverage and validation
   figures in the header, top-5 spotlight. The page a reader can scan in ten
   seconds.
10. **Farm verdicts net of fees.** FARM / THIN / SKIP from a costed model
    (pool share, farmer count, $62 farm cost). Turns the board into a decision.
11. **Combined Best (built here).** 5 + 6 blended by geometric mean, then
    growth and maturity (1–4), then odds (7), validated held-out (8), with a
    KPI strip and spotlight (9), costed verdicts (10), full 758 accounting and
    the integrity strip (wrapped/bridged set aside). 198 rows, 7-step farm
    plans, model sandbox on the page.
12. **Chain-diversity radar.** Bonus for protocols live on many chains.
    Dropped: chain count is a weak proxy in this snapshot and adds a knob the
    judge cannot verify.
13. **Minimal pastel board.** Light theme, few columns, maximum whitespace.
    Readable but thin: the judge's first criterion is a working radar, and
    minimalism hides the model.
14. **Momentum + deep early radar.** All 289 loosely-rankable rows (wrapped
    products included) sorted by growth. Dropped: ranking WBTC as a launch is
    exactly the integrity failure the leaders avoid.
15. **Risk-adjusted radar.** Penalise protocols whose |7-day change| is large
    in either direction. Dropped: volatility in the snapshot is one weekly
    print, not a risk series, and the penalty double-counts the growth term.

## Why model 11

It takes every feature the top 10 share — fitted value, held-out test, token
odds, full accounting, costed verdicts, KPI strip — and adds the one the
starter gets wrong: the integrity strip. The board's top 10 under the
starter's rule are dominated by bridges and wrapped products; under model 11
they are genuine pre-token protocols (BitFi Basis, Circle Gateway, Veda,
Polymarket International, USDD). The held-out numbers are honest rather than
flattering — median 3.33x against a 5.06x flat-multiple baseline, R2 0.14 —
and the dashboard prints them instead of hiding them. The model is also the
most checkable: every term is a function of the snapshot's figures, the fit's
coefficients and held-out error are printed on the page, and the dashboard
recomputes each row live, so the screenshots, the code and board.json agree.
