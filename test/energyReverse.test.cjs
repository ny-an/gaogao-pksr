const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateDisplayedEnergy,
  findFoodCombination,
  getCandidateBaseEnergies,
  getMultiplierFraction,
  solveExactEnergy,
  solveExactEnergyCandidates,
} = require('../js/energy_reverse.js');

test('FBボーナスとイベント倍率を正確な分数に変換する', () => {
  assert.deepEqual(getMultiplierFraction(15, '1.1', 3), {
    numerator: 759,
    denominator: 200,
  });
});

test('切り捨て後の目標値になりうる料理前エナジーだけを返す', () => {
  const multiplier = getMultiplierFraction(10, '1.25');
  assert.deepEqual(getCandidateBaseEnergies(1375, multiplier), [1000]);
  assert.deepEqual(getCandidateBaseEnergies(1, getMultiplierFraction(0, '2')), []);
});

test('上限個数内で追加食材の組み合わせを復元する', () => {
  const result = findFoodCombination(240, 3, {
    '100エナジー食材': 100,
    '70エナジー食材': 70,
  });

  assert.deepEqual(result, {
    foods: {
      '100エナジー食材': 1,
      '70エナジー食材': 2,
    },
    count: 3,
  });
});

test('鍋を満杯にせず目標に必要な最小個数を返す', () => {
  const result = solveExactEnergy({
    targetEnergy: 100,
    recipeEnergy: 0,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 5,
    recipeFoodCount: 0,
    foodEnergyMap: { '100エナジー食材': 100 },
  });

  assert.equal(result.found, true);
  assert.equal(result.extraFoodCount, 1);
  assert.deepEqual(result.foods, { '100エナジー食材': 1 });
});

test('レシピLvの四捨五入後に追加食材を逆算する', () => {
  const result = solveExactEnergy({
    targetEnergy: 1300,
    recipeEnergy: 1000,
    recipeBonusPercent: 10,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 10,
    recipeFoodCount: 3,
    foodEnergyMap: {
      '100エナジー食材': 100,
      '70エナジー食材': 70,
    },
  });

  assert.equal(result.found, true);
  assert.equal(result.recipeDisplayEnergy, 1100);
  assert.equal(result.extraEnergy, 200);
  assert.equal(result.extraFoodCount, 2);
  assert.equal(result.finalEnergy, 1300);
});

test('FBとイベント適用後の切り捨て値が目標と完全一致する', () => {
  const result = solveExactEnergy({
    targetEnergy: 1265,
    recipeEnergy: 1000,
    recipeBonusPercent: 0,
    fbBonusPercent: 15,
    eventBonus: '1.1',
    successMultiplier: 1,
    potCapacity: 10,
    recipeFoodCount: 4,
    foodEnergyMap: { '100エナジー食材': 100 },
  });

  assert.equal(result.found, true);
  assert.equal(result.extraFoodCount, 0);
  assert.equal(result.finalEnergy, 1265);
});

test('大成功2倍と超成功3倍を最後に適用する', () => {
  const commonOptions = {
    recipeEnergy: 1000,
    recipeBonusPercent: 0,
    fbBonusPercent: 15,
    eventBonus: '1.1',
    potCapacity: 10,
    recipeFoodCount: 4,
    foodEnergyMap: { '100エナジー食材': 100 },
  };

  const doubleResult = solveExactEnergy({
    ...commonOptions,
    targetEnergy: 2530,
    successMultiplier: 2,
  });
  const tripleResult = solveExactEnergy({
    ...commonOptions,
    targetEnergy: 3795,
    successMultiplier: 3,
  });

  assert.equal(doubleResult.found, true);
  assert.equal(doubleResult.finalEnergy, 2530);
  assert.equal(doubleResult.successMultiplier, 2);
  assert.equal(tripleResult.found, true);
  assert.equal(tripleResult.finalEnergy, 3795);
  assert.equal(tripleResult.successMultiplier, 3);
});

test('画面と同じ浮動小数点境界の切り捨てを再現する', () => {
  assert.equal(calculateDisplayedEnergy(2600, 15, '1.1', 1), 3288);

  const result = solveExactEnergy({
    targetEnergy: 3288,
    recipeEnergy: 2600,
    recipeBonusPercent: 0,
    fbBonusPercent: 15,
    eventBonus: '1.1',
    successMultiplier: 1,
    potCapacity: 10,
    recipeFoodCount: 4,
    foodEnergyMap: { '100エナジー食材': 100 },
  });

  assert.equal(result.found, true);
  assert.equal(result.extraFoodCount, 0);
  assert.equal(result.finalEnergy, 3288);
});

