// Runs the real Worker against an in-memory SQLite database standing in for D1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: sql => stmt(sql) };
}

const env = { DB: fakeD1(), ADMIN_USER: 'admin', ADMIN_PASSWORD: '1111', ASSETS: { fetch: () => new Response('asset') } };
const call = async (method, path, body, token) => {
  const res = await worker.fetch(new Request(`https://x.test${path}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }), env);
  return { status: res.status, data: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
};

test('full order flow through the API', async () => {
  const store = await call('GET', '/api/store');
  assert.equal(store.status, 200);
  assert.equal(store.data.products.length, 3);

  const order = await call('POST', '/api/orders', { customer: { name: 'Pat', email: 'pat@example.com' }, items: [{ id: 'honey-1lb', qty: 2 }] });
  assert.equal(order.status, 201);
  assert.equal(order.data.total, 2400);

  const bad = await call('POST', '/api/orders', { customer: { name: 'Pat' }, items: [{ id: 'honey-1lb', qty: 1 }] });
  assert.equal(bad.status, 400);

  assert.equal((await call('GET', '/api/admin/state')).status, 401);
  assert.equal((await call('POST', '/api/admin/login', { username: 'admin', password: 'nope' })).status, 401);
  const { data: { token } } = await call('POST', '/api/admin/login', { username: 'admin', password: '1111' });
  assert.ok(token);
  assert.equal((await call('GET', '/api/admin/state', null, token + 'x')).status, 401);

  const state = (await call('GET', '/api/admin/state', null, token)).data;
  assert.equal(state.orders.length, 1);
  const paid = await call('PATCH', `/api/admin/orders/${state.orders[0].id}`, { paid: true, paidMethod: 'Cash', status: 'done' }, token);
  assert.equal(paid.data.orders[0].paidMethod, 'Cash');

  const added = await call('POST', '/api/admin/products', { name: 'Duck eggs', unit: 'half dozen', price: '6', stock: '4' }, token);
  assert.equal(added.data.products.length, 4);
  const img = await call('PUT', '/api/admin/products/duck-eggs-half-dozen/image', { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }, token);
  assert.equal(img.data.products[3].imageVersion, 1);
  const photo = await worker.fetch(new Request('https://x.test/img/duck-eggs-half-dozen'), env);
  assert.equal(photo.headers.get('content-type'), 'image/png');

  const settings = await call('PUT', '/api/admin/settings', { venmoHandle: '@lisa' }, token);
  assert.equal(settings.data.settings.venmoHandle, 'lisa');
  assert.equal((await call('GET', '/api/store')).data.settings.venmoReady, true);

  assert.equal((await call('GET', '/')).data, 'asset');
});

test('orders placed at the same time are all kept', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () =>
    call('POST', '/api/orders', { customer: { name: 'Sam', phone: '3155550123' }, items: [{ id: 'eggs-dozen', qty: 1 }] })));
  assert.ok(results.every(r => r.status === 201));
  assert.equal(new Set(results.map(r => r.data.number)).size, 5);
});
