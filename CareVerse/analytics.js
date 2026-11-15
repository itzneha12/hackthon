'use strict';
/* =====================================================================
   CareVerse analytics — charts (pure SVG, themeable, no library) + data
   helpers + dashboard tiles + the Analytics page.
   Loaded BEFORE app.js; everything runs at call time.
   ===================================================================== */
const ICONS_EXTRA = {
  xcircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2M9 9.5v.5M15 9.5v.5"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2-6 3 2v4M11 15l-1-5 4-2 2 4 3 1M10 10l-3 3"/>'
};
const PERIODS = [[7, 'Past 7 days'], [14, 'Past 14 days'], [30, 'Past month']];
const CVAR = n => `var(--c-${n})`;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

/* ---------- data helpers ---------- */
function isLate(d, k) { let h = 0; for (const c of d + k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 6 === 0; }   // deterministic demo split of on-time vs late
const histWin = (n, skip = 0) => S.hist.slice(Math.max(0, S.hist.length - n - skip), S.hist.length - skip);
function medCounts(n) {
  let ontime = 0, late = 0, missed = 0, pending = 0;
  histWin(n).forEach(h => { if (!h.s) return; for (const k in h.s) { if (h.s[k]) { isLate(h.date, k) ? late++ : ontime++; } else missed++; } });
  tasks().filter(x => x.type === 'med').forEach(x => {
    if (x.st === 'done') ontime++; else if (x.st === 'overdue' || x.st === 'escalated') missed++; else pending++;
  });
  return { ontime, late, missed, pending, total: ontime + late + missed + pending };
}
function adhRate(n, skip = 0) {
  let ok = 0, tot = 0; histWin(n, skip).forEach(h => { if (!h.s) return; for (const k in h.s) { tot++; ok += h.s[k]; } });
  return tot ? Math.round(ok / tot * 100) : null;
}
function adhSeries(n) {
  return histWin(n).map(h => { if (!h.s) return { d: h.date, p: null }; const v = Object.values(h.s); return { d: h.date, p: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) }; });
}
function weekdayRates() {
  const A = [...Array(7)].map(() => [0, 0]);
  S.hist.forEach(h => { if (!h.s) return; const w = (dateOf(h.date).getDay() + 6) % 7; for (const k in h.s) { A[w][0]++; A[w][1] += h.s[k]; } });
  return A.map((x, i) => ({ l: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], v: x[0] ? Math.round(x[1] / x[0] * 100) : 0 }));
}
function moodCounts(n) {
  const c = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < n; i++) { const k = S.checkins[iso(addDays(new Date(), -i))]; if (k) c[k.mood]++; }
  return c;
}
function moodAvg(n) { const c = moodCounts(n), t = c.reduce((a, b) => a + b, 0); return t ? (c.reduce((a, v, i) => a + v * i, 0) / t).toFixed(1) : '—'; }
function dayRange(n) { return [...Array(n)].map((_, i) => iso(addDays(new Date(), i - n + 1))); }
function expenseByCat(n) {
  const from = iso(addDays(new Date(), -n + 1)), by = {}; S.expenses.filter(e => e.date >= from).forEach(e => by[e.cat] = (by[e.cat] || 0) + e.amt);
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}
function monthTotals(k = 3) {
  const D = new Date(), out = [];
  for (let i = k - 1; i >= 0; i--) { const d = new Date(D.getFullYear(), D.getMonth() - i, 1), key = iso(d).slice(0, 7); out.push({ l: d.toLocaleDateString('en-IN', { month: 'short' }), v: S.expenses.filter(e => e.date.startsWith(key)).reduce((a, e) => a + e.amt, 0) }); }
  return out;
}
function fillHistory() {   // gives older installs 30 days of wellbeing data so charts have something to show
  const T = new Date(), r = mulberry(404); S.water = S.water || {}; S.walk = S.walk || {}; S.checkins = S.checkins || {};
  for (let i = 29; i >= 1; i--) {
    const d = iso(addDays(T, -i));
    if (S.water[d] === undefined) S.water[d] = Math.round(4 + r() * 4);
    if (S.walk[d] === undefined) S.walk[d] = Math.round((10 + r() * 35) / 5) * 5;
    if (!S.checkins[d]) { const q = r(), mood = q < .1 ? 2 : q < .3 ? 3 : q < .65 ? 4 : 5; S.checkins[d] = { mood, sleep: ['Good', 'Okay', 'Poor'][r() < .6 ? 0 : r() < .6 ? 1 : 2], pain: r() < .12 ? 1 : 0, t: 540, by: 'Lakshmi Devi', note: '' }; }
  }
}

