// One API for both pages. On the Cloudflare Worker it talks to the real
// backend. On GitHub Pages (or with ?demo in the URL) it runs in demo mode:
// the same store logic, saved in this browser only.

import * as core from './store-core.js';

export const DEMO = /github\.io$/.test(location.hostname) || location.protocol === 'file:' ||
  new URLSearchParams(location.search).has('demo');

const TOKEN_KEY = 'hh-admin-token';
const DEMO_KEY = 'hh-demo-state';
const DEMO_IMG = id => `hh-demo-img-${id}`;

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// ── Real backend ───────────────────────────────────────────────────────────
async function request(method, path, body) {
  const token = storage.get(TOKEN_KEY);
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the store. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Try again.', res.status);
  return data;
}

const remote = {
  store: () => request('GET', '/api/store'),
  placeOrder: input => request('POST', '/api/orders', input),
  async login(username, password) {
    const { token } = await request('POST', '/api/admin/login', { username, password });
    storage.set(TOKEN_KEY, token);
  },
  admin: {
    state: () => request('GET', '/api/admin/state'),
    saveProduct: p => request('POST', '/api/admin/products', p),
    deleteProduct: id => request('DELETE', `/api/admin/products/${id}`),
    moveProduct: (id, dir) => request('POST', `/api/admin/products/${id}/move`, { dir }),
    setImage: (id, dataUrl) => request('PUT', `/api/admin/products/${id}/image`, { dataUrl }),
    removeImage: id => request('DELETE', `/api/admin/products/${id}/image`),
    updateOrder: (id, patch) => request('PATCH', `/api/admin/orders/${id}`, patch),
    saveSettings: s => request('PUT', '/api/admin/settings', s),
  },
  imageUrl: p => `/img/${p.id}?v=${p.imageVersion}`,
};

// ── Demo mode ──────────────────────────────────────────────────────────────
function load() {
  try { return core.migrate(JSON.parse(storage.get(DEMO_KEY))); } catch { return core.seedState(); }
}
function run(fn) {
  const s = load();
  try {
    const result = fn(s);
    if (!storage.set(DEMO_KEY, JSON.stringify(s))) throw new ApiError('This browser could not save the demo data.', 0);
    return Promise.resolve({ state: s, result });
  } catch (e) {
    return Promise.reject(e instanceof core.StoreError ? new ApiError(e.message, e.status) : e);
  }
}
const demoAdmin = fn => run(fn).then(r => r.state);

const demo = {
  store: () => Promise.resolve(core.publicView(load())),
  placeOrder: input => run(s => core.placeOrder(s, input)).then(r => r.result),
  async login(username, password) {
    if (username !== 'admin' || password !== '1111') throw new ApiError('Wrong username or password.', 401);
    storage.set(TOKEN_KEY, 'demo');
  },
  admin: {
    state: () => Promise.resolve(load()),
    saveProduct: p => demoAdmin(s => core.saveProduct(s, p)),
    deleteProduct: id => { storage.del(DEMO_IMG(id)); return demoAdmin(s => core.deleteProduct(s, id)); },
    moveProduct: (id, dir) => demoAdmin(s => core.moveProduct(s, id, dir)),
    setImage: (id, dataUrl) => {
      if (!storage.set(DEMO_IMG(id), dataUrl)) return Promise.reject(new ApiError('This browser is out of room for demo photos.', 0));
      return demoAdmin(s => core.bumpImage(s, id, true));
    },
    removeImage: id => { storage.del(DEMO_IMG(id)); return demoAdmin(s => core.bumpImage(s, id, false)); },
    updateOrder: (id, patch) => demoAdmin(s => core.updateOrder(s, id, patch)),
    saveSettings: input => demoAdmin(s => core.saveSettings(s, input)),
  },
  imageUrl: p => storage.get(DEMO_IMG(p.id)) || '',
};

export const api = DEMO ? demo : remote;
export const isSignedIn = () => !!storage.get(TOKEN_KEY);
export const signOut = () => storage.del(TOKEN_KEY);
export const resetDemo = () => {
  const s = load();
  s.products.forEach(p => storage.del(DEMO_IMG(p.id)));
  storage.del(DEMO_KEY);
};
export { core };
