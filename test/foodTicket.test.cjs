const test = require('node:test');
const assert = require('node:assert/strict');

const {
  drawTicket,
  getTicketConfig,
  simulateTargetReach,
  simulateTickets,
} = require('../js/food_ticket.js');

function createRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test('食材チケットS/M/Lの種類数・個数を返す', () => {
  assert.deepEqual(getTicketConfig('S'), {
    key: 'S',
    label: '食材チケットS',
    types: 2,
    quantity: 5,
    total: 10,
  });
  assert.deepEqual(getTicketConfig('m'), {
    key: 'M',
    label: '食材チケットM',
    types: 3,
    quantity: 10,
    total: 30,
  });
  assert.deepEqual(getTicketConfig('L'), {
    key: 'L',
    label: '食材チケットL',
    types: 4,
    quantity: 25,
    total: 100,
  });
});

test('1枚のチケット内では食材の種類が重複しない', () => {
  const result = drawTicket(
    'S',
    ['A', 'B', 'C', 'D'],
    createRandom([0, 0])
  );

  assert.deepEqual(result, {
    ticketType: 'S',
    foods: { A: 5, B: 5 },
    count: 10,
  });
});

test('複数枚シミュレーションは総数と食材別合計を返す', () => {
  const result = simulateTickets({
    ticketType: 'S',
    ticketCount: 2,
    foodNames: ['A', 'B', 'C', 'D'],
    random: createRandom([0, 0, 0, 0]),
  });

  assert.equal(result.totalFoodCount, 20);
  assert.deepEqual(result.foods, { A: 10, B: 10, C: 0, D: 0 });
  assert.equal(result.expectedPerFood, 5);
});

test('目標食材に届くチケット枚数のシミュレーション結果を集計する', () => {
  const result = simulateTargetReach({
    ticketType: 'S',
    foodNames: ['A', 'B', 'C', 'D'],
    targetFoods: [{ name: 'A', quantity: 10 }],
    trials: 4,
    maxTickets: 2,
    random: createRandom([0, 0]),
  });

  assert.equal(result.completedTrials, 4);
  assert.equal(result.completionRate, 1);
  assert.equal(result.targetMinimumTickets, 2);
  assert.equal(result.averageTickets, 2);
  assert.equal(result.medianTickets, 2);
  assert.equal(result.p90Tickets, 2);
});

test('登録食材が抽選種類数に満たない場合はエラーにする', () => {
  assert.throws(
    () => drawTicket('L', ['A', 'B', 'C'], () => 0),
    { name: 'RangeError', message: 'not-enough-foods' }
  );
});