/* ---------- SVG chart primitives ---------- */
function donut(segs, { size = 190, thick = 28, center = '', sub = '' } = {}) {
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1, r = (size - thick) / 2, c = 2 * Math.PI * r, h = size / 2; let off = 0;
  const arcs = segs.filter(s => s.v > 0).map(s => {
    const len = s.v / tot * c, el = `<circle class="dn-seg" cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thick}" stroke-dasharray="${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}" stroke-dashoffset="${-off}" transform="rotate(-90 ${h} ${h})"><title>${esc(s.label)}: ${s.v} (${Math.round(s.v / tot * 100)}%)</title></circle>`;
    off += len; return el;
  }).join('');
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(sub)}"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${thick}"/>${arcs}<text x="50%" y="49%" text-anchor="middle" class="dn-c">${center}</text><text x="50%" y="62%" text-anchor="middle" class="dn-s">${esc(sub)}</text></svg>`;
}
function legend(segs) {
  return `<ul class="lgd">${segs.map(s => `<li style="--lc:${s.color}"><i></i><div><small>${esc(s.label)}</small><b>${s.fmt ? s.fmt(s.v) : s.v}</b></div></li>`).join('')}</ul>`;
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function lineMulti(labels, series, { h = 210, band = null, min = null, max = null, unit = '', area = true } = {}) {
  const W = 560, L = 40, R = 12, T = 12, B = 28, vals = series.flatMap(s => s.data.filter(v => v != null));
  if (vals.length < 2) return '<p class="muted small">Not enough data yet.</p>';
  let lo = min ?? Math.min(...vals, band ? band[0] : Infinity), hi = max ?? Math.max(...vals, band ? band[1] : -Infinity);
  const pd = (hi - lo) * .12 || 1; if (min == null) lo -= pd; if (max == null) hi += pd;
  const n = labels.length, X = i => L + i * (W - L - R) / Math.max(1, n - 1), Y = v => T + (1 - (v - lo) / (hi - lo)) * (h - T - B);
  let s = `<svg class="lcm" viewBox="0 0 ${W} ${h}" role="img" aria-label="Line chart">`;
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 6}" y="${y + 3}" text-anchor="end" class="ax">${Math.round(v * 10) / 10}</text>`; }
  if (band) s += `<rect x="${L}" y="${Y(band[1])}" width="${W - L - R}" height="${Math.max(0, Y(band[0]) - Y(band[1]))}" class="bandr"><title>General reference range</title></rect>`;
  const step = Math.ceil(n / 6); labels.forEach((lb, i) => { if (i % step === 0 || i === n - 1) s += `<text x="${X(i)}" y="${h - 8}" text-anchor="middle" class="ax">${lb}</text>`; });
  series.forEach((sr, j) => {
    const pts = sr.data.map((v, i) => v == null ? null : [X(i), Y(v), v, labels[i]]).filter(Boolean);
    if (area && j === 0 && pts.length > 1) s += `<polygon class="area" fill="${sr.color}" points="${pts[0][0]},${h - B} ${pts.map(p => p[0] + ',' + p[1]).join(' ')} ${pts[pts.length - 1][0]},${h - B}"/>`;
    s += `<polyline class="ln" stroke="${sr.color}" points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>` + pts.map(p => `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${sr.color}"><title>${esc(sr.name)} · ${p[3]}: ${p[2]}${unit}</title></circle>`).join('');
  });
  return s + '</svg>';
}
function barsV(items, { h = 190, color = CVAR('green'), unit = '', max = null, colorFn = null } = {}) {
  const W = 380, L = 8, B = 26, T = 20, n = items.length, mx = max || niceMax(Math.max(...items.map(i => i.v), 1)), bw = (W - L * 2) / n;
  return `<svg class="bars" viewBox="0 0 ${W} ${h}" role="img" aria-label="Bar chart">` + items.map((it, i) => {
    const bh = (it.v / mx) * (h - T - B), x = L + i * bw + bw * .18, w = bw * .64, y = h - B - bh;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${Math.max(2, bh)}" rx="5" fill="${colorFn ? colorFn(it) : color}"><title>${esc(it.l)}: ${it.v}${unit}</title></rect><text x="${x + w / 2}" y="${y - 5}" text-anchor="middle" class="bv">${it.v}${unit && unit.length < 3 ? unit : ''}</text><text x="${x + w / 2}" y="${h - 8}" text-anchor="middle" class="ax">${it.l}</text></g>`;
  }).join('') + '</svg>';
}
function hbars(items, { color = CVAR('green'), unit = '' } = {}) {
  const mx = Math.max(...items.map(i => i.v), 1);
  return `<div class="hb">${items.map(i => `<div class="hb-r"><span>${esc(i.l)}</span><div class="bar"><i style="width:${i.v / mx * 100}%;background:${i.color || color}"></i></div><b>${i.fmt ? i.fmt(i.v) : i.v + unit}</b></div>`).join('')}</div>`;
}

