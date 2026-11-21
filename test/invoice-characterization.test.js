'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

// In-memory order shaped like the order route's stored line item: HSN is saved,
// but gstRate is not. No storage module or data/db.json is used by these tests.
var order = {
  id: 1,
  date: '21/11/2026',
  customer: 'Test Customer',
  paymentMode: 'cash',
  status: 'completed',
  coupon: 'SAVE10',
  items: [
    { id: 1, sku: 'GRN-001', name: 'Test Rice', hsn: '1006', price: 2000, qty: 1 }
  ]
};

test('CURRENT BEHAVIOUR: order pricing caps SAVE10 and applies the HSN rate before tax', function () {
  var totals = pricing.computeTotals(order.items, order.coupon);

  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.discount, 150);
  assert.equal(totals.tax, 92.5);
  assert.equal(totals.cgst, 46.25);
  assert.equal(totals.sgst, 46.25);
  assert.equal(totals.total, 1942.5);
  assert.equal(totals.lines[0].gstPercent, 5);
  assert.equal(totals.lines[0].taxable, 1850);
});

test('invoice GST breakdown and total match the order pricing used for the customer charge', function () {
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual({
    subtotal: figures.subtotal,
    discount: figures.discount,
    tax: figures.tax,
    cgst: figures.cgst,
    sgst: figures.sgst,
    total: figures.total,
    gstPercent: figures.rows[0].gstPercent,
    lineTax: figures.rows[0].lineTax
  }, {
    subtotal: 2000,
    discount: 150,
    tax: 92.5,
    cgst: 46.25,
    sgst: 46.25,
    total: 1942.5,
    gstPercent: 5,
    lineTax: 92.5
  });
});

test('invoice renderer does not warn when its figures match the billed order', function () {
  var billed = pricing.computeTotals(order.items, order.coupon);
  var html = invoice.render(Object.assign({}, order, { total: billed.total }));

  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
