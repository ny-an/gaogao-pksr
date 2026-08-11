const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPotCapacity(elements = {}, initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const context = {
    console,
    document: {
      addEventListener() {},
      getElementById(id) {
        return elements[id] || null;
      },
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  const projectRoot = path.join(__dirname, '..');
  const source = [
    fs.readFileSync(path.join(projectRoot, 'js/dishes_setting.js'), 'utf8'),
    fs.readFileSync(path.join(projectRoot, 'js/pot_capacity.js'), 'utf8'),
    'this.fixture = {',
    '  GAME_POT_CAPACITY_MAX,',
    '  calculatePotCapacity,',
    '  loadPotCapacitySettings,',
    '  savePotCapacitySettings,',
    '  validateManualPotCapacity,',
    '};',
  ].join('\n');

  vm.runInNewContext(source, context);
  return { ...context.fixture, storage };
}

function createAutomaticElements(manualValue = '') {
  return {
    maxPotCapacity: { value: manualValue },
    potCapacity: { value: '81' },
    potEventBonus: { value: '2' },
    weekendBonus: { checked: true },
    cookingPowerUp: { value: '200' },
    goodCampTicket: { checked: true },
  };
}

test('鍋容量の直接指定は既存のボーナス計算より優先される', () => {
  const fixture = loadPotCapacity(createAutomaticElements('500'));

  assert.equal(fixture.calculatePotCapacity(), 500);
});

test('鍋容量の直接指定と自動計算はゲーム上限786を超えない', () => {
  const manualFixture = loadPotCapacity(createAutomaticElements('999'));
  const automaticFixture = loadPotCapacity({
    ...createAutomaticElements(''),
    potCapacity: { value: '999' },
  });

  assert.equal(manualFixture.GAME_POT_CAPACITY_MAX, 786);
  assert.equal(manualFixture.calculatePotCapacity(), 786);
  assert.equal(automaticFixture.calculatePotCapacity(), 786);
});

test('鍋容量を空欄にすると従来の設定から自動計算する', () => {
  const fixture = loadPotCapacity(createAutomaticElements(''));

  assert.equal(fixture.calculatePotCapacity(), 786);
});

test('直接指定した鍋容量を保存し、空欄では設定を削除する', () => {
  const elements = createAutomaticElements('432');
  const fixture = loadPotCapacity(elements);

  fixture.savePotCapacitySettings();
  assert.equal(fixture.storage.get('maxPotCapacity'), '432');

  elements.maxPotCapacity.value = '';
  fixture.savePotCapacitySettings();
  assert.equal(fixture.storage.has('maxPotCapacity'), false);
});

test('保存済み鍋容量は読み込み時に現在のゲーム上限へ補正する', () => {
  const elements = createAutomaticElements('');
  const fixture = loadPotCapacity(elements, { maxPotCapacity: '900' });

  fixture.loadPotCapacitySettings();
  assert.equal(elements.maxPotCapacity.value, 786);
});
