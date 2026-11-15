'use strict';

/* =====================================================================

   CareVerse feature pack — loaded BEFORE app.js (only declarations here;

   everything is used at runtime after app.js has defined S, ui, render…)

   Wellness · vitals · family wall · brain & relax · tasks · journal ·

   expenses · shifts · help · backup

   ===================================================================== */

const TE_EXTRA = {

  'Wellness': 'ఆరోగ్య స్థితి', 'Family Wall': 'కుటుంబ సందేశాలు', 'Relax & Brain': 'విశ్రాంతి & మెదడు', 'Help': 'సహాయం',

  'Tasks & Journal': 'పనులు & డైరీ', 'Expenses': 'ఖర్చులు', 'How are you today?': 'ఈ రోజు మీరు ఎలా ఉన్నారు?', 'Check in': 'చెక్-ఇన్',

  'Send love': 'ప్రేమ పంపండి', 'Read to me': 'నాకు చదివి వినిపించండి', 'Water': 'నీళ్లు', 'Today is': 'ఈ రోజు'

};

const MOODS = ['', '😢', '🙁', '😐', '🙂', '😄'], MOODN = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'];

const PAIN = ['None', 'Mild', 'Moderate', 'Severe'];

const VT = {

  bp: { n: 'Blood pressure', u: 'mmHg', ic: '🩸' }, sugar: { n: 'Blood sugar', u: 'mg/dL', ic: '🍬' }, weight: { n: 'Weight', u: 'kg', ic: '⚖️' },

  spo2: { n: 'Oxygen (SpO₂)', u: '%', ic: '🫁' }, pulse: { n: 'Pulse', u: 'bpm', ic: '💓' }, temp: { n: 'Temperature', u: '°F', ic: '🌡️' }

};

const BANDS = { sugar: [70, 130], spo2: [94, 100], pulse: [50, 100], temp: [97, 99.5] };

const FLAGTXT = { high: 'above the general reference range', low: 'below the general reference range', urgent: 'far outside the general range' };

const SAFETY = ['Non-slip mats in bathroom and kitchen', 'Night lights from bed to bathroom', 'Grab bars near toilet and shower', 'No loose rugs or trailing cables', 'Phone / SOS button within reach of the bed', 'Sturdy chair with armrests; non-slip footwear indoors', 'All medicines kept in one labelled place', 'Stairs well lit with handrails on both sides'];

const EXP_CATS = ['Medicines', 'Doctor', 'Tests', 'Care staff', 'Groceries & diet', 'Equipment', 'Other'];

const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };

const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

const clockOf = ts => new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });



/* ---------- seed + migration ---------- */

function extras(T) {

  const r = mulberry(77), td = iso(T), vit = [], d = n => iso(addDays(T, -n));

  const V = (date, time, type, v1, v2, by) => vit.push({ id: uid(), date, time, type, v1, v2, by: by || 'Sunita Rao' });

  for (let i = 13; i >= 1; i--) {

    const spike = i === 5;

    V(d(i), '07:40', 'bp', spike ? 152 : Math.round(126 + r() * 14), spike ? 94 : Math.round(78 + r() * 9));

    V(d(i), '07:50', 'sugar', Math.round(104 + r() * 32));

    if (i % 3 === 0) V(d(i), '08:00', 'weight', +(61.4 + r() * 1.1).toFixed(1));

    if (i % 4 === 0) V(d(i), '08:05', 'spo2', Math.round(96 + r() * 2));

  }

  V(td, '07:40', 'bp', 134, 84); V(td, '07:50', 'sugar', 118);

  const mm = [4, 3, 4, 5, 3, 4], sl = ['Good', 'Okay', 'Good', 'Good', 'Poor', 'Good'], checkins = {};

  for (let i = 6; i >= 1; i--) checkins[d(i)] = { mood: mm[6 - i], sleep: sl[6 - i], pain: i === 2 ? 1 : 0, t: 540, by: 'Lakshmi Devi', note: '' };

  checkins[td] = { mood: 4, sleep: 'Good', pain: 0, t: 545, by: 'Lakshmi Devi', note: '' };

  const open = new Date(T); open.setHours(7, 0, 0, 0); if (+open > Date.now() - 60000) open.setTime(Date.now() - 3600e3);

  const sh = (ago, h1, h2) => { const a = new Date(T); a.setDate(a.getDate() - ago); a.setHours(h1, 0, 0, 0); const b = new Date(a); b.setHours(h2); return { id: uid(), who: 'sunita', start: +a, end: +b }; };

  const ex = (n, cat, desc, amt) => ({ id: uid(), date: d(n), cat, desc, amt, by: 'Ravi Kumar' });

  return {

    checkinTime: '09:00', vitals: vit, checkins, water: { [td]: 3 }, walk: { [td]: 15 },

    wall: [

      { id: uid(), from: 'priya', text: 'Good morning Amma! 🌸 Thinking of you. I will call you at 5 PM today. Love you!', when: 'Today 7:10 AM', loved: false, photo: '' },

      { id: uid(), from: 'ravi', text: 'The doctor visit went well. I will bring your favourite mangoes on Saturday. 🥭', when: 'Today 11:20 AM', loved: true, photo: '' }],

    journal: [

      { id: uid(), by: 'Sunita Rao', cat: 'Food', text: 'Ate a good breakfast (idli and sambar). Had 3 glasses of water by noon.', when: 'Today 9:15 AM' },

      { id: uid(), by: 'Ravi Kumar', cat: 'Doctor', text: 'Doctor advised repeating the blood test in 3 months. Will book it.', when: 'Today 11:30 AM' },

      { id: uid(), by: 'Sunita Rao', cat: 'Mood', text: 'A little low yesterday evening; cheered up after talking to Priya.', when: 'Yesterday 8:10 PM' }],

    todos: [

      { id: uid(), title: 'Order Amlodipine refill', assignee: 'ravi', due: iso(addDays(T, 1)), done: false },

      { id: uid(), title: 'Arrange transport for the eye check-up', assignee: 'ravi', due: iso(addDays(T, 1)), done: false },

      { id: uid(), title: 'Weekly video call with Amma', assignee: 'priya', due: iso(addDays(T, 3)), done: false },

      { id: uid(), title: 'Buy a non-slip bathroom mat', assignee: 'sunita', due: d(1), done: true }],

    expenses: [ex(2, 'Medicines', 'Monthly pharmacy bill', 1840), ex(5, 'Doctor', 'Consultation — Dr. Reddy', 700), ex(9, 'Tests', 'Blood tests', 1450), ex(12, 'Care staff', 'Nurse — weekly', 4500), ex(14, 'Groceries & diet', 'Groceries', 960), ex(20, 'Equipment', 'BP monitor batteries', 180), ex(34, 'Medicines', 'Pharmacy bill', 1760), ex(37, 'Care staff', 'Nurse — weekly', 4500), ex(41, 'Doctor', 'Eye consultation', 600)],

    shifts: [{ id: uid(), who: 'sunita', start: +open, end: null }, sh(1, 7, 19), sh(2, 7, 19), sh(3, 8, 17)],

    safety: {}, wellbeing: {}, brain: {}, memBest: 0

  };

}

