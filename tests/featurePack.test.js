'use strict';
const { test } = require('node:test'); const assert = require('node:assert');
process.env.OPENROUTER_API_KEY=''; process.env.OPENAI_API_KEY='';
const fp = require('../server/routes/featurePack');
test('tasks store create/list/update with search filter', () => {
  const s = fp.createTaskStore(); const a = s.create('u1', { title: 'Alpha task', status: 'open', priority: 'high' });
  s.create('u1', { title: 'Beta task', status: 'done', priority: 'low' }); s.create('u2', { title: 'Alpha other', status: 'open' });
  assert.equal(s.list('u1', {}).length, 2); assert.equal(s.list('u1', { q: 'alpha' }).length, 1);
  assert.equal(s.list('u1', { status: 'done' }).length, 1); assert.equal(fp.filterRecords([a], { q: 'nope' }).length, 0);
  const u = s.update('u1', a.id, { status: 'done' }); assert.equal(u.status, 'done'); assert.equal(s.update('u2', a.id, { status: 'x' }), null);
});
test('CSV export preserves false/0/empty and JSON shape', () => {
  const csv = fp.toCSV([{ id: 1, title: 'A,B', active: false, count: 0, note: '' }]);
  assert.match(csv, /false/); assert.match(csv, /,0,/); assert.ok(csv.split('\n')[0].includes('active'));
  assert.equal(fp.toCSV([]).includes('title'), true);
});
test('AI fallback is deterministic, labelled, preserves falsy', async () => {
  for (const f of ['churn-risk', 'class-recommendation', 'schedule-optimizer']) {
    const r = fp.buildDeterministic(f, []);
    assert.equal(r.aiGenerated, false); assert.equal(r.provider, 'deterministic-fallback');
    assert.ok(r.sections.some(s => s.label === 'Record Count' && s.value === 0));
    assert.ok(r.sections.some(s => s.value === false || s.value === '' || s.value === 0));
    const live = await fp.runAI(f, [{ title: 'x', status: 'open' }]); assert.equal(live.aiGenerated, false);
  }
});
test('router requires auth and serves tasks/export/AI', async () => {
  const express = require('express');
  const auth = (req, res, next) => req.headers.authorization === 'Bearer good' ? (req.user = { id: 7 }, next()) : res.status(401).json({ error: 'unauthorized' });
  const app = express(); app.use(express.json()); app.use('/api/feature-pack', fp.createFeaturePackRouter(auth));
  const srv = app.listen(0); const baseUrl = 'http://127.0.0.1:' + srv.address().port;
  try {
    assert.equal((await fetch(baseUrl + '/api/feature-pack/tasks')).status, 401);
    const h = { authorization: 'Bearer good', 'content-type': 'application/json' };
    const created = await (await fetch(baseUrl + '/api/feature-pack/tasks', { method: 'POST', headers: h, body: JSON.stringify({ title: 'First' }) })).json();
    assert.equal(created.title, 'First');
    assert.equal((await fetch(baseUrl + '/api/feature-pack/tasks', { method: 'POST', headers: h, body: JSON.stringify({}) })).status, 400);
    const list = await (await fetch(baseUrl + '/api/feature-pack/tasks?q=first', { headers: h })).json(); assert.equal(list.count, 1);
    const upd = await (await fetch(baseUrl + '/api/feature-pack/tasks/' + created.id, { method: 'PUT', headers: h, body: JSON.stringify({ status: 'done' }) })).json(); assert.equal(upd.status, 'done');
    const csv = await (await fetch(baseUrl + '/api/feature-pack/tasks/export?format=csv', { headers: h })).text(); assert.match(csv, /First/);
    const js = await (await fetch(baseUrl + '/api/feature-pack/export?format=json', { headers: h })).json(); assert.equal(js.count, 1);
    const ai = await (await fetch(baseUrl + '/api/feature-pack/ai/churn-risk', { method: 'POST', headers: h, body: JSON.stringify({ records: [] }) })).json();
    assert.equal(ai.aiGenerated, false); assert.ok(ai.sections.length >= 3);
  } finally { srv.close(); }
});
