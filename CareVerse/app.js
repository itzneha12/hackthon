'use strict';
/* =====================================================================
   CareVerse — SilverGuard AI  ·  elderly-care coordination platform
   Single-page app, no build step. Data lives in localStorage (demo mode).
   In production: swap save()/load() for Supabase tables + realtime.
   ===================================================================== */

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60); return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = s => new Date(s + 'T00:00:00');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayISO = () => iso(new Date());
const fmtDate = d => (typeof d === 'string' ? dateOf(d) : d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const uid = () => Math.random().toString(36).slice(2, 9);
const slotOf = m => m < 720 ? 'Morning' : m < 1020 ? 'Afternoon' : m < 1260 ? 'Evening' : 'Night';
const nl2br = s => esc(s).replace(/\n/g, '<br>');

/* ---------- i18n (English + Telugu for key UI) ---------- */
const TE = {
  'Home': 'హోమ్', 'My Day': 'నా రోజు', 'Medicines': 'మందులు', 'Appointments': 'అపాయింట్‌మెంట్లు', 'Care Circle': 'కేర్ సర్కిల్',
  'Health Passport': 'ఆరోగ్య పాస్‌పోర్ట్', 'Insights': 'విశ్లేషణ', 'Good morning': 'శుభోదయం', 'Good afternoon': 'శుభ మధ్యాహ్నం',
  'Good evening': 'శుభ సాయంత్రం', 'Next up': 'తదుపరి', 'I took it': 'నేను వేసుకున్నాను', 'Done': 'పూర్తైంది',
  'I need help': 'నాకు సహాయం కావాలి', 'Talk to me': 'నాతో మాట్లాడండి', 'Call family': 'కుటుంబానికి కాల్',
  'Needs attention': 'శ్రద్ధ అవసరం', 'tasks completed': 'పనులు పూర్తయ్యాయి', "Today's activity": 'నేటి కార్యకలాపాలు',
  'Completed': 'పూర్తైంది', 'Upcoming': 'రాబోయేది', 'Reminder': 'రిమైండర్', 'Pending': 'పెండింగ్', 'Overdue': 'ఆలస్యం',
  'Caregiver notified': 'సంరక్షకుడికి తెలియజేశాము', 'Emergency card': 'అత్యవసర కార్డు',
  'All done for today': 'ఈ రోజుకు అన్నీ పూర్తయ్యాయి', 'Settings': 'సెట్టింగ్‌లు', 'Now': 'ఇప్పుడు'
};
Object.assign(TE, TE_EXTRA);
const t = k => (S && S.lang !== 'en' && uiText(S.lang, k)) || k;

/* ---------- state ---------- */
const KEY = 'careverse.v1';
let S;
const ui = { page: 'home', circleTab: 'members', chat: [], listening: false, rec: null };

function seed() {
  const T = new Date();
  const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; })(2026);
  const P = { Morning: .94, Afternoon: .84, Evening: .62 };
  const hist = [];
  for (let i = 29; i >= 1; i--) {
    const d = iso(addDays(T, -i));
    if (i >= 27) { hist.push({ date: d, s: null }); continue; }
    const s = {}; for (const k in P) s[k] = rng() < P[k] ? 1 : 0;
    hist.push({ date: d, s });
  }
  const duties = {};
  const D = ['Morning medicines', 'Evening medicines', 'Doctor visits & transport', 'Groceries & refills', 'Evening check-in call'];
  const plan = [
    ['sunita', 'sunita', 'sunita', 'sunita', 'sunita', 'sunita', 'ravi'],
    ['sunita', 'sunita', 'sunita', 'sunita', 'sunita', 'sunita', 'ravi'],
    ['ravi', 'ravi', 'ravi', 'ravi', 'ravi', 'ravi', 'ravi'],
    ['sunita', 'sunita', 'priya', 'sunita', 'sunita', 'ravi', 'ravi'],
    ['priya', 'ravi', 'priya', 'ravi', 'priya', 'ravi', 'ravi']];
  D.forEach((d, i) => duties[d] = plan[i]);
  return {
    v: 1, meId: null, lang: 'en', theme: 'light', size: 'md', voice: false, motion: true, live: false, clock: 14 * 60 + 10, gkey: '',
    policy: { overdue: 30, notify: 60 },
    circle: [
      { id: 'lak', name: 'Lakshmi Devi', rel: 'Elder · age 78', role: 'elder', emoji: '👵', perms: { edit: false, locker: true, reports: true }, phone: '+91 90000 00001' },
      { id: 'ravi', name: 'Ravi Kumar', rel: 'Son · Circle admin', role: 'family', emoji: '👨', admin: true, perms: { edit: true, locker: true, reports: true }, phone: '+91 90000 00002' },
      { id: 'priya', name: 'Priya Sharma', rel: 'Daughter · lives abroad', role: 'family', emoji: '👩', perms: { edit: false, locker: false, reports: true }, phone: '+91 90000 00003' },
      { id: 'sunita', name: 'Sunita Rao', rel: 'Home nurse · day shift', role: 'caregiver', emoji: '🧑‍⚕️', perms: { edit: true, locker: true, reports: false }, phone: '+91 90000 00004' }],
    meds: [
      { id: 'm1', name: 'Metformin', dose: '500 mg', times: ['08:00', '20:00'], stock: 24, note: 'Take with food' },
      { id: 'm2', name: 'Amlodipine', dose: '5 mg', times: ['08:00'], stock: 9, note: '' },
      { id: 'm3', name: 'Calcium + D3', dose: '1 tablet', times: ['14:00'], stock: 40, note: 'After lunch' }],
    appts: [
      { id: 'a1', title: 'Diabetes follow-up', doctor: 'Dr. Meera Reddy', place: 'Apollo Clinic', date: iso(T), time: '10:00', questions: ['Is my morning sugar trend improving?', 'Can we review when I take my medicines?'], docs: ['Latest blood test report'], checks: {} },
      { id: 'a2', title: 'Eye check-up', doctor: 'Dr. Anand Rao', place: 'Sankara Eye Centre', date: iso(addDays(T, 2)), time: '14:30', questions: ['Has my vision changed since last year?'], docs: ['Previous eye prescription', 'Insurance card'], checks: {} },
      { id: 'a3', title: 'Cardiology review', doctor: 'Dr. S. Prasad', place: 'City Heart Hospital', date: iso(addDays(T, 9)), time: '11:00', questions: ['Is my blood pressure diary useful to you?'], docs: ['ECG report', 'BP diary'], checks: {} }],
    tasks: [
      { id: 't1', title: 'Check blood pressure', time: '07:30', icon: '🩺', detail: 'Write it in the BP diary' },
      { id: 't2', title: 'Family video check-in', time: '17:00', icon: '📞', detail: 'Priya calls from abroad' }],
    done: { 'task@t1': { at: 455, by: 'Sunita Rao' }, 'med@08:00': { at: 488, by: 'Lakshmi Devi' }, 'appt@a1': { at: 640, by: 'Ravi Kumar' }, 'checkin@day': { at: 545, by: 'Lakshmi Devi' } },
    ...extras(T),
    alerts: {}, sos: null,
    feed: [
      { id: 'f1', t: 640, who: 'Ravi Kumar', icon: '🩺', text: 'Diabetes follow-up attended' },
      { id: 'f2', t: 488, who: 'Lakshmi Devi', icon: '✅', text: 'Morning medication marked done' },
      { id: 'f3', t: 455, who: 'Sunita Rao', icon: '✅', text: 'Check blood pressure marked done' },
      { id: 'f4', t: 420, who: 'Sunita Rao', icon: '🤝', text: 'Started morning shift' }],
    duties, DUTIES: D,
    handovers: [{ id: 'h1', by: 'Sunita Rao', when: 'Yesterday 8:00 PM', text: 'Evening medication given. Slept well. Doctor visit today at 10 AM — please carry the blood test report.' }],
    docs: [
      { id: 'd1', name: 'Blood test report', type: 'Report', date: iso(addDays(T, -18)) },
      { id: 'd2', name: 'Prescription — Dr. Meera Reddy', type: 'Prescription', date: iso(addDays(T, -18)) },
      { id: 'd3', name: 'Health insurance policy', type: 'Insurance', date: iso(addDays(T, -200)) },
      { id: 'd4', name: 'ECG report', type: 'Report', date: iso(addDays(T, -60)) }],
    emergency: {
      name: 'Lakshmi Devi', age: '78', blood: 'B+', allergies: 'Penicillin', conditions: 'Type 2 diabetes, high blood pressure',
      doctor: 'Dr. Meera Reddy — Apollo Clinic', c1: 'Ravi Kumar (son) · +91 90000 00002', c2: 'Sunita Rao (nurse) · +91 90000 00004',
      notes: 'Hard of hearing in left ear. Prefers Telugu.'
    },
    shares: [], hist, doneDate: todayISO()
  };
}
function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return j; } catch (e) { } return null; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

const now = () => { if (S.live) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); } return S.clock; };
const me = () => S.circle.find(m => m.id === S.meId);
const elder = () => S.circle.find(m => m.role === 'elder');
const elderFirst = () => elder().name.split(' ')[0];
const canAct = () => { const m = me(); return !!m && (m.role === 'elder' || m.perms.edit); };