function migrate() {

  const fresh = !S.checkins, ex = extras(new Date());

  for (const k in ex) if (S[k] === undefined) S[k] = ex[k];

  if (fresh) S.done['checkin\@day'] = { at: 545, by: 'Lakshmi Devi' };

  if (S.ai === undefined) { S.ai = S.lang || 'en'; S.voice = true; }

  if (!S.rate) S.rate = '0.9';

  fillHistory();

}



/* ---------- vitals logic ---------- */

const vSorted = type => S.vitals.filter(v => v.type === type).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

const vLast = type => vSorted(type).slice(-1)[0];

const vFmt = r => r.type === 'bp' ? `${r.v1}/${r.v2}` : `${r.v1}`;

function vFlag(r) {

  const a = r.v1, b = r.v2;

  switch (r.type) {

    case 'bp': if (a >= 180 || b >= 120 || a < 80) return 'urgent'; if (a > 140 || b > 90) return 'high'; if (a < 90 || b < 60) return 'low'; break;

    case 'sugar': if (a < 70 || a > 300) return 'urgent'; if (a > 180) return 'high'; break;

    case 'spo2': if (a < 90) return 'urgent'; if (a < 94) return 'low'; break;

    case 'pulse': if (a < 40 || a > 130) return 'urgent'; if (a < 50) return 'low'; if (a > 100) return 'high'; break;

    case 'temp': if (a >= 103) return 'urgent'; if (a > 100.4) return 'high'; if (a < 96) return 'low'; break;

  }

  return '';

}

function extraAttention() {

  const out = [], T = todayISO(), y = iso(addDays(new Date(), -1));

  Object.keys(VT).forEach(k => {

    const r = vLast(k); if (!r || r.date < y) return; const f = vFlag(r);

    if (f) out.push({ sev: f === 'urgent' ? 'bad' : 'warn', text: `${VT[k].n} ${vFmt(r)} ${VT[k].u} is ${FLAGTXT[f]} — tell the doctor${f === 'urgent' ? ', or call 108 if unwell' : ''}`, kind: 'vital' });

  });

  const c = S.checkins[T];

  if (c) { if (c.pain >= 3) out.push({ sev: 'bad', text: `${elderFirst()} reported severe pain today`, kind: 'checkin' }); else if (c.mood <= 2) out.push({ sev: 'warn', text: `${elderFirst()} reported feeling low today`, kind: 'checkin' }); }

  const w = S.water[T] || 0; if (now() >= 15 * 60 && w < 4) out.push({ sev: 'warn', text: `Only ${w} glass${w === 1 ? '' : 'es'} of water recorded so far today`, kind: 'water' });

  S.todos.filter(x => !x.done && x.due < T).forEach(x => out.push({ sev: 'warn', text: `Care task overdue: ${x.title}`, kind: 'todo' }));

  return out;

}



/* ---------- charts ---------- */

function lineChart(rows, keys, band) {

  if (rows.length < 2) return '<p class="muted small">Add more readings to see a trend.</p>';

  const W = 320, H = 130, P = 28, vals = rows.flatMap(r => keys.map(k => r[k]));

  const dmn = Math.min(...vals), dmx = Math.max(...vals); let mn = Math.min(dmn, band ? band[0] : 1e9), mx = Math.max(dmx, band ? band[1] : -1e9);

  const pd = (mx - mn) * .12 || 1; mn -= pd; mx += pd;

  const X = i => P + i * (W - P - 8) / (rows.length - 1), Y = v => H - 20 - (v - mn) / (mx - mn) * (H - 34);

  let s = `<svg viewBox="0 0 ${W} ${H}" class="lc" role="img" aria-label="Trend chart, ${rows.length} readings">`;

  if (band) s += `<rect x="${P}" y="${Y(band[1])}" width="${W - P - 8}" height="${Y(band[0]) - Y(band[1])}" class="band"><title>General reference range</title></rect>`;

  [dmn, dmx].forEach(v => s += `<text x="1" y="${Y(v) + 3}" class="ax">${Math.round(v * 10) / 10}</text>`);

  keys.forEach((k, j) => { s += `<polyline class="ln l${j}" points="${rows.map((r, i) => X(i) + ',' + Y(r[k])).join(' ')}"/>` + rows.map((r, i) => `<circle class="pt l${j}" cx="${X(i)}" cy="${Y(r[k])}" r="3.2"><title>${r.l}: ${r[k]}</title></circle>`).join(''); });

  return s + `<text x="${P}" y="${H - 4}" class="ax">${rows[0].l}</text><text x="${W - 8}" y="${H - 4}" text-anchor="end" class="ax">${rows[rows.length - 1].l}</text></svg>`;

}



/* ---------- home-page widgets ---------- */

function orientCard() {

  const d = new Date(), h = Math.floor(now() / 60), part = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';

  const nx = tasks().find(x => x.st !== 'done');

  return `<section class="card orient"><small class="muted"><b>${t('Today is').toUpperCase()}</b></small><div class="od">${d.toLocaleDateString('en-IN', { weekday: 'long' })}</div><div class="odd">${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div><p class="muted">${part} · ${fmt(now())}${nx ? ` · Next: ${esc(nx.title)} at ${fmt(nx.time)}` : ''}</p></section>`;

}

function msgCard() {

  const p = S.wall[0]; if (!p) return '';

  const m = S.circle.find(x => x.id === p.from) || { emoji: '🧑', name: 'Family' };

  return card('💌 From your family', `<div class="row"><span class="av2">${m.emoji}</span><div class="sp"><b>${esc(m.name)}</b><div class="muted small">${esc(p.when)}</div></div></div><p class="wall-t">${esc(p.text)}</p><div class="row"><button class="btn sm" data-act="love" data-id="${p.id}">${p.loved ? '❤️ Loved' : '🤍 ' + t('Send love')}</button><button class="btn sm" data-act="readMsg" data-id="${p.id}">🔊 ${t('Read to me')}</button></div>`, '<button class="btn sm" data-act="nav" data-p="wall">All</button>');

}