test('料理の必須食材数が鍋容量を超える場合は該当なし', () => {
  const result = solveExactEnergy({
    targetEnergy: 1000,
    recipeEnergy: 1000,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 2,
    recipeFoodCount: 3,
    foodEnergyMap: { 食材: 100 },
  });

  assert.deepEqual(result, {
    found: false,
    reason: 'recipe-over-capacity',
  });
});

test('鍋の残り枠内に組み合わせがない場合は該当なし', () => {
  const result = solveExactEnergy({
    targetEnergy: 300,
    recipeEnergy: 0,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 2,
    recipeFoodCount: 0,
    foodEnergyMap: { '100エナジー食材': 100 },
  });

  assert.equal(result.found, false);
  assert.equal(result.reason, 'no-match');
});

test('できばえ指定なしでは通常・大成功・超成功の候補をまとめて返す', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 600,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 10,
    foodEnergyMap: {},
    successMultipliers: [1, 2, 3],
    recipes: [
      { name: '通常料理', energy: 600, foodCount: 3 },
      { name: '大成功料理', energy: 300, foodCount: 2 },
      { name: '超成功料理', energy: 200, foodCount: 1 },
    ],
  });

  assert.deepEqual(
    results.map(result => [result.dishName, result.successMultiplier]),
    [
      ['超成功料理', 3],
      ['大成功料理', 2],
      ['通常料理', 1],
    ]
  );
});

test('料理候補ごとに最小追加食材案を返し、料理名も保持する', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 500,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 6,
    foodEnergyMap: { '100エナジー食材': 100 },
    successMultipliers: [1],
    recipes: [
      { name: '料理A', category: 'サラダ', energy: 300, foodCount: 2 },
      { name: '料理B', category: 'カレー', energy: 400, foodCount: 3 },
    ],
  });

  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map(result => ({
      dishName: result.dishName,
      category: result.dishCategory,
      extraFoodCount: result.extraFoodCount,
    })),
    [
      { dishName: '料理B', category: 'カレー', extraFoodCount: 1 },
      { dishName: '料理A', category: 'サラダ', extraFoodCount: 2 },
    ]
  );
});

test('料理なし候補は料理名なしとして明示できる', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 100,
    recipeBonusPercent: 0,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 2,
    foodEnergyMap: { 食材: 100 },
    successMultipliers: [1],
    recipes: [{ name: '', energy: 0, foodCount: 0 }],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].dishName, '');
  assert.deepEqual(results[0].foods, { 食材: 1 });
});

test('レシピレベル指定なしでは全レベルから一致するレベルを返す', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 150,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 2,
    foodEnergyMap: {},
    successMultipliers: [1],
    recipeLevels: [1, 2, 3],
    recipeBonusPercentMap: { 1: 0, 2: 50, 3: 100 },
    recipes: [{ name: 'レベル探索料理', energy: 100, foodCount: 1 }],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].recipeLevel, 2);
  assert.equal(results[0].recipeBonusPercent, 50);
  assert.equal(results[0].recipeDisplayEnergy, 150);
});

test('料理なしはレシピレベルを変えても重複候補を作らない', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 100,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 2,
    foodEnergyMap: { 食材: 100 },
    successMultipliers: [1],
    recipeLevels: [1, 2, 3],
    recipeBonusPercentMap: { 1: 0, 2: 50, 3: 100 },
    recipes: [{ name: '', energy: 0, foodCount: 0 }],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].recipeLevel, null);
});

test('同じ料理とできばえでは追加食材が最少のレベルだけを返す', () => {
  const results = solveExactEnergyCandidates({
    targetEnergy: 300,
    fbBonusPercent: 0,
    eventBonus: '1',
    potCapacity: 4,
    foodEnergyMap: { 食材: 100 },
    successMultipliers: [1],
    recipeLevels: [1, 2, 3],
    recipeBonusPercentMap: { 1: 0, 2: 100, 3: 200 },
    recipes: [{ name: '最適レベル料理', energy: 100, foodCount: 1 }],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].recipeLevel, 3);
  assert.equal(results[0].extraFoodCount, 0);
});
