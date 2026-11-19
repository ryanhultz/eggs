import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../docs/store-core.js';

const customer = { name: 'Pat', phone: '315-555-0100' };

test('seed has eggs and both honey jars', () => {
  const s = core.seedState();
  assert.deepEqual(s.products.map(p => p.id), ['eggs-dozen', 'honey-1lb', 'honey-2lb']);
  assert.equal(core.publicView(s).settings.venmoReady, false);
});

test('placing an order totals items and numbers orders', () => {
  const s = core.seedState();
  const r = core.placeOrder(s, { customer, items: [{ id: 'eggs-dozen', qty: 2 }, { id: 'honey-2lb', qty: 1 }] });
  assert.equal(r.number, 1001);
  assert.equal(r.total, 2 * 500 + 2200);
  assert.equal(r.venmoUrl, null); // placeholder handle
  const r2 = core.placeOrder(s, { customer, items: [{ id: 'honey-1lb', qty: 1 }] });
  assert.equal(r2.number, 1002);
  assert.equal(s.orders.length, 2);
});

test('order needs a name and a way to reach the customer', () => {
  const s = core.seedState();
  const items = [{ id: 'eggs-dozen', qty: 1 }];
  assert.throws(() => core.placeOrder(s, { customer: { phone: '3155550100' }, items }), /name/);
  assert.throws(() => core.placeOrder(s, { customer: { name: 'Pat' }, items }), /phone number or email/);
  assert.throws(() => core.placeOrder(s, { customer: { name: 'Pat', email: 'nope' }, items }), /email/);
  assert.throws(() => core.placeOrder(s, { customer, items: [] }), /at least one/);
});

test('stock limits orders and cancelling restores it', () => {
  const s = core.seedState();
  core.saveProduct(s, { ...s.products[0], price: '5.00', stock: 3 });
  assert.throws(() => core.placeOrder(s, { customer, items: [{ id: 'eggs-dozen', qty: 4 }] }), /Only 3 left/);
  core.placeOrder(s, { customer, items: [{ id: 'eggs-dozen', qty: 3 }] });
  assert.equal(s.products[0].stock, 0);
  assert.equal(core.publicView(s).products[0].soldOut, true);
  core.updateOrder(s, s.orders[0].id, { status: 'cancelled' });
  assert.equal(s.products[0].stock, 3);
  core.updateOrder(s, s.orders[0].id, { status: 'new' });
  assert.equal(s.products[0].stock, 0);
});

test('closed store refuses orders', () => {
  const s = core.seedState();
  core.saveSettings(s, { open: false });
  assert.throws(() => core.placeOrder(s, { customer, items: [{ id: 'eggs-dozen', qty: 1 }] }), /not taking orders/);
});

test('venmo link appears once a handle is set', () => {
  const s = core.seedState();
  core.saveSettings(s, { venmoHandle: '@Lisa-Hen-Hive' });
  const r = core.placeOrder(s, { customer, items: [{ id: 'honey-1lb', qty: 1 }] });
  const u = new URL(r.venmoUrl);
  assert.equal(u.searchParams.get('recipients'), 'Lisa-Hen-Hive');
  assert.equal(u.searchParams.get('amount'), '12.00');
});

test('payments and sales report', () => {
  const s = core.seedState();
  core.placeOrder(s, { customer, items: [{ id: 'eggs-dozen', qty: 2 }] });
  core.placeOrder(s, { customer, items: [{ id: 'honey-1lb', qty: 1 }] });
  core.placeOrder(s, { customer, items: [{ id: 'honey-2lb', qty: 1 }] });
  core.updateOrder(s, s.orders[0].id, { paid: true, paidMethod: 'Venmo' });
  core.updateOrder(s, s.orders[2].id, { status: 'cancelled' });
  const r = core.salesReport(s, 0);
  assert.equal(r.orders, 2);
  assert.equal(r.sales, 1000 + 1200);
  assert.equal(r.paid, 1000);
  assert.equal(r.unpaid, 1200);
  assert.deepEqual(r.byMethod, [{ method: 'Venmo', total: 1000 }]);
  assert.match(core.ordersCsv(s), /"1001","\d{4}-\d\d-\d\d","Pat"/);
});

test('products can be added, moved and removed', () => {
  const s = core.seedState();
  const p = core.saveProduct(s, { name: 'Duck eggs', unit: 'half dozen', price: '$6' });
  assert.equal(p.id, 'duck-eggs-half-dozen');
  assert.equal(p.price, 600);
  core.moveProduct(s, p.id, -1);
  assert.equal(s.products[2].id, p.id);
  core.deleteProduct(s, p.id);
  assert.equal(s.products.length, 3);
  assert.throws(() => core.saveProduct(s, { name: 'X', price: '-1' }), /price/);
});
