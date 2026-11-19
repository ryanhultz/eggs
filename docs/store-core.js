// Store logic shared by the Cloudflare Worker (real backend) and demo mode
// (browser-only). Everything here works on a plain JSON "state" object, so
// both sides behave the same way. Money is always whole cents.

export const SCHEMA_VERSION = 1;
export const VENMO_PLACEHOLDER = 'your-venmo-handle';

export class StoreError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function seedState() {
  return {
    schema: SCHEMA_VERSION,
    seq: 1000,
    settings: {
      storeName: "Lisa's Hen & Hive",
      tagline: 'Fresh eggs and honey from our farm in Cayuga, NY.',
      venmoHandle: VENMO_PLACEHOLDER,
      orderNote: "Lisa will reach out by phone or email to set up a time to get your order to you.",
      open: true,
      closedMessage: "We're not taking orders right now. Check back soon.",
    },
    products: [
      { id: 'eggs-dozen', name: 'Eggs', unit: 'dozen', price: 500, stock: null, active: true, description: 'Farm-fresh, from our free-ranging hens.', imageVersion: 0 },
      { id: 'honey-1lb', name: 'Honey', unit: '1 lb jar', price: 1200, stock: null, active: true, description: 'Raw honey from our own hives.', imageVersion: 0 },
      { id: 'honey-2lb', name: 'Honey', unit: '2 lb jar', price: 2200, stock: null, active: true, description: 'Raw honey from our own hives.', imageVersion: 0 },
    ],
    orders: [],
  };
}