/* ---------- dashboard widgets ---------- */
function tile(icon, color, label, sub, val, { ring = null, hot = false } = {}) {
  const r = 22, c = 2 * Math.PI * r, f = ring == null ? 1 : Math.max(.04, Math.min(1, ring));
  return `<div class="tile ${hot ? 'hot' : ''}" style="--tc:${CVAR(color)}"><span class="tile-ico">${ico(icon, 22)}</span><div class="tile-m"><b>${esc(label)}</b><small>${esc(sub)}</small></div>
    <span class="tile-ring"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" class="tr-bg"/><circle cx="28" cy="28" r="${r}" class="tr-fg" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 28 28)"/></svg><em>${val}</em></span></div>`;
}
function panel(title, body, extra = '', tone = '', cls = '') {
  return `<section class="card panel ${tone ? 'tone-' + tone : ''} ${cls}"><div class="card-h"><h2>${title}</h2>${extra}</div><div class="card-b">${body}</div></section>`;
}
function medDonutPanel(n = 7, tone = 'green') {
  const m = medCounts(n), segs = [{ label: 'Taken on time', v: m.ontime, color: CVAR('green') }, { label: 'Taken late', v: m.late, color: CVAR('amber') }, { label: 'Missed', v: m.missed, color: CVAR('red') }, { label: 'Pending today', v: m.pending, color: CVAR('blue') }];
  return panel('Medication overview', `<div class="chart-flex">${donut(segs, { center: pct(m.ontime + m.late, m.total) + '%', sub: 'taken' })}${legend(segs)}</div>`, `<span class="chip plain">Last ${n} days</span>`, tone);
}
function adhTrendPanel(n = 14, tone = 'blue') {
  const s = adhSeries(n);
  return panel('Adherence trend', lineMulti(s.map(x => fmtDate(x.d).split(', ')[1] || x.d), [{ name: 'Doses taken', color: CVAR('green'), data: s.map(x => x.p) }], { min: 0, max: 100, unit: '%' }), `<span class="chip plain">Last ${n} days</span>`, tone);
}
function updatesPanel(n = 6, tone = 'lilac') {
  return panel('Last 24 hours updates', `<ul class="upd">${S.feed.slice(0, n).map(f => `<li><b class="${f.kind === 'bad' ? 'u-bad' : 'u-ok'}">${esc(f.who)}</b><p>${esc(f.text)}</p><small>${fmt(f.t)}</small></li>`).join('')}</ul>`, '', tone);
}
function stockPanel(tone = 'sand') {
  return panel('Medicine supply', hbars(S.meds.map(m => ({ l: m.name, v: daysLeft(m), color: daysLeft(m) <= 7 ? CVAR('red') : daysLeft(m) <= 10 ? CVAR('amber') : CVAR('green'), fmt: v => v + ' days' }))), '<button class="btn sm" data-act="nav" data-p="meds">Manage</button>', tone);
}
function overviewTiles() {
  const m7 = medCounts(7), st = stats(), items = attention(), na = nextAppts().filter(a => dateOf(a.date) <= addDays(new Date(), 30)).length;
  const low = S.meds.filter(lowStock).length, openT = S.todos.filter(x => !x.done).length, ck = dayRange(7).filter(d => S.checkins[d]).length;
  const pend = tasks().filter(x => x.st === 'pending').length, water = S.water[todayISO()] || 0;
  return `<div class="tiles">
    ${tile('xcircle', 'red', 'Missed doses', 'Last 7 days', m7.missed, { ring: m7.missed / Math.max(1, m7.total) * 4 })}
    ${tile('clock', 'amber', 'Late doses', 'Last 7 days', m7.late, { ring: m7.late / Math.max(1, m7.total) * 4 })}
    ${tile('hourglass', 'amber', 'Pending now', 'Today', pend, { hot: pend > 0, ring: null })}
    ${tile('check', 'green', 'Taken on time', 'Last 7 days', m7.ontime, { ring: m7.ontime / Math.max(1, m7.total) })}
    ${tile('checklist', 'green', 'Tasks done', 'Today', st.done + '/' + st.total, { ring: st.done / Math.max(1, st.total) })}
    ${tile('alert', 'purple', 'Needs attention', 'Right now', items.length, { ring: null })}
    ${tile('calendar', 'blue', 'Appointments', 'Next 30 days', na, { ring: null })}
    ${tile('box', 'red', 'Low stock', 'Medicines', low, { ring: null })}
    ${tile('checklist', 'teal', 'Open care tasks', 'Assigned', openT, { ring: null })}
    ${tile('heart', 'teal', 'Check-ins', 'This week', ck + '/7', { ring: ck / 7 })}
  </div>`;
}