/* ---------- derived data ---------- */
const STAGE_ORDER = ['upcoming', 'soon', 'pending', 'overdue', 'escalated'];
const LABEL = { done: 'Completed', upcoming: 'Upcoming', soon: 'Reminder', pending: 'Pending', overdue: 'Overdue', escalated: 'Caregiver notified' };
const SICON = { done: '✓', upcoming: '○', soon: '🔔', pending: '⏳', overdue: '⚠', escalated: '📣' };
function stage(x, n) {
  if (S.done[x.id]) return 'done';
  const d = n - x.time;
  if (d < -15) return 'upcoming'; if (d < 0) return 'soon';
  if (d < S.policy.overdue) return 'pending'; if (d < S.policy.notify) return 'overdue'; return 'escalated';
}
function tasks() {
  const out = [], T = todayISO(), by = {};
  S.meds.forEach(m => m.times.forEach(tm => (by[tm] = by[tm] || []).push(m)));
  Object.entries(by).forEach(([tm, ms]) => out.push({ id: 'med@' + tm, type: 'med', time: toMin(tm), title: slotOf(toMin(tm)) + ' medication', detail: ms.map(m => `${m.name} ${m.dose}`).join(' · '), meds: ms, icon: '💊' }));
  S.appts.filter(a => a.date === T).forEach(a => out.push({ id: 'appt@' + a.id, type: 'appt', time: toMin(a.time), title: a.title, detail: `${a.doctor} · ${a.place}`, icon: '🩺' }));
  S.tasks.forEach(k => out.push({ id: 'task@' + k.id, type: 'task', time: toMin(k.time), title: k.title, detail: k.detail || '', icon: k.icon || '✅' }));
  out.push({ id: 'checkin@day', type: 'checkin', time: toMin(S.checkinTime || '09:00'), title: 'Daily "I\'m OK" check-in', detail: 'Tell the family how you are today', icon: '💛' });
  out.sort((a, b) => a.time - b.time);
  const n = now(); out.forEach(x => x.st = stage(x, n));
  return out;
}
const stats = () => { const ts = tasks(); return { ts, done: ts.filter(x => x.st === 'done').length, total: ts.length }; };
const perDay = m => m.times.length || 1;
const daysLeft = m => Math.floor(m.stock / perDay(m));
const lowStock = m => daysLeft(m) <= 10;
function attention() {
  const out = [], ts = tasks();
  if (S.sos && !S.sos.ack) out.push({ sev: 'bad', text: `SOS — ${elderFirst()} pressed "I need help" at ${fmt(S.sos.t)}`, kind: 'sos' });
  ts.filter(x => x.st === 'overdue' || x.st === 'escalated').forEach(x => out.push({ sev: 'bad', text: `${x.title} overdue since ${fmt(x.time)}`, kind: 'task', id: x.id }));
  ts.filter(x => x.st === 'pending').forEach(x => out.push({ sev: 'warn', text: `${x.title} is pending (due ${fmt(x.time)})`, kind: 'task', id: x.id }));
  S.meds.filter(lowStock).forEach(m => out.push({ sev: 'warn', text: `${m.name} supply: about ${daysLeft(m)} days left`, kind: 'stock', id: m.id }));
  out.push(...extraAttention());
  return out.sort((a, b) => (a.sev === 'bad' ? 0 : 1) - (b.sev === 'bad' ? 0 : 1));
}
function dayStatus(h) {
  if (!h.s) return 'none'; const v = Object.values(h.s);
  return v.every(Boolean) ? 'ok' : v.some(Boolean) ? 'part' : 'miss';
}
function todayStatus() {
  const m = tasks().filter(x => x.type === 'med'); if (!m.length) return 'none';
  if (m.some(x => x.st === 'overdue' || x.st === 'escalated')) return 'miss';
  return m.every(x => x.st === 'done') ? 'ok' : 'part';
}
function adherence() {
  const slots = { Morning: [0, 0], Afternoon: [0, 0], Evening: [0, 0] }; let sched = 0, ok = 0;
  S.hist.forEach(h => { if (!h.s) return; for (const k in h.s) { slots[k][0]++; sched++; if (h.s[k]) { slots[k][1]++; ok++; } } });
  tasks().filter(x => x.type === 'med').forEach(x => {
    const k = slotOf(x.time); slots[k] = slots[k] || [0, 0];
    if (x.st === 'done') { slots[k][0]++; slots[k][1]++; sched++; ok++; }
    else if (x.st === 'overdue' || x.st === 'escalated') { slots[k][0]++; sched++; }
  });
  return { sched, ok, pct: sched ? Math.round(ok / sched * 100) : 0, slots };
}
function streak() {
  let n = 0; if (todayStatus() === 'ok') n++;
  for (let i = S.hist.length - 1; i >= 0; i--) { const s = dayStatus(S.hist[i]); if (s === 'ok') n++; else break; }
  return n;
}
function observations() {
  const a = adherence(), out = [];
  const rates = Object.entries(a.slots).filter(([, v]) => v[0]).map(([k, v]) => [k, v[1] / v[0], v[0] - v[1], v[0]]);
  if (rates.length) {
    const worst = [...rates].sort((x, y) => x[1] - y[1])[0], best = [...rates].sort((x, y) => y[1] - x[1])[0];
    out.push(`${worst[0]} reminders were missed most often — ${worst[2]} of ${worst[3]} recorded doses (${Math.round(worst[1] * 100)}% completed).`);
    out.push(`${best[0]} routines are the most consistent at ${Math.round(best[1] * 100)}% completed.`);
  }
  let wk = [0, 0], we = [0, 0];
  S.hist.forEach(h => { if (!h.s) return; const g = dateOf(h.date).getDay(), w = (g === 0 || g === 6) ? we : wk; for (const k in h.s) { w[0]++; w[1] += h.s[k]; } });
  if (wk[0] && we[0]) { const d = Math.round((wk[1] / wk[0] - we[1] / we[0]) * 100); if (Math.abs(d) >= 8) out.push(`Weekends show ${Math.abs(d)} points ${d > 0 ? 'lower' : 'higher'} completion than weekdays.`); }
  out.push(`Current streak: ${streak()} day${streak() === 1 ? '' : 's'} with every scheduled dose recorded.`);
  out.push('These are observations from recorded entries only — not medical predictions or advice.');
  return out;
}
function daySummary() {
  const { ts, done, total } = stats(), L = [];
  L.push(`${done} of ${total} care activities are complete as of ${fmt(now())}.`);
  const d = ts.filter(x => x.st === 'done'); if (d.length) L.push('Completed: ' + d.map(x => `${x.title} (${fmt(S.done[x.id].at)})`).join(', ') + '.');
  const p = ts.filter(x => ['pending', 'overdue', 'escalated'].includes(x.st)); if (p.length) L.push('Needs attention: ' + p.map(x => `${x.title} (due ${fmt(x.time)}, ${LABEL[x.st].toLowerCase()})`).join(', ') + '.');
  const u = ts.filter(x => ['upcoming', 'soon'].includes(x.st)); if (u.length) L.push('Coming up: ' + u.map(x => `${x.title} at ${fmt(x.time)}`).join(', ') + '.');
  const ls = S.meds.filter(lowStock); if (ls.length) L.push('Supply: ' + ls.map(m => `${m.name} ~${daysLeft(m)} days left`).join(', ') + '.');
  const na = nextAppts()[0]; if (na) L.push(`Next appointment: ${na.title} with ${na.doctor}, ${fmtDate(na.date)} at ${fmt(toMin(na.time))}.`);
  return L.join('\n');
}
const nextAppts = () => S.appts.filter(a => a.date >= todayISO() && !(a.date === todayISO() && S.done['appt@' + a.id])).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

/* ---------- side effects: feed, toasts, speech, escalation ---------- */
function feed(text, icon = '📝', who, kind) { S.feed.unshift({ id: uid(), t: now(), who: who || me()?.name || 'System', icon, text, kind }); S.feed = S.feed.slice(0, 60); }
function toast(msg, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 5500); }
function speak(text) { if (S.voice) say(text); }
function sysNotify(title, body) { try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }); } catch (e) { } }
function checkEscalation() {
  tasks().forEach(x => {
    if (x.st === 'done') return;
    const i = STAGE_ORDER.indexOf(x.st);
    for (let k = 1; k <= i; k++) {
      const key = x.id + ':' + STAGE_ORDER[k]; if (S.alerts[key]) continue; S.alerts[key] = 1;
      if (k < i) continue; // jumped over a stage — only act on the current one
      if (x.st === 'soon') toast(`🔔 Reminder: ${x.title} at ${fmt(x.time)}`, 'warn');
      if (x.st === 'pending') { toast(`⏳ ${x.title} is due now`, 'warn'); speak(`It is time for your ${x.title}.`); }
      if (x.st === 'overdue') { feed(`${x.title} is overdue — reminder repeated`, '⚠️', 'Reminder policy', 'bad'); toast(`⚠️ ${x.title} is overdue`, 'bad'); }
      if (x.st === 'escalated') { feed(`${x.title} still not done — caregiver & family notified`, '📣', 'Reminder policy', 'bad'); toast(`📣 Caregiver & family notified: ${x.title}`, 'bad'); sysNotify('CareVerse — attention needed', `${x.title} is still pending`); }
    }
  });
  save();
}
function complete(id) {
  const x = tasks().find(k => k.id === id); if (!x || S.done[id]) return;
  if (x.type === 'checkin') { checkinModal(); return; }
  S.done[id] = { at: now(), by: me().name };
  if (x.type === 'med') x.meds.forEach(m => m.stock = Math.max(0, m.stock - 1));
  feed(`${x.title} marked done`, '✅'); toast(`✅ ${x.title} — done. Thank you!`, 'ok'); speak('Well done. Recorded.');
  if (stats().done === stats().total) toast('🎉 Every activity for today is complete!', 'ok');
  save(); render();
}
function triggerSos() {
  S.sos = { t: now(), ack: false };
  feed('SOS — "I need help" pressed', '🆘', elderFirst(), 'bad'); toast('🆘 Your Care Circle has been alerted', 'bad');
  speak('Help is on the way. Your family has been alerted.'); sysNotify('CareVerse SOS', `${elderFirst()} needs help`); save(); render();
}

/* ---------- pdf ---------- */
function makePdf(title, blocks, file) {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) { toast('PDF library needs internet on first load. Opening print view instead.', 'warn'); window.print(); return; }
  const d = new J(); let y = 18;
  d.setFontSize(18); d.text(title, 14, y); y += 7; d.setFontSize(9.5); d.setTextColor(110);
  d.text('Generated by CareVerse on ' + new Date().toLocaleString(), 14, y); y += 9; d.setTextColor(0);
  blocks.forEach(b => {
    if (y > 262) { d.addPage(); y = 18; }
    d.setFontSize(12.5); d.setFont(undefined, 'bold'); d.text(b.h, 14, y); y += 6; d.setFont(undefined, 'normal'); d.setFontSize(10.5);
    b.lines.forEach(l => d.splitTextToSize('- ' + l, 178).forEach(w => { if (y > 280) { d.addPage(); y = 18; } d.text(w, 16, y); y += 5.2; }));
    y += 4;
  });
  d.setFontSize(8.5); d.setTextColor(120);
  d.text('CareVerse records and reminds. It does not provide medical advice. Please discuss with your healthcare professional.', 14, 291);
  d.save(file);
}
function reportBlocks() {
  const a = adherence(), e = S.emergency;
  return [
    { h: 'Person', lines: [`${e.name}, age ${e.age}`, `Allergies: ${e.allergies}`, `Recorded conditions: ${e.conditions}`] },
    { h: 'Medication adherence (last 30 days)', lines: [`Overall: ${a.pct}% of ${a.sched} recorded doses completed`, ...Object.entries(a.slots).map(([k, v]) => `${k}: ${v[0] ? Math.round(v[1] / v[0] * 100) : 0}% (${v[1]}/${v[0]})`)] },
    { h: 'Observations (from recorded entries)', lines: observations() },
    { h: 'Current medicines & supply', lines: S.meds.map(m => `${m.name} ${m.dose} at ${m.times.map(x => fmt(toMin(x))).join(', ')} — about ${daysLeft(m)} days of supply${m.note ? ' · ' + m.note : ''}`) },
    { h: 'Appointments', lines: S.appts.map(x => `${fmtDate(x.date)} ${fmt(toMin(x.time))} — ${x.title}, ${x.doctor}, ${x.place}`) },
    { h: 'Latest caregiver handovers', lines: S.handovers.slice(0, 3).map(h => `${h.when} (${h.by}): ${h.text}`) },
    ...reportExtra(),
    { h: 'Recent care activity', lines: S.feed.slice(0, 10).map(f => `${fmt(f.t)} — ${f.who}: ${f.text}`) }
  ];
}

