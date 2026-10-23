'use strict';
const express = require('express');
const DOMAIN = 'dance studio students and classes';
const FEATURES = {
  'churn-risk': { label: 'Churn Risk', flag: (r) => Number(r.absences||r.missed||0) >= 3 || String(r.status||'').toLowerCase() === 'inactive', describe: (rows, f) => `${f} of ${rows.length} students at churn risk`, recommend: (rows, f) => f ? 'Contact at-risk families.' : 'No churn-risk students.' },
  'class-recommendation': { label: 'Class Recommendation', flag: (r) => !r.level && !r.age_group, describe: (rows, f) => `${f} students missing level or age group`, recommend: (rows, f) => f ? 'Assess students missing placement data.' : 'All students placed.' },
  'schedule-optimizer': { label: 'Schedule Optimizer', flag: (r) => Number(r.enrolled||0) >= Number(r.capacity||9999), describe: (rows, f) => `${f} classes at or over capacity`, recommend: (rows, f) => f ? 'Open waitlist or add sections for full classes.' : 'No full classes.' },
 };

function filterRecords(records, { q, status, priority } = {}) {
  return (records || []).filter((r) => {
    if (status && String(r.status || '') !== String(status)) return false;
    if (priority && String(r.priority || '') !== String(priority)) return false;
    if (q) {
      const hay = Object.values(r || {}).map((v) => (v === null || v === undefined ? '' : String(v))).join(' ').toLowerCase();
      if (!hay.includes(String(q).toLowerCase())) return false;
    }
    return true;
  });
}
function toCSV(records) {
  const rows = records || [];
  if (!rows.length) return 'id,title,status,priority,description,createdBy,createdAt,updatedAt\n';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v); // preserves false and 0
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}
function createTaskStore() {
  let seq = 1; const items = [];
  return {
    list(owner, filters) { return filterRecords(items.filter((t) => t.createdBy === owner), filters); },
    create(owner, data) {
      const t = { id: seq++, title: String(data.title).trim(), description: data.description ?? '', status: data.status || 'open', priority: data.priority || 'medium', createdBy: owner, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      items.push(t); return t;
    },
    update(owner, id, data) {
      const t = items.find((x) => x.id === Number(id) && x.createdBy === owner);
      if (!t) return null;
      if (data.title !== undefined) t.title = String(data.title);
      if (data.description !== undefined) t.description = data.description;
      if (data.status !== undefined) t.status = data.status;
      if (data.priority !== undefined) t.priority = data.priority;
      t.updatedAt = new Date().toISOString(); return t;
    },
    all(owner) { return items.filter((t) => t.createdBy === owner); },
  };
}
// Deterministic domain AI over the caller's own records. Sections are labelled and
// intentionally include false/0/empty values instead of dropping them.
function buildDeterministic(feature, records) {
  const rows = Array.isArray(records) ? records : [];
  const def = FEATURES[feature] || FEATURES[Object.keys(FEATURES)[0]];
  const flagged = rows.filter((r) => def.flag(r)).length;
  const emptyCount = rows.filter((r) => !r || Object.keys(r).length === 0).length;
  return {
    feature, domain: DOMAIN, aiGenerated: false, provider: 'deterministic-fallback',
    sections: [
      { label: 'Record Count', value: rows.length },
      { label: 'Flagged Count', value: flagged },
      { label: 'Empty Records', value: emptyCount },
      { label: def.label, value: rows.length === 0 ? '' : def.describe(rows, flagged) },
      { label: 'Has Records', value: rows.length > 0 },
      { label: 'Recommendation', value: rows.length === 0 ? 'No records supplied; supply own records to analyse.' : def.recommend(rows, flagged) },
    ],
  };
}
async function runAI(feature, records) {
  const fallback = buildDeterministic(feature, records);
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return fallback;
  try {
    const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
    const res = await fetch(isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || (isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'), messages: [{ role: 'user', content: `Analyse these ${DOMAIN} records for ${feature}: ${JSON.stringify(records).slice(0, 4000)}` }] }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return fallback;
    return { feature, domain: DOMAIN, aiGenerated: true, provider: isOpenRouter ? 'openrouter' : 'openai', sections: [{ label: 'AI Analysis', value: text }, { label: 'Record Count', value: Array.isArray(records) ? records.length : 0 }] };
  } catch { return fallback; }
}
function ownerOf(req) { return String(req.user?.id ?? req.user?.sub ?? req.user?.email ?? 'unknown'); }
function createFeaturePackRouter(authenticate) {
  const router = express.Router(); const store = createTaskStore();
  router.use(authenticate);
  router.get('/tasks/export', (req, res) => {
    const rows = store.list(ownerOf(req), req.query);
    if ((req.query.format || 'json') === 'csv') { res.type('text/csv'); return res.send(toCSV(rows)); }
    return res.json({ data: rows, count: rows.length });
  });
  router.get('/tasks', (req, res) => { const rows = store.list(ownerOf(req), req.query); res.json({ data: rows, count: rows.length }); });
  router.post('/tasks', (req, res) => {
    if (!req.body?.title || !String(req.body.title).trim()) return res.status(400).json({ error: 'title is required' });
    return res.status(201).json(store.create(ownerOf(req), req.body));
  });
  router.put('/tasks/:id', (req, res) => { const t = store.update(ownerOf(req), req.params.id, req.body || {}); return t ? res.json(t) : res.status(404).json({ error: 'Not found' }); });
  router.patch('/tasks/:id', (req, res) => { const t = store.update(ownerOf(req), req.params.id, req.body || {}); return t ? res.json(t) : res.status(404).json({ error: 'Not found' }); });
  // Search/filter + export aliases on the feature-pack main list (tasks)
  router.get('/search', (req, res) => { const rows = store.list(ownerOf(req), req.query); res.json({ data: rows, count: rows.length }); });
  router.get('/export', (req, res) => {
    const rows = store.list(ownerOf(req), req.query);
    if ((req.query.format || 'json') === 'csv') { res.type('text/csv'); return res.send(toCSV(rows)); }
    return res.json({ data: rows, count: rows.length });
  });
  for (const name of Object.keys(FEATURES)) {
    router.post(`/ai/${name}`, async (req, res) => { res.json(await runAI(name, req.body?.records ?? [])); });
  }
  router.store = store;
  return router;
}
module.exports = { createFeaturePackRouter, filterRecords, toCSV, buildDeterministic, runAI, createTaskStore, FEATURES };
