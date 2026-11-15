'use strict';

/* =====================================================================

   CareVerse multilingual voice — loaded BEFORE app.js (declarations only)

   • 16 languages for the app labels AND for the AI's voice/answers

   • Speak (device voice, or Google online voice if none installed)

   • Listen (speech recognition in the chosen language)

   • Hands-free conversation mode (listen → answer aloud → listen…)

   • Translation: Gemini if a key is set, else Google Translate (opt-in)

   ===================================================================== */

const LANGS = [

    { c: 'en', name: 'English', nat: 'English', bcp: 'en-IN' },

    { c: 'te', name: 'Telugu', nat: 'తెలుగు', bcp: 'te-IN' },

    { c: 'hi', name: 'Hindi', nat: 'हिन्दी', bcp: 'hi-IN' },

    { c: 'ta', name: 'Tamil', nat: 'தமிழ்', bcp: 'ta-IN' },

    { c: 'kn', name: 'Kannada', nat: 'ಕನ್ನಡ', bcp: 'kn-IN' },

    { c: 'ml', name: 'Malayalam', nat: 'മലയാളം', bcp: 'ml-IN' },

    { c: 'mr', name: 'Marathi', nat: 'मराठी', bcp: 'mr-IN' },

    { c: 'bn', name: 'Bengali', nat: 'বাংলা', bcp: 'bn-IN' },

    { c: 'gu', name: 'Gujarati', nat: 'ગુજરાતી', bcp: 'gu-IN' },

    { c: 'pa', name: 'Punjabi', nat: 'ਪੰਜਾਬੀ', bcp: 'pa-IN' },

    { c: 'ur', name: 'Urdu', nat: 'اردو', bcp: 'ur-IN' },

    { c: 'or', name: 'Odia', nat: 'ଓଡ଼ିଆ', bcp: 'or-IN' },

    { c: 'es', name: 'Spanish', nat: 'Español', bcp: 'es-ES' },

    { c: 'fr', name: 'French', nat: 'Français', bcp: 'fr-FR' },

    { c: 'ar', name: 'Arabic', nat: 'العربية', bcp: 'ar-SA' },

    { c: 'zh', name: 'Chinese', nat: '中文', bcp: 'zh-CN', tts: 'zh-CN' }

];

const HI = {

    'Home': 'होम', 'My Day': 'मेरा दिन', 'Medicines': 'दवाइयाँ', 'Appointments': 'अपॉइंटमेंट', 'Care Circle': 'केयर सर्कल', 'Health Passport': 'स्वास्थ्य पासपोर्ट',

    'Insights': 'जानकारी', 'Good morning': 'सुप्रभात', 'Good afternoon': 'शुभ दोपहर', 'Good evening': 'शुभ संध्या', 'Next up': 'अगला', 'I took it': 'मैंने ले ली',

    'Done': 'हो गया', 'I need help': 'मुझे मदद चाहिए', 'Talk to me': 'मुझसे बात करें', 'Call family': 'परिवार को कॉल करें', 'Needs attention': 'ध्यान चाहिए',

    'tasks completed': 'कार्य पूरे', "Today's activity": 'आज की गतिविधियाँ', 'Completed': 'पूरा हुआ', 'Upcoming': 'आगामी', 'Reminder': 'रिमाइंडर', 'Pending': 'लंबित',

    'Overdue': 'देर हो गई', 'Caregiver notified': 'देखभालकर्ता को सूचित किया', 'Emergency card': 'आपातकालीन कार्ड', 'All done for today': 'आज का सब हो गया',

    'Settings': 'सेटिंग्स', 'Now': 'अभी', 'Wellness': 'स्वास्थ्य', 'Family Wall': 'परिवार संदेश', 'Relax & Brain': 'आराम और दिमाग', 'Help': 'मदद',

    'Tasks & Journal': 'कार्य और डायरी', 'Expenses': 'खर्चे', 'How are you today?': 'आज आप कैसे हैं?', 'Check in': 'चेक-इन', 'Send love': 'प्यार भेजें',

    'Read to me': 'मुझे पढ़कर सुनाएँ', 'Water': 'पानी', 'Today is': 'आज है'

};

