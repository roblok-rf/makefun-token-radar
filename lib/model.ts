// Token Radar radar-11: the combined-best model.
//
// Every number below is derived from the sealed snapshot's own figures; no
// protocol name is ever special-cased and no row is hand-picked.
//
//   1. FIT. On the live-token protocols (a market cap on record, TVL above
//      zero, CEX rows out) fit log10(market cap) = a + b * log10(TVL) by
//      least squares. That is the size curve: a protocol's token is worth
//      what tokens of protocols its size are worth.
//   2. COMPS. For each category, the median market-cap/TVL multiple of its
//      live-token members (three or more members, else the global median).
//      Fitted value = the geometric mean of the size-curve prediction and
//      the category prediction, so neither the curve nor the category rules.
//   3. GROWTH and MATURITY. Growth multiplies by 1 + clamp(change_7d, -60,
//      120) / 100 * 0.5. Maturity multiplies by 0.6 + min(age, 1095) / 1095
//      * 0.4: age is the time since first listing with no token, unknown age
//      uses 365 days. Gross value = fitted * growth * maturity.
//   4. ODDS and IMPLIED VALUE. The chance a protocol ever records a token
//      is its category's token rate among all protocols in the snapshot,
//      shrunk toward the global rate (two pseudo-counts) and clamped to
//      [0.05, 0.95]. Implied value = gross value * odds: what the launch
//      would be worth, weighted by whether it ever happens. The board ranks
//      by implied value, so rank 1 is the most valuable launch. The gross
//      (pre-odds) value is carried beside it, so the odds never hide.
//   5. HELD-OUT TEST. The live-token set is split by slug hash (even slugs
//      train, odd slugs test): the curve is fitted on the train half and its
//      median prediction error measured on the test half, against a flat
//      global-multiple baseline. The dashboard prints both numbers.
//   6. FARM VERDICT. Airdrop pool = 7% of expected value. Farmers grow with
//      the square root of TVL (a protocol 100x larger has ~10x the farmers,
//      not 100x): farmers = max(50, 200 * sqrt(TVL / 1e6)). Cost of one farm
//      is $62 ($12 gas, one hour at $50). Net per farmer = pool / farmers -
//      62: FARM above $150, THIN above $0, SKIP otherwise.
//   7. INTEGRITY STRIP. The watchlist's own exclusion rule is applied to
//      every row, not just the watchlist: wrapped, staked and bridged
//      products of tokens that already trade, exchange products, CEX rows
//      and versioned pools are set aside, never ranked. They are still
//      shown, in the set-aside tab, so all 758 protocols are accounted for.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted model's constants, computed from the snapshot at run time. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** log10(market cap) = curve_a + curve_b * log10(TVL), fitted on live tokens. */
  curve_a: number;
  curve_b: number;
  curve_r2: number;
  /** Median market-cap/TVL multiple across live-token protocols. */
  global_multiple: number;
  /** Airdrop pool share of expected value, as a fraction. */
  pool_share: number;
  /** Dollars one farm costs: gas plus one hour of time. */
  farm_cost_usd: number;
  /** FARM verdict needs net per farmer above this many dollars. */
  farm_threshold_usd: number;
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-11';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  expected_value_usd: number;
  gross_implied_value_usd: number;
  token_odds: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  net_per_farmer_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    size_curve_usd: number;
    category_multiple: number;
    category_value_usd: number;
    fitted_value_usd: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  expected_value_usd: number;
  gross_implied_value_usd: number;
  token_odds: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  net_per_farmer_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  size_curve_usd: number;
  category_multiple: number;
  fitted_value_usd: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A protocol set aside from the ranking, with the reason it was set aside. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** The held-out test's numbers, printed on the dashboard. */
export interface Validation {
  train_n: number;
  test_n: number;
  /** Median |log10(pred/actual)| on the test half, as a multiple. */
  median_factor: number;
  /** The flat-multiple baseline's median factor on the same test half. */
  baseline_factor: number;
  /** R-squared of the full fit. */
  r2: number;
  live_n: number;
}

/** Everything the dashboard needs: the board, the live set, the set-aside, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  set_aside_size: number;
  total_protocols: number;
  validation: Validation;
  verdicts: { FARM: number; THIN: number; SKIP: number };
  rows: RadarRow[];
  live: LiveRow[];
  set_aside: SetAsideRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** Categories the watchlist rule treats as a wrapped, staked or bridged product. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** Names beginning with an exchange's name are that exchange's product. */
const EXCHANGE_NAME = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
/** A whole word wrapped, staked or staking in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Why a protocol is set aside from the ranking, or null when it may rank. */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `category ${p.category}`;
  if (WRAPPED_WORD.test(p.name)) return 'wrapped or staked product';
  if (EXCHANGE_NAME.test(p.name)) return 'exchange product';
  if (VERSIONED.test(p.name)) return 'versioned pool';
  return null;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not set aside. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** Least squares on log10(TVL) -> log10(market cap), with R-squared. */
