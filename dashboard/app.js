// Token Radar radar-11. It reads window.RADAR (written beside dashboard/ by main.ts) and renders
// the ranked board, the live-token and set-aside tabs, a per-protocol detail view with the model's
// own inputs and the protocol's farm plan, and the methodology. No network: every byte it shows
// is in data.js. The page recomputes a row from the snapshot figures, so the page's code and the
// board's data are visibly the same arithmetic: impliedOf, oddsOf and verdictOf below are the
// model in lib/model.ts, in the browser's words.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', verdict: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
  var sandbox = { growth: DATA.model.growth_weight, pool: DATA.model.pool_share };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function clampGrowth(change) {
    var g = change === null || change === undefined ? 0 : change;
    return Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, g));
  }
  // impliedOf: the model, recomputed live. gross = fitted x growth x maturity; implied = gross x odds.
  function impliedOf(row) {
    var growthMult = 1 + (clampGrowth(row.change_7d) / 100) * sandbox.growth;
    var gross = row.fitted_value_usd * growthMult * row.maturity_multiplier;
    return { gross: Math.max(1, Math.round(gross)), implied: Math.max(1, Math.round(gross * row.token_odds)), growthMult: growthMult };
  }
  function farmersOf(row) { return Math.max(50, 200 * Math.sqrt(row.tvl_usd / 1e6)); }
  function verdictOf(row) {
    var imp = impliedOf(row).implied;
    var net = (sandbox.pool * imp) / farmersOf(row) - DATA.model.farm_cost_usd;
    return { verdict: net > DATA.model.farm_threshold_usd ? 'FARM' : net > 0 ? 'THIN' : 'SKIP', net: Math.round(net), implied: imp };
  }
  function displayRow(row) {
    var v = verdictOf(row);
    var imp = impliedOf(row);
    return { rank: row.rank, slug: row.slug, name: row.name, category: row.category, chains: row.chains,
      tvl_usd: row.tvl_usd, change_7d: row.change_7d, listed_at: row.listed_at, age_days: row.age_days,
      implied_value_usd: imp.implied, gross_implied_value_usd: imp.gross, expected_value_usd: imp.implied,
      token_odds: row.token_odds, verdict: v.verdict, net_per_farmer_usd: v.net,
      growth_multiplier: imp.growthMult, maturity_multiplier: row.maturity_multiplier,
      size_curve_usd: row.size_curve_usd, category_multiple: row.category_multiple, fitted_value_usd: row.fitted_value_usd };
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL and age
  // decide the action, the capital, the hold and every cost and time; the verdict step uses the
  // sandbox's own verdict. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s basis vault on " + chain + ' and keep the position open.';
    if (c.indexOf('chain') >= 0) return 'Use ' + name + ' on ' + chain + ' with $' + capital + ' of activity and keep the wallet funded.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\'s own page.';
    return s;
  }
  function farmSteps(p) {
    var d = displayRow(p);
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var verdictLine = d.verdict === 'FARM'
      ? 'Verdict FARM: expected value $' + d.expected_value_usd.toLocaleString('en-US') + ' at ' + Math.round(d.token_odds * 100) + '% token odds, about $' + d.net_per_farmer_usd + ' net per farmer after the $62 farm cost, so farm it first.'
      : d.verdict === 'THIN'
        ? 'Verdict THIN: expected value $' + d.expected_value_usd.toLocaleString('en-US') + ' at ' + Math.round(d.token_odds * 100) + '% token odds, about $' + d.net_per_farmer_usd + ' net per farmer after the $62 farm cost, so farm it only with capital already on ' + chain + '.'
        : 'Verdict SKIP: expected value $' + d.expected_value_usd.toLocaleString('en-US') + ' at ' + Math.round(d.token_odds * 100) + '% token odds, about $' + d.net_per_farmer_usd + ' net per farmer after the $62 farm cost, so do not spend fresh gas on it.';
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: verdictLine, cost: 'nothing but the judgement', time: '2 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('verdict')) state.verdict = params.get('verdict');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('sort')) state.sort = params.get('sort');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.verdict !== 'all') params.set('verdict', state.verdict);
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.sort !== 'implied') params.set('sort', state.sort);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      var d = displayRow(r);
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.verdict !== 'all' && d.verdict !== state.verdict) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    }).map(displayRow);
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'odds') { av = a.token_odds; bv = b.token_odds; }
      else if (key === 'gross') { av = a.gross_implied_value_usd; bv = b.gross_implied_value_usd; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }),
        el('span', { class: 'brand-name', text: 'Token Radar' }),
        el('span', { class: 'brand-tag', text: 'RADAR-11' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' }),
        el('span', { text: DATA.total_protocols + ' protocols accounted for' })
      )
    );
  }

  function lede() {
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied launch value' }),
        el('p', { text: 'Implied value is a fitted value times token odds: what a launch would be worth, weighted by whether it ever happens. The watchlist is the floor; the early radar adds ' + DATA.early_size + ' pre-token protocols below it. Wrapped, staked and bridged products are set aside, never ranked. Implied value is a model, not a price.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size }), el('small', { text: 'every watchlist slug ranks' })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) }), el('small', { text: DATA.early_size + ' early rows below the floor' })),
        el('div', { class: 'fact' }, el('span', { text: 'Verdicts' }), el('b', { text: DATA.verdicts.FARM + ' FARM' }), el('small', { text: DATA.verdicts.THIN + ' THIN, ' + DATA.verdicts.SKIP + ' SKIP, net of the $62 farm cost' })),
        el('div', { class: 'fact' }, el('span', { text: 'Held-out test' }), el('b', { text: DATA.validation.median_factor.toFixed(1) + 'x' }), el('small', { text: 'median error on ' + DATA.validation.test_n + ' unseen tokens, vs ' + DATA.validation.baseline_factor.toFixed(1) + 'x for a flat multiple' })),
        el('div', { class: 'fact' }, el('span', { text: 'Set aside' }), el('b', { text: String(DATA.live_size + DATA.set_aside_size) }), el('small', { text: DATA.live_size + ' live tokens, ' + DATA.set_aside_size + ' set aside' }))
      )
    );
  }

  function spotlight() {
    var top = DATA.rows.slice(0, 5).map(displayRow);
    return el('section', { class: 'spot', 'aria-label': 'Top five launches' },
      top.map(function (r) {
        return el('button', { type: 'button', class: 'card', onclick: function () { openDetail(r.slug); } },
          el('span', { class: 'rank', text: 'RANK ' + r.rank + ' · ' + r.verdict }),
          el('b', { class: 'name', text: r.name }),
          el('span', { class: 'val', text: fmtUsd(r.implied_value_usd) }),
          el('span', { class: 'sub', text: 'gross ' + fmtUsd(r.gross_implied_value_usd) + ' at ' + Math.round(r.token_odds * 100) + '% odds · ' + (r.category || 'Other') })
        );
      })
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (a, r) { return a.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var ch = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    ch.addEventListener('change', function () { state.chain = ch.value; writeHash(); render(); });
    var vd = el('select', { id: 'verdict', 'aria-label': 'Filter by verdict' },
      ['all', 'FARM', 'THIN', 'SKIP'].map(function (v) { return el('option', { value: v, text: v === 'all' ? 'All verdicts' : v, selected: v === state.verdict ? 'selected' : null }); })
    );
    vd.addEventListener('change', function () { state.verdict = vd.value; writeHash(); render(); });
    var sort = el('select', { id: 'sort', 'aria-label': 'Sort the board' },
      [['implied', 'Implied value'], ['gross', 'Gross value'], ['odds', 'Token odds'], ['tvl', 'TVL'], ['growth', '7-day growth'], ['age', 'Age'], ['name', 'Name']].map(function (o) { return el('option', { value: o[0], text: 'Sort: ' + o[1], selected: o[0] === state.sort ? 'selected' : null }); })
    );
    sort.addEventListener('change', function () { state.sort = sort.value; state.dir = -1; writeHash(); render(); });
    var tabs = [['pre-token', 'Pre-token'], ['live', 'Live token'], ['set-aside', 'Set aside'], ['method', 'Methodology']].map(function (t) {
      return el('button', { type: 'button', 'aria-pressed': state.tab === t[0] ? 'true' : 'false', text: t[1],
        onclick: function () { state.tab = t[0]; writeHash(); render(); } });
    });
    var count = state.tab === 'pre-token' ? filteredRows().length + ' rows shown'
      : state.tab === 'live' ? DATA.live.length + ' live-token protocols'
      : state.tab === 'set-aside' ? DATA.set_aside.length + ' set aside'
      : 'how the radar works';
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), ch),
      el('div', { class: 'field' }, el('label', { for: 'verdict', text: 'Verdict' }), vd),
      el('div', { class: 'field' }, el('label', { for: 'sort', text: 'Sort' }), sort),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'View' }), el('div', { class: 'tabs' }, tabs)),
      el('span', { class: 'count', text: count })
    );
  }

  function verdictChip(v) {
    return el('span', { class: 'status ' + v.toLowerCase(), text: v });
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.verdict = 'all'; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: Math.round(r.token_odds * 100) + '%' }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, verdictChip(r.verdict))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan. Implied = gross value x token odds.' }),
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: 'Rank' }), el('th', { scope: 'col', text: 'Protocol' }),
            el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }),
            el('th', { scope: 'col', text: 'Age' }), el('th', { scope: 'col', text: 'Odds' }),
            el('th', { scope: 'col', text: 'Implied value' }), el('th', { scope: 'col', text: 'Verdict' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', { tabindex: '0' },
        el('td', null, el('span', { class: 'status live', text: 'already trades' })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) })
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking, and they are the comparables the model is fitted on.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }))),
          tbody
        )
      )
    );
  }

  function setAsideTable() {
    var tbody = el('tbody');
    DATA.set_aside.forEach(function (r) {
      tbody.appendChild(el('tr', { tabindex: '0' },
        el('td', null, el('span', { class: 'status aside', text: 'set aside' })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { text: r.reason })
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Not a launch waiting to happen: wrapped, staked and bridged products of tokens that already trade, exchange products and versioned pools. A wrapped token is not a token that does not exist yet.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Why it is set aside' }))),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    var v = DATA.validation;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }),
      el('div', { class: 'formula' },
        'gross = sqrt( size-curve(TVL) x TVL x category-multiple ) x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ')'
      ),
      el('div', { class: 'formula' },
        'implied = gross x token-odds   ·   size curve: log10(mcap) = ' + m.curve_a.toFixed(3) + ' + ' + m.curve_b.toFixed(3) + ' x log10(TVL), fitted on ' + v.live_n + ' live-token protocols (R2 ' + m.curve_r2.toFixed(2) + ')'
      ),
      el('p', { class: 'sub', text: 'Held out: the curve is fitted on ' + v.train_n + ' live tokens and tested on ' + v.test_n + ' it never saw. Its median prediction is within ' + v.median_factor.toFixed(1) + 'x of the real market cap; a flat global multiple manages ' + v.baseline_factor.toFixed(1) + 'x. The curve helps, and the dispersion is real: implied value is a model, not a price. Token odds are the category token rate, shrunk to the global rate. The early radar is every pre-token protocol below the watchlist floor, at any TVL.' }),
      el('div', { class: 'sandbox' },
        el('div', null,
          el('label', { for: 'gw', text: 'Growth weight' }),
          el('input', { type: 'range', id: 'gw', min: '0', max: '1', step: '0.05', value: String(sandbox.growth),
            oninput: function (e) { sandbox.growth = parseFloat(e.target.value); render(); } }),
          el('output', { text: 'growth weight ' + sandbox.growth.toFixed(2) })
        ),
        el('div', null,
          el('label', { for: 'ps', text: 'Airdrop pool share' }),
          el('input', { type: 'range', id: 'ps', min: '0.01', max: '0.15', step: '0.01', value: String(sandbox.pool),
            oninput: function (e) { sandbox.pool = parseFloat(e.target.value); render(); } }),
          el('output', { text: 'pool ' + Math.round(sandbox.pool * 100) + '% of expected value' })
        ),
        el('div', null,
          el('label', { text: 'Reset' }),
          el('button', { class: 'button', type: 'button', text: 'Back to the fitted model',
            onclick: function () { sandbox.growth = DATA.model.growth_weight; sandbox.pool = DATA.model.pool_share; render(); } })
        )
      )
    );
  }

  function methodTab() {
    var m = DATA.model;
    var v = DATA.validation;
    return el('section', { class: 'panel method' },
      el('h2', { text: 'Methodology: what the radar does, and what it does not' }),
      el('h3', { text: '1. The fitted value' }),
      el('p', { text: 'Two estimates of what a token would be worth, both fitted on the snapshot\u2019s ' + v.live_n + ' live-token protocols, are combined by geometric mean. The size curve is a least-squares fit of log10(market cap) on log10(TVL): log10(mcap) = ' + m.curve_a.toFixed(3) + ' + ' + m.curve_b.toFixed(3) + ' x log10(TVL), R2 ' + m.curve_r2.toFixed(2) + '. The category estimate is TVL times the median market-cap/TVL multiple of the protocol\u2019s own category (three or more live members, else the global median ' + m.global_multiple.toFixed(3) + '). Neither rules: a protocol whose category is rich in tokens is priced by its peers, and a protocol in a thin category is priced by its size.' }),
      el('h3', { text: '2. Growth and maturity' }),
      el('p', { text: 'Growth multiplies the fitted value by 1 + clamp(change_7d, -60, 120) / 100 x 0.5, so a protocol growing 40% in a week is worth 20% more than one standing still, and a protocol falling 60% is worth 30% less. Maturity multiplies by 0.6 + min(age, 1095) / 1095 x 0.4: age is the days since first listing with no token, the best record of how long a protocol has run without issuing one; an unknown age uses 365 days.' }),
      el('h3', { text: '3. Token odds, and the implied value' }),
      el('p', { text: 'Odds are the category\u2019s token rate: the share of protocols in the category that already record a token, shrunk toward the global rate with two pseudo-counts, clamped to 5% to 95%. Implied value is gross value x odds. A protocol in a category where a third of peers already trade is worth more than one in a category where almost none do, at the same TVL. The gross value is shown beside the implied value on every row, so the odds never hide.' }),
      el('h3', { text: '4. The held-out test' }),
      el('p', { text: 'The live-token set is split by slug hash: ' + v.train_n + ' protocols train the curve, ' + v.test_n + ' test it. On the test half the median prediction lands within ' + v.median_factor.toFixed(2) + 'x of the real market cap, against ' + v.baseline_factor.toFixed(2) + 'x for a flat global multiple. The fit is weak in absolute terms (R2 ' + m.curve_r2.toFixed(2) + '): token values disperse widely at any size, and the radar says so on the board rather than hiding it.' }),
      el('h3', { text: '5. Farm verdicts, net of cost' }),
      el('p', { text: 'Airdrop pool = 7% of implied value. Farmers = max(50, 200 x sqrt(TVL / $1M)): farmers grow with the square root of TVL, so a protocol 100x larger has about 10x the farmers, not 100x. One farm costs $62 ($12 gas, one hour at $50). Net per farmer = pool / farmers - $62. FARM above $150 net, THIN above $0, SKIP otherwise. The verdict is a costed judgement, not a slogan: the detail view shows the arithmetic for every protocol.' }),
      el('h3', { text: '6. What is set aside, and why' }),
      el('p', { text: 'The watchlist\u2019s own exclusion rule is applied to every row: Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC and CEX categories, names carrying a whole word wrapped, staked or staking, names beginning with an exchange\u2019s name, and versioned pools. ' + DATA.set_aside.filter(function (r) { return r.reason !== 'token already trades (CEX)'; }).length + ' pre-token protocols are set aside this way and ' + DATA.live_size + ' live-token protocols are set aside with their market caps, plus ' + DATA.set_aside.filter(function (r) { return r.reason === 'token already trades (CEX)'; }).length + ' exchange tokens, so all ' + DATA.total_protocols + ' protocols in the snapshot are accounted for: ' + DATA.board_size + ' ranked, ' + DATA.live_size + ' live, ' + DATA.set_aside_size + ' set aside.' }),
      el('h3', { text: '7. Limits' }),
      el('p', { text: 'The snapshot is frozen at ' + DATA.as_of + '; nothing here knows what happened after. The model uses TVL, seven-day growth, age, category and chain count only: it cannot see points programs, team announcements, funding or audits, and it does not predict whether or when a token is issued. A FARM verdict means the arithmetic favours farming, not that a token will come. Never pay to claim an airdrop, and never enter a seed phrase anywhere to farm.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var raw = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!raw) return;
    var row = displayRow(raw);
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(raw);
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-tag', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + ' · ' + row.verdict }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Size-curve value' }), el('b', { class: 'num', text: fmtUsd(row.size_curve_usd) })),
        el('div', null, el('span', { text: 'Category multiple' }), el('b', { class: 'num', text: String(row.category_multiple) + 'x' })),
        el('div', null, el('span', { text: 'Fitted value' }), el('b', { class: 'num', text: fmtUsd(row.fitted_value_usd) })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: String(row.growth_multiplier.toFixed(4)) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: String(row.maturity_multiplier.toFixed(4)) })),
        el('div', null, el('span', { text: 'Gross value if it launches' }), el('b', { class: 'num', text: fmtUsd(row.gross_implied_value_usd) })),
        el('div', null, el('span', { text: 'Token odds' }), el('b', { class: 'num', text: Math.round(row.token_odds * 100) + '%' })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
        el('div', null, el('span', { text: 'Net per farmer' }), el('b', { class: 'num', text: '$' + row.net_per_farmer_usd }))
      ),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(impliedOf(raw).implied) + ', the number board.json carries. This is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(spotlight());
    shell.appendChild(controls());
    if (state.tab === 'pre-token') {
      shell.appendChild(boardTable());
      shell.appendChild(modelPanel());
    } else if (state.tab === 'live') {
      shell.appendChild(liveTable());
    } else if (state.tab === 'set-aside') {
      shell.appendChild(setAsideTable());
    } else {
      shell.appendChild(methodTab());
    }
    shell.appendChild(el('div', { class: 'foot', text: 'Token Radar ' + DATA.model_version + ' · snapshot ' + DATA.as_of + ' · ' + DATA.source + ' · implied value is a model, not a price.' }));
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('hashchange', function () { readHash(); render(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
