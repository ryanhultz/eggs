// Cloudflare Worker backend for Lisa's Hen & Hive.
// Serves the site from /docs (static assets) and the JSON API under /api.
// Store data lives in one D1 row (JSON) guarded by a version number, so two
// orders arriving at once can't overwrite each other. Photos live in their own table.

import * as core from '../docs/store-core.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
const fail = (message, status = 400) => json({ error: message }, status);

// ── Storage ────────────────────────────────────────────────────────────────
async function loadState(env) {
  const row = await env.DB.prepare('SELECT data, version FROM store WHERE id = 1').first();
  if (row) return { state: core.migrate(JSON.parse(row.data)), version: row.version };
  const state = core.seedState();
  await env.DB.prepare('INSERT OR IGNORE INTO store (id, data, version) VALUES (1, ?, 1)').bind(JSON.stringify(state)).run();
  return loadState(env);
}

// Run fn against the latest state and save it, retrying if someone else saved first.
async function mutate(env, fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, version } = await loadState(env);
    const result = fn(state);
    const res = await env.DB.prepare('UPDATE store SET data = ?, version = version + 1 WHERE id = 1 AND version = ?')
      .bind(JSON.stringify(state), version).run();
    if (res.meta.changes === 1) return { state, result };
  }
  throw new core.StoreError('The store is busy. Try again in a moment.', 503);
}

// ── Auth (signed, expiring token; no session table needed) ─────────────────
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(env, msg) {
  const secret = env.SESSION_SECRET || `hen-and-hive:${env.ADMIN_PASSWORD}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function sameText(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function makeToken(env) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 days
  return `${exp}.${await hmac(env, String(exp))}`;
}
async function isAdmin(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sameText(sig, await hmac(env, exp));
}

// ── Photos ─────────────────────────────────────────────────────────────────
async function getImage(env, id) {
  const row = await env.DB.prepare('SELECT mime, data FROM images WHERE product_id = ?').bind(id).first();
  if (!row) return new Response('Not found', { status: 404 });
  const bytes = Uint8Array.from(atob(row.data), c => c.charCodeAt(0));
  return new Response(bytes, { headers: { 'content-type': row.mime, 'cache-control': 'public, max-age=31536000, immutable' } });
}
async function putImage(env, id, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new core.StoreError('Upload a JPEG, PNG or WebP photo.');
  if (m[2].length > 900_000) throw new core.StoreError('That photo is too large. Use one under about 600 KB.');
  await env.DB.prepare('INSERT INTO images (product_id, mime, data) VALUES (?, ?, ?) ON CONFLICT(product_id) DO UPDATE SET mime = excluded.mime, data = excluded.data')
    .bind(id, m[1], m[2]).run();
}

// ── Routes ─────────────────────────────────────────────────────────────────
async function api(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await request.json().catch(() => ({})) : null;

  if (path === '/api/store' && method === 'GET') {
    const { state } = await loadState(env);
    return json(core.publicView(state));
  }
  if (path === '/api/orders' && method === 'POST') {
    const { result } = await mutate(env, s => core.placeOrder(s, body));
    return json(result, 201);
  }
  if (path === '/api/admin/login' && method === 'POST') {
    const user = env.ADMIN_USER || 'admin', pass = env.ADMIN_PASSWORD || '1111';
    if (!sameText(body.username || '', user) || !sameText(body.password || '', pass)) {
      await new Promise(r => setTimeout(r, 600));
      return fail('Wrong username or password.', 401);
    }
    return json({ token: await makeToken(env) });
  }

  if (!path.startsWith('/api/admin/')) return fail('Not found.', 404);
  if (!(await isAdmin(request, env))) return fail('Sign in again.', 401);

  if (path === '/api/admin/state' && method === 'GET') return json((await loadState(env)).state);

  const save = async fn => json((await mutate(env, fn)).state);
  let m;
  if (path === '/api/admin/products' && method === 'POST') return save(s => core.saveProduct(s, body));
  if ((m = path.match(/^\/api\/admin\/products\/([\w-]+)$/)) && method === 'DELETE') {
    const res = await save(s => core.deleteProduct(s, m[1]));
    await env.DB.prepare('DELETE FROM images WHERE product_id = ?').bind(m[1]).run();
    return res;
  }
  if ((m = path.match(/^\/api\/admin\/products\/([\w-]+)\/move$/)) && method === 'POST') return save(s => core.moveProduct(s, m[1], body.dir));
  if ((m = path.match(/^\/api\/admin\/products\/([\w-]+)\/image$/))) {
    if (method === 'PUT') { await putImage(env, m[1], body.dataUrl); return save(s => core.bumpImage(s, m[1], true)); }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM images WHERE product_id = ?').bind(m[1]).run();
      return save(s => core.bumpImage(s, m[1], false));
    }
  }
  if ((m = path.match(/^\/api\/admin\/orders\/(o\d+)$/)) && method === 'PATCH') return save(s => core.updateOrder(s, m[1], body));
  if (path === '/api/admin/settings' && method === 'PUT') return save(s => core.saveSettings(s, body));

  return fail('Not found.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env, url);
      const img = url.pathname.match(/^\/img\/([\w-]+)$/);
      if (img) return await getImage(env, img[1]);
      return env.ASSETS.fetch(request);
    } catch (e) {
      if (e instanceof core.StoreError) return fail(e.message, e.status);
      console.error(e);
      return fail('Something went wrong on the server. Try again.', 500);
    }
  },
};