export function migrate(state) {
  if (!state || typeof state !== 'object') return seedState();
  const seed = seedState();
  state.settings = { ...seed.settings, ...(state.settings || {}) };
  state.products = Array.isArray(state.products) ? state.products : seed.products;
  state.orders = Array.isArray(state.orders) ? state.orders : [];
  state.seq = Number.isInteger(state.seq) ? state.seq : 1000;
  state.schema = SCHEMA_VERSION;
  return state;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const str = (v, max) => String(v ?? '').trim().slice(0, max);
export const fmtMoney = c => (c < 0 ? '-$' : '$') + (Math.abs(c) / 100).toFixed(2);
export const productLabel = p => p.unit ? `${p.name}, ${p.unit}` : p.name;

export function toCents(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new StoreError('Enter a price of $0 or more.');
  return Math.round(n * 100);
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
}

export function venmoLink(handle, cents, note) {
  if (!handle || handle === VENMO_PLACEHOLDER) return null;
  const h = handle.replace(/^@/, '');
  const q = new URLSearchParams({ txn: 'pay', audience: 'private', recipients: h, amount: (cents / 100).toFixed(2), note });
  return `https://venmo.com/?${q}`;
}

// ── Public ─────────────────────────────────────────────────────────────────
export function publicView(state) {
  const s = state.settings;
  return {
    settings: {
      storeName: s.storeName, tagline: s.tagline, orderNote: s.orderNote,
      open: s.open, closedMessage: s.closedMessage,
      venmoReady: !!venmoLink(s.venmoHandle, 100, ''),
    },
    products: state.products.filter(p => p.active).map(p => ({
      id: p.id, name: p.name, unit: p.unit, price: p.price, description: p.description,
      imageVersion: p.imageVersion || 0,
      soldOut: p.stock !== null && p.stock <= 0,
      maxQty: p.stock === null ? 50 : Math.min(50, p.stock),
    })),
  };
}

export function placeOrder(state, input, now = new Date()) {
  if (!state.settings.open) throw new StoreError(state.settings.closedMessage, 409);
  const c = input?.customer || {};
  const customer = {
    name: str(c.name, 80), phone: str(c.phone, 30), email: str(c.email, 120), notes: str(c.notes, 500),
  };
  if (!customer.name) throw new StoreError('Enter your name.');
  if (!customer.phone && !customer.email) throw new StoreError('Enter a phone number or email so Lisa can reach you.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new StoreError('Check the email address.');
  if (customer.phone && customer.phone.replace(/\D/g, '').length < 7) throw new StoreError('Check the phone number.');

  const wanted = Array.isArray(input?.items) ? input.items : [];
  const items = [];
  for (const w of wanted) {
    const qty = Math.floor(Number(w?.qty));
    if (!(qty > 0)) continue;
    const p = state.products.find(x => x.id === w.id && x.active);
    if (!p) throw new StoreError('One of the items is no longer available. Refresh the page and try again.', 409);
    if (qty > 50) throw new StoreError(`The most you can order online is 50 of ${productLabel(p)}.`);
    if (p.stock !== null && qty > p.stock) {
      throw new StoreError(p.stock > 0
        ? `Only ${p.stock} left of ${productLabel(p)}. Lower the quantity and try again.`
        : `${productLabel(p)} just sold out. Remove it and try again.`, 409);
    }
    const existing = items.find(i => i.productId === p.id);
    if (existing) existing.qty += qty;
    else items.push({ productId: p.id, name: p.name, unit: p.unit, price: p.price, qty });
  }
  if (!items.length) throw new StoreError('Add at least one item to your order.');

  for (const i of items) {
    const p = state.products.find(x => x.id === i.productId);
    if (p.stock !== null) p.stock -= i.qty;
  }
  state.seq += 1;
  const order = {
    id: `o${state.seq}`, number: state.seq, createdAt: now.toISOString(),
    customer, items, total: items.reduce((a, i) => a + i.price * i.qty, 0),
    status: 'new', paid: false, paidMethod: '', paidAt: null, adminNote: '',
  };
  state.orders.push(order);
  return {
    number: order.number, total: order.total, items: order.items,
    venmoUrl: venmoLink(state.settings.venmoHandle, order.total, `${state.settings.storeName} order #${order.number}`),
    orderNote: state.settings.orderNote,
  };
}

// ── Admin ──────────────────────────────────────────────────────────────────
export const STATUSES = ['new', 'ready', 'done', 'cancelled'];
export const PAY_METHODS = ['Venmo', 'Cash', 'Check', 'Other'];

export function updateOrder(state, id, patch, now = new Date()) {
  const o = state.orders.find(x => x.id === id);
  if (!o) throw new StoreError('That order no longer exists.', 404);
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) throw new StoreError('Unknown status.');
    const wasCancelled = o.status === 'cancelled', nowCancelled = patch.status === 'cancelled';
    if (wasCancelled !== nowCancelled) {
      // Cancelling puts tracked stock back; reopening takes it out again.
      for (const i of o.items) {
        const p = state.products.find(x => x.id === i.productId);
        if (p && p.stock !== null) p.stock = Math.max(0, p.stock + (nowCancelled ? i.qty : -i.qty));
      }
    }
    o.status = patch.status;
  }
  if (patch.paid !== undefined) {
    o.paid = !!patch.paid;
    o.paidAt = o.paid ? (o.paidAt || now.toISOString()) : null;
    if (!o.paid) o.paidMethod = '';
  }
  if (patch.paidMethod !== undefined) {
    if (patch.paidMethod && !PAY_METHODS.includes(patch.paidMethod)) throw new StoreError('Unknown payment method.');
    o.paidMethod = patch.paidMethod;
  }
  if (patch.adminNote !== undefined) o.adminNote = str(patch.adminNote, 500);
  return o;
}