/* ---------- icons (stroke icons, consistent 24px grid) ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5"/>',
  checklist: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.7 1.7-2.5 3-2.5s2.5.8 3 2.5M14 10h4M14 14h3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  alert: '<path d="M12 4l9.5 16h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  check: '<path d="M5 12l5 5 9-10"/>'
};
Object.assign(ICONS, ICONS_EXTRA);
const ico = (k, s = 20) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
const LOGO = (s = 36) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0d7c74"/><path d="M32 49S17 40 17 28.5a8.5 8.5 0 0 1 15-5.4 8.5 8.5 0 0 1 15 5.4C47 40 32 49 32 49z" fill="#fff"/><path d="M15 33h11l3-6 5 11 3-5h12" fill="none" stroke="#0d7c74" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const EMO_LEAD = /^(?:[\p{Extended_Pictographic}️‍]+\s*)+/u;
function tidy(root) {   // calm UI for family/caregiver: drop decorative leading emoji from headings, buttons, tabs
  root.querySelectorAll('.btn:not(.xl):not(.mic),.tabs button,.card-h h2,.chips button,.notice b,h2,h3').forEach(el => {
    if (el.closest('.glass,.mc,.mood,.icon-btn,.more-grid,.big3,.glasses,.wall-t')) return;
    const n = el.firstChild; if (!n || n.nodeType !== 3) return;
    const v = n.nodeValue.replace(EMO_LEAD, ''); if (v !== n.nodeValue && v.trim()) n.nodeValue = v;
  });
}

/* ---------- small components ---------- */
const chip = st => `<span class="chip st ${st}">${t(LABEL[st])}</span>`;
const TONES = ['teal', 'green', 'blue', 'sand', 'lilac', 'rose'];
function card(title, body, extra = '', cls = '') {
  title = (S.meId && me() && me().role !== 'elder') ? String(title).replace(EMO_LEAD, '') : title;
  let h = 0; for (const ch of String(title).replace(/<[^>]*>/g, '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return panel(title, body, extra, TONES[h % TONES.length], cls);
}
function lockCard(what) { return `<section class="card lock"><div class="ic">${ico('id', 40)}</div><h2>Restricted</h2><p class="muted">Your Care Circle permissions don't include ${what}. Ask the circle admin (${esc(S.circle.find(m => m.admin).name)}) to grant access.</p></section>`; }
function ring(p, size = 150) {
  const r = size / 2 - 12, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
}
function pulse() {
  const { done, total } = stats(), items = attention(), n = items.length;
  const state = items.some(i => i.sev === 'bad') ? 'bad' : n ? 'warn' : 'ok';
  const label = state === 'bad' ? 'Urgent' : state === 'warn' ? 'Needs attention' : 'On track';
  return `<section class="card pulse ${state}" aria-labelledby="pt">
    <div class="pulse-head"><h2 id="pt">CarePulse<span>Live care overview</span></h2><span class="pulse-pill">${label} · ${S.live ? 'Live' : 'Demo'}</span></div>
    <div class="pulse-body">
      <div class="ringwrap" role="img" aria-label="${done} of ${total} tasks completed">${ring(total ? done / total : 0)}<div class="ring-c"><b>${done}/${total}</b><small>${t('tasks completed')}</small></div></div>
      <div class="pulse-stats"><div class="stat"><b>${n}</b><span>${t('Needs attention')}</span></div><div class="stat"><b>${fmt(now())}</b><span>${t('Now')}</span></div></div>
    </div>
    <svg class="ecg" viewBox="0 0 400 50" preserveAspectRatio="none" aria-hidden="true"><path d="M0 28H40l8-2 8-20 10 42 10-30 6 10H150l8-2 8-20 10 42 10-30 6 10H260l8-2 8-20 10 42 10-30 6 10H400"/></svg>
    <div class="pulse-alert ${n ? '' : 'ok'}">${ico(n ? 'alert' : 'check', 18)}<span>${n ? esc(items[0].text) : 'Everything is on track right now'}</span></div>
  </section>`;
}
const ACT_ICON = { med: 'pill', appt: 'calendar', task: 'checklist', checkin: 'heart' };
function activity(ts, big) {
  return `<ul class="act ${big ? 'big' : ''}">` + ts.map(x => `<li class="act-i ${x.st}"><span class="act-ico" aria-hidden="true">${ico(ACT_ICON[x.type] || 'checklist', big ? 26 : 22)}</span>
    <div class="act-m"><b>${esc(x.title)}</b><small>${fmt(x.time)}${x.detail ? ' · ' + esc(x.detail) : ''}</small></div>${chip(x.st)}
    ${canAct() && x.st !== 'done' ? `<button class="btn sm primary" data-act="done" data-id="${x.id}">${x.type === 'checkin' ? t('Check in') : x.type === 'med' && me().role === 'elder' ? t('I took it') : t('Done')}</button>` : ''}</li>`).join('') + '</ul>';
}
function feedList(n = 8) {
  return `<ul class="feed">` + S.feed.slice(0, n).map(f => `<li class="${f.kind || ''}"><span class="fd ${f.kind || ''}"></span><div><b>${esc(f.text)}</b><small>${esc(f.who)} · ${fmt(f.t)}</small></div></li>`).join('') + '</ul>';
}
function stockBar(m) {
  const d = daysLeft(m), pct = Math.min(100, d / 30 * 100), cls = d <= 7 ? 'low' : d <= 10 ? 'mid' : '';
  return `<div class="bar ${cls}" role="img" aria-label="${d} days of supply"><i style="width:${pct}%"></i></div>`;
}

/* ---------- pages ---------- */
function loginView() {
  const roleName = { elder: 'Elder Mode', family: 'Family Mode', caregiver: 'Caregiver Mode' };
  return `<div class="login"><div class="login-in">
    <div class="login-hero">${LOGO(64)}<h1>Care<em>Verse</em></h1><p class="tag">One platform for elders, their families and their caregivers. Medicines, appointments, wellbeing and emergencies in one calm place.</p>
    <div class="pills"><span>Live CarePulse status</span><span>Voice in 16 languages</span><span>Medicine label scanner</span><span>Emergency health passport</span></div></div>
    <div><h2 class="pick">Who is using CareVerse?</h2>
    <div class="profiles">${S.circle.map(m => `<button class="profile" data-act="login" data-id="${m.id}"><span class="e">${m.emoji}</span><b>${esc(m.name)}</b>
      <span class="muted small">${esc(m.rel)}</span><span class="chip">${roleName[m.role]}</span>${m.role !== 'elder' && !m.perms.edit ? '<span class="chip pending">View-only access</span>' : ''}</button>`).join('')}</div></div>
    <p class="muted small" style="text-align:center">Demo mode · all data stays in this browser · each person sees different things and has different permissions</p>
    <div class="row" style="justify-content:center"><button class="btn sm" data-act="settings">${ico('gear', 16)} Accessibility &amp; language</button></div>
  </div></div>`;
}
// [id, icon, label, elder, family, caregiver, group, showInMobileBar]
const NAV = [
  ['home', 'home', 'Home', 1, 1, 1, 'Daily care', 1], ['day', 'clock', 'My Day', 1, 1, 1, 'Daily care', 1], ['meds', 'pill', 'Medicines', 1, 1, 1, 'Daily care', 1],
  ['appts', 'calendar', 'Appointments', 1, 1, 1, 'Daily care', 0], ['wellness', 'heart', 'Wellness', 1, 1, 1, 'Daily care', 1],
  ['wall', 'message', 'Family Wall', 1, 1, 1, 'Family', 0], ['circle', 'users', 'Care Circle', 0, 1, 1, 'Family', 0],
  ['journal', 'checklist', 'Tasks & Journal', 0, 1, 1, 'Family', 0], ['money', 'receipt', 'Expenses', 0, 1, 0, 'Family', 0],
  ['relax', 'leaf', 'Relax & Brain', 1, 0, 1, 'More', 0], ['passport', 'id', 'Health Passport', 1, 1, 1, 'More', 0],
  ['insights', 'chart', 'Analytics', 0, 1, 1, 'Daily care', 0], ['help', 'lifebuoy', 'Help', 1, 1, 1, 'More', 0]];
const NAV_GROUPS = ['Daily care', 'Family', 'More'];
function navFor() { const m = me(), i = { elder: 3, family: 4, caregiver: 5 }[m.role]; return NAV.filter(n => n[i]); }
function topNav() {
  const m = me(), items = navFor(), n = attention().length, g = k => items.filter(x => x[6] === k);
  const link = x => `<button data-act="nav" data-p="${x[0]}" ${ui.page === x[0] ? 'aria-current="page"' : ''}>${t(x[2])}</button>`;
  const dd = (label, L) => L.length ? `<details class="navdd ${L.some(x => x[0] === ui.page) ? 'on' : ''}"><summary>${t(label)}${ico('chev', 16)}</summary><div class="dd">${L.map(x => `<button data-act="nav" data-p="${x[0]}" ${ui.page === x[0] ? 'aria-current="page"' : ''}>${ico(x[1], 18)}<span>${t(x[2])}</span></button>`).join('')}</div></details>` : '';
  const role = { elder: 'Elder Mode', family: 'Family Mode', caregiver: 'Caregiver Mode' }[m.role];
  return `<header class="topnav"><button class="logo" data-act="nav" data-p="home" aria-label="CareVerse home">${LOGO(34)}<b>CareVerse</b></button>
  <nav class="nav-links" aria-label="Main">${g('Daily care').map(link).join('')}${dd('Family', g('Family'))}${dd('More', g('More'))}</nav>
  <div class="nav-r">${demoBar()}
    <button class="icon-btn nb" data-act="alerts" aria-label="Alerts: ${n} need attention">${ico('bell', 20)}${n ? `<span class="badge-n">${n}</span>` : ''}</button>
    <label class="langwrap"><span class="sr-only">Language</span>${ico('globe', 18)}<select class="langsel" data-chg="set" data-k="lang">${LANGS.map(l => `<option value="${l.c}" ${S.lang === l.c ? 'selected' : ''}>${l.nat}</option>`).join('')}</select></label>
    <button class="who" data-act="logout" title="Switch person" aria-label="Signed in as ${esc(m.name)}. Switch person"><span class="av" aria-hidden="true">${m.emoji}</span><div><b>${esc(m.name.split(' ')[0])}</b><small>${role}</small></div></button>
    <button class="icon-btn" data-act="settings" aria-label="Accessibility and settings">${ico('gear', 20)}</button></div></header>`;
}
function bottomBar() {
  const L = navFor().filter(n => n[7]);
  return `<nav class="bottombar" aria-label="Main">${L.map(n => `<button data-act="nav" data-p="${n[0]}" ${ui.page === n[0] ? 'aria-current="page"' : ''}>${ico(n[1], 22)}<span>${t(n[2])}</span></button>`).join('')}<button data-act="more">${ico('more', 22)}<span>${t('More')}</span></button></nav>`;
}
function pageTitle() {
  const n = NAV.find(x => x[0] === ui.page); const m = me(), h = Math.floor(now() / 60);
  if (ui.page === 'home' && m.role === 'elder') return `${t(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')}, ${m.name.split(' ')[0]}`;
  if (ui.page === 'home') return m.role === 'family' ? 'Family Peace-of-Mind' : 'Caregiver Dashboard';
  return t(n[2]);
}
function demoBar() {
  return `<details class="demo-menu" ${ui.demoOpen ? 'open' : ''}><summary>${ico('clock', 18)}<span>${S.live ? 'Live' : 'Demo'} · ${fmt(now())}</span></summary>
  <div class="demo-pop"><h3>Demo clock</h3><p class="small muted">Jump ahead to watch a reminder escalate: Reminder, Pending, Overdue, then Caregiver notified.</p>
  ${S.live ? '<p class="small">Using your real time.</p>' : `<div class="btns"><button class="btn sm" data-act="clock" data-m="15">+15 min</button><button class="btn sm" data-act="clock" data-m="30">+30 min</button><button class="btn sm" data-act="clock" data-m="60">+1 hour</button><button class="btn sm" data-act="clock" data-m="-30">−30 min</button></div>`}
  <div class="btns"><button class="btn sm" data-act="live">${S.live ? 'Use demo clock' : 'Use real time'}</button><button class="btn sm ghost" data-act="reset">Reset demo data</button></div></div></details>`;
}
function pageHead() {
  return `<div class="pagehead"><h1 id="pgt">${esc(pageTitle())}</h1><p class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · caring for ${esc(elder().name)}</p></div>`;
}

function page() {
  const m = me();
  switch (ui.page) {
    case 'home': return m.role === 'elder' ? homeElder() : m.role === 'family' ? homeFamily() : homeCaregiver();
    case 'day': return pageDay(); case 'meds': return pageMeds(); case 'appts': return pageAppts();
    case 'circle': return pageCircle(); case 'passport': return pagePassport(); case 'insights': return pageAnalytics();
    case 'wellness': return pageWellness(); case 'wall': return pageWall(); case 'relax': return pageRelax();
    case 'journal': return pageJournal(); case 'money': return pageMoney(); case 'help': return pageHelp();
  }
}

function homeElder() {
  const { ts, done, total } = stats(); const nx = ts.find(x => x.st !== 'done');
  const nextHtml = nx ? `<div class="next-card" aria-live="polite"><small class="muted"><b>${t('Next up').toUpperCase()}</b> · ${chip(nx.st)}</small><div class="when">${fmt(nx.time)}</div><h3>${esc(nx.title)}</h3><p class="muted">${esc(nx.detail)}</p>
      <button class="btn xl primary" data-act="done" data-id="${nx.id}">${ico('check', 22)} ${nx.type === 'med' ? t('I took it') : t('Done')}</button></div>`
    : `<div class="next-card"><div class="when">${ico('check', 56)}</div><h3>${t('All done for today')}</h3><p class="muted">Your family can see that you completed everything. Well done!</p></div>`;
  return `<div class="hero-elder"><p class="muted"><b>${done} of ${total}</b> ${t('tasks completed')}</p>${nextHtml}
    <div class="big3"><button class="btn" data-act="mic">${ico('mic', 34)}${t('Talk to me')}</button><button class="btn" data-act="call">${ico('phone', 34)}${t('Call family')}</button><button class="btn danger" data-act="sosAsk">${ico('alert', 34)}${t('I need help')}</button></div></div>
    <div class="grid" style="margin-top:18px"><div class="c-7">${card(t("Today's activity"), activity(ts, true))}</div><div class="c-5 stack">${orientCard()}${msgCard()}${pulse()}${waterMini()}${card(t('Emergency card'), '<p class="muted">Your allergies, conditions and contacts — ready for any doctor or responder.</p>', '<button class="btn sm" data-act="nav" data-p="passport">Open</button>')}</div></div>`;
}
function homeFamily() {
  const items = attention(), ts = tasks(), na = nextAppts().slice(0, 2), dayIdx = (new Date().getDay() + 6) % 7;
  const sos = S.sos && !S.sos.ack, bad = items.some(i => i.sev === 'bad');
  const banner = sos ? `<div class="notice bad" role="alert">${ico('alert', 20)}<b>${esc(elderFirst())} pressed the SOS button at ${fmt(S.sos.t)}.</b><span class="sp"></span><button class="btn sm danger" data-act="ackSos">I'm responding</button></div>`
    : items.length ? `<div class="notice ${bad ? 'bad' : ''}">${ico('alert', 20)}<b>${items.length} thing${items.length > 1 ? 's' : ''} need${items.length > 1 ? '' : 's'} attention.</b> Details are below.</div>`
      : `<div class="notice ok">${ico('check', 20)}<b>All calm.</b> ${esc(elderFirst())}'s routine is on track.</div>`;
  return `<div class="grid"><div class="c-12">${banner}</div>
    <div class="c-12">${panel('Overview', overviewTiles(), `<span class="chip plain">Updated ${fmt(now())}</span>`, 'teal')}</div>
    <div class="c-4">${pulse()}</div><div class="c-4">${medDonutPanel(7, 'green')}</div><div class="c-4">${adhTrendPanel(14, 'blue')}</div>
    <div class="c-8">${card(t("Today's activity"), activity(ts), '<button class="btn sm" data-act="nav" data-p="day">Full timeline</button>')}</div>
    <div class="c-4 stack">
      ${card('Needs attention', items.length ? `<ul class="feed">${items.map(i => `<li class="${i.sev === 'bad' ? 'bad' : ''}"><span class="fd ${i.sev}"></span><div><b>${esc(i.text)}</b></div></li>`).join('')}</ul>` : '<p class="muted">Nothing right now.</p>', canAct() ? `<button class="btn sm" data-act="nudge">Send gentle nudge</button>` : '')}
      ${card('Upcoming appointments', na.length ? na.map(a => `<div class="act-i" style="margin-bottom:8px"><span class="act-ico">${ico('calendar', 22)}</span><div class="act-m"><b>${esc(a.title)}</b><small>${fmtDate(a.date)} · ${fmt(toMin(a.time))} · ${esc(a.doctor)}</small></div><button class="btn sm" data-act="prep" data-id="${a.id}">Prep sheet</button></div>`).join('') : '<p class="muted">None scheduled.</p>')}
    </div>
    <div class="c-4">${updatesPanel(6, 'lilac')}</div><div class="c-4">${stockPanel('sand')}</div><div class="c-4">${wellCard()}</div>
    <div class="c-4">${onDutyCard() || card('On duty now', '<p class="muted">No caregiver is clocked in.</p>')}</div>
    <div class="c-4">${card("Who's doing what today", `<ul class="feed">${S.DUTIES.map(d => { const p = S.circle.find(x => x.id === S.duties[d][dayIdx]); return `<li><span class="ic">${p ? p.emoji : '·'}</span><div><b>${esc(d)}</b><small>${p ? esc(p.name) : 'Unassigned'}</small></div></li>`; }).join('')}</ul>`)}</div>
    <div class="c-4">${todosCard()}</div></div>`;
}
function homeCaregiver() {
  const ts = tasks(), last = S.handovers[0];
  return `<div class="grid"><div class="c-12">${panel('Overview', overviewTiles(), `<span class="chip plain">Updated ${fmt(now())}</span>`, 'teal')}</div><div class="c-7 stack">${card("Shift checklist · " + t("Today's activity"), activity(ts))}
      ${card('Quick log', `<div class="row"><button class="btn" data-act="qlog" data-t="Vitals recorded|🩺">🩺 Vitals recorded</button><button class="btn" data-act="qlog" data-t="Meal given|🍲">🍲 Meal given</button><button class="btn" data-act="qlog" data-t="Walk / exercise done|🚶">🚶 Walk done</button><button class="btn" data-act="qlog" data-t="Hydration reminder given|💧">💧 Water</button></div>`)}</div>
    <div class="c-5 stack">${shiftCard()}${pulse()}${wellCard()}${todosCard(true)}${card('Previous handover', last ? `<div class="hand"><b>${esc(last.by)}</b> <span class="muted small">· ${esc(last.when)}</span><p>${esc(last.text)}</p></div>` : '<p class="muted">No handover yet.</p>', '<button class="btn sm primary" data-act="handoverForm">✍ Write handover</button>')}
      ${card('Recent activity', feedList(5))}</div></div>`;
}
function pageDay() {
  const ts = tasks(), n = now(); let nowPlaced = false, h = '';
  ts.forEach(x => {
    if (!nowPlaced && x.time > n) { h += `<div class="tl-now">NOW · ${fmt(n)}</div>`; nowPlaced = true; }
    h += `<div class="tl-i ${x.st}"><span class="dot"></span><div class="card" style="padding:14px">${activity([x], me().role === 'elder')}</div></div>`;
  });
  if (!nowPlaced) h += `<div class="tl-now">NOW · ${fmt(n)}</div>`;
  return `<div class="grid"><div class="c-8"><div class="card"><div class="card-h"><h2>The Living Care Timeline</h2></div><p class="muted" style="margin-bottom:16px">Medicines, appointments, caregiver visits and tasks — one visual day.</p><div class="tl">${h}</div></div></div><div class="c-4 stack">${pulse()}${card('Reminder policy', `<ol class="obs"><li><b>Reminder</b> — 15 min before</li><li><b>Pending</b> — at the due time</li><li><b>Overdue</b> — +${S.policy.overdue} min</li><li><b>Caregiver notified</b> — +${S.policy.notify} min</li></ol>`)}</div></div>`;
}

/* --- medicines --- */
function pageMeds() {
  const ed = canAct() && me().role !== 'elder';
  return `<div class="row" style="margin-bottom:16px"><p class="muted sp">Everything about ${esc(elderFirst())}'s medicines, supply and refills.</p>${ed ? `<button class="btn" data-act="medForm" data-scan="1">📷 Scan label</button><button class="btn primary" data-act="medForm">＋ Add medicine</button>` : ''}</div>
  <div class="cards">${S.meds.map(m => `<article class="card med"><div class="row"><h3>💊 ${esc(m.name)}</h3><span class="chip">${esc(m.dose)}</span></div>
    <div class="times">${m.times.map(x => `<span class="chip soon">🕑 ${fmt(toMin(x))}</span>`).join('')}</div>${m.note ? `<p class="muted small">📝 ${esc(m.note)}</p>` : ''}
    <div><div class="row small"><span>Supply: ${m.stock} left</span><span class="sp"></span><b class="${lowStock(m) ? 'bad' : ''}" style="color:${lowStock(m) ? 'var(--bad)' : 'inherit'}">≈ ${daysLeft(m)} days · runs out ${fmtDate(addDays(new Date(), daysLeft(m)))}</b></div>${stockBar(m)}</div>
    ${lowStock(m) ? `<div class="notice bad small">Running low — time to arrange a refill.</div>` : ''}
    ${ed ? `<div class="row"><button class="btn sm" data-act="refill" data-id="${m.id}">+30 refilled</button><button class="btn sm" data-act="notifyRefill" data-id="${m.id}">📣 Ask family to refill</button><button class="btn sm ghost" data-act="medForm" data-id="${m.id}">Edit</button><button class="btn sm ghost" data-act="delMed" data-id="${m.id}">Remove</button></div>` : ''}</article>`).join('')}</div>
  <p class="notice info small" style="margin-top:18px">Stock is based on quantities entered by your family. CareVerse never suggests or changes doses — always follow the prescription.</p>`;
}
function medForm(id, scan) {
  const m = S.meds.find(x => x.id === id) || { name: '', dose: '', times: ['08:00'], stock: 30, note: '' };
  openModal(`<h2>${id ? 'Edit' : 'Add'} medicine</h2>
  ${!id ? `<div class="notice info"><b>📷 Scan the label</b> — we read the printed text on your device to pre-fill this form. <b>You must check everything before saving.</b>
  <div class="row" style="margin-top:8px"><input type="file" id="ocr-file" accept="image/*" capture="environment" aria-label="Medicine label photo"><button type="button" class="btn sm" data-act="ocrSample">Try a sample label</button></div><p id="ocr-status" class="small" aria-live="polite"></p></div>` : ''}
  <form class="form" data-form="med" data-id="${id || ''}">
   <div class="two"><label>Medicine name<input name="medname" required value="${esc(m.name)}"></label><label>Strength / dose label<input name="dose" required value="${esc(m.dose)}" placeholder="e.g. 500 mg"></label></div>
   <div class="three">${[0, 1, 2].map(i => `<label>Time ${i + 1}${i ? ' (optional)' : ''}<input type="time" name="t${i}" value="${m.times[i] || ''}" ${i ? '' : 'required'}></label>`).join('')}</div>
   <div class="two"><label>Tablets / units in stock<input type="number" min="0" name="stock" value="${m.stock}"></label><label>Note (e.g. with food)<input name="note" value="${esc(m.note)}"></label></div>
   <div class="row"><button class="btn primary" type="submit">Save medicine</button><button type="button" class="btn ghost" data-act="close">Cancel</button></div></form>`);
}
const SAMPLE_LABEL = 'METFORMIN HCL TABLETS IP 500 mg\nTake as directed by your physician\nMfg: 03/2026  Exp: 02/2028';
function parseLabel(txt) {
  const lines = txt.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const dose = (txt.match(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu)\b/i) || [''])[0];
  let name = lines.find(l => /[A-Za-z]{4,}/.test(l) && !/take|store|exp|mfg|batch|price|mrp|keep|dr\.|physician/i.test(l)) || lines[0] || '';
  name = name.replace(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu)\b/ig, '').replace(/\b(tablets?|capsules?|syrup|ip|bp|usp)\b/ig, '').replace(/[^A-Za-z0-9+ \-]/g, '').replace(/\s+/g, ' ').trim();
  name = name.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  return { name, dose };
}
function ocrFill(txt, status) {
  const f = $('form[data-form=med]'); if (!f) return; const r = parseLabel(txt);
  if (r.name) f.elements.medname.value = r.name; if (r.dose) f.elements.dose.value = r.dose;
  status.innerHTML = `✅ Read: <b>${esc(r.name || '?')}</b> ${esc(r.dose)} — please verify the fields below, then save.`;
}
async function runOcr(file) {
  const st = $('#ocr-status'); st.textContent = 'Loading reader (first time needs internet)…';
  try {
    if (!window.Tesseract) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    st.textContent = 'Reading label…';
    const { data } = await Tesseract.recognize(file, 'eng', { logger: p => { if (p.status === 'recognizing text') st.textContent = `Reading label… ${Math.round(p.progress * 100)}%`; } });
    ocrFill(data.text, st);
  } catch (e) { st.textContent = '⚠️ Could not read the photo. Try the sample label or type the details manually.'; }
}