function waterMini() {

  const w = S.water[todayISO()] || 0;

  return card('💧 ' + t('Water'), `<div class="glasses">${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<button class="glass ${i <= w ? 'on' : ''}" data-act="water" data-n="${i}" aria-label="${i} glasses" aria-pressed="${i <= w}" ${canAct() ? '' : 'disabled'}>🥛</button>`).join('')}</div><p class="small muted">${w} of 8 glasses today</p>`);

}

function wellCard() {

  const T = todayISO(), c = S.checkins[T], w = S.water[T] || 0, walk = S.walk[T] || 0;

  const chips = ['bp', 'sugar', 'weight'].map(k => { const r = vLast(k); if (!r) return ''; const f = vFlag(r); return `<span class="chip ${f ? (f === 'urgent' ? 'overdue' : 'pending') : 'done'}">${VT[k].ic} ${vFmt(r)} ${VT[k].u}</span>`; }).join(' ');

  return card('💛 Wellbeing today', `<ul class="feed"><li><span class="ic">${c ? MOODS[c.mood] : '❔'}</span><div><b>${c ? `Checked in at ${fmt(c.t)} — mood ${MOODN[c.mood].toLowerCase()}, sleep ${esc(c.sleep).toLowerCase()}, pain ${PAIN[c.pain].toLowerCase()}` : 'No check-in yet today'}</b></div></li><li><span class="ic">💧</span><div><b>${w} of 8 glasses of water</b></div></li><li><span class="ic">🚶</span><div><b>${walk} min walking</b><small>goal 30 min</small></div></li></ul><div class="row" style="margin-top:8px">${chips}</div>`, '<button class="btn sm" data-act="nav" data-p="wellness">Details</button>');

}

function todosCard(mine) {

  const L = S.todos.filter(x => !x.done && (!mine || x.assignee === S.meId || x.assignee === '')).slice(0, 5);

  return card('✅ Open care tasks', L.length ? `<ul class="feed">${L.map(x => { const a = S.circle.find(m => m.id === x.assignee); return `<li><span class="ic">${a ? a.emoji : '👥'}</span><div><b>${esc(x.title)}</b><small>${a ? esc(a.name.split(' ')[0]) : 'Anyone'} · due ${fmtDate(x.due)}${x.due < todayISO() ? ' · overdue' : ''}</small></div></li>`; }).join('')}</ul>` : '<p class="muted">All caught up ✨</p>', '<button class="btn sm" data-act="nav" data-p="journal">Open</button>');

}

const openShift = who => S.shifts.find(x => (!who || x.who === who) && !x.end);

function shiftCard() {

  const o = openShift(S.meId);

  return card('⏱ My shift', o ? `<p><b>On shift</b> since ${clockOf(o.start)} · ${((Date.now() - o.start) / 3600e3).toFixed(1)} h</p><button class="btn danger" data-act="clockOut">Clock out</button>` : `<p class="muted">You are not clocked in.</p><button class="btn primary" data-act="clockIn">Clock in</button>`);

}

function onDutyCard() {

  const o = openShift(); if (!o) return '';

  const p = S.circle.find(m => m.id === o.who);

  return card('🧑‍⚕️ On duty now', `<div class="row"><span class="av2">${p ? p.emoji : '🧑'}</span><div><b>${esc(p ? p.name : 'Caregiver')}</b><div class="muted small">since ${clockOf(o.start)}</div></div></div>`);

}



/* ---------- pages ---------- */

function pageWellness() {

  const T = todayISO(), c = S.checkins[T], w = S.water[T] || 0, walk = S.walk[T] || 0, ca = canAct();

  const wk = [...Array(7)].map((_, i) => { const d = iso(addDays(new Date(), i - 6)); return { d, c: S.checkins[d] }; });

  const type = ui.vt || 'bp', rows = vSorted(type), last = rows[rows.length - 1], f = last ? vFlag(last) : '';

  const chart = lineChart(rows.slice(-14).map(r => ({ l: fmtDate(r.date).split(',')[1] || fmtDate(r.date), a: r.v1, b: r.v2 })), type === 'bp' ? ['a', 'b'] : ['a'], BANDS[type]);

  const nowT = hhmm(now() % 1440);

  const urgent = f === 'urgent' ? `<div class="notice bad" role="alert"><b>This reading is far outside the general range.</b> If ${esc(elderFirst())} feels unwell, call <a href="tel:108"><b>108</b></a> (ambulance) or <a href="tel:112"><b>112</b></a> now. Otherwise, tell the doctor today.</div>` : '';

  return `<div class="grid">

   <div class="c-12">${card('💛 Daily check-in', c ? `<div class="notice ok"><b>✅ Checked in at ${fmt(c.t)}</b> by ${esc(c.by)} — mood ${MOODS[c.mood]} ${MOODN[c.mood]}, sleep ${esc(c.sleep)}, pain ${PAIN[c.pain]}.${c.note ? `<br>“${esc(c.note)}”` : ''}</div>` : `<p class="muted">No check-in yet today. If it isn't done by ${fmt(toMin(S.checkinTime))} the app starts the reminder policy.</p>`, ca ? `<button class="btn ${c ? '' : 'primary'}" data-act="checkinForm">${c ? 'Update' : '💛 ' + t('How are you today?')}</button>` : '')}</div>

   <div class="c-6">${card('💧 Hydration', `<p class="muted small">Goal: 8 glasses. Tap a glass to set today's count.</p><div class="glasses">${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<button class="glass ${i <= w ? 'on' : ''}" data-act="water" data-n="${i}" aria-label="${i} glasses" aria-pressed="${i <= w}" ${ca ? '' : 'disabled'}>🥛</button>`).join('')}</div><div class="bar ${w < 4 ? 'mid' : ''}"><i style="width:${w / 8 * 100}%"></i></div><p style="margin-top:6px"><b>${w}</b> / 8 glasses</p>`)}

    <div style="height:18px"></div>${card('🚶 Movement', `<p><b>${walk}</b> min today <span class="muted small">(gentle goal: 30)</span></p><div class="bar"><i style="width:${Math.min(100, walk / 30 * 100)}%"></i></div><div class="row" style="margin-top:10px"><button class="btn sm" data-act="walk" data-m="10" ${ca ? '' : 'disabled'}>+10 min</button><button class="btn sm" data-act="walk" data-m="-10" ${ca ? '' : 'disabled'}>−10</button></div>`)}</div>

   <div class="c-6">${card('Mood this week', `<div class="mweek">${wk.map(x => `<div class="mcol"><span class="mb"><i style="height:${x.c ? x.c.mood * 20 : 4}%"></i></span><span class="me">${x.c ? MOODS[x.c.mood] : '·'}</span><small>${dateOf(x.d).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)}</small></div>`).join('')}</div><p class="muted small">Sleep: ${wk.filter(x => x.c).map(x => x.c.sleep[0]).join(' · ')} (G=Good, O=Okay, P=Poor)</p>`)}</div>

   <div class="c-12">${card('🩺 Health readings', `<div class="tabs">${Object.entries(VT).map(([k, v]) => `<button data-act="vtype" data-k="${k}" aria-selected="${type === k}">${v.ic} ${v.n}</button>`).join('')}</div>${urgent}

     <div class="grid" style="gap:20px"><div class="c-6"><div class="row"><div><small class="muted">Latest ${VT[type].n}</small><div class="bignum">${last ? vFmt(last) : '—'} <small>${VT[type].u}</small></div><span class="muted small">${last ? fmtDate(last.date) + ' · ' + last.time + ' · ' + esc(last.by) : 'No readings yet'}</span></div><span class="sp"></span>${f ? `<span class="chip ${f === 'urgent' ? 'overdue' : 'pending'}">${f === 'high' ? '▲ High' : f === 'low' ? '▼ Low' : '‼ Check now'}</span>` : last ? '<span class="chip done">✓ In general range</span>' : ''}</div>${chart}<div class="legend small"><span class="ok">${type === 'bp' ? '<b style="color:var(--brand)">●</b> top (systolic)  <b style="color:var(--accent)">●</b> bottom (diastolic)' : 'Green band = general reference range'}</span></div></div>

     <div class="c-6">${ca ? `<form class="form" data-form="vital"><input type="hidden" name="type" value="${type}"><div class="two"><label>${type === 'bp' ? 'Top number (systolic)' : VT[type].n + ' (' + VT[type].u + ')'}<input type="number" step="any" name="v1" required inputmode="decimal"></label>${type === 'bp' ? '<label>Bottom number (diastolic)<input type="number" name="v2" required inputmode="numeric"></label>' : `<label>Time<input type="time" name="time" value="${nowT}"></label>`}</div>${type === 'bp' ? `<label>Time<input type="time" name="time" value="${nowT}"></label>` : ''}<button class="btn primary" type="submit">＋ Save reading</button></form>` : ''}

       <p class="small muted" style="margin:10px 0 4px"><b>Recent</b></p><ul class="feed">${rows.slice(-5).reverse().map(r => { const fl = vFlag(r); return `<li><span class="ic">${VT[type].ic}</span><div><b>${vFmt(r)} ${VT[type].u}</b> ${fl ? `<span class="chip ${fl === 'urgent' ? 'overdue' : 'pending'}">${fl}</span>` : ''}<small>${fmtDate(r.date)} ${r.time} · ${esc(r.by)}</small></div></li>`; }).join('') || '<li class="muted">None</li>'}</ul></div></div>

     <p class="notice info small" style="margin-top:14px">Reference ranges are general adult guidance only. CareVerse does not diagnose and your doctor's targets may differ. If someone feels very unwell, call 108 / 112.</p>`)}</div></div>`;

}