export function saveProduct(state, input) {
  const name = str(input.name, 60);
  if (!name) throw new StoreError('Enter a product name.');
  const unit = str(input.unit, 30);
  const price = toCents(input.price);
  let stock = null;
  if (input.stock !== null && input.stock !== undefined && String(input.stock).trim() !== '') {
    stock = Math.floor(Number(input.stock));
    if (!Number.isFinite(stock) || stock < 0) throw new StoreError('Stock must be 0 or more, or blank for no limit.');
  }
  const fields = { name, unit, price, stock, active: input.active !== false, description: str(input.description, 200) };
  if (input.id) {
    const p = state.products.find(x => x.id === input.id);
    if (!p) throw new StoreError('That product no longer exists.', 404);
    Object.assign(p, fields);
    return p;
  }
  let id = slug(`${name} ${unit}`), n = 2;
  while (state.products.some(x => x.id === id)) id = `${slug(`${name} ${unit}`)}-${n++}`;
  const p = { id, ...fields, imageVersion: 0 };
  state.products.push(p);
  return p;
}

export function deleteProduct(state, id) {
  const i = state.products.findIndex(x => x.id === id);
  if (i < 0) throw new StoreError('That product no longer exists.', 404);
  state.products.splice(i, 1);
}

export function moveProduct(state, id, dir) {
  const i = state.products.findIndex(x => x.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= state.products.length) return;
  [state.products[i], state.products[j]] = [state.products[j], state.products[i]];
}

export function bumpImage(state, id, hasImage) {
  const p = state.products.find(x => x.id === id);
  if (!p) throw new StoreError('That product no longer exists.', 404);
  p.imageVersion = hasImage ? (p.imageVersion || 0) + 1 : 0;
  return p;
}

export function saveSettings(state, input) {
  const s = state.settings;
  if (input.storeName !== undefined) s.storeName = str(input.storeName, 60) || s.storeName;
  if (input.tagline !== undefined) s.tagline = str(input.tagline, 160);
  if (input.orderNote !== undefined) s.orderNote = str(input.orderNote, 300);
  if (input.closedMessage !== undefined) s.closedMessage = str(input.closedMessage, 200);
  if (input.open !== undefined) s.open = !!input.open;
  if (input.venmoHandle !== undefined) s.venmoHandle = str(input.venmoHandle, 40).replace(/^@/, '') || VENMO_PLACEHOLDER;
  return s;
}

// ── Reports ────────────────────────────────────────────────────────────────
function localDay(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function salesReport(state, days, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const orders = state.orders.filter(o => o.status !== 'cancelled' && (!days || new Date(o.createdAt) >= start));
  const byProduct = {};
  for (const o of orders) for (const i of o.items) {
    const k = i.unit ? `${i.name}, ${i.unit}` : i.name;
    byProduct[k] = byProduct[k] || { label: k, qty: 0, total: 0 };
    byProduct[k].qty += i.qty; byProduct[k].total += i.qty * i.price;
  }
  const sum = list => list.reduce((a, o) => a + o.total, 0);
  return {
    orders: orders.length,
    sales: sum(orders),
    paid: sum(orders.filter(o => o.paid)),
    unpaid: sum(orders.filter(o => !o.paid)),
    unpaidCount: orders.filter(o => !o.paid).length,
    byProduct: Object.values(byProduct).sort((a, b) => b.total - a.total),
    byMethod: PAY_METHODS.map(m => ({ method: m, total: sum(orders.filter(o => o.paid && o.paidMethod === m)) }))
      .concat([{ method: 'Not recorded', total: sum(orders.filter(o => o.paid && !o.paidMethod)) }])
      .filter(x => x.total > 0),
  };
}

export function ordersCsv(state) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['order', 'date', 'name', 'phone', 'email', 'items', 'total', 'status', 'paid', 'paid_method', 'paid_date', 'customer_notes', 'admin_note'].join(',')];
  for (const o of state.orders) {
    lines.push([
      o.number, localDay(o.createdAt), o.customer.name, o.customer.phone, o.customer.email,
      o.items.map(i => `${i.qty} x ${i.unit ? `${i.name} (${i.unit})` : i.name}`).join('; '),
      (o.total / 100).toFixed(2), o.status, o.paid ? 'yes' : 'no', o.paidMethod,
      o.paidAt ? localDay(o.paidAt) : '', o.customer.notes, o.adminNote,
    ].map(q).join(','));
  }
  return lines.join('\n');
}
