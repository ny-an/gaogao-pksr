const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getISOWeekString,
  getMondayDateFromWeek,
  inferIsoTargetsFromLegacyWeekString,
} = require('../js/calendar/weekUtils.js');

test('ISO週キー: 年またぎ週(2025-12-29)は 2026-W01', () => {
  // ローカルTZ差の影響を避けるため、正午で固定
  const d = new Date('2025-12-29T12:00:00Z');
  assert.equal(getISOWeekString(d), '2026-W01');
});

test('ISO週キー: 2026-01-01 は 2026-W01', () => {
  const d = new Date('2026-01-01T12:00:00Z');
  assert.equal(getISOWeekString(d), '2026-W01');
});

test('ISO週キー: 2026-01-05 は 2026-W02', () => {
  const d = new Date('2026-01-05T12:00:00Z');
  assert.equal(getISOWeekString(d), '2026-W02');
});

test('週→月曜: 2026-W01 の月曜は 2025/12/29 (2026のJan4が日曜でも崩れない)', () => {
  assert.equal(getMondayDateFromWeek('2026-W01'), '2025/12/29');
});

test('移行推定: legacy 2025-W01 は 2025-W01 と 2026-W01 の両方に複製候補が出る', () => {
  const targets = inferIsoTargetsFromLegacyWeekString('2025-W01');
  // 順序は安定だが、最悪の差分にも耐えるように集合で確認
  assert.ok(targets.includes('2025-W01'));
  assert.ok(targets.includes('2026-W01'));
});