function fitCurve(rows: SnapshotProtocol[]): { a: number; b: number; r2: number } {
  const xs = rows.map((p) => Math.log10(p.tvl_usd));
  const ys = rows.map((p) => Math.log10(p.mcap_usd!));
  const mx = xs.reduce((a, v) => a + v, 0) / xs.length;
  const my = ys.reduce((a, v) => a + v, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i]! - my);
    den += (x - mx) * (x - mx);
  });
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  let ssTot = 0;
  let ssRes = 0;
  ys.forEach((y, i) => {
    const pr = a + b * xs[i]!;
    ssTot += (y - my) * (y - my);
    ssRes += (y - pr) * (y - pr);
  });
  return { a, b, r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot };
}

/** A stable split of the live set: even slug hashes train, odd slugs test. */
function slugHash(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** The model fitted from the snapshot: curve, multiples, odds base rates and the held-out test. */
export function fitModel(snapshot: Snapshot): {
  model: ModelConstants;
  validation: Validation;
  categoryMultiple: Map<string, number>;
  categoryOdds: Map<string, number>;
} {
  const live = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.tvl_usd > 0 && p.mcap_usd > 0 && p.category !== 'CEX',
  );
  const full = fitCurve(live);
  const globalMultiple = median(live.map((p) => p.mcap_usd! / p.tvl_usd));

  const byCategory = new Map<string, number[]>();
  for (const p of live) {
    const c = p.category ?? 'Other';
    const arr = byCategory.get(c) ?? [];
    arr.push(p.mcap_usd! / p.tvl_usd);
    byCategory.set(c, arr);
  }
  const categoryMultiple = new Map<string, number>();
  for (const [c, arr] of byCategory) categoryMultiple.set(c, arr.length >= 3 ? median(arr) : globalMultiple);

  // Token odds: each category's token rate among all protocols, shrunk to the global rate.
  const counts = new Map<string, { n: number; live: number }>();
  for (const p of snapshot.protocols) {
    const c = p.category ?? 'Other';
    const e = counts.get(c) ?? { n: 0, live: 0 };
    e.n += 1;
    if (p.mcap_usd !== null) e.live += 1;
    counts.set(c, e);
  }
  const globalRate = live.length / snapshot.protocols.length;
  const categoryOdds = new Map<string, number>();
  for (const [c, e] of counts) {
    categoryOdds.set(c, Math.min(0.95, Math.max(0.05, (e.live + 2 * globalRate) / (e.n + 2))));
  }

  // Held-out test: fit on even-hash slugs, score on odd-hash slugs, against a flat multiple.
  const train = live.filter((p) => slugHash(p.slug) % 2 === 0);
  const test = live.filter((p) => slugHash(p.slug) % 2 === 1);
  const trainFit = fitCurve(train);
  const trainMultiple = median(train.map((p) => p.mcap_usd! / p.tvl_usd));
  const modelErr = test
    .map((p) => Math.abs(trainFit.a + trainFit.b * Math.log10(p.tvl_usd) - Math.log10(p.mcap_usd!)))
    .sort((a, b) => a - b);
  const baseErr = test
    .map((p) => Math.abs(Math.log10(p.tvl_usd * trainMultiple) - Math.log10(p.mcap_usd!)))
    .sort((a, b) => a - b);
  const validation: Validation = {
    train_n: train.length,
    test_n: test.length,
    median_factor: Math.pow(10, modelErr[Math.floor(modelErr.length / 2)]!),
    baseline_factor: Math.pow(10, baseErr[Math.floor(baseErr.length / 2)]!),
    r2: full.r2,
    live_n: live.length,
  };

  const model: ModelConstants = {
    base_multiple: globalMultiple,
    growth_weight: 0.5,
    growth_floor: -60,
    growth_cap: 120,
    maturity_floor: 0.6,
    maturity_range: 0.4,
    maturity_days: 1095,
    unknown_age_days: 365,
    curve_a: full.a,
    curve_b: full.b,
    curve_r2: full.r2,
    global_multiple: globalMultiple,
    pool_share: 0.07,
    farm_cost_usd: 62,
    farm_threshold_usd: 150,
  };
  return { model, validation, categoryMultiple, categoryOdds };
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The fitted value, implied value, odds, expected value and verdict for one protocol. */
export function scoreProtocol(
  p: SnapshotProtocol,
  snapshot: Snapshot,
  model: ModelConstants,
  categoryMultiple: Map<string, number>,
  categoryOdds: Map<string, number>,
): {
  implied: number;
  gross: number;
  expected: number;
  odds: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  net: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  age: number | null;
  sizeCurve: number;
  catMultiple: number;
  catValue: number;
  fitted: number;
} {
  const age = ageDays(snapshot.as_of, p.listed_at);
  const rawGrowth = finite(p.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const sizeCurve = Math.pow(10, model.curve_a + model.curve_b * Math.log10(Math.max(1, p.tvl_usd)));
  const catMultiple = categoryMultiple.get(p.category ?? 'Other') ?? model.global_multiple;
  const catValue = p.tvl_usd * catMultiple;
  const fitted = Math.sqrt(Math.max(1, sizeCurve) * Math.max(1, catValue));
  const gross = Math.max(1, Math.round(fitted * growthMult * maturityMult));
  const odds = categoryOdds.get(p.category ?? 'Other') ?? 0.15;
  const implied = Math.max(1, Math.round(gross * odds));
  const expected = implied;
  const farmers = Math.max(50, 200 * Math.sqrt(p.tvl_usd / 1e6));
  const net = (model.pool_share * expected) / farmers - model.farm_cost_usd;
  const verdict = net > model.farm_threshold_usd ? 'FARM' : net > 0 ? 'THIN' : 'SKIP';
  return { implied, gross, expected, odds, verdict, net, growthPct, growthMult, maturityMult, age, sizeCurve, catMultiple, catValue, fitted };
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest expected value first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  fitted: ReturnType<typeof fitModel>,
): { board: BoardRow[]; live: LiveRow[]; setAside: SetAsideRow[] } {
  const { model, categoryMultiple, categoryOdds } = fitted;
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it ranks.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, at any TVL.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => ({ p, s: scoreProtocol(p, snapshot, model, categoryMultiple, categoryOdds) }));
  scored.sort((a, b) => b.s.implied - a.s.implied || b.s.gross - a.s.gross || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.s.age,
    implied_value_usd: s.s.implied,
    expected_value_usd: s.s.expected,
    gross_implied_value_usd: s.s.gross,
    token_odds: round4(s.s.odds),
    verdict: s.s.verdict,
    net_per_farmer_usd: Math.round(s.s.net),
    model: {
      base_multiple: round4(model.global_multiple),
      growth_pct: round4(s.s.growthPct),
      growth_multiplier: round4(s.s.growthMult),
      maturity_multiplier: round4(s.s.maturityMult),
      age_days: s.s.age,
      size_curve_usd: Math.round(s.s.sizeCurve),
      category_multiple: round4(s.s.catMultiple),
      category_value_usd: Math.round(s.s.catValue),
      fitted_value_usd: Math.round(s.s.fitted),
    },
    farm_steps: farmSteps(s.p, s.s.age, s.s.verdict, s.s.expected, s.s.net, s.s.odds).map(stepText),
  }));

  const live: LiveRow[] = snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, chains: p.chains, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, change_7d: p.change_7d }));

  const rankedSlugs = new Set(board.map((r) => r.slug));
  const liveSlugs = new Set(live.map((r) => r.slug));
  const setAside: SetAsideRow[] = snapshot.protocols
    .filter((p) => !rankedSlugs.has(p.slug) && !liveSlugs.has(p.slug))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: isPreToken(p) ? (exclusionReason(p) ?? 'set aside') : 'token already trades (CEX)',
    }))
    .sort((a, b) => b.tvl_usd - a.tvl_usd);

  return { board, live, setAside };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and keep the position open.`;
  if (c.includes('chain')) return `Use ${name} on ${chain} with $${capital} of activity and keep the wallet funded.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age) and its verdict, never from a
 * hand-written list of names.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  verdict: 'FARM' | 'THIN' | 'SKIP',
  expected: number,
  net: number,
  odds: number,
): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const verdictLine =
    verdict === 'FARM'
      ? `Verdict FARM: expected value $${expected.toLocaleString('en-US')} at ${Math.round(odds * 100)}% token odds, about $${Math.round(net)} net per farmer after the $62 farm cost, so farm it first.`
      : verdict === 'THIN'
        ? `Verdict THIN: expected value $${expected.toLocaleString('en-US')} at ${Math.round(odds * 100)}% token odds, about $${Math.round(net)} net per farmer after the $62 farm cost, so farm it only with capital already on ${chain}.`
        : `Verdict SKIP: expected value $${expected.toLocaleString('en-US')} at ${Math.round(odds * 100)}% token odds, about $${Math.round(net)} net per farmer after the $62 farm cost, so do not spend fresh gas on it.`;
  return [
    { text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`, cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
    { text: action, cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`, time: '15 minutes to set up' },
    { text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: verdictLine, cost: 'nothing but the judgement', time: '2 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    expected_value_usd: row.expected_value_usd,
    gross_implied_value_usd: row.gross_implied_value_usd,
    token_odds: row.token_odds,
    verdict: row.verdict,
    net_per_farmer_usd: row.net_per_farmer_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    size_curve_usd: row.model.size_curve_usd,
    category_multiple: row.model.category_multiple,
    fitted_value_usd: row.model.fitted_value_usd,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const fitted = fitModel(snapshot);
  const { board, live, setAside } = buildBoard(snapshot, fitted);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const verdicts = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const r of board) verdicts[r.verdict] += 1;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: fitted.model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    set_aside_size: setAside.length,
    total_protocols: snapshot.protocols.length,
    validation: fitted.validation,
    verdicts,
    rows: board.map(radarRow),
    live,
    set_aside: setAside,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!Number.isSafeInteger(r.expected_value_usd) || r.expected_value_usd <= 0) return `${r.slug} has expected value ${r.expected_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
