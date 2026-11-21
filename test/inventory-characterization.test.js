'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

function product(stock, reserved) {
  return { id: 11, name: 'Byadgi Chilli Powder', stock: stock, reserved: reserved };
}

function cancellationDb() {
  return {
    products: [product(3, 3)],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      total: 0,
      items: [{ id: 11, qty: 1 }]
    }]
  };
}

test('allows an order for exactly the last sellable unit', function () {
  var result = inventory.check([product(4, 3)], [{ id: 11, qty: 1 }]);

  assert.deepEqual(result, { ok: true });
});

test('rejects duplicate lines whose combined quantity exceeds sellable stock', function () {
  var result = inventory.check([product(4, 3)], [
    { id: 11, qty: 1 },
    { id: 11, qty: 1 }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.msg, 'Byadgi Chilli Powder is out of stock (1 sellable available)');
});

test('rejects a quantity greater than sellable stock', function () {
  var result = inventory.check([product(4, 3)], [{ id: 11, qty: 2 }]);

  assert.equal(result.ok, false);
  assert.equal(result.msg, 'Byadgi Chilli Powder is out of stock (1 sellable available)');
});

test('cancellation restores physical stock without changing reserved units', function () {
  var db = cancellationDb();
  var result = orders.cancel(db, 1007, 'test cancellation');

  assert.equal(result.ok, true);
  assert.equal(db.products[0].stock, 4);
  assert.equal(db.products[0].reserved, 3);

  var repeated = orders.cancel(db, 1007, 'repeat cancellation');
  assert.equal(repeated.ok, false);
  assert.equal(db.products[0].stock, 4);
  assert.equal(db.products[0].reserved, 3);
});
