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

test('料理チャンスは3連鎖目以降の各連鎖で発動し上限到達後も表示する', () => {
  const resolveBoard = functionSource('resolveBoard');
  assert.match(resolveBoard, /const cookingChanceBonus = chain >= 3 \? activateCookingChance\(\) : 0;/);

  const context = {
    moves: 9,
    MAX_MOVES: 12,
    ACTIVATION_BONUS_MOVES: 1,
    extraTastyBonus: 0.7,
    MAX_COOKING_CHANCE_BONUS: 0.7,
    COOKING_CHANCE_BONUS_STEP: 0.1
  };
  vm.runInNewContext(
    `${functionSource('addActivationMove')}; ${functionSource('activateCookingChance')}; result = activateCookingChance();`,
    context
  );

  assert.equal(context.result, 70);
  assert.equal(context.extraTastyBonus, 0.7);
  assert.equal(context.moves, 10);
  assert.match(functionSource('showCookingChanceMessage'), /料理チャンス発動！ 大成功＋\$\{bonusPercent\}%/);
});

test('保存した未終了ゲームを検証して盤面と進捗を復元する', () => {
  const foodIds = ['a', 'b', 'c', 'd', 'e', 'f'];
  const foods = Object.fromEntries(foodIds.map(id => [id, { id, name: id }]));
  const recipe = { name: 'テスト料理', energy: 100, needs: { a: 2 } };
  const cellIds = ['koiki', ...Array.from({ length: 35 }, (_, index) => foodIds[index % foodIds.length])];
  const saved = {
    version: 1,
    moves: 7,
    score: 1234,
    dishes: 1,
    maxChain: 4,
    maxCookingEnergy: 800,
    extraTastyBonus: 0.3,
    recipeName: recipe.name,
    activePalette: foodIds,
    recipeProgress: { a: 2 },
    pot: { b: 3 },
    lockedIngredientIds: ['b'],
    totalAdditionalIngredients: { b: 5 },
    shuffleCount: 2,
    foodGetActivations: 3,
    cellIds
  };
  const baseContext = {
    GAME_STATE_VERSION: 1,
    MAX_MOVES: 12,
    MAX_COOKING_CHANCE_BONUS: 0.7,
    BOARD_FOOD_TYPES: 6,
    ROWS: 6,
    COLS: 6,
    ALL_FOOD_IDS: foodIds,
    FOODS: foods,
    RECIPES: [recipe],
    KOIKI: { id: 'koiki', kind: 'koiki' },
    recipeAtDifficulty: (baseRecipe, dishes) => ({ ...baseRecipe, needs: { a: baseRecipe.needs.a + dishes } }),
    makeFood: id => ({ ...foods[id], kind: 'food' })
  };
  const parse = raw => vm.runInNewContext(
    `${functionSource('validSavedNumber')}; ${functionSource('normalizeIngredientCounts')}; ${functionSource('parseSavedGame')}; parseSavedGame(raw);`,
    { ...baseContext, raw }
  );

  const restored = parse(JSON.stringify(saved));
  assert.equal(restored.moves, 7);
  assert.equal(restored.score, 1234);
  assert.equal(restored.activeRecipe.needs.a, 3);
  assert.equal(restored.recipeProgress.a, 2);
  assert.equal(restored.pot.b, 3);
  assert.deepEqual(Array.from(restored.lockedIngredients), ['b']);
  assert.equal(restored.cells[0].kind, 'koiki');
  assert.equal(restored.cells[1].kind, 'food');

  assert.equal(parse(JSON.stringify({ ...saved, version: 2 })), null);
  assert.equal(parse(JSON.stringify({ ...saved, cellIds: Array(36).fill('a') })), null);
  assert.equal(parse(JSON.stringify({ ...saved, moves: 0 })), null);
});