function checkinModal() {

  const c = S.checkins[todayISO()] || {};

  openModal(`<h2>💛 ${t('How are you today?')}</h2><form class="form" data-form="checkin">

   <fieldset class="moods"><legend>Mood</legend>${[1, 2, 3, 4, 5].map(i => `<label class="mood"><input type="radio" name="mood" value="${i}" ${(c.mood || 4) === i ? 'checked' : ''}><span>${MOODS[i]}<small>${MOODN[i]}</small></span></label>`).join('')}</fieldset>

   <div class="two"><label>How did you sleep?<select name="sleep">${['Good', 'Okay', 'Poor'].map(x => `<option ${c.sleep === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>

   <label>Any pain?<select name="pain">${PAIN.map((x, i) => `<option value="${i}" ${(c.pain || 0) === i ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>

   <label>Anything to tell the family? (optional)<textarea name="note">${esc(c.note || '')}</textarea></label>

   <div class="row"><button class="btn primary xl" type="submit">✔ Send my check-in</button><button type="button" class="btn ghost" data-act="close">Cancel</button></div></form>`);

}



function wallPost(p) {

  const m = S.circle.find(x => x.id === p.from) || { emoji: '🧑', name: 'Family' };

  return `<article class="card wall ${p.priority === 'sos' ? 'sos-wall' : ''}"><div class="row"><span class="av2">${m.emoji}</span><div class="sp"><b>${esc(m.name)}</b><div class="muted small">${esc(p.when)}</div></div></div><p class="wall-t">${p.priority === 'sos' ? '<b class="sos-tag">🆘 PRIORITY SOS ALERT</b><br>' : ''}${esc(p.text)}</p>${p.photo ? `<img src="${p.photo}" alt="Photo shared by ${esc(m.name)}">` : ''}

  <div class="row"><button class="btn sm" data-act="love" data-id="${p.id}" aria-pressed="${!!p.loved}">${p.loved ? '❤️ Loved' : '🤍 ' + t('Send love')}</button><button class="btn sm" data-act="readMsg" data-id="${p.id}">🔊 ${t('Read to me')}</button>${p.from === S.meId ? `<button class="btn sm ghost" data-act="delPost" data-id="${p.id}">Delete</button>` : ''}</div></article>`;

}

function pageWall() {

  return `<div class="grid"><div class="c-5">${card('Family Chat · Send a message', `<p class="small muted">Quick messages</p><div class="row quick-chat"><button class="btn sm" type="button" data-act="quickMsg" data-msg="Good morning! 🌸 Have a lovely day.">☀️ Good morning</button><button class="btn sm" type="button" data-act="quickMsg" data-msg="Good night! Sleep well. 🌙">🌙 Good night</button><button class="btn sm" type="button" data-act="quickMsg" data-msg="A gentle reminder: please check your scheduled medicine reminder. 💊">💊 Medicine reminder</button><button class="btn sm" type="button" data-act="quickMsg" data-msg="Have you had some water? 💧">💧 Drink water</button><button class="btn sm" type="button" data-act="quickMsg" data-msg="How are you feeling today? ❤️">❤️ How are you?</button></div><form class="form" data-form="wall"><label>Your message<textarea name="text" required placeholder="Type a message to your family…"></textarea></label><label>Photo (optional)<input type="file" id="wall-photo" accept="image/*"></label><button class="btn primary" type="submit">💬 Send to family chat</button></form><p class="small muted" style="margin-top:10px">Messages appear in the shared CareVerse Family Wall. Elders can tap 🔊 to hear them.</p>`)}</div><div class="c-7 stack">${S.wall.map(wallPost).join('') || '<p class="muted">No messages yet.</p>'}</div></div>`;

}



const newMem = () => { const e = ['🌸', '🐘', '🥭', '🪔', '🚲', '🐦'], a = [...e, ...e].map(x => ({ e: x, f: 0, m: 0 })); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return { cards: a, first: null, moves: 0, lock: false }; };

function pageRelax() {

  const mem = ui.mem || (ui.mem = newMem()), won = mem.cards.every(c => c.m), T = todayISO(), bs = S.brain[T];

  const d = new Date(), days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const yt = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

  return `<div class="grid">

  <div class="c-6">${card('🌬 Calm breathing', `<p class="muted">Breathe in as the circle grows, hold, then out slowly. One minute can help you feel calmer.</p><div class="breath-wrap"><div class="breath ${ui.breath ? 'on' : ''}"><span class="bt bt1">Breathe in…</span><span class="bt bt2">Hold…</span><span class="bt bt3">Breathe out…</span><span class="bt0">${ui.breath ? '' : 'Ready?'}</span></div></div><div class="row" style="justify-content:center"><button class="btn primary" data-act="breath">${ui.breath ? 'Stop' : '▶ Start breathing'}</button></div>`)}</div>

  <div class="c-6">${card('🧠 Daily warm-up', bs !== undefined ? `<div class="notice ok"><b>Today's warm-up: ${bs}/3 ⭐</b><br>Lovely — come back tomorrow for another one!</div>` : `<form class="form" data-form="brain"><p class="muted small">A friendly warm-up — not a medical test.</p><label>What day is it today?<select name="day">${days.map(x => `<option>${x}</option>`).join('')}</select></label><label>Which month is it?<select name="month">${months.map(x => `<option>${x}</option>`).join('')}</select></label><label>Which year is it?<select name="year">${[d.getFullYear() - 1, d.getFullYear(), d.getFullYear() + 1].map(x => `<option>${x}</option>`).join('')}</select></label><button class="btn primary" type="submit">Check my answers</button></form>`)}</div>

  <div class="c-7">${card('🃏 Memory match', `<p class="muted small">Find the matching pairs. Moves: <b>${mem.moves}</b> · Best: <b>${S.memBest || '—'}</b></p>${won ? `<div class="notice ok"><b>🎉 You found them all in ${mem.moves} moves!</b></div>` : ''}<div class="memgrid">${mem.cards.map((c, i) => `<button class="mc ${c.f || c.m ? 'up' : ''} ${c.m ? 'ok' : ''}" data-act="memFlip" data-i="${i}" aria-label="${c.f || c.m ? c.e : 'Hidden card ' + (i + 1)}">${c.f || c.m ? c.e : '❓'}</button>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn sm" data-act="memNew">New game</button></div>`)}</div>

  <div class="c-5">${card('🎵 Music & gentle exercise', `<p class="muted small">Opens YouTube in a new tab.</p><div class="stack"><a class="btn" target="_blank" rel="noopener" href="${yt('telugu devotional songs')}">🙏 Devotional songs</a><a class="btn" target="_blank" rel="noopener" href="${yt('old telugu melodies')}">🎶 Old Telugu melodies</a><a class="btn" target="_blank" rel="noopener" href="${yt('chair yoga for seniors')}">🧘 Chair yoga for seniors</a><a class="btn" target="_blank" rel="noopener" href="${yt('pranayama for beginners seniors')}">🌿 Easy pranayama</a></div>`)}</div></div>`;

}



function pageJournal() {

  const tab = ui.jtab || 'tasks', non = S.circle.filter(m => m.role !== 'elder'), T = todayISO();

  let body = '';

  if (tab === 'tasks') {

    const open = S.todos.filter(x => !x.done).sort((a, b) => a.due.localeCompare(b.due)), done = S.todos.filter(x => x.done);

    const item = x => { const a = S.circle.find(m => m.id === x.assignee); return `<label class="todo ${x.done ? 'dn' : ''}"><input type="checkbox" data-chg="todo" data-id="${x.id}" ${x.done ? 'checked' : ''}><span class="sp"><b>${esc(x.title)}</b><small class="muted">${a ? a.emoji + ' ' + esc(a.name.split(' ')[0]) : '👥 Anyone'} · due ${fmtDate(x.due)}</small></span>${!x.done && x.due < T ? '<span class="chip overdue">Overdue</span>' : ''}${x.done ? '<span class="chip done">Done</span>' : ''}</label>`; };

    body = `<div class="grid"><div class="c-5">${card('Assign a care task', `<form class="form" data-form="todo"><label>Task<input name="title" required placeholder="e.g. Pick up medicines"></label><div class="two"><label>Who<select name="assignee"><option value="">Anyone</option>${non.map(m => `<option value="${m.id}">${esc(m.name.split(' ')[0])}</option>`).join('')}</select></label><label>Due<input type="date" name="due" value="${T}" required></label></div><button class="btn primary" type="submit">＋ Add task</button></form>`)}</div><div class="c-7">${card('Open tasks', `<div class="stack">${open.map(item).join('') || '<p class="muted">All caught up ✨</p>'}</div>${done.length ? `<p class="small muted" style="margin:14px 0 6px"><b>Completed</b></p><div class="stack">${done.slice(0, 4).map(item).join('')}</div>` : ''}`)}</div></div>`;

  } else {

    body = `<div class="grid"><div class="c-5">${card('Add a journal note', `<form class="form" data-form="journal"><label>Category<select name="cat">${['General', 'Food', 'Mood', 'Doctor', 'Sleep', 'Fall / safety'].map(x => `<option>${x}</option>`).join('')}</select></label><label>Note<textarea name="text" required placeholder="What happened today?"></textarea></label><button class="btn primary" type="submit">Save note</button></form>`)}</div><div class="c-7">${card('Care journal', `<div class="stack">${S.journal.map(j => `<div class="hand"><div class="row"><span class="chip">${esc(j.cat)}</span><b>${esc(j.by)}</b><span class="muted small">· ${esc(j.when)}</span></div><p>${esc(j.text)}</p></div>`).join('')}</div>`)}</div></div>`;

  }

  return `<div class="tabs" role="tablist">${[['tasks', '✅ Care tasks'], ['journal', '📓 Care journal']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="jtab" data-k="${k}">${l}</button>`).join('')}</div>${body}`;

}



function pageMoney() {

  if (!me().perms.reports) return lockCard('expenses and reports');

  const D = new Date(), mo = todayISO().slice(0, 7), lm = iso(new Date(D.getFullYear(), D.getMonth() - 1, 1)).slice(0, 7);

  const sum = L => L.reduce((a, e) => a + e.amt, 0), cur = S.expenses.filter(e => e.date.startsWith(mo)), prev = S.expenses.filter(e => e.date.startsWith(lm));

  const by = {}; cur.forEach(e => by[e.cat] = (by[e.cat] || 0) + e.amt); const mx = Math.max(1, ...Object.values(by));

  const wk = S.shifts.filter(s => s.start > Date.now() - 7 * 864e5), hrs = wk.reduce((a, s) => a + ((s.end || Date.now()) - s.start) / 3600e3, 0), inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

  const list = [...S.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  return `<div class="grid"><div class="c-12 kpis"><div class="card kpi"><b>${inr(sum(cur))}</b><span>spent this month</span></div><div class="card kpi"><b>${inr(sum(prev))}</b><span>last month</span></div><div class="card kpi"><b>${hrs.toFixed(1)} h</b><span>caregiver hours, last 7 days</span></div></div>

  <div class="c-5 stack">${card('Where it goes', Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="slot" style="grid-template-columns:120px 1fr 70px"><span>${k}</span><div class="bar"><i style="width:${v / mx * 100}%"></i></div><b>${inr(v)}</b></div>`).join('') || '<p class="muted">Nothing this month.</p>')}

   ${card('Add an expense', `<form class="form" data-form="expense"><div class="two"><label>Category<select name="cat">${EXP_CATS.map(x => `<option>${x}</option>`).join('')}</select></label><label>Amount (₹)<input type="number" name="amt" min="1" required></label></div><label>Description<input name="desc" required></label><label>Date<input type="date" name="date" value="${todayISO()}" required></label><button class="btn primary" type="submit">Save expense</button></form>`)}</div>

  <div class="c-7 stack">${card('Recent expenses', `<div class="tscroll"><table><thead><tr><th>Date</th><th>What</th><th>Category</th><th>₹</th></tr></thead><tbody>${list.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${esc(e.desc)}</td><td>${esc(e.cat)}</td><td><b>${e.amt.toLocaleString('en-IN')}</b></td></tr>`).join('')}</tbody></table></div>`, '<button class="btn sm" data-act="expCsv">⬇ Export CSV</button>')}

   ${card('Caregiver shifts', `<ul class="feed">${[...S.shifts].sort((a, b) => b.start - a.start).slice(0, 5).map(s => { const p = S.circle.find(m => m.id === s.who); return `<li><span class="ic">${p ? p.emoji : '🧑'}</span><div><b>${esc(p ? p.name : 'Caregiver')}</b><small>${new Date(s.start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${clockOf(s.start)} – ${s.end ? clockOf(s.end) : 'on shift now'} · ${(((s.end || Date.now()) - s.start) / 3600e3).toFixed(1)} h</small></div></li>`; }).join('')}</ul>`)}</div></div>`;

}



function pageHelp() {

  const m = me(), carer = m.role !== 'elder', maps = q => `https://www.google.com/maps/search/${encodeURIComponent(q)}`, W = S.wellbeing[todayISO()];

  const nums = [['112', 'Emergency (police, fire, ambulance)', '🚨'], ['108', 'Ambulance', '🚑'], ['14567', 'Elderline — national senior citizens helpline (India)', '👴']];

  return `<div class="grid">

  <div class="c-6 stack">${card('📞 Emergency numbers', `<div class="stack">${nums.map(([n, l, ic]) => `<a class="btn xl" style="text-decoration:none;justify-content:flex-start" href="tel:${n}"><span aria-hidden="true">${ic}</span> <b>${n}</b> <small style="font-weight:400">${l}</small></a>`).join('')}</div>`)}

   ${card('📍 Find nearby', `<div class="stack"><a class="btn" target="_blank" rel="noopener" href="${maps('hospital near me')}">🏥 Hospitals near me</a><a class="btn" target="_blank" rel="noopener" href="${maps('pharmacy open now near me')}">💊 Pharmacies near me</a><a class="btn" target="_blank" rel="noopener" href="${maps('blood test lab near me')}">🧪 Diagnostic labs near me</a></div><p class="small muted" style="margin-top:8px">Opens Google Maps in a new tab.</p>`)}

   ${card('🧭 How to use CareVerse', `<ol class="obs"><li>The big card on <b>Home</b> shows what to do next. Tap the green button when it's done.</li><li>Tap <b>🎤 Talk to me</b> (or the ✨ button) and just ask a question.</li><li>Every day, press <b>How are you today?</b> so your family knows you're well.</li><li>In trouble? Press the red <b>I need help</b> button — your family is alerted at once.</li></ol>`)}</div>

  <div class="c-6 stack">${card('🏠 Home safety checklist (preventing falls)', `<div class="checks">${SAFETY.map((x, i) => `<label><input type="checkbox" data-chg="safety" data-i="${i}" ${S.safety[i] ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div><p class="small muted" style="margin-top:10px">${SAFETY.filter((_, i) => S.safety[i]).length} of ${SAFETY.length} done. Most falls at home can be prevented with small changes.</p>`)}

   ${carer ? card('🫶 Caregiver wellbeing', W ? `<div class="notice ok"><b>Thanks for checking in (${MOODS[W]}).</b> ${W <= 2 ? 'Looking after someone is hard work. Please ask the circle to share the load.' : 'Keep taking care of yourself too.'}</div>${W <= 2 ? '<button class="btn primary" data-act="respite">🙋 Ask the circle for a break</button>' : ''}` : `<p class="muted">Looking after others starts with looking after yourself. How are you holding up today?</p><div class="row">${[1, 2, 3, 4, 5].map(i => `<button class="btn" data-act="wellbeing" data-n="${i}" aria-label="${MOODN[i]}" style="font-size:1.6rem">${MOODS[i]}</button>`).join('')}</div>`) : ''}

   ${card('💾 Your data', `<p class="small muted">Everything is stored in this browser. Make a backup before switching devices.</p><div class="row"><button class="btn" data-act="export">⬇ Export backup</button><label class="btn" style="cursor:pointer">⬆ Import backup<input type="file" accept="application/json" data-chg="import" hidden></label>${window.__inst ? '<button class="btn primary" data-act="install">📲 Install as app</button>' : ''}</div><p class="small muted" style="margin-top:8px">Tip: in Chrome, use ⋮ → "Install CareVerse" to add it to your home screen or desktop.</p>`)}</div></div>`;

}



/* ---------- report + insights extras ---------- */

function reportExtra() {

  const L = [], T = todayISO();

  Object.keys(VT).forEach(k => { const r = vLast(k); if (r) { const f = vFlag(r); L.push(`${VT[k].n}: ${vFmt(r)} ${VT[k].u} on ${fmtDate(r.date)}${f ? ' (' + FLAGTXT[f] + ')' : ''}`); } });

  const ck = Object.entries(S.checkins).sort().slice(-7);

  return [{ h: 'Latest health readings', lines: L.length ? L : ['None recorded'] }, { h: 'Daily check-ins (last 7 days)', lines: ck.map(([d, c]) => `${fmtDate(d)}: mood ${MOODN[c.mood]}, sleep ${c.sleep}, pain ${PAIN[c.pain]}${c.note ? ' — ' + c.note : ''}`) }, { h: 'Hydration today', lines: [`${S.water[T] || 0} of 8 glasses`] }];

}

function moodWeekCard() {

  const wk = [...Array(7)].map((_, i) => { const d = iso(addDays(new Date(), i - 6)); return { d, c: S.checkins[d] }; });

  return card('Mood & sleep, 7 days', `<div class="mweek">${wk.map(x => `<div class="mcol"><span class="mb"><i style="height:${x.c ? x.c.mood * 20 : 4}%"></i></span><span class="me">${x.c ? MOODS[x.c.mood] : '·'}</span><small>${dateOf(x.d).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)}</small></div>`).join('')}</div>`);

}



/* ---------- assistant extras ---------- */

function extraAnswer(s) {

  const T = todayISO();

  if (/\bbp\b|blood pressure|sugar|glucose|weight|oxygen|pulse|vital|reading/.test(s)) {

    const ks = Object.keys(VT).filter(k => vLast(k) && (/vital|reading/.test(s) || s.includes(k) || (k === 'bp' && /blood pressure/.test(s)) || (k === 'sugar' && /glucose/.test(s)) || (k === 'spo2' && /oxygen/.test(s))));

    const L = (ks.length ? ks : ['bp', 'sugar', 'weight']).filter(k => vLast(k)).map(k => { const r = vLast(k), f = vFlag(r); return `• ${VT[k].n}: ${vFmt(r)} ${VT[k].u} (${fmtDate(r.date)} ${r.time})${f ? ' — ' + FLAGTXT[f] : ''}`; });

    return (L.join('\n') || 'No readings recorded yet.') + '\n\nGeneral ranges only — please ask the doctor what is right for you.';

  }

  if (/water|hydrat|glass|drink/.test(s)) {

    if (/add|log|drank|had|another/.test(s) && canAct()) { S.water[T] = Math.min(8, (S.water[T] || 0) + 1); save(); render(); return `Logged! That's ${S.water[T]} of 8 glasses today 💧`; }

    return `${S.water[T] || 0} of 8 glasses of water so far today. Say "log a glass of water" to add one.`;

  }

  if (/check-?in|mood|feeling|slept|sleep/.test(s)) { const c = S.checkins[T]; return c ? `Today's check-in at ${fmt(c.t)}: mood ${MOODN[c.mood].toLowerCase()}, sleep ${c.sleep.toLowerCase()}, pain ${PAIN[c.pain].toLowerCase()}.` : 'No check-in has been recorded yet today.'; }

  if (/\btask|to-?do|chore/.test(s)) { const L = S.todos.filter(x => !x.done); return L.length ? 'Open care tasks:\n' + L.map(x => `• ${x.title} — ${(S.circle.find(m => m.id === x.assignee) || { name: 'Anyone' }).name.split(' ')[0]}, due ${fmtDate(x.due)}`).join('\n') : 'No open care tasks 🎉'; }

  if (/spent|expense|cost|money|bill/.test(s)) { if (!me().perms.reports) return 'You do not have access to expenses.'; const mo = T.slice(0, 7), n = S.expenses.filter(e => e.date.startsWith(mo)).reduce((a, e) => a + e.amt, 0); return `Care spending this month: ₹${n.toLocaleString('en-IN')}.`; }

  if (/message|wall|from (my )?(family|priya|ravi)/.test(s)) { const p = S.wall[0]; return p ? `Latest family message (${(S.circle.find(m => m.id === p.from) || { name: 'Family' }).name.split(' ')[0]}, ${p.when}):\n“${p.text}”` : 'No messages yet.'; }

  return '';

}



/* ---------- actions / forms / changes (merged by app.js) ---------- */

const readImage = (file, max = 640) => new Promise(res => {

  const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); }; im.onerror = () => res(''); im.src = fr.result; }; fr.onerror = () => res(''); fr.readAsDataURL(file);

});

const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__inst = e; });



