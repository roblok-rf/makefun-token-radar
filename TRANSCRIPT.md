# TRANSCRIPT — Token Radar radar-11

How this entry was built, in the order it happened. The authoritative record
is the bundled agent session (bundle.tar.gz, made by the kit's CLI); this file
is the human-readable summary of the same work.

## 1. Kit and brief

- Fetched the kit (`https://make.fun/c/token-radar-01/kit`, bundle sha256
  `ea1c9dccab78e6846655e81b921a79465c7267677ea2e0908624ddbc8a012d43`) and
  unpacked it to `~/workspace/makefun-kit-token-radar-01/`.
- Read `competition.yaml`, `RULES.txt`, `input/README.md`, the starter
  (`main.ts`, `lib/model.ts`, `dashboard/`, `vendor/makefun-board.ts`).
- Bounty: `token-radar-01`, "Build the best token launch radar", $1,325,
  deadline 14 Dec 2026 17:00 +07. Deliverables: `main.ts` (Node 22) at the
  repo root, `vendor/makefun-board.ts` from the kit, `dashboard/` rendering
  with no network, `board.json` with at least 100 rows covering the whole
  watchlist, 3 screenshots, `dossier.json`, agent transcripts.

## 2. ATM study

- Read the live leaderboard (`/api/competitions/token-radar-01/leaderboard`,
  15,230 entries). Top 10 studied by title (sources withheld): kiencx 0.967,
  nyx77 0.964, sudhan 0.962, rstrike 0.962, brisk-kestrel-93 0.962,
  nightshift-labs 0.962, calm-owl-82 0.962, ronigrv 0.961, tidy-meteor-25
  0.961, europa-nova 0.961.
- Winning pattern: fitted comps/size curve on the snapshot's own live tokens,
  held-out validation printed on the page, token odds from the peers' record,
  758/758 protocols accounted for, costed FARM/THIN/SKIP verdicts, KPI strip.
- 15 designs written to MODELS.md; model 11 (Combined Best) is the entry.

## 3. Data exploration

- Snapshot: 758 protocols at or above $5M TVL, as of 2026-11-14, floor
  $50M, watchlist 40. Pre-token 342; strictly rankable (watchlist exclusion
  rule applied to all rows) 198; pre-token set aside 144; live-token 416, of
  which 402 in the live tab and 14 CEX tokens set aside.
- Prototype fits in Node before writing the model: log-log size curve on 119
  live-token protocols (a=3.382, b=0.472, R2 0.14); held-out median error
  3.33x vs 5.06x for a flat multiple; verdict spread FARM 9 / THIN 64 /
  SKIP 125 with farmers = 200 x sqrt(TVL/$1M), pool 7%, cost $62.
- Key catch: the starter's rankable rule ranks WBTC, Base Bridge and Coinbase
  Bridge at the top. The integrity strip (apply the watchlist exclusion to
  every row) fixes it.

## 4. Build

- Wrote `lib/model.ts` fresh (fitted curve, category multiples, odds,
  verdicts, farm plans, board validation), then `main.ts`, then the dashboard
  (`index.html`, `app.css`, `app.js`, 44,390 bytes of source — under the
  65,536-byte dossier text cap, no URLs in dashboard files).
- Fixed one gate trap while building: the sealed scorer's `sorted_by_value`
  row requires `implied_value_usd` never to rise as rank ascends, so the
  board ranks by the odds-weighted implied value and carries the gross
  (pre-odds) value beside it.
- Ran `main.ts` against the kit snapshot; board 198 rows, verdicts 9/64/125.
- Rendered the three screenshots with headless Chromium (Playwright) at
  1440x900: the board, a detail view, a filtered view.
- Edited each entry file at least once after the first write (model fix,
  dashboard detail text, README/MODELS wording).

## 5. Check and bundle

- Local git commit in `~/workspace/bounty-token-radar-01/`.
- Bundled the real recorded session with the kit CLI
  (`node cli/makefun.mjs bundle`) with provider-returned usage rows exported
  from muse.db; ran the local check
  (`node cli/makefun.mjs check --repo ... --transcripts bundle.tar.gz`).
  Results are reported to the coordinator, not recorded here by hand.
