/**
 * events.js の簡易テスト（Node）
 * 実行: node test/events.test.cjs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const eventsPath = path.join(__dirname, '..', 'js', 'data', 'events.js');
const code = fs.readFileSync(eventsPath, 'utf8');
const context = vm.createContext({ console });
vm.runInContext(
  `${code}
  this.eventsList = eventsList;
  this.EVENT_COOKING_BONUS_VALUES = EVENT_COOKING_BONUS_VALUES;
  this.EVENT_POT_BONUS_VALUES = EVENT_POT_BONUS_VALUES;
  this.getActiveEventPeriod = getActiveEventPeriod;
  this.getActiveCookingEnergyMultiplier = getActiveCookingEnergyMultiplier;
  this.getActivePotCapacityMultiplier = getActivePotCapacityMultiplier;
  this.getEventById = getEventById;
  `,
  context
);

const {
  eventsList,
  EVENT_COOKING_BONUS_VALUES,
  EVENT_POT_BONUS_VALUES,
  getActiveEventPeriod,
  getActiveCookingEnergyMultiplier,
  getActivePotCapacityMultiplier,
  getEventById,
} = context;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(Array.isArray(eventsList) && eventsList.length >= 2, 'eventsList が不足');
assert(EVENT_COOKING_BONUS_VALUES.includes(1.5), '料理倍率に1.5がない');
assert(EVENT_POT_BONUS_VALUES.includes(1.5), 'なべ倍率に1.5がない');

const festival = getEventById('3rd-anniversary-festival-2026');
assert(festival, '3周年フェスが見つからない');
assert(festival.weeks.length === 2, '週データが2つではない');

// 1週目: 料理倍率なし
const week1 = getActiveEventPeriod(new Date('2026-07-15T12:00:00+09:00'));
assert(week1 && week1.week && week1.week.week === 1, '1週目判定失敗');
assert(getActiveCookingEnergyMultiplier(new Date('2026-07-15T12:00:00+09:00')) === 1.0, '1週目料理倍率');
assert(getActivePotCapacityMultiplier(new Date('2026-07-15T12:00:00+09:00')) === 1.0, '1週目なべ倍率');

// 2週目: 料理1.5倍
const week2 = getActiveEventPeriod(new Date('2026-07-22T12:00:00+09:00'));
assert(week2 && week2.week && week2.week.week === 2, '2週目判定失敗');
assert(getActiveCookingEnergyMultiplier(new Date('2026-07-22T12:00:00+09:00')) === 1.5, '2週目料理倍率');
assert(getActivePotCapacityMultiplier(new Date('2026-07-22T12:00:00+09:00')) === 1.0, '2週目なべ倍率');

// 境界: 7/20 3:59 は1週目、4:00 は2週目
assert(getActiveEventPeriod(new Date('2026-07-20T03:59:00+09:00')).week.week === 1, '境界1週目');
assert(getActiveEventPeriod(new Date('2026-07-20T04:00:00+09:00')).week.week === 2, '境界2週目');

// もうすぐ3周年
const almost = getActiveEventPeriod(new Date('2026-07-08T12:00:00+09:00'));
assert(almost && almost.event.id === 'almost-3rd-anniversary-2026', 'もうすぐ3周年判定');
assert(getActiveCookingEnergyMultiplier(new Date('2026-07-08T12:00:00+09:00')) === 1.0, 'もうすぐ3周年料理倍率');

// 期間外
assert(getActiveEventPeriod(new Date('2026-07-01T12:00:00+09:00')) === null, '期間外判定');

console.log('events.test.cjs: all passed');