const featActions = {

  more() { const L = navFor().filter(n => !n[7]); openModal(`<h2>${t('More')}</h2><div class="more-grid">${L.map(n => `<button data-act="nav" data-p="${n[0]}">${ico(n[1], 24)}<span>${t(n[2])}</span></button>`).join('')}<button data-act="settings">${ico('gear', 24)}<span>${t('Settings')}</span></button><button data-act="logout">${ico('logout', 24)}<span>Switch person</span></button></div>`); },

  checkinForm() { checkinModal(); },

  water(d) { const T = todayISO(), n = +d.n, cur = S.water[T] || 0; S.water[T] = cur === n ? n - 1 : n; if (S.water[T] >= 8) toast('💧 Hydration goal reached!', 'ok'); feed(`Water: ${S.water[T]} of 8 glasses`, '💧'); save(); render(); },

  walk(d) { const T = todayISO(); S.walk[T] = Math.max(0, (S.walk[T] || 0) + (+d.m)); if (+d.m > 0) feed(`Walked ${d.m} more minutes (${S.walk[T]} today)`, '🚶'); save(); render(); },

  vtype(d) { ui.vt = d.k; render(); },

  quickMsg(d) {
    const text = String(d.msg || '').trim();
    if (!text) return;
    S.wall.unshift({ id: uid(), from: S.meId, text, when: 'Today ' + fmt(now()), loved: false, photo: '' });
    feed('Sent a quick family chat message', '💬');
    save(); render(); toast('Message added to the family chat', 'ok');
  },

  love(d) { const p = S.wall.find(x => x.id === d.id); p.loved = !p.loved; if (p.loved) { feed(`${me().name.split(' ')[0]} sent love ❤️ to ${(S.circle.find(m => m.id === p.from) || { name: 'family' }).name.split(' ')[0]}'s message`, '❤️'); toast('❤️ Love sent!', 'ok'); } save(); render(); },

  readMsg(d) { const p = S.wall.find(x => x.id === d.id), m = S.circle.find(x => x.id === p.from); say(`Message from ${m ? m.name.split(' ')[0] : 'family'}. ${p.text.replace(/[^\p{L}\p{N}\s.,!?']/gu, '')}`); },

  delPost(d) { S.wall = S.wall.filter(x => x.id !== d.id); save(); render(); },

  breath() { ui.breath = !ui.breath; render(); },

  memNew() { ui.mem = newMem(); render(); },

  memFlip(d) {

    const m = ui.mem, i = +d.i, c = m.cards[i]; if (m.lock || c.f || c.m) return; c.f = 1;

    if (m.first === null) m.first = i;

    else { m.moves++; const a = m.cards[m.first]; if (a.e === c.e) { a.m = c.m = 1; a.f = c.f = 0; m.first = null; if (m.cards.every(x => x.m)) { if (!S.memBest || m.moves < S.memBest) S.memBest = m.moves; save(); toast('🎉 Well done!', 'ok'); } } else { m.lock = true; setTimeout(() => { a.f = c.f = 0; m.first = null; m.lock = false; if (ui.page === 'relax') render(); }, 800); } }

    render();

  },

  jtab(d) { ui.jtab = d.k; render(); },

  clockIn() { S.shifts.unshift({ id: uid(), who: S.meId, start: Date.now(), end: null }); feed(`${me().name.split(' ')[0]} started a shift`, '⏱'); toast('⏱ Clocked in', 'ok'); save(); render(); },

  clockOut() { const o = openShift(S.meId); if (o) { o.end = Date.now(); feed(`${me().name.split(' ')[0]} finished a shift (${((o.end - o.start) / 3600e3).toFixed(1)} h)`, '⏱'); toast('Clocked out — remember to leave a handover 🤝', 'ok'); save(); render(); } },

  expCsv() { const rows = [['Date', 'Category', 'Description', 'Amount INR', 'By'], ...S.expenses.map(e => [e.date, e.cat, e.desc, e.amt, e.by])]; download('careverse-expenses.csv', rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv'); },

  wellbeing(d) { S.wellbeing[todayISO()] = +d.n; save(); render(); },

  respite() { S.todos.unshift({ id: uid(), title: `Cover a short break for ${me().name.split(' ')[0]}`, assignee: '', due: todayISO(), done: false }); feed(`${me().name.split(' ')[0]} asked the circle for a break`, '🙋'); toast('Request sent to the Care Circle', 'ok'); save(); render(); },

  export() { download('careverse-backup.json', JSON.stringify(S), 'application/json'); toast('Backup downloaded', 'ok'); },

  install() { if (window.__inst) { window.__inst.prompt(); window.__inst = null; } }

};

const featForms = {

  checkin(v) {

    const T = todayISO(), c = { mood: +v.mood, sleep: v.sleep, pain: +v.pain, note: (v.note || '').trim(), t: now(), by: me().name };

    S.checkins[T] = c; S.done['checkin\@day'] = { at: now(), by: me().name };

    feed(`${elderFirst()} checked in — mood ${MOODS[c.mood]}, sleep ${c.sleep.toLowerCase()}, pain ${PAIN[c.pain].toLowerCase()}`, '💛', me().name, (c.pain >= 3 || c.mood <= 2) ? 'bad' : '');

    closeModal(); toast(c.mood >= 3 && c.pain < 3 ? '💛 Thank you! Your family knows you are well.' : '💛 Thank you. Your family has been told how you feel.', 'ok');

    if (c.mood >= 3) speak('Thank you. Your family knows you are well.'); save(); render();

  },

  vital(v) {

    const r = { id: uid(), date: todayISO(), time: v.time || hhmm(now() % 1440), type: v.type, v1: +v.v1, v2: v.v2 ? +v.v2 : undefined, by: me().name };

    if (isNaN(r.v1) || (r.type === 'bp' && isNaN(r.v2))) return toast('Please enter valid numbers', 'bad');

    S.vitals.push(r); const f = vFlag(r);

    feed(`${VT[r.type].n} recorded: ${vFmt(r)} ${VT[r.type].u}${f ? ' — ' + FLAGTXT[f] : ''}`, VT[r.type].ic, me().name, f ? 'bad' : '');

    toast(f ? `⚠️ ${vFmt(r)} is ${FLAGTXT[f]}. Tell the doctor.` : '✅ Reading saved', f ? 'warn' : 'ok'); save(); render();

  },

  async wall(v) {

    const f = $('#wall-photo')?.files[0], photo = f ? await readImage(f) : '';

    S.wall.unshift({ id: uid(), from: S.meId, text: v.text.trim(), photo, when: 'Today ' + fmt(now()), loved: false });

    feed('Posted on the family wall', '💌'); toast('💌 Posted!', 'ok'); save(); render();

  },

  brain(v) {

    const d = new Date(), days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const s = (v.day === days[d.getDay()]) + (v.month === months[d.getMonth()]) + (+v.year === d.getFullYear()); S.brain[todayISO()] = s;

    toast(s === 3 ? '⭐ All correct — wonderful!' : `Good try! Today is ${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}.`, s === 3 ? 'ok' : ''); save(); render();

  },

  todo(v) { S.todos.push({ id: uid(), title: v.title.trim(), assignee: v.assignee, due: v.due, done: false }); const a = S.circle.find(m => m.id === v.assignee); feed(`Task assigned to ${a ? a.name.split(' ')[0] : 'anyone'}: ${v.title}`, '📌'); toast('Task added', 'ok'); save(); render(); },

  journal(v) { S.journal.unshift({ id: uid(), by: me().name, cat: v.cat, text: v.text.trim(), when: 'Today ' + fmt(now()) }); feed(`Journal note (${v.cat})`, '📓'); toast('Note saved', 'ok'); save(); render(); },

  expense(v) { S.expenses.push({ id: uid(), date: v.date, cat: v.cat, desc: v.desc.trim(), amt: +v.amt, by: me().name }); feed(`Expense added: ${v.desc} (₹${v.amt})`, '🧾'); toast('Expense saved', 'ok'); save(); render(); }

};

const featChanges = {

  todo(el) { const x = S.todos.find(k => k.id === el.dataset.id); x.done = el.checked; if (x.done) feed(`Task done: ${x.title}`, '✅'); save(); render(); },

  safety(el) { S.safety[+el.dataset.i] = el.checked; save(); render(); },

  import(el) {

    const f = el.files[0]; if (!f) return; const r = new FileReader();

    r.onload = () => { try { const o = JSON.parse(r.result); if (o.v !== 1 || !o.circle) throw 0; S = o; migrate(); save(); render(); toast('Backup restored ✅', 'ok'); } catch (e) { toast('That file is not a CareVerse backup', 'bad'); } };

    r.readAsText(f);

  }

};