const langInfo = c => LANGS.find(l => l.c === c) || LANGS[0];

const uiText = (c, k) => c === 'te' ? TE[k] : c === 'hi' ? HI[k] : (S.uiTr && S.uiTr[c] && S.uiTr[c][k]);

const BUILTIN_UI = ['en', 'te', 'hi'];



/* ---------- translation ---------- */

const trCache = new Map();

const canTranslate = () => !!(S.gkey || S.trOk);

async function gtx(text, tl, sl = 'auto') {

    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${tl}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'q=' + encodeURIComponent(text) });

    if (!r.ok) throw new Error('gtx ' + r.status);

    const j = await r.json(); return j[0].map(x => x[0]).join('');

}

async function geminiTranslate(text, tl) {

    const name = tl === 'en' ? 'English' : langInfo(tl).name;

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(S.gkey)}`, {

        method: 'POST', headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Translate the following text to ${name}. Output only the translation. Keep line breaks, bullets and numbers.\n\n${text}` }] }] })

    });

    if (!r.ok) throw new Error('gemini ' + r.status);

    return (await r.json()).candidates[0].content.parts.map(p => p.text).join('').trim();

}

async function translate(text, tl, sl) {

    if (!text || tl === sl) return text;

    const k = tl + '|' + text; if (trCache.has(k)) return trCache.get(k);

    let out = text;

    try { out = S.gkey ? await geminiTranslate(text, tl) : (S.trOk ? await gtx(text, tl, sl || 'auto') : text); }

    catch (e) { if (S.gkey && S.trOk) { try { out = await gtx(text, tl, sl || 'auto'); } catch (_) { } } }

    if (out !== text) trCache.set(k, out);

    return out;

}

/* ---- consent (in-app dialog; window.confirm can be silently blocked) ---- */

function askConsent(c) {

    return new Promise(res => {

        ui.consentRes = res;

        openModal(`<h2>🌐 Show CareVerse in ${langInfo(c).name}?</h2>

      <p>To translate screens and answers, CareVerse sends the words shown on screen — <b>including names, medicine names and notes</b> — to Google Translate. Nothing else, and no account details.</p>

      <p class="small muted">Choose English any time to stop. Adding a Gemini key in Settings uses Gemini instead of Google Translate.</p>

      <div class="row"><button class="btn primary xl" data-act="consentYes">Yes, translate</button><button class="btn xl" data-act="consentNo">No, keep English</button></div>`);

    });

}

async function consentTr(c, strict) {

    if (c === 'en' || (!strict && BUILTIN_UI.includes(c)) || canTranslate()) return true;

    const ok = await askConsent(c); S.trOk = ok; save(); return ok;

}

{ const m = document.getElementById('modal'); if (m) m.addEventListener('close', () => { if (ui.consentRes) { const r = ui.consentRes; ui.consentRes = null; r(false); } }); }



async function loadUiLang(c) {

    if (BUILTIN_UI.includes(c)) return;

    S.uiTr = S.uiTr || {}; const keys = Object.keys(TE);

    if (S.uiTr[c] && keys.every(k => S.uiTr[c][k])) return;

    try {

        const out = await translate(keys.join('\n'), c, 'en'), parts = out.split(/\n+/).map(s => s.trim());

        if (parts.length === keys.length && out !== keys.join('\n')) { S.uiTr[c] = Object.assign(S.uiTr[c] || {}, Object.fromEntries(keys.map((k, i) => [k, parts[i]]))); save(); }

    } catch (e) { }

}