/* --- appointments --- */
function pageAppts() {
  const d = new Date(), y = d.getFullYear(), mo = d.getMonth(), first = new Date(y, mo, 1), off = (first.getDay() + 6) % 7, dim = new Date(y, mo + 1, 0).getDate();
  const has = new Set(S.appts.map(a => a.date));
  let cal = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="h">${x}</div>`).join('') + '<div></div>'.repeat(off);
  for (let i = 1; i <= dim; i++) { const k = `${y}-${pad(mo + 1)}-${pad(i)}`; cal += `<div class="d ${has.has(k) ? 'has' : ''} ${i === d.getDate() ? 't' : ''}" ${has.has(k) ? 'title="Appointment"' : ''}>${i}</div>`; }
  const list = [...S.appts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return `<div class="grid"><div class="c-4 stack">${card(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), `<div class="cal">${cal}</div><p class="small muted" style="margin-top:10px">● marks an appointment day</p>`)}
    ${canAct() && me().role !== 'elder' ? `<button class="btn primary xl" style="min-height:56px;font-size:1.05rem" data-act="apptForm">＋ New appointment</button>` : ''}</div>
    <div class="c-8 stack">${list.map(a => {
    const past = a.date < todayISO() || S.done['appt@' + a.id];
    return `<article class="card" style="${past ? 'opacity:.78' : ''}"><div class="row"><span class="act-ico" style="font-size:1.6rem">🩺</span><div class="sp"><h3 style="font-size:1.2rem">${esc(a.title)}</h3><span class="muted small">${fmtDate(a.date)} · ${fmt(toMin(a.time))} · ${esc(a.doctor)} · ${esc(a.place)}</span></div>${past ? '<span class="chip done">✓ Completed</span>' : '<span class="chip soon">Upcoming</span>'}</div>
    <div class="grid" style="margin-top:12px;gap:14px"><div class="c-6"><b class="small">🎒 Documents to carry</b><div class="checks" style="margin-top:6px">${a.docs.map((x, i) => `<label><input type="checkbox" data-chg="apptCheck" data-id="${a.id}" data-i="${i}" ${a.checks[i] ? 'checked' : ''}>${esc(x)}</label>`).join('') || '<span class="muted small">—</span>'}</div></div>
    <div class="c-6"><b class="small">❓ Questions to ask</b><ul class="obs small" style="margin-top:6px">${a.questions.map(q => `<li>${esc(q)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div></div>
    <div class="row" style="margin-top:12px"><button class="btn sm primary" data-act="prep" data-id="${a.id}">📝 Preparation sheet</button>${canAct() && me().role !== 'elder' ? `<button class="btn sm ghost" data-act="delAppt" data-id="${a.id}">Remove</button>` : ''}</div></article>`;
  }).join('')}</div></div>`;
}
function apptForm() {
  openModal(`<h2>New appointment</h2><form class="form" data-form="appt">
  <label>What for?<input name="title" required placeholder="e.g. Blood pressure review"></label>
  <div class="two"><label>Doctor<input name="doctor" required></label><label>Place<input name="place" required></label></div>
  <div class="two"><label>Date<input type="date" name="date" required value="${todayISO()}"></label><label>Time<input type="time" name="time" required value="10:00"></label></div>
  <label>Questions to ask (one per line)<textarea name="questions"></textarea></label>
  <label>Documents to carry (comma separated)<input name="docs" placeholder="Prescription, previous report"></label>
  <div class="row"><button class="btn primary" type="submit">Save appointment</button><button type="button" class="btn ghost" data-act="close">Cancel</button></div></form>`);
}
function prepBlocks(a) {
  const ad = adherence(), last7 = S.hist.slice(-7).map(dayStatus);
  const prev = S.appts.filter(x => x.date < a.date).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 2);
  const next = S.appts.filter(x => x.date > a.date && x.id !== a.id).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 2);
  return [
    { h: 'Visit', lines: [`${a.title} — ${a.doctor}`, `${fmtDate(a.date)} at ${fmt(toMin(a.time))}, ${a.place}`] },
    { h: 'Recent recorded medication history', lines: [`30-day recorded completion: ${ad.pct}%`, `Last 7 days: ${last7.filter(x => x === 'ok').length} fully completed, ${last7.filter(x => x === 'part').length} partly, ${last7.filter(x => x === 'miss').length} missed`, ...observations().slice(0, 2), 'Current medicines: ' + S.meds.map(m => `${m.name} ${m.dose} (${m.times.map(x => fmt(toMin(x))).join(', ')})`).join('; ')] },
    { h: 'Questions I want to ask', lines: a.questions.length ? a.questions : ['(add questions on the appointment)'] },
    { h: 'Documents to carry', lines: [...new Set([...a.docs, 'Current medicine list', 'Photo ID'])] },
    { h: 'Previous & upcoming appointments', lines: [...prev.map(x => `Previous: ${fmtDate(x.date)} — ${x.title}, ${x.doctor}`), ...next.map(x => `Upcoming: ${fmtDate(x.date)} — ${x.title}, ${x.doctor}`)].concat([]).length ? [...prev.map(x => `Previous: ${fmtDate(x.date)} — ${x.title}, ${x.doctor}`), ...next.map(x => `Upcoming: ${fmtDate(x.date)} — ${x.title}, ${x.doctor}`)] : ['None on record'] }
  ];
}

/* --- care circle --- */
function pageCircle() {
  const tab = ui.circleTab, tabs = [['members', '👥 Members'], ['duties', '🗓 Responsibilities'], ['handover', '🤝 Handover'], ['feed', '📰 Activity feed']];
  let body = '';
  if (tab === 'members') body = `<div class="grid">${S.circle.map(m => `<div class="c-6"><article class="card member"><span class="av" aria-hidden="true">${m.emoji}</span><div class="sp"><h3 style="font-size:1.15rem">${esc(m.name)}</h3><p class="muted small">${esc(m.rel)}</p>
    <div class="row" style="margin-top:6px"><span class="chip">${{ elder: 'Elder', family: 'Family', caregiver: 'Caregiver' }[m.role]}</span>${m.admin ? '<span class="chip done">Admin</span>' : ''}</div>
    ${m.role !== 'elder' ? `<div class="perm">${[['edit', 'Can edit & mark done'], ['locker', 'Health locker'], ['reports', 'Reports']].map(([k, l]) => `<label><input type="checkbox" data-chg="perm" data-id="${m.id}" data-k="${k}" ${m.perms[k] ? 'checked' : ''} ${me().admin && !m.admin ? '' : 'disabled'}>${l}</label>`).join('')}</div>` : ''}</div></article></div>`).join('')}
    ${me().admin ? `<div class="c-12">${card('Invite to the Care Circle', `<form class="form" data-form="invite"><div class="three"><label>Name<input name="name" required></label><label>Relationship<input name="rel" required placeholder="e.g. Neighbour"></label><label>Role<select name="role"><option value="family">Family</option><option value="caregiver">Caregiver</option></select></label></div><div><button class="btn primary" type="submit">Send invite (demo)</button></div></form>`)}</div>
    <div class="c-12">${card('Reminder escalation policy', `<form class="form" data-form="policy"><div class="two"><label>Mark overdue after (minutes)<input type="number" min="5" max="240" name="overdue" value="${S.policy.overdue}"></label><label>Notify caregiver after (minutes)<input type="number" min="10" max="480" name="notify" value="${S.policy.notify}"></label></div><label>Daily "I'm OK" check-in due at<input type="time" name="checkin" value="${S.checkinTime}"></label><div><button class="btn" type="submit">Save policy</button></div></form>`)}</div>` : ''}</div>`;
  if (tab === 'duties') {
    const di = (new Date().getDay() + 6) % 7, days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], opts = S.circle.filter(m => m.role !== 'elder');
    body = card('Responsibility scheduler', `<p class="muted small" style="margin-bottom:10px">Who takes care of what, every day of the week. Today is highlighted.</p><div class="tscroll"><table><thead><tr><th>Responsibility</th>${days.map((d, i) => `<th class="${i === di ? 'today' : ''}">${d}</th>`).join('')}</tr></thead><tbody>${S.DUTIES.map(d => `<tr><th>${esc(d)}</th>${days.map((_, i) => `<td><select data-chg="duty" data-d="${esc(d)}" data-i="${i}" aria-label="${esc(d)} ${days[i]}" ${me().perms.edit ? '' : 'disabled'}>${opts.map(o => `<option value="${o.id}" ${S.duties[d][i] === o.id ? 'selected' : ''}>${esc(o.name.split(' ')[0])}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  }
  if (tab === 'handover') body = `<div class="grid"><div class="c-5">${card('Write a handover', handoverFormHtml())}</div><div class="c-7">${card('Handover history', S.handovers.map(h => `<div class="hand" style="margin-bottom:10px"><b>${esc(h.by)}</b> <span class="muted small">· ${esc(h.when)}</span><p>${esc(h.text)}</p></div>`).join('') || '<p class="muted">Nothing yet.</p>')}</div></div>`;
  if (tab === 'feed') body = card('Family activity feed', feedList(30));
  return `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="ctab" data-k="${k}">${l}</button>`).join('')}</div>${body}`;
}
function handoverFormHtml() {
  return `<form class="form" data-form="handover"><label>Summary for the next caregiver<textarea name="text" id="ho-text" required placeholder="Morning medication recorded. Doctor appointment tomorrow…"></textarea></label>
  <div class="row"><button type="button" class="btn sm" data-act="aiHandover">✨ Draft from today's activity</button><button class="btn primary" type="submit">Save handover</button></div></form>`;
}

/* --- passport + locker --- */
function pagePassport() {
  const e = S.emergency, ed = canAct() && me().role !== 'elder', canLock = me().perms.locker;
  const passHtml = (x) => `<div class="pass"><h3>⛑ Emergency Care Card</h3><b style="font-size:1.6rem">${esc(x.name)}</b> <span class="muted">· ${esc(x.age)} yrs · Blood group <b>${esc(x.blood)}</b></span>
   <dl><dt>Allergies</dt><dd><b>${esc(x.allergies)}</b></dd><dt>Conditions</dt><dd>${esc(x.conditions)}</dd><dt>Medicines</dt><dd>${S.meds.map(m => esc(m.name + ' ' + m.dose)).join(', ')}</dd><dt>Doctor</dt><dd>${esc(x.doctor)}</dd><dt>Contacts</dt><dd>${esc(x.c1)}<br>${esc(x.c2)}</dd><dt>Notes</dt><dd>${esc(x.notes)}</dd></dl></div>`;
  const shares = S.shares.filter(s => s.exp > Date.now());
  return `<div class="grid"><div class="c-7 stack">${passHtml(e)}<div class="row">${ed ? '<button class="btn" data-act="passForm">✏️ Edit card</button>' : ''}<button class="btn" data-act="printCard">🖨 Print / save</button></div>
    ${me().perms.locker ? card('Digital Health Locker', `<div class="stack">${S.docs.map(d => `<div class="doc"><span class="ic">${{ Report: '🧪', Prescription: '💊', Insurance: '🛡', Other: '📄' }[d.type] || '📄'}</span><div class="sp"><b>${esc(d.name)}</b><div class="muted small">${esc(d.type)} · added ${fmtDate(d.date)}</div></div>${d.url ? `<a class="btn sm" href="${d.url}" target="_blank" rel="noopener">Open</a>` : ''}${ed ? `<button class="btn sm ghost" data-act="delDoc" data-id="${d.id}">Remove</button>` : ''}</div>`).join('')}</div>`, ed ? '<button class="btn sm primary" data-act="docForm">＋ Add document</button>' : '') : lockCard('the Digital Health Locker')}</div>
    <div class="c-5 stack">${card('Secure share links', `<p class="muted small">Create a link that expires automatically. Responders need the PIN (demo PIN: <b>1234</b>).</p>
      ${shares.map(s => `<div class="doc" style="margin-top:10px;display:grid"><div class="row"><b class="small">careverse.demo/p/${s.token}</b></div><div class="small muted">Expires in ${Math.max(1, Math.round((s.exp - Date.now()) / 3600000))} h</div><div class="qr">${qrSvg('https://careverse.demo/p/' + s.token)}</div><div class="row"><button class="btn sm" data-act="responder" data-id="${s.id}">Open as responder</button><button class="btn sm ghost" data-act="revoke" data-id="${s.id}">Revoke</button></div></div>`).join('') || '<p class="muted small" style="margin-top:8px">No active links.</p>'}`, '<button class="btn sm primary" data-act="share">＋ New 24h link</button>')}
    ${card('How privacy works', '<ul class="obs small"><li>Only people in the Care Circle see the locker.</li><li>The admin controls each person\'s permissions.</li><li>Share links expire and can be revoked.</li></ul>')}</div></div>`;
}
function qrSvg(text) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { return '<span class="muted small">QR loads when online</span>'; } }
function passForm() {
  const e = S.emergency;
  openModal(`<h2>Edit emergency card</h2><form class="form" data-form="pass">${[['name', 'Name'], ['age', 'Age'], ['blood', 'Blood group'], ['allergies', 'Allergies'], ['conditions', 'Recorded conditions'], ['doctor', 'Doctor'], ['c1', 'Emergency contact 1'], ['c2', 'Emergency contact 2']].map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(e[k])}"></label>`).join('')}<label>Notes<textarea name="notes">${esc(e.notes)}</textarea></label><div class="row"><button class="btn primary" type="submit">Save</button><button type="button" class="btn ghost" data-act="close">Cancel</button></div></form>`);
}

/* --- insights --- */
function pageInsights() {
  if (!me().perms.reports) return lockCard('reports and insights');
  const a = adherence(), cells = [...S.hist.map(h => ({ d: h.date, s: dayStatus(h) })), { d: todayISO(), s: todayStatus(), today: 1 }], off = (dateOf(cells[0].d).getDay() + 6) % 7;
  const glyph = { ok: '✓', part: '◐', miss: '✕', none: '–' }, lab = { ok: 'all doses completed', part: 'partly completed / pending', miss: 'missed', none: 'not scheduled' };
  const heat = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="h">${x}</div>`).join('') + '<div></div>'.repeat(off) + cells.map(c => `<div class="cell ${c.s} ${c.today ? 'today' : ''}" role="img" aria-label="${fmtDate(c.d)}: ${lab[c.s]}" title="${fmtDate(c.d)} — ${lab[c.s]}"><b>${dateOf(c.d).getDate()}</b>${glyph[c.s]}</div>`).join('');
  const spark = S.hist.map(h => { if (!h.s) return '<i class="z" style="height:6%"></i>'; const v = Object.values(h.s), p = v.reduce((x, y) => x + y, 0) / v.length; return `<i style="height:${Math.max(6, p * 100)}%" title="${fmtDate(h.date)} ${Math.round(p * 100)}%"></i>`; }).join('');
  return `<div class="grid"><div class="c-12 kpis">
    <div class="card kpi"><b>${a.pct}%</b><span>30-day recorded adherence</span></div><div class="card kpi"><b>${streak()}</b><span>day streak, all doses recorded</span></div>
    <div class="card kpi"><b>${a.ok}/${a.sched}</b><span>doses recorded as completed</span></div><div class="card kpi"><b>${S.appts.filter(x => x.date >= todayISO()).length}</b><span>upcoming appointments</span></div></div>
    <div class="c-6">${card('Missed-routine heatmap · 30 days', `<div class="heat">${heat}</div><div class="legend"><span class="ok">✓ All done</span><span class="part">◐ Partly / pending</span><span class="miss">✕ Missed</span><span class="none">– Not scheduled</span></div>`)}</div>
    <div class="c-6 stack">${card('Completion by time of day', Object.entries(a.slots).map(([k, v]) => { const p = v[0] ? Math.round(v[1] / v[0] * 100) : 0; return `<div class="slot"><span>${k}</span><div class="bar ${p < 70 ? 'low' : p < 85 ? 'mid' : ''}"><i style="width:${p}%"></i></div><b>${p}%</b></div>`; }).join('') + `<p class="small muted" style="margin:14px 0 6px">Daily completion trend</p><div class="spark" aria-hidden="true">${spark}</div>`)}
    ${card('Routine pattern insights', `<ul class="obs">${observations().map(o => `<li>${esc(o)}</li>`).join('')}</ul>`)}${moodWeekCard()}</div>
    <div class="c-12">${card('AI activity summary & report', `<div class="notice info" id="sum-box" style="white-space:pre-wrap">${esc(daySummary())}</div><div class="row" style="margin-top:12px"><button class="btn" data-act="aiSummary">✨ Refresh AI summary</button><button class="btn primary" data-act="report">⬇ Download monthly report (PDF)</button></div>`)}</div></div>`;
}

