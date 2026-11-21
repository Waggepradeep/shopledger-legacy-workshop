'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

var sampleOrders = [
  { id: 1001, date: '28/12/2021' },
  { id: 1004, date: '30/01/2022' },
  { id: 1008, date: '15/03/2022' }
];

function meeraDb() {
  return {
    customers: [{
      id: 1,
      name: 'Meera Joshi',
      openingBalance: 450,
      totalBilled: 1982.01,
      totalSettled: 1200,
      balance: 1232.01
    }],
    settlements: [],
    nextSettlementId: 505
  };
}

test('order history sorts newest dates first chronologically', function () {
  var listed = orders.list({ orders: sampleOrders }, {});

  assert.deepEqual(listed.map(function (order) { return order.id; }), [1008, 1004, 1001]);
});

test('date range filter includes matching dates across month and year boundaries', function () {
  var listed = orders.list({ orders: sampleOrders }, {
    from: '2022-01-01',
    to: '2022-02-28'
  });

  assert.deepEqual(listed.map(function (order) { return order.id; }), [1004]);
});

test('date range endpoints are inclusive and accept stored date format', function () {
  var listed = orders.list({ orders: sampleOrders }, {
    from: '2021-12-28',
    to: '30/01/2022'
  });

  assert.deepEqual(listed.map(function (order) { return order.id; }), [1004, 1001]);
});

test('same-day orders sort by descending order ID', function () {
  var listed = orders.list({ orders: [
    { id: 1009, date: '15/03/2022' },
    { id: 1010, date: '15/03/2022' }
  ] }, {});

  assert.deepEqual(listed.map(function (order) { return order.id; }), [1010, 1009]);
});

test('settlement string amount updates totals numerically and keeps the due balance', function () {
  var db = meeraDb();
  var result = ledger.recordSettlement(db, 1, '500', 'cash', 'Ticket reproduction');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
  assert.equal(typeof result.customer.totalSettled, 'number');
});

test('invalid settlement amounts are rejected without changing the customer', function () {
  ['not-money', '', '0', '-1', 'Infinity'].forEach(function (amount) {
    var db = meeraDb();
    var result = ledger.recordSettlement(db, 1, amount, 'cash', 'Invalid test');

    assert.equal(result.ok, false, 'amount ' + JSON.stringify(amount) + ' should be rejected');
    assert.equal(db.customers[0].totalSettled, 1200);
    assert.equal(db.customers[0].balance, 1232.01);
    assert.equal(db.settlements.length, 0);
  });
});