async function onUiLang(c, old) {

    const ok = await consentTr(c);

    if (!ok && !BUILTIN_UI.includes(c)) { S.lang = old; toast('Staying in the previous language — other languages need online translation.', 'warn'); applyPrefs(); render(); return; }

    if ((S.ai === old || !S.ai) && (c === 'en' || canTranslate())) S.ai = c;

    await loadUiLang(c); save(); applyPrefs(); render(); renderChat(); scheduleTr();

    if (S.ai === c) announceLang(c);

}

async function setAiLang(c) {

    if (c !== 'en' && !(await consentTr(c, true))) { toast('Staying in English — talking in other languages needs online translation.', 'warn'); c = 'en'; }

    S.ai = c; save(); renderChat(); announceLang(c);

}

function announceLang(c) {

    if (c === 'en' || hasVoice(c) || cloudOk()) say(`Hello! I will talk with you in ${langInfo(c).name} now.`, true);

    else noVoiceHint(c);

}



/* ---- whole-page translation: every visible text on every screen ---- */

const _o = new WeakMap(); let _trT = null, _running = false, _again = false, _applying = false, _failedOnce = false;

const norm = s => s.replace(/\s+/g, ' ').trim();

const SKIPSTR = /^(CareVerse|SILVERGUARD AI|CarePulse|SOS|Aa|AM|PM|OK|ECG|BP|SpO₂)$/;

const needs = s => /[A-Za-z]{2,}/.test(s) && !SKIPSTR.test(s) && !/^[\d\s:.,/%₹+\-–—·•|()]+(?:AM|PM|mg|ml|mcg|IU|kg|mmHg|bpm|min|h|m[g/dL]+)?[\d\s:.,/%₹+\-–—·•|()]*$/i.test(s);

const TR_ROOTS = ['#app', '#modal', '#toasts', '#assistant'];

function trTextNodes() {

    const out = [];

    TR_ROOTS.map(x => document.querySelector(x)).filter(Boolean).forEach(r => {

        const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {

            acceptNode(n) {

                const p = n.parentElement;

                if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName) || p.closest('.msg,#ai-lang,.langsel,svg,[data-notr]')) return NodeFilter.FILTER_REJECT;

                if (p.tagName === 'OPTION' && p.closest('select[data-k=lang],select[data-k=ai]')) return NodeFilter.FILTER_REJECT;

                return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;

            }

        });

        let n; while ((n = w.nextNode())) out.push(n);

    });

    return out;

}

const TR_ATTRS = ['placeholder', 'aria-label', 'title'];

function trAttrEls() { return [...document.querySelectorAll(TR_ROOTS.map(r => `${r} [placeholder],${r} [aria-label],${r} [title]`).join(','))].filter(e => !e.closest('#ai-lang,.langsel,[data-notr]')); }

function setText(n, tr) { const o = _o.get(n), lead = o.match(/^\s*/)[0], trail = o.match(/\s*$/)[0]; n.nodeValue = lead + tr + trail; }

function applyTr(cache) {

    _applying = true;

    trTextNodes().forEach(n => { let o = _o.get(n); if (o === undefined) { o = n.nodeValue; _o.set(n, o); } const k = norm(o); if (cache[k]) setText(n, cache[k]); else if (n.nodeValue !== o) n.nodeValue = o; });

    trAttrEls().forEach(e => { e.__oa = e.__oa || {}; TR_ATTRS.forEach(a => { if (!e.hasAttribute(a)) return; if (e.__oa[a] === undefined) e.__oa[a] = e.getAttribute(a); const k = norm(e.__oa[a]); if (needs(k) && cache[k]) e.setAttribute(a, cache[k]); }); });

    _obs.takeRecords(); _applying = false;

}

function restoreEnglish() {

    _applying = true;

    trTextNodes().forEach(n => { const o = _o.get(n); if (o !== undefined && n.nodeValue !== o) n.nodeValue = o; });

    trAttrEls().forEach(e => { if (e.__oa) TR_ATTRS.forEach(a => { if (e.__oa[a] !== undefined && e.hasAttribute(a)) e.setAttribute(a, e.__oa[a]); }); });

    _obs.takeRecords(); _applying = false;

}