/* ---------- modal helpers ---------- */
const modal = () => $('#modal');
function openModal(html) { const m = modal(); m.innerHTML = `<div class="mbody">${html}</div>`; if (S.meId && me() && me().role !== 'elder') tidy(m); if (!m.open) m.showModal(); }
function closeModal() { const m = modal(); if (m.open) m.close(); }

function settingsModal() {
  const sel = (k, opts) => `<select data-chg="set" data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${S[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  openModal(`<h2>Accessibility &amp; settings</h2><div class="form">
  <label>Text size${sel('size', [['md', 'Standard'], ['lg', 'Large'], ['xl', 'Extra large']])}</label>
  <label>Colour theme${sel('theme', [['light', 'Light (warm)'], ['dark', 'Dark'], ['contrast', 'High contrast (yellow on black)']])}</label>
  <label>App language (menus &amp; buttons)${sel('lang', LANGS.map(l => [l.c, l.nat + ' · ' + l.name]))}</label>
  <label>AI talking language (voice &amp; answers)${sel('ai', LANGS.map(l => [l.c, l.nat + ' · ' + l.name]))}</label>
  ${voiceStatusHtml()}
  <label>Speaking speed${sel('rate', [['0.75', 'Slow (easier to follow)'], ['0.9', 'Normal'], ['1.05', 'Fast']])}</label>
  <label class="row" style="flex-direction:row;font-weight:400"><input type="checkbox" style="width:24px;min-height:0" data-chg="set" data-k="voice" ${S.voice ? 'checked' : ''}> Speak reminders and answers aloud</label>
  <label class="row" style="flex-direction:row;font-weight:400"><input type="checkbox" style="width:24px;min-height:0" data-chg="set" data-k="motion" ${S.motion ? 'checked' : ''}> Show animations</label>
  <div class="row"><button class="btn sm" data-act="enableNotif">🔔 Enable browser notifications</button></div>
  <label>Gemini API key (optional — enables smarter AI answers)<input type="password" data-chg="set" data-k="gkey" value="${esc(S.gkey)}" placeholder="Paste key here (free from Google AI Studio)" autocomplete="off"></label>
  <div class="row"><button class="btn sm" data-act="testVoice">▶ Test voice</button><a class="btn sm" target="_blank" rel="noopener" href="https://aistudio.google.com/apikey">🔑 Get a free key</a><a class="btn sm" href="microsoft-edge:${location.origin}/">🌐 Open in Edge</a></div>
  <label>Voice server URL (for developers — see voice-server/README.md)<input type="url" data-chg="set" data-k="ttsUrl" value="${esc(S.ttsUrl || '')}" placeholder="https://careverse-voice.yourname.workers.dev"></label>
  <p class="small muted">If you add a key, your questions plus a summary of care data are sent to Google's Gemini API. Without a key, everything stays in your browser.</p>
  <div class="row"><button class="btn primary" data-act="close">Done</button></div></div>`);
}

/* ---------- AI assistant ---------- */
const CHIPS = ['What is next in my schedule?', 'What appointments do I have this week?', 'Show my medicines', 'Who needs a refill?', "What was the last blood pressure?", 'Log a glass of water', 'Any messages from family?', 'Open care tasks', 'Summarize today'];
function answer(q) {
  const s = q.toLowerCase(), ts = tasks(), m = me();
  if (/\b(took|taken|finished my|done with)\b|వేసుకున్న/.test(s)) {
    const nx = ts.find(x => x.st !== 'done' && x.st !== 'upcoming') || ts.find(x => x.st !== 'done');
    if (!nx) return 'Everything for today is already done 🎉'; if (!canAct()) return 'You have view-only access, so you cannot mark tasks as done.';
    complete(nx.id); return `Lovely! I recorded "${nx.title}" as done.`;
  }
  if (/\bsos\b|i (have )?(fallen|fell)|need (urgent )?help|ambulance|సహాయం కావాలి/.test(s)) {
    if (m.role !== 'elder') return 'The SOS button lives in Elder Mode. To alert the circle, use "Send gentle nudge" or call directly.';
    triggerSos(); return 'I have alerted your whole Care Circle. Please stay calm and stay where you are — they are on the way.';
  }
  const ex = extraAnswer(s); if (ex) return ex;
  if (/appoint|doctor|visit|అపాయింట్/.test(s)) {
    const w = /week/.test(s) ? nextAppts().filter(a => dateOf(a.date) <= addDays(new Date(), 7)) : nextAppts().slice(0, 3);
    return w.length ? (/week/.test(s) ? 'Appointments in the next 7 days:\n' : 'Your next appointments:\n') + w.map(a => `• ${fmtDate(a.date)} ${fmt(toMin(a.time))} — ${a.title} with ${a.doctor} (${a.place})`).join('\n') : 'No appointments in that period.';
  }
  if (/refill|stock|run out|supply|left/.test(s)) { const l = S.meds.filter(lowStock); return l.length ? 'These may need a refill soon:\n' + l.map(x => `• ${x.name} — about ${daysLeft(x)} days left`).join('\n') : 'All medicines have more than 10 days of supply.'; }
  if (/medicine|pill|tablet|medication|మందు/.test(s)) {
    if (/next/.test(s)) { const n = ts.find(x => x.type === 'med' && x.st !== 'done'); return n ? `Next medication is at ${fmt(n.time)}: ${n.detail}.` : 'All medications for today are done ✅'; }
    return 'Medicines on record:\n' + S.meds.map(x => `• ${x.name} ${x.dose} — ${x.times.map(z => fmt(toMin(z))).join(', ')}`).join('\n');
  }
  if (/next|schedule|today|my day|plan|ఈ రోజు/.test(s) && !/summar/.test(s)) {
    const r = ts.filter(x => x.st !== 'done'); return r.length ? `Still to do today:\n` + r.map(x => `• ${fmt(x.time)} — ${x.title} (${LABEL[x.st].toLowerCase()})`).join('\n') : 'Everything is done for today 🎉';
  }
  if (/miss|overdue|late|adherence|forgot|streak/.test(s)) { const a = adherence(); return `Recorded adherence over 30 days: ${a.pct}% (${a.ok}/${a.sched} doses).\n` + observations().slice(0, 2).join('\n'); }
  if (/summar|report|update|status|activity|how (is|was)/.test(s)) return daySummary();
  if (/prep|question/.test(s)) { const a = nextAppts()[0]; return a ? `For ${a.title} with ${a.doctor}:\n` + (a.questions.map(x => '• ' + x).join('\n') || '• (no questions saved yet)') + '\n\nOpen Appointments → "Preparation sheet" to download a full sheet.' : 'No upcoming appointments.'; }
  if (/handover|shift|nurse/.test(s)) { const h = S.handovers[0]; return h ? `Latest handover from ${h.by} (${h.when}):\n${h.text}` : 'No handovers yet.'; }
  if (/allerg|blood group|emergency card|passport/.test(s)) { const e = S.emergency; return `Emergency card — allergies: ${e.allergies}. Blood group: ${e.blood}. Conditions: ${e.conditions}.`; }
  if (/^(hi|hello|hey|namaste)|నమస్తే/.test(s)) return `Hello ${m.name.split(' ')[0]}! 😊 Ask me about your medicines, appointments or today's schedule.`;
  if (/help|how|what can you/.test(s)) return 'I can: read your schedule, list medicines, find appointments, flag low supply, summarize today, prepare doctor questions, and mark a dose as done ("I took it"). Try the buttons below — or tap 🎤 and speak.';
  return 'I can help with your schedule, medicines, appointments, supply and summaries. Try one of the suggestions below. (I never give medical advice.)';
}
const hasAiConnection = () => !!(S.gkey || window.CAREVERSE_AI_URL);
async function gemini(q) {
  const ctx = { date: todayISO(), time: fmt(now()), tasks: tasks().map(x => ({ title: x.title, time: fmt(x.time), status: x.st, detail: x.detail })), medicines: S.meds.map(m => ({ name: m.name, dose: m.dose, times: m.times, daysLeft: daysLeft(m) })), appointments: nextAppts().map(a => ({ title: a.title, doctor: a.doctor, date: a.date, time: a.time, place: a.place })), adherence30: adherence().pct, lastHandover: S.handovers[0]?.text };
  const body = {
    systemInstruction: { parts: [{ text: `You are CareVerse, a warm, concise assistant inside an elderly-care app. Answer ONLY from the JSON data given. Never give medical advice, diagnoses or dosage recommendations; if asked, say to consult the doctor. Keep answers under 90 words, plain language${(S.ai || 'en') !== 'en' ? ', reply in ' + langInfo(S.ai).name : ''}.` }] },
    contents: [{ role: 'user', parts: [{ text: `DATA:\n${JSON.stringify(ctx)}\n\nQUESTION: ${q}` }] }]
  };
  if (window.CAREVERSE_AI_URL && !S.gkey) {
    const pr = await fetch(window.CAREVERSE_AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, context: ctx, instruction: body.systemInstruction.parts[0].text }) });
    const pj = await pr.json().catch(() => ({}));
    if (!pr.ok || !pj.text) throw new Error(pj.error || ('ai proxy ' + pr.status));
    return pj.text;
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(S.gkey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('gemini ' + r.status);
  const j = await r.json(); return j.candidates[0].content.parts.map(p => p.text).join('');
}
function renderChat() {
  $('#chat').innerHTML = ui.chat.map(c => `<div class="msg ${c.me ? 'me' : 'bot'}">${c.html || nl2br(c.t)}</div>`).join('');
  $('#chat').scrollTop = 1e9; $('#chips').innerHTML = CHIPS.map(c => `<button type="button" data-act="chip" data-q="${esc(c)}">${esc(c)}</button>`).join('');
  renderAiBar();
}
function openAssistant(forceOpen) {
  const p = $('#assistant'); p.hidden = forceOpen === true ? false : !p.hidden;
  if (!p.hidden) { if (!ui.chat.length) ui.chat.push({ t: `Hi ${me() ? me().name.split(' ')[0] : ''}! I'm your CareVerse assistant ✨ Ask me about today's schedule, medicines, appointments or supply. You can also tap 🎤 and speak (English or తెలుగు).` }); renderChat(); setTimeout(() => $('#chat-input').focus(), 50); }
}

