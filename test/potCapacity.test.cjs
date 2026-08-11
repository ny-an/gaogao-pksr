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
    '  getEnergyReversePotCapacity,',
    '  loadPotCapacitySettings,',
    '  savePotCapacitySettings,',
    '};',
  ].join('\n');

  vm.runInNewContext(source, context);
  return { ...context.fixture, storage };
}

function createAutomaticElements() {
  return {
    potCapacity: { value: '81' },
    potEventBonus: { value: '1.0' },
    weekendBonus: { checked: true },
    cookingPowerUp: { value: '0' },
    goodCampTicket: { checked: true },
  };
}

test('現在の鍋容量は既存の鍋設定から計算する', () => {
  const fixture = loadPotCapacity(createAutomaticElements());

  assert.equal(fixture.calculatePotCapacity(), 243);
  assert.equal(fixture.getEnergyReversePotCapacity('current'), 243);
});

test('逆算の自動選択はゲーム上限786を返す', () => {
  const fixture = loadPotCapacity(createAutomaticElements());

  assert.equal(fixture.GAME_POT_CAPACITY_MAX, 786);
  assert.equal(fixture.getEnergyReversePotCapacity('max'), 786);
});

test('既存の鍋設定からの計算もゲーム上限786を超えない', () => {
  const fixture = loadPotCapacity({
    ...createAutomaticElements(),
    potCapacity: { value: '999' },
    potEventBonus: { value: '2' },
    cookingPowerUp: { value: '200' },
  });

  assert.equal(fixture.calculatePotCapacity(), 786);
});