function scheduleTr() { clearTimeout(_trT); _trT = setTimeout(runTr, 40); }

function trPill(on) { let p = document.getElementById('trstat'); if (!p) { p = document.createElement('div'); p.id = 'trstat'; p.setAttribute('role', 'status'); p.textContent = '🌐 Translating…'; document.body.appendChild(p); } p.hidden = !on; }

async function runTr() {

    if (!S) return;

    if (S.lang === 'en') { restoreEnglish(); return; }

    if (!canTranslate()) return;

    if (_running) { _again = true; return; }

    _running = true;

    try {

        const lang = S.lang; S.uiTr = S.uiTr || {}; const cache = S.uiTr[lang] = S.uiTr[lang] || {};

        applyTr(cache);

        const miss = new Set();

        trTextNodes().forEach(n => { const k = norm(_o.get(n) ?? n.nodeValue); if (needs(k) && !cache[k] && k.length < 400) miss.add(k); });

        trAttrEls().forEach(e => TR_ATTRS.forEach(a => { const v = e.__oa && e.__oa[a]; if (v && needs(norm(v)) && !cache[norm(v)]) miss.add(norm(v)); }));

        const list = [...miss]; if (!list.length) return;

        trPill(true); let any = false;

        for (let i = 0; i < list.length && lang === S.lang; i += 30) {

            const chunk = list.slice(i, i + 30); let parts = [];

            try { parts = (await translate(chunk.join('\n'), lang, 'en')).split('\n').map(x => x.trim()); } catch (e) { }

            if (parts.length !== chunk.length) { parts = []; for (const k of chunk) { try { parts.push(await translate(k, lang, 'en')); } catch (e) { parts.push(k); } } }

            chunk.forEach((k, j) => { if (parts[j] && parts[j] !== k) { cache[k] = parts[j]; any = true; } });

            if (lang === S.lang) applyTr(cache);

        }

        save();

        if (!any && !_failedOnce) { _failedOnce = true; toast('Could not reach the translation service — check your internet connection.', 'warn'); }

    } finally { _running = false; trPill(false); if (_again) { _again = false; scheduleTr(); } }

}

const _obs = new MutationObserver(() => { if (!_applying) scheduleTr(); });

TR_ROOTS.forEach(r => { const e = document.querySelector(r); if (e) _obs.observe(e, { childList: true, subtree: true, characterData: true }); });



/* ---------- speaking ---------- */

let _voices = [];

if ('speechSynthesis' in window) { const lv = () => { _voices = speechSynthesis.getVoices(); }; lv(); speechSynthesis.addEventListener('voiceschanged', lv); }

const vnorm = v => v.lang.toLowerCase().replace('_', '-');

const pickVoice = bcp => { const l = bcp.toLowerCase(), b = l.split('-')[0]; return _voices.find(v => vnorm(v) === l) || _voices.find(v => vnorm(v).split('-')[0] === b); };

function chunks(t, max = 170) {

    const out = [];

    t.split(/(?<=[.!?।؟。])\s+/).forEach(s => { while (s.length > max) { let i = s.lastIndexOf(' ', max); if (i < 40) i = max; out.push(s.slice(0, i)); s = s.slice(i); } if (s.trim()) out.push(s.trim()); });

    return out;

}

function setSpeakUi() { const b = $('#btn-stop'); if (b) b.hidden = !ui.speaking; }

function stopTalk() {

    ui.speaking = false; ui.talkId = (ui.talkId || 0) + 1;

    try { speechSynthesis.cancel(); } catch (e) { }

    if (ui.audio) { try { ui.audio.pause(); } catch (e) { } ui.audio = null; }

    setSpeakUi();

}

