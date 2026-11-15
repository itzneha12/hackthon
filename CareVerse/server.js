'use strict';
// Optional local Gemini proxy. The API key stays on the server, not in the browser.
// Node.js 18+ is required; no npm packages are needed.
const http = require('node:http');
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.CAREVERSE_AI_MODEL || 'gemini-3.8-flash';
const API_KEY = process.env.GEMINI_API_KEY || '';
const ALLOWED_ORIGIN = process.env.CAREVERSE_ALLOWED_ORIGIN || '';

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function cors(req, res) {
  const origin = req.headers.origin || '';
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && (local || (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN))) {
    res.setHeader('Access-Control-Allow-Origin', local ? origin : ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 70000) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON body')); } });
    req.on('error', reject);
  });
}
const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true, aiConfigured: Boolean(API_KEY), model: MODEL });
  if (req.method !== 'POST' || path !== '/api/ai') return send(res, 404, { error: 'Not found' });
  if (!API_KEY) return send(res, 503, { error: 'Server Gemini key is not configured. Set GEMINI_API_KEY in the server terminal.' });
  try {
    const input = await readBody(req);
    const question = String(input.question || '').trim().slice(0, 2000);
    if (!question) return send(res, 400, { error: 'Question is required.' });
    const context = input.context && typeof input.context === 'object' ? input.context : {};
    const instruction = String(input.instruction || 'You are CareVerse, a concise elderly-care coordination assistant. Use only the supplied records. Do not diagnose, prescribe or recommend dosage changes.').slice(0, 2500);
    const payload = {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [{ role: 'user', parts: [{ text: `RECORDED CARE DATA:\n${JSON.stringify(context).slice(0, 12000)}\n\nQUESTION:\n${question}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 350 }
    };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return send(res, response.status, { error: result.error?.message || `Gemini API returned ${response.status}` });
    const text = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) return send(res, 502, { error: 'Gemini returned an empty response.' });
    return send(res, 200, { text, model: MODEL });
  } catch (error) {
    return send(res, 500, { error: String(error.message || 'AI proxy failed').slice(0, 200) });
  }
});
server.listen(PORT, () => console.log(`CareVerse AI proxy listening at http://localhost:${PORT} (${MODEL})`));