/* ---------- actions ---------- */
const actions = {
  login(d) { S.meId = d.id; ui.page = 'home'; save(); render(); setTimeout(() => $('#view')?.focus(), 30); },
  logout() { S.meId = null; save(); closeModal(); render(); },
  nav(d) { ui.page = d.p; closeModal(); render(); window.scrollTo(0, 0); $('#view')?.focus(); },
  done(d) { complete(d.id); },
  sosAsk() { openModal(`<h2>🆘 Send an alert?</h2><p>This will immediately tell your whole Care Circle that you need help.</p><div class="row"><button class="btn danger xl" data-act="sos">Yes — I need help</button><button class="btn xl" data-act="close">No, cancel</button></div>`); },
  sos() { closeModal(); triggerSos(); },
  ackSos() { S.sos.ack = true; feed(`${me().name.split(' ')[0]} is responding to the SOS`, '🚑', me().name); toast('Marked as responding — the circle can see this', 'ok'); save(); render(); },
  nudge() { feed(`Sent a gentle voice reminder to ${elderFirst()}`, '🔔'); toast(`🔔 Gentle reminder sent to ${elderFirst()}`, 'ok'); save(); render(); },
  qlog(d) { const [tx, ic] = d.t.split('|'); feed(tx, ic); toast(`${ic} Logged: ${tx}`, 'ok'); save(); render(); },
  call() { openModal(`<h2>📞 Call family</h2><div class="stack">${S.circle.filter(m => m.role !== 'elder').map(m => `<a class="btn xl" style="text-decoration:none" href="tel:${m.phone.replace(/\s/g, '')}">${m.emoji} ${esc(m.name.split(' ')[0])} — ${esc(m.rel.split('·')[0])}</a>`).join('')}</div><button class="btn" data-act="close">Close</button>`); },
  clock(d) { S.clock = Math.max(0, Math.min(1439, S.clock + (+d.m))); save(); render(); },
  live() { S.live = !S.live; save(); render(); },
  reset() { if (confirm('Reset all demo data to the starting state?')) { const keep = { lang: S.lang, theme: S.theme, size: S.size, voice: S.voice, motion: S.motion, gkey: S.gkey, meId: S.meId, ai: S.ai, rate: S.rate, trOk: S.trOk, uiTr: S.uiTr }; S = Object.assign(seed(), keep); migrate(); ui.chat = []; save(); render(); toast('Demo data reset', 'ok'); } },
  settings() { settingsModal(); }, close() { closeModal(); },
  assistant() { openAssistant(); }, mic() { listen(); }, chip(d) { ask(d.q); },
  medForm(d) { medForm(d.id, d.scan); },
  ocrSample() { ocrFill(SAMPLE_LABEL, $('#ocr-status')); },
  delMed(d) { if (confirm('Remove this medicine?')) { S.meds = S.meds.filter(m => m.id !== d.id); feed('Medicine removed', '🗑'); save(); render(); } },
  refill(d) { const m = S.meds.find(x => x.id === d.id); m.stock += 30; feed(`${m.name} refilled (+30)`, '🛒'); toast(`${m.name} stock updated`, 'ok'); save(); render(); },
  notifyRefill(d) { const m = S.meds.find(x => x.id === d.id); feed(`Refill requested: ${m.name} (~${daysLeft(m)} days left)`, '📣'); toast('📣 Family notified to arrange a refill', 'ok'); save(); render(); },
  apptForm() { apptForm(); }, delAppt(d) { if (confirm('Remove this appointment?')) { S.appts = S.appts.filter(a => a.id !== d.id); save(); render(); } },
  prep(d) {
    const a = S.appts.find(x => x.id === d.id), b = prepBlocks(a);
    openModal(`<h2>📝 Appointment preparation</h2><div class="sheet">${b.map(x => `<h3>${esc(x.h)}</h3><ul>${x.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}</div><p class="small muted">Based only on recorded entries. Not medical advice.</p><div class="row"><button class="btn primary" data-act="prepPdf" data-id="${a.id}">⬇ Download PDF</button><button class="btn ghost" data-act="close">Close</button></div>`);
  },
  prepPdf(d) { const a = S.appts.find(x => x.id === d.id); makePdf('Doctor visit preparation — ' + a.title, prepBlocks(a), 'visit-prep.pdf'); },
  ctab(d) { ui.circleTab = d.k; render(); },
  handoverForm() { openModal(`<h2>✍ Write handover</h2>${handoverFormHtml()}`); },
  aiHandover() { const el = $('#ho-text'); el.value = `Handover from ${me().name.split(' ')[0]} (${fmt(now())}):\n` + daySummary(); },
  docForm() { openModal(`<h2>Add to Health Locker</h2><form class="form" data-form="doc"><label>Document name<input name="name" required></label><label>Type<select name="type"><option>Report</option><option>Prescription</option><option>Insurance</option><option>Other</option></select></label><label>File (optional, small files only)<input type="file" name="file" id="doc-file"></label><div class="row"><button class="btn primary" type="submit">Save</button><button type="button" class="btn ghost" data-act="close">Cancel</button></div></form>`); },
  delDoc(d) { if (confirm('Remove this document?')) { S.docs = S.docs.filter(x => x.id !== d.id); save(); render(); } },
  passForm() { passForm(); },
  printCard() { window.print(); },
  share() { S.shares.push({ id: uid(), token: uid() + uid(), exp: Date.now() + 24 * 3600e3 }); feed('Created a 24-hour emergency share link', '🔗'); toast('🔗 Secure link created — expires in 24 hours', 'ok'); save(); render(); },
  revoke(d) { S.shares = S.shares.filter(x => x.id !== d.id); feed('Revoked a share link', '🚫'); save(); render(); },
  responder(d) { openModal(`<h2>🔐 Responder access</h2><form class="form" data-form="pin" data-id="${d.id}"><label>Enter PIN (demo: 1234)<input name="pin" inputmode="numeric" maxlength="4" required autofocus></label><button class="btn primary" type="submit">Unlock card</button></form>`); },
  async aiSummary() { const b = $('#sum-box'); let txt = daySummary(); if (S.gkey) { b.textContent = '✨ Thinking…'; try { txt = await gemini('Write a warm 3-sentence summary of today for the family, using only the data.'); } catch (e) { } } b.textContent = txt; },
  report() { makePdf('Monthly care activity report — ' + S.emergency.name, reportBlocks(), 'careverse-monthly-report.pdf'); },
  enableNotif() { if (!('Notification' in window)) return toast('Notifications are not supported here', 'warn'); Notification.requestPermission().then(p => toast(p === 'granted' ? '🔔 Browser notifications on' : 'Notifications not allowed', p === 'granted' ? 'ok' : 'warn')); }
};
const forms = {
  med(v, f) {
    const times = [v.t0, v.t1, v.t2].filter(Boolean), id = f.dataset.id;
    const obj = { name: v.medname.trim(), dose: v.dose.trim(), times: [...new Set(times)].sort(), stock: +v.stock || 0, note: v.note.trim() };
    if (id) { Object.assign(S.meds.find(m => m.id === id), obj); feed(`Updated ${obj.name}`, '✏️'); } else { S.meds.push({ id: uid(), ...obj }); feed(`Added medicine: ${obj.name} ${obj.dose}`, '💊'); }
    closeModal(); toast('Medicine saved ✅', 'ok'); save(); render();
  },
  appt(v) { S.appts.push({ id: uid(), title: v.title, doctor: v.doctor, place: v.place, date: v.date, time: v.time, questions: v.questions.split('\n').map(s => s.trim()).filter(Boolean), docs: v.docs.split(',').map(s => s.trim()).filter(Boolean), checks: {} }); feed(`Appointment scheduled: ${v.title} on ${fmtDate(v.date)}`, '📅'); closeModal(); save(); render(); toast('Appointment saved 📅', 'ok'); },
  handover(v) { S.handovers.unshift({ id: uid(), by: me().name, when: 'Today ' + fmt(now()), text: v.text.trim() }); feed('Shift handover left for the next caregiver', '🤝'); closeModal(); toast('Handover saved 🤝', 'ok'); save(); render(); },
  invite(v) { S.circle.push({ id: uid(), name: v.name, rel: v.rel, role: v.role, emoji: v.role === 'caregiver' ? '🧑‍⚕️' : '🧑', perms: { edit: false, locker: false, reports: false }, phone: '' }); feed(`${v.name} invited to the Care Circle`, '💌'); save(); render(); toast('Invite sent (demo) 💌', 'ok'); },
  policy(v) { S.policy = { overdue: +v.overdue, notify: Math.max(+v.notify, +v.overdue + 5) }; if (v.checkin) S.checkinTime = v.checkin; S.alerts = {}; save(); render(); toast('Policy saved', 'ok'); },
  pass(v) { Object.assign(S.emergency, v); feed('Emergency card updated', '⛑'); closeModal(); save(); render(); },
  doc(v) {
    const f = $('#doc-file')?.files[0], finish = url => { S.docs.unshift({ id: uid(), name: v.name, type: v.type, date: todayISO(), url }); feed(`Document added: ${v.name}`, '📁'); closeModal(); save(); render(); };
    if (f && f.size < 300000) { const r = new FileReader(); r.onload = () => finish(r.result); r.readAsDataURL(f); } else finish('');
  },
  pin(v, f) {
    const s = S.shares.find(x => x.id === f.dataset.id);
    if (!s || s.exp < Date.now()) return openModal('<h2>Link expired</h2><p>This share link is no longer valid.</p><button class="btn" data-act="close">Close</button>');
    if (v.pin !== '1234') return toast('Wrong PIN', 'bad');
    const e = S.emergency;
    openModal(`<div class="pass"><h3>⛑ Emergency Care Card — responder view</h3><b style="font-size:1.6rem">${esc(e.name)}</b> · ${esc(e.age)} yrs · Blood <b>${esc(e.blood)}</b><dl><dt>Allergies</dt><dd><b>${esc(e.allergies)}</b></dd><dt>Conditions</dt><dd>${esc(e.conditions)}</dd><dt>Medicines</dt><dd>${S.meds.map(m => esc(m.name + ' ' + m.dose)).join(', ')}</dd><dt>Contacts</dt><dd>${esc(e.c1)}<br>${esc(e.c2)}</dd><dt>Notes</dt><dd>${esc(e.notes)}</dd></dl></div><p class="small muted">Read-only · access logged · expires automatically</p><button class="btn" data-act="close">Close</button>`);
    feed('Emergency card opened via share link', '👁', 'Responder');
  }
};
const changes = {
  set(el) {
    const k = el.dataset.k, old = S[k]; S[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'lang') { onUiLang(S.lang, old); return; }
    if (k === 'ai') { setAiLang(S.ai); return; }
    applyPrefs(); save(); render(); renderChat();
  },
  perm(el) { S.circle.find(m => m.id === el.dataset.id).perms[el.dataset.k] = el.checked; save(); toast('Permission updated', 'ok'); },
  duty(el) { S.duties[el.dataset.d][+el.dataset.i] = el.value; save(); toast('Schedule updated', 'ok'); },
  apptCheck(el) { S.appts.find(a => a.id === el.dataset.id).checks[el.dataset.i] = el.checked; save(); }
};
Object.assign(actions, featActions, voiceActions, analyticsActions); Object.assign(forms, featForms); Object.assign(changes, featChanges);
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('.demo-menu')) ui.demoOpen = e.target.open; }, true);
document.addEventListener('click', e => { document.querySelectorAll('details.navdd[open],details.demo-menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); }, true);
document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a && actions[a.dataset.act]) { e.preventDefault(); actions[a.dataset.act](a.dataset, a, e); } });
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (f) { e.preventDefault(); forms[f.dataset.form](Object.fromEntries(new FormData(f)), f); } });
document.addEventListener('change', e => {
  const c = e.target.closest('[data-chg]'); if (c && changes[c.dataset.chg]) changes[c.dataset.chg](c);
  if (e.target.id === 'ocr-file' && e.target.files[0]) runOcr(e.target.files[0]);
});
document.addEventListener('DOMContentLoaded', () => { }); // placeholder for clarity

/* ---------- render ---------- */
function applyPrefs() {
  const h = document.documentElement; h.dataset.theme = S.theme; h.dataset.size = S.size; h.dataset.motion = S.motion ? 'on' : 'off'; h.lang = S.lang; h.dir = ['ur', 'ar'].includes(S.lang) ? 'rtl' : 'ltr';
  document.body.classList.toggle('loggedout', !S.meId);
}
function render() {
  if (S.doneDate !== todayISO()) { S.done = {}; S.alerts = {}; S.sos = null; S.doneDate = todayISO(); save(); }
  applyPrefs(); const app = $('#app');
  if (!S.meId) { app.innerHTML = loginView(); return; }
  checkEscalation();
  const f = document.activeElement && document.activeElement.id;
  app.innerHTML = `<div class="app" data-role="${me().role}">${topNav()}<div class="col">${pageHead()}<main id="view" tabindex="-1" aria-labelledby="pgt">${page()}</main></div>${bottomBar()}</div>`;
  document.body.dataset.role = me().role;
  if (me().role !== 'elder') tidy(app);
  if (f && $('#' + f)) $('#' + f).focus();
}
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); const i = $('#chat-input'); ask(i.value); i.value = ''; });

/* ---------- boot ---------- */
S = load() || seed();
if (!S.DUTIES) S = seed();
migrate();
render(); renderChat();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
setInterval(() => { if (S.live && S.meId && !modal().open) render(); }, 30000);

// Keep the Family / More drop-downs right under their tab, even when the tab row scrolls sideways.
document.addEventListener('toggle', e => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.classList.contains('navdd') || !d.open) return;
  const dd = d.querySelector('.dd'), r = d.getBoundingClientRect();
  if (!dd) return;
  dd.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 236)) + 'px';
  dd.style.top = r.bottom + 'px';
}, true);