function talk(text, done, force) {

    if (!(S.voice || force)) { done && done(); return; }

    stopTalk(); const id = ui.talkId;

    text = text.replace(/[•✅🎉✨💧🔔⚠️📣🆘💛❤️🤍🔊⏳]/gu, '').replace(/\s*\n+\s*/g, '. ').trim();

    if (!text) { done && done(); return; }

    const L = langInfo(S.ai), v = 'speechSynthesis' in window ? pickVoice(L.bcp) : null, parts = chunks(text);

    ui.speaking = true; setSpeakUi();

    const finish = () => { if (id !== ui.talkId) return; ui.speaking = false; setSpeakUi(); done && done(); };

    if (v) {

        let i = 0; const next = () => { if (id !== ui.talkId) return; if (i >= parts.length) return finish(); const u = new SpeechSynthesisUtterance(parts[i++]); u.voice = v; u.lang = v.lang; u.rate = +S.rate || .9; u.onend = next; u.onerror = next; speechSynthesis.speak(u); };

        next(); return;

    }

    // no device voice → Gemini voice (if the user added a key), else text only

    if (cloudOk()) { cloudSpeak(parts.join(' '), id).then(ok => { if (ok) finish(); else { ui.speaking = false; setSpeakUi(); noVoiceHint(S.ai); done && done(); } }); return; }

    ui.speaking = false; setSpeakUi(); noVoiceHint(S.ai); done && done();

}

const hasVoice = c => 'speechSynthesis' in window && !!pickVoice(langInfo(c).bcp);

function noVoiceHint(c) {

    ui.hinted = ui.hinted || {}; if (ui.hinted[c]) return; ui.hinted[c] = 1;

    const n = langInfo(c).name, edge = 'microsoft-edge:' + location.origin + '/';

    ui.chat.push({ html: `<b>🔇 This browser has no ${esc(n)} voice.</b><br>To hear me speak ${esc(n)}:<br>① <a class="btn sm" href="${edge}">Open in Microsoft Edge</a> — free natural voices<br>② or <button class="btn sm" data-act="settings">Add a free Gemini key / voice server</button> — works in Chrome<br><span class="small">Until then I reply in text.</span>` });

    renderChat(); toast(`No ${n} voice in Chrome — see the message in the assistant for 2 easy fixes.`, 'warn');

}

function voiceStatusHtml() {

    return `<div class="small"><b>Voice status in this browser</b><div class="vgrid">${LANGS.map(l => { const ok = l.c === 'en' || hasVoice(l.c) || cloudOk(); return `<span class="vchip ${ok ? 'ok' : ''}">${ok ? '🔊' : '🔇'} ${l.nat}</span>`; }).join('')}</div><p class="muted" style="margin-top:6px">${cloudOk() ? '✅ Cloud voice is on' + (voiceUrl() ? ' (voice server)' : ' (your Gemini key)') + ', so every language can speak.' : '🔇 means no voice here. Fix: open in <b>Microsoft Edge</b> (free, natural Indian voices) or add a free <b>Gemini key</b> below.'}</p></div>`;

}

const voiceUrl = () => String(S.ttsUrl || window.CAREVERSE_VOICE_URL || '').trim().replace(/\/+$/, '');

const cloudOk = () => !!(S.gkey || voiceUrl());

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function playBuffer(ab, id) {

    const ctx = ui.ctx || (ui.ctx = new (window.AudioContext || window.webkitAudioContext)());

    await Promise.race([ctx.resume(), sleep(1500)]);

    const buf = await ctx.decodeAudioData(ab);

    if (id !== ui.talkId) return true;

    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);

    return await new Promise(res => { ui.audio = { pause() { try { src.stop(); } catch (e) { } res(true); } }; src.onended = () => res(true); src.start(); });

}

async function serverSpeak(text, id) {

    const u = voiceUrl(); if (!u) return false;

    try {

        const r = await fetch(u + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: langInfo(S.ai).name, code: S.ai }) });

        if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) { } ui.ttsErr = `voice server ${r.status} ${m || ''}`.trim(); return false; }

        return await playBuffer(await r.arrayBuffer(), id);

    } catch (e) { ui.ttsErr = 'voice server unreachable (' + String(e.message || e).slice(0, 60) + ')'; return false; }

}

