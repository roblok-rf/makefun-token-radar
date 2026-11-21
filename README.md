[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/roblok-rf/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/roblok-rf/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar radar-11

**Build the best token launch radar** — make.fun bounty `token-radar-01`
($1,325, ends 14 Dec 2026 17:00 +07). A program plus the dashboard it writes:
it reads a sealed snapshot of every protocol DefiLlama tracks, works out which
ones still record no token, ranks them by what their launch would be worth,
and hands in a web dashboard with the board, a detail view for each protocol
and the steps to farm it.

## What it is

- **198 pre-token protocols ranked** — the whole 40-protocol watchlist plus
  every other rankable pre-token protocol below the floor, at any TVL.
- **758 of 758 protocols accounted for** — 198 ranked, 402 live-token
  protocols set aside with their market caps, 158 set aside (144 wrapped /
  staked / bridged products and 14 exchange tokens). Nothing is silently
  dropped.
- **Fitted value, not a fixed multiple.** The model fits a size curve
  (`log10(market cap) = 3.382 + 0.472 x log10(TVL)`) and category median
  multiples on the snapshot's own 119 live-token protocols, blends them by
  geometric mean, then applies seven-day growth and age-with-no-token
  multipliers.
- **Implied = gross value x token odds.** Odds are the category's token rate,
  shrunk to the global rate. Rank 1 is the most valuable launch.
- **Held-out test on the page.** The curve is fitted on half the live tokens
  and tested on the half it never saw: median prediction within 3.33x of the
  real market cap, against 5.06x for a flat multiple. The fit is weak in
  absolute terms (R2 0.14) and the dashboard says so.
- **Costed farm verdicts.** Airdrop pool = 7% of implied value, farmers grow
  with the square root of TVL, one farm costs $62. FARM above $150 net per
  farmer, THIN above $0, SKIP otherwise: 9 FARM, 64 THIN, 125 SKIP.
- **Dashboard a reader can use.** Sortable and filterable board, search,
  category / chain / verdict filters, top-5 spotlight, a detail dialog per
  protocol with the full model breakdown and a 7-step farm plan with costs and
  times, a live-token tab, a set-aside tab, a methodology tab, and a model
  sandbox (growth weight and pool share sliders that recompute the board live).
  Static, no network, no framework.

## Run it

Requires Node.js 22.18 or later. No install, standard library only.

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

That writes `out/board.json` (198 rows), `out/data.js`, `out/dashboard/`,
`out/screenshots/` and `out/dossier.json`. Open `out/dashboard/index.html`
in a browser (it reads `../data.js`).

## Files

| File | What it is |
| --- | --- |
| `main.ts` | Entry point: reads the snapshot, writes the board, data, dashboard, screenshots and dossier |
| `lib/model.ts` | The radar-11 model: fit, odds, verdicts, farm plans, board validation |
| `vendor/makefun-board.ts` | make.fun's dossier library, copied byte for byte from the kit |
| `dashboard/index.html`, `app.css`, `app.js` | The static dashboard (44 KB of source, so the judge reads all of it) |
| `screenshots/` | 1-board, 2-detail, 3-filtered — renders of this dashboard |
| `MODELS.md` | The 15 radar designs studied; model 11 is the one built here |
| `TRANSCRIPT.md` | How this entry was built |

## The model, in one paragraph

On the live-token protocols, fit `log10(market cap)` on `log10(TVL)` and take
each category's median market-cap/TVL multiple. A protocol's fitted value is
the geometric mean of the size-curve prediction and the category prediction.
Gross value is fitted x growth multiplier x maturity multiplier. Token odds
are the category token rate, shrunk to the global rate. Implied value is
gross x odds, and the board ranks by implied value. The farm verdict nets a
7% airdrop pool, split over farmers that grow with the square root of TVL,
against a $62 farm cost. Wrapped, staked and bridged products of tokens that
already trade are set aside, never ranked — a wrapped token is not a token
that does not exist yet.

## Limits

The snapshot is frozen at 2026-11-14; nothing here knows what happened after.
The model uses TVL, seven-day growth, age, category and chains only: it
cannot see points programs, announcements, funding or audits, and it does not
predict whether or when a token is issued. Implied value is a model, not a
price. Never pay to claim an airdrop, and never enter a seed phrase anywhere
to farm.