test('ゲーム状態は安定時に自動保存し終了時に削除して起動時に復元する', () => {
  const snapshot = functionSource('gameStateSnapshot');
  const save = functionSource('saveGame');
  const restore = functionSource('restoreGame');

  for (const field of [
    'moves', 'score', 'dishes', 'maxChain', 'maxCookingEnergy', 'extraTastyBonus',
    'recipeName', 'activePalette', 'recipeProgress', 'pot', 'lockedIngredientIds',
    'totalAdditionalIngredients', 'shuffleCount', 'foodGetActivations', 'cellIds'
  ]) assert.match(snapshot, new RegExp(`\\b${field}\\b`));

  assert.match(save, /!started \|\| ended \|\| busy \|\| cooking \|\| clearing\.size > 0 \|\| dropping\.size > 0/);
  assert.match(save, /localStorage\.setItem\(GAME_STATE_KEY/);
  assert.match(restore, /parseSavedGame\(localStorage\.getItem\(GAME_STATE_KEY\)\)/);
  assert.match(functionSource('playMove'), /if \(moves <= 0\) endGame\(\);\s*else saveGame\(\);/);
  assert.match(functionSource('startGame'), /clearSavedGame\(\);[\s\S]*saveGame\(\);/);
  assert.match(functionSource('endGame'), /clearSavedGame\(\);/);
  assert.match(source, /document\.addEventListener\('visibilitychange',[\s\S]*window\.addEventListener\('pagehide', saveGame\)/);
  assert.match(source, /if \(restoreGame\(\)\)[\s\S]*つづきから再開しました！/);
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

test('料理完成時に実際に消費した追加食材だけをアイコン表示する', () => {
  const context = {
    pot: { apple: 3, milk: 2, honey: 0 },
    lockedIngredients: new Set(['milk'])
  };
  const cookingIngredients = vm.runInNewContext(`(${functionSource('cookingAdditionalIngredients')})`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(cookingIngredients())), { apple: 3 });

  const cookRecipe = functionSource('cookRecipe');
  const celebration = functionSource('showCookCelebration');
  const renderIngredients = functionSource('renderCookAdditionalIngredients');
  assert.match(source, /id="cookAdditional" hidden/);
  assert.match(source, /id="cookAdditionalItems"/);
  assert.doesNotMatch(source, /class="cook-final-label"/);
  assert.equal((source.match(/class="cook-final-unit">エナジー</g) || []).length, 1);
  assert.match(cookRecipe, /const usedAdditionalIngredients = cookingAdditionalIngredients\(\)/);
  assert.match(cookRecipe, /showCookCelebration\(cooked, recipeLevelEnergy\.totalEnergy, cookingEnergy, isExtraTasty, usedAdditionalIngredients\)/);
  assert.match(celebration, /renderCookAdditionalIngredients\(additionalIngredients\)/);
  assert.match(renderIngredients, /cookAdditionalEl\.hidden = entries\.length === 0/);
  assert.match(renderIngredients, /class="cook-additional-count"/);
});

test('SPの追加食材は全19種類をロックとバッジが重ならない2段に収める', () => {
  const mobileStart = source.indexOf('@media (max-width: 520px)');
  const narrowStart = source.indexOf('@media (max-width: 360px)', mobileStart);
  const mobileStyles = source.slice(mobileStart, narrowStart);

  assert.match(mobileStyles, /\.additional-row \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(mobileStyles, /\.additional-ingredients \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(10, minmax\(0, 1fr\)\);[\s\S]*?column-gap: clamp\(4px, 1\.5vw, 9px\);[\s\S]*?row-gap: 10px;/);
  assert.match(mobileStyles, /\.additional-lock \{ left: 0; \}/);
  assert.match(mobileStyles, /\.additional-count \{ right: 0; \}/);
});

test('追加食材は全ロックだけを一括操作できる', () => {
  assert.match(source, /id="lockAllIngredients"[\s\S]*?🔒 全ロック/);
  assert.doesNotMatch(source, /unlockAllIngredients|全解除/);
  assert.match(source, /lockAllIngredientsButton\.disabled = disabled \|\| ingredientIds\.length === 0 \|\| ingredientIds\.every\(id => lockedIngredients\.has\(id\)\)/);
  assert.match(source, /function lockAllAdditionalIngredients\(\)[\s\S]*?\.forEach\(id => lockedIngredients\.add\(id\)\)/);
  assert.match(source, /lockAllIngredientsButton\.addEventListener\('click'/);
});

test('持ち越した追加食材はロック解除時に現在料理の不足分へ充当する', () => {
  const context = {
    pot: { apple: 5, milk: 2 },
    recipeProgress: { apple: 1 },
    currentRecipe: () => ({ needs: { apple: 3 } })
  };
  const useUnlockedIngredientForRecipe = vm.runInNewContext(
    `(${functionSource('useUnlockedIngredientForRecipe')})`,
    context
  );

  assert.equal(useUnlockedIngredientForRecipe('apple'), 2);
  assert.equal(context.recipeProgress.apple, 3);
  assert.equal(context.pot.apple, 3);
  assert.equal(useUnlockedIngredientForRecipe('milk'), 0);
  assert.equal(context.pot.milk, 2);

  context.recipeProgress.apple = 0;
  context.pot.apple = 2;
  assert.equal(useUnlockedIngredientForRecipe('apple'), 2);
  assert.equal(context.recipeProgress.apple, 2);
  assert.equal('apple' in context.pot, false);

  assert.match(source, /const usedForRecipe = useUnlockedIngredientForRecipe\(id\)/);
  assert.match(source, /if \(recipeComplete\(\)\) await cookRecipe\(\)/);
});

test('操作アイコンは提供されたGaoGaoPuuun画像を表示する', () => {
  assert.match(source, /--koiki-icon: url\("img\/icons\/gaogaopuuun-koiki\.png"\)/);
  assert.doesNotMatch(source, /--koiki-icon: url\("data:image\//);
  assert.equal(fs.existsSync(path.join(projectRoot, 'img/icons/gaogaopuuun-koiki.png')), true);
});

test('完成数でレシピレベルを上げて料理基礎エナジーへボーナスを加える', () => {
  const recipeLevelForCompletedDishes = vm.runInNewContext(
    `(${functionSource('recipeLevelForCompletedDishes')})`,
    { RECIPE_LEVEL_MAX: 70 }
  );
  assert.equal(recipeLevelForCompletedDishes(0), 1);
  assert.equal(recipeLevelForCompletedDishes(1), 2);
  assert.equal(recipeLevelForCompletedDishes(100), 70);

  const recipeEnergyAtLevel = vm.runInNewContext(
    `(${functionSource('recipeEnergyAtLevel')})`,
    { recipeLevelBonusList: { 1: '0', 2: '2', 70: '258' } }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(recipeEnergyAtLevel(1234, 2))),
    { bonusPercent: 2, bonusEnergy: 25, totalEnergy: 1259 }
  );

  const cookRecipe = functionSource('cookRecipe');
  assert.match(source, /<title>お料理できるかな！！<\/title>/);
  assert.match(source, /<h1>お料理できるかな！！<\/h1>/);
  assert.match(source, /<span class="stat-label">レシピレベル<\/span>/);
  assert.match(source, /id="recipeLevelValue">Lv1</);
  assert.doesNotMatch(source, /できた料理|最大料理数|品完成/);
  assert.match(cookRecipe, /const recipeLevel = recipeLevelForCompletedDishes\(dishes\)/);
  assert.match(cookRecipe, /const baseCookingEnergy = recipeLevelEnergy\.totalEnergy \+ extraEnergy/);
  assert.match(cookRecipe, /const cookingEnergy = baseCookingEnergy \* \(isExtraTasty/);
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