async function cloudSpeak(text, id) {

    if (voiceUrl() && await serverSpeak(text, id)) return true;

    if (S.gkey) return await geminiSpeak(text, id);

    return false;

}

async function geminiSpeak(text, id) {

    const models = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts'];

    for (const m of models) {

        try {

            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(S.gkey)}`, {

                method: 'POST', headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ contents: [{ parts: [{ text: `Say this warmly and slowly in ${langInfo(S.ai).name}: ${text}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } })

            });

            if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) { } ui.ttsErr = `${r.status} ${m}`.slice(0, 160); continue; }

            const j = await r.json(), b64 = j.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;

            if (id !== ui.talkId) return true;

            const bin = atob(b64), pcm = new Int16Array(bin.length / 2);

            for (let i = 0; i < pcm.length; i++) pcm[i] = (bin.charCodeAt(2 * i + 1) << 8 | bin.charCodeAt(2 * i)) << 16 >> 16;

            const ctx = ui.ctx || (ui.ctx = new (window.AudioContext || window.webkitAudioContext)()); await ctx.resume();

            const buf = ctx.createBuffer(1, pcm.length, 24000), ch = buf.getChannelData(0); for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;

            const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);

            return await new Promise(res => { ui.audio = { pause() { try { src.stop(); } catch (e) { } res(true); } }; src.onended = () => res(true); src.start(); });

        } catch (e) { ui.ttsErr = ui.ttsErr || String(e).slice(0, 120); }

    }

    return false;

}

async function say(text, force) {

    if (!(S.voice || force)) return;

    let t = text; if (S.ai !== 'en') t = await translate(text, S.ai, 'en');

    talk(t, null, force);

}



/* ---------- listening + conversation ---------- */