/* ---------- Analytics page ---------- */
function heatmapHtml() {
  const hist = S.hist.slice(-29), cells = [...hist.map(h => ({ d: h.date, s: dayStatus(h) })), { d: todayISO(), s: todayStatus(), today: 1 }], off = (dateOf(cells[0].d).getDay() + 6) % 7;
  const glyph = { ok: '✓', part: '◐', miss: '✕', none: '–' }, lab = { ok: 'all doses taken', part: 'partly taken / pending', miss: 'missed', none: 'not scheduled' };
  return `<div class="heat">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="h">${x}</div>`).join('')}${'<div></div>'.repeat(off)}${cells.map(c => `<div class="cell ${c.s} ${c.today ? 'today' : ''}" role="img" aria-label="${fmtDate(c.d)}: ${lab[c.s]}" title="${fmtDate(c.d)} — ${lab[c.s]}"><b>${dateOf(c.d).getDate()}</b>${glyph[c.s]}</div>`).join('')}</div>
  <div class="legend"><span class="ok">✓ All taken</span><span class="part">◐ Partly / pending</span><span class="miss">✕ Missed</span><span class="none">– Not scheduled</span></div>`;
}
function deltaChip(now_, prev, unit = '%') {
  if (prev == null || now_ == null) return '';
  const d = now_ - prev; return `<span class="chip plain ${d >= 0 ? 'done' : 'overdue'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}${unit === '%' ? ' pts' : unit} vs previous</span>`;
}
function pageAnalytics() {
  if (!me().perms.reports) return lockCard('reports and analytics');
  const n = ui.period || 14, a = adhRate(n), prev = adhRate(n, n), m = medCounts(n), days = dayRange(Math.min(n, 30));
  const bpRows = vSorted('bp').filter(r => r.date >= days[0]), sg = vSorted('sugar').filter(r => r.date >= days[0]);
  const mood = moodCounts(Math.min(n, 30)), moodSegs = [5, 4, 3, 2, 1].map(i => ({ label: MOODN[i], v: mood[i], color: [0, CVAR('red'), CVAR('amber'), CVAR('lime'), CVAR('teal'), CVAR('green')][i] })).filter(s => s.v > 0);
  const water = days.map(d => ({ l: dateOf(d).getDate() + '', v: S.water[d] || 0 })), exp = expenseByCat(n === 30 ? 30 : 30), expSegs = exp.map(([k, v], i) => ({ label: k, v, color: CVAR(['green', 'blue', 'amber', 'purple', 'teal', 'red', 'lime'][i % 7]), fmt: x => '₹' + x.toLocaleString('en-IN') }));
  const slots = Object.entries(adherence().slots).map(([k, v]) => ({ l: k, v: v[0] ? Math.round(v[1] / v[0] * 100) : 0, fmt: x => x + '%' }));
  const wd = weekdayRates(), walk = days.slice(-14).map(d => ({ l: dateOf(d).getDate() + '', v: S.walk[d] || 0 }));
  const col = v => v >= 85 ? CVAR('green') : v >= 70 ? CVAR('amber') : CVAR('red');
  return `<div class="row" style="margin-bottom:18px"><div class="tabs" style="margin:0" role="tablist">${PERIODS.map(([d, l]) => `<button role="tab" aria-selected="${n === d}" data-act="period" data-d="${d}">${l}</button>`).join('')}</div><span class="sp"></span><button class="btn primary" data-act="report">${ico('download', 18)} Download monthly report</button></div>
  <div class="grid">
   <div class="c-12">${panel('Summary · ' + PERIODS.find(p => p[0] === n)[1], `<div class="tiles t6">
     ${tile('trend', 'green', 'Adherence', 'Doses taken', (a ?? '—') + '%', { ring: (a || 0) / 100 })}
     ${tile('check', 'green', 'Taken on time', 'Doses', m.ontime, { ring: m.ontime / Math.max(1, m.total) })}
     ${tile('clock', 'amber', 'Taken late', 'Doses', m.late, { ring: m.late / Math.max(1, m.total) * 4 })}
     ${tile('xcircle', 'red', 'Missed', 'Doses', m.missed, { ring: m.missed / Math.max(1, m.total) * 4 })}
     ${tile('smile', 'teal', 'Average mood', 'Out of 5', moodAvg(Math.min(n, 30)))}
     ${tile('drop', 'blue', 'Avg water', 'Glasses a day', (water.reduce((s, x) => s + x.v, 0) / Math.max(1, water.length)).toFixed(1))}
    </div><div style="margin-top:12px">${deltaChip(a, prev)}</div>`, '', 'teal')}</div>
   <div class="c-5">${medDonutPanel(n, 'green')}</div>
   <div class="c-7">${adhTrendPanel(Math.min(n, 29), 'blue')}</div>
   <div class="c-4">${panel('Missed-routine heatmap', heatmapHtml(), '', 'sand')}</div>
   <div class="c-4">${panel('Best and worst days', barsV(wd.map(x => ({ l: x.l, v: x.v })), { unit: '%', max: 100, colorFn: it => col(it.v) }), '', 'lilac')}</div>
   <div class="c-4">${panel('Time of day', hbars(slots.map(s => ({ ...s, color: col(s.v) })), {}) + '<p class="small muted" style="margin-top:14px">Share of doses taken in each part of the day.</p>', '', 'green')}</div>
   <div class="c-6">${panel('Blood pressure', lineMulti(bpRows.map(r => fmtDate(r.date).split(', ')[1]), [{ name: 'Top (systolic)', color: CVAR('green'), data: bpRows.map(r => r.v1) }, { name: 'Bottom (diastolic)', color: CVAR('amber'), data: bpRows.map(r => r.v2) }], { unit: ' mmHg', area: false }) + '<div class="legend"><span class="ok">Top (systolic)</span><span class="part">Bottom (diastolic)</span></div>', `<span class="chip plain">${bpRows.length} readings</span>`, 'blue')}</div>
   <div class="c-6">${panel('Blood sugar', lineMulti(sg.map(r => fmtDate(r.date).split(', ')[1]), [{ name: 'Blood sugar', color: CVAR('purple'), data: sg.map(r => r.v1) }], { unit: ' mg/dL', band: BANDS.sugar }) + '<p class="small muted">Green band is the general reference range. Your doctor\'s targets may differ.</p>', `<span class="chip plain">${sg.length} readings</span>`, 'lilac')}</div>
   <div class="c-4">${panel('Mood this period', moodSegs.length ? `<div class="chart-flex">${donut(moodSegs, { size: 160, thick: 24, center: moodAvg(Math.min(n, 30)), sub: 'avg of 5' })}${legend(moodSegs.map(s => ({ ...s })))}</div>` : '<p class="muted">No check-ins yet.</p>', '', 'rose')}</div>
   <div class="c-4">${panel('Water per day', barsV(water.slice(-14), { unit: '', max: 8, colorFn: it => it.v >= 6 ? CVAR('blue') : CVAR('amber') }) + '<p class="small muted">Glasses per day, goal 8.</p>', '', 'blue')}</div>
   <div class="c-4">${panel('Walking minutes', barsV(walk, { color: CVAR('teal'), max: 60 }) + '<p class="small muted">Minutes per day, gentle goal 30.</p>', '', 'teal')}</div>
   <div class="c-6">${panel('Where the money goes · last 30 days', exp.length ? `<div class="chart-flex">${donut(expSegs, { size: 170, thick: 26, center: '₹' + Math.round(exp.reduce((s, x) => s + x[1], 0) / 100) / 10 + 'k', sub: 'total' })}${legend(expSegs)}</div>` : '<p class="muted">No expenses yet.</p>', '', 'sand')}</div>
   <div class="c-6">${panel('Monthly care spending', barsV(monthTotals(3).map(x => ({ l: x.l, v: x.v })), { color: CVAR('green') }), '<button class="btn sm" data-act="expCsv">Export CSV</button>', 'green')}</div>
   <div class="c-12">${panel('What stands out', `<ul class="obs">${observations().map(o => `<li>${esc(o)}</li>`).join('')}</ul><div class="notice info" id="sum-box" style="white-space:pre-wrap;margin-top:16px">${esc(daySummary())}</div><div class="row" style="margin-top:12px"><button class="btn" data-act="aiSummary">Refresh AI summary</button></div>`, '', 'teal')}</div>
  </div>`;
}
const analyticsActions = {
  period(d) { ui.period = +d.d; render(); },
  alerts() {
    const L = attention();
    openModal(`<h2>Alerts</h2>${L.length ? `<ul class="feed">${L.map(i => `<li class="${i.sev === 'bad' ? 'bad' : ''}"><span class="fd ${i.sev}"></span><div><b>${esc(i.text)}</b></div></li>`).join('')}</ul>` : '<p class="muted">Nothing needs attention right now.</p>'}<div class="row"><button class="btn primary" data-act="close">Close</button></div>`);
  }
};