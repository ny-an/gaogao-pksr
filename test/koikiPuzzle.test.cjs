const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'koiki-puzzle.html'), 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const end = source.indexOf('\n  }\n', start);
  assert.notEqual(end, -1, `${name} is incomplete`);
  return source.slice(start, end + 5);
}

test('食材ゲットは盤面候補ではなく全食材から3種類を抽選する', () => {
  const body = functionSource('activateFoodGet');
  assert.match(body, /const candidates = \[\.\.\.ALL_FOOD_IDS\]/);
  assert.doesNotMatch(body, /activePalette/);
  assert.match(body, /const selectedFoods = candidates\.slice\(0, 3\)/);
});

test('食材ゲットの取得数を3種類へ差1個以内で配分する', () => {
  const distributeFoodGet = vm.runInNewContext(`(${functionSource('distributeFoodGet')})`);
  const foods = ['a', 'b', 'c'];

  for (const total of [6, 8, 11, 14, 17, 21, 24]) {
    const counts = Object.values(distributeFoodGet(total, foods));
    assert.equal(counts.length, 3);
    assert.equal(counts.reduce((sum, count) => sum + count, 0), total);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  }
});

test('食材ゲットと料理チャンスの発動ごとに1手回復する', () => {
  const context = { moves: 9, MAX_MOVES: 12, ACTIVATION_BONUS_MOVES: 1 };
  const addMoveSource = functionSource('addActivationMove');
  vm.runInNewContext(`${addMoveSource}; addActivationMove(); addActivationMove();`, context);
  assert.equal(context.moves, 11);

  context.moves = 11;
  vm.runInNewContext(`${addMoveSource}; addActivationMove(); addActivationMove();`, context);
  assert.equal(context.moves, 12);
  assert.match(functionSource('activateFoodGet'), /addActivationMove\(\)/);
  assert.match(functionSource('activateCookingChance'), /addActivationMove\(\)/);
});

test('各スキル表示の終了後に独立した手数回復を表示する', () => {
  const foodGetMessage = functionSource('showFoodGetMessage');
  const cookingChanceMessage = functionSource('showCookingChanceMessage');
  const moveMessage = functionSource('showActivationMoveMessage');
  const resolveBoard = functionSource('resolveBoard');

  assert.doesNotMatch(foodGetMessage, /ACTIVATION_BONUS_MOVES/);
  assert.doesNotMatch(cookingChanceMessage, /ACTIVATION_BONUS_MOVES/);
  assert.match(moveMessage, /`＋\$\{ACTIVATION_BONUS_MOVES\}手`/);
  assert.match(resolveBoard, /if \(foodGet\) \{[\s\S]*?showActivationMoveMessage\(\);/);
  assert.match(resolveBoard, /if \(cookingChanceBonus\) \{[\s\S]*?showActivationMoveMessage\(\);/);
  assert.equal((resolveBoard.match(/showActivationMoveMessage\(\);/g) || []).length, 2);
});

test('食材ゲットLvと料理チャンス確率を常設表示する', () => {
  assert.match(source, /id="foodGetLevel">Lv0</);
  assert.match(source, /id="cookingChanceValue">\+0%</);
  assert.match(source, /foodGetLevelEl\.textContent = `Lv\$\{Math\.min\(foodGetActivations, FOOD_GET_REWARDS\.length\)\}`/);
  assert.match(source, /cookingChanceValueEl\.textContent = `\+\$\{Math\.round\(extraTastyBonus \* 100\)\}%`/);
  assert.match(functionSource('cookRecipe'), /if \(isExtraTasty\) extraTastyBonus = 0/);
});

test('リザルトはベスト更新状況と今回の結果を重複なく表示する', () => {
  assert.match(source, /id="resultBestStatus"/);
  assert.match(functionSource('endGame'), /今回の結果：\$\{shareStats\}/);
  assert.doesNotMatch(source, /id="resultShareHeadline"/);
  assert.doesNotMatch(source, /class="result-share-copy"/);
});

test('100万台のエナジーを折り返さず等幅数字で表示する', () => {
  assert.match(source, /class="result-score-unit">エナジー</);
  assert.match(source, /class="cook-final-unit">エナジー</);
  assert.match(source, /\.result-score \{[\s\S]*?font-variant-numeric: tabular-nums;[\s\S]*?white-space: nowrap;/);
  assert.match(source, /\.cook-final-energy \{[\s\S]*?font-variant-numeric: tabular-nums;[\s\S]*?white-space: nowrap;/);
});

test('OGP画像は1200x630でキャッシュ更新版を参照する', () => {
  const image = fs.readFileSync(path.join(projectRoot, 'img/ogp/koiki-puzzle-ogp.png'));
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.match(source, /koiki-puzzle-ogp\.png\?v=20260830-simple/);
});