function listen() {

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) { toast('Voice input needs Chrome or Edge. You can type instead.', 'warn'); openAssistant(true); return; }

    if (ui.listening && ui.rec) { ui.rec.stop(); return; }

    stopTalk(); if ($('#assistant').hidden) openAssistant(true);

    const r = new SR(); r.lang = langInfo(S.ai).bcp; r.interimResults = true; r.maxAlternatives = 1; ui.rec = r; ui.err = ''; let final = '';

    r.onstart = () => { ui.listening = true; $('#mic').classList.add('on'); $('#chat-input').placeholder = '🎤 Listening in ' + langInfo(S.ai).name + '…'; };

    r.onresult = e => { let tx = ''; for (const x of e.results) { tx += x[0].transcript; if (x.isFinal) final = tx; } $('#chat-input').value = tx; };

    r.onerror = e => { ui.err = e.error; if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Please allow the microphone (lock icon in the address bar).', 'bad'); if (e.error === 'language-not-supported') toast(`This browser can't listen in ${langInfo(S.ai).name}. Try typing.`, 'warn'); };

    r.onend = () => {

        ui.listening = false; $('#mic').classList.remove('on'); const inp = $('#chat-input'); inp.placeholder = 'Ask about medicines, appointments…';

        const text = (final || inp.value).trim(); inp.value = '';

        if (text) { ui.idle = 0; ask(text); }

        else if (ui.convo) { ui.idle = (ui.idle || 0) + 1; if (ui.idle >= 3 || ui.err === 'not-allowed') { ui.convo = false; setConvoUi(); toast('Hands-free conversation paused'); } else setTimeout(listen, 300); }

    };

    try { r.start(); } catch (e) { }

}

async function ask(q) {

    q = q.trim(); if (!q) return; openAssistant(true);

    ui.chat.push({ me: 1, t: q }); const typing = { t: '…' }; ui.chat.push(typing); renderChat();

    const ai = S.ai || 'en'; let a = null; let aiFailed = false;

    try {


        if (hasAiConnection() && !/\b(took|taken|sos)\b/i.test(q)) { try { a = await gemini(q); } catch (e) { a = null; aiFailed = true; ui.aiError = String(e.message || e); } }

        if (a == null) {

            let qe = q; if (/[^\u0000-ɏ]/.test(q) && canTranslate()) qe = await translate(q, 'en');

            a = answer(qe); if (ai !== 'en' && canTranslate()) a = await translate(a, ai, 'en');

        }

    } catch (e) { a = 'Sorry, something went wrong.'; }

    ui.chat = ui.chat.filter(x => x !== typing); ui.chat.push({ t: a }); renderChat(); if (aiFailed) toast('Gemini is unavailable right now — I used the local assistant instead.', 'warn');

    talk(a, () => { if (ui.convo && !$('#assistant').hidden) setTimeout(listen, 450); });

}



/* ---------- assistant bar ---------- */

function setConvoUi() { const b = $('#btn-convo'); if (b) b.setAttribute('aria-pressed', !!ui.convo); }

function renderAiBar() {

    const sel = $('#ai-lang'); if (!sel) return;

    if (!sel.options.length) sel.innerHTML = LANGS.map(l => `<option value="${l.c}">${l.nat} · ${l.name}</option>`).join('');

    sel.value = S.ai || 'en';

    const v = $('#btn-voice'); if (v) { v.setAttribute('aria-pressed', !!S.voice); v.textContent = S.voice ? '🔊' : '🔇'; }

    setConvoUi(); setSpeakUi();

    const m = $('#ai-mode'); if (m) m.textContent = `${(S.gkey || window.CAREVERSE_AI_URL) ? 'Gemini-connected' : 'Smart local assistant'} · talking in ${langInfo(S.ai).name} ${(S.ai === 'en' || hasVoice(S.ai) || cloudOk()) ? '🔊' : '(text only — see tip)'}`;

}

document.addEventListener('change', e => { if (e.target.id === 'ai-lang') setAiLang(e.target.value); });

const voiceActions = {

    async testVoice() {

        const L = langInfo(S.ai), sample = S.ai === 'en' ? 'Hello! This is your CareVerse assistant speaking.' : await translate('Hello! This is your CareVerse assistant speaking.', S.ai, 'en');

        ui.ttsErr = ''; if (hasVoice(S.ai) || S.ai === 'en') { talk(sample, null, true); toast('🔊 Playing a test in ' + L.name + ' using the voice built into this browser'); return; }

        if (!cloudOk()) { toast('No ' + L.name + ' voice here. Add a voice server URL or a Gemini key, or open in Edge.', 'warn'); return; }

        toast('🔊 Asking the cloud voice to speak ' + L.name + '…'); stopTalk(); const id = ui.talkId; const ok = await cloudSpeak(sample, id);

        toast(ok ? '✅ Cloud voice works!' : '❌ Cloud voice failed: ' + (ui.ttsErr || 'unknown error'), ok ? 'ok' : 'bad');

    },

    consentYes() { const r = ui.consentRes; ui.consentRes = null; closeModal(); r && r(true); },

    consentNo() { const r = ui.consentRes; ui.consentRes = null; closeModal(); r && r(false); },

    voiceToggle() { S.voice = !S.voice; if (!S.voice) stopTalk(); save(); renderAiBar(); toast(S.voice ? '🔊 Voice replies on' : '🔇 Voice replies off'); },

    convo() { ui.convo = !ui.convo; ui.idle = 0; setConvoUi(); if (ui.convo) { S.voice = true; renderAiBar(); toast('🗣 Hands-free: just speak, I will answer and listen again'); listen(); } else { if (ui.rec) try { ui.rec.stop(); } catch (e) { } stopTalk(); } },

    stopTalk() { stopTalk(); ui.convo = false; setConvoUi(); }

};
