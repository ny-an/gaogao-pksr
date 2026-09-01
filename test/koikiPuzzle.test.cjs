const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'koiki-puzzle.html'), 'utf8');
const legacySource = fs.readFileSync(path.join(projectRoot, 'koiki-puzzle-legacy.html'), 'utf8');
const indexSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const v2Source = fs.readFileSync(path.join(projectRoot, 'js/koiki-puzzle-v2.js'), 'utf8');
const debugSource = fs.readFileSync(path.join(projectRoot, 'js/koiki-puzzle-debug-ui.js'), 'utf8');

function functionSource(name) {
  const start = legacySource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const end = legacySource.indexOf('\n  }\n', start);
  assert.notEqual(end, -1, `${name} is incomplete`);
  return legacySource.slice(start, end + 5);
}

function v2FunctionSource(name) {
  const start = v2Source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing from v2 runtime`);
  const end = v2Source.indexOf('\n  }\n', start);
  assert.notEqual(end, -1, `${name} is incomplete in v2 runtime`);
  return v2Source.slice(start, end + 5);
}

function v2SpawnFunctions(recipe, pot, activePalette) {
  return vm.runInNewContext(`(() => {
    ${v2FunctionSource('ingredientShortages')}
    ${v2FunctionSource('chooseVirtualShortage')}
    ${v2FunctionSource('spawnPool')}
    return { ingredientShortages, chooseVirtualShortage, spawnPool };
  })()`, {
    currentRecipe: () => recipe,
    pot,
    activePalette,
    Math,
    Object
  });
}

function poolCounts(pool) {
  return Object.fromEntries([...new Set(pool)].map(id => [id, pool.filter(candidate => candidate === id).length]));
}

test('不足ありの盤面リセットは食材バッグに対する不足割合で強く偏らせる', () => {
  const recipe = { needs: { a: 8, b: 4 } };
  const { ingredientShortages, spawnPool } = v2SpawnFunctions(recipe, { a: 4, b: 4 }, ['a', 'b', 'c']);
  assert.deepEqual(JSON.parse(JSON.stringify(ingredientShortages(recipe))), {
    shortages: { a: 4, b: 0 },
    total: 4
  });
  assert.deepEqual(poolCounts(spawnPool(recipe, { reset: true })), { a: 8, b: 1, c: 1 });
});

test('不足なしの盤面リセットは必要食材1種類だけを仮想不足ウェイト8にする', () => {
  const recipe = { needs: { a: 8, b: 4 } };
  const { spawnPool } = v2SpawnFunctions(recipe, { a: 8, b: 4 }, ['a', 'b', 'c']);
  assert.deepEqual(poolCounts(spawnPool(recipe, { reset: true, virtualShortageId: 'b' })), { a: 1, b: 8, c: 1 });
});

test('仮想不足は盤面生成ごとに選び直しリトライ中は固定してセーブしない', () => {
  const recipe = { needs: { a: 8, b: 4 } };
  const { chooseVirtualShortage } = v2SpawnFunctions(recipe, { a: 8, b: 4 }, ['a', 'b', 'c']);
  assert.equal(chooseVirtualShortage(recipe, 0), 'a');
  assert.equal(chooseVirtualShortage(recipe, 0.999), 'b');

  const buildBoard = v2FunctionSource('buildBoard');
  const choiceIndex = buildBoard.indexOf('chooseVirtualShortage(recipe)');
  const retryIndex = buildBoard.indexOf('for (let attempt');
  assert.ok(choiceIndex >= 0 && choiceIndex < retryIndex);
  assert.equal((buildBoard.match(/chooseVirtualShortage\(recipe\)/g) || []).length, 1);
  assert.match(v2FunctionSource('performShuffle'), /cells = buildBoard\(\)/);
  assert.doesNotMatch(v2FunctionSource('gameStateSnapshot'), /virtualShortage/);
});

test('消去後の補充は仮想不足を使わず必要食材を最低ウェイト2にする', () => {
  const recipe = { needs: { a: 8, b: 4 } };
  const fullBag = v2SpawnFunctions(recipe, { a: 8, b: 4 }, ['a', 'b', 'c']);
  assert.deepEqual(
    poolCounts(fullBag.spawnPool(recipe, { reset: false, virtualShortageId: 'b' })),
    { a: 2, b: 2, c: 1 }
  );

  const shortBag = v2SpawnFunctions(recipe, { a: 4, b: 4 }, ['a', 'b', 'c']);
  assert.deepEqual(poolCounts(shortBag.spawnPool(recipe, { reset: false })), { a: 8, b: 2, c: 1 });
  assert.match(v2FunctionSource('applyGravity'), /spawnPool\(currentRecipe\(\), \{ reset: false \}\)/);
});

test('盤面リセットは全6種類・自動消去なし・有効手ありを維持する', () => {
  const recipe = { needs: { a: 4, b: 4 } };
  const activePalette = ['a', 'b', 'c', 'd', 'e', 'f'];
  let seed = 246813579;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const context = {
    currentRecipe: () => recipe,
    pot: { a: 4, b: 4 },
    activePalette,
    ROWS: 6,
    COLS: 6,
    KOIKI: { id: 'koiki', kind: 'koiki' },
    makeFood: id => ({ id, kind: 'food' }),
    randomFrom: list => list[Math.floor(seededMath.random() * list.length)],
    Math: seededMath,
    Object,
    Set,
    Array
  };
  const boardFunctions = vm.runInNewContext(`(() => {
    ${v2FunctionSource('ingredientShortages')}
    ${v2FunctionSource('chooseVirtualShortage')}
    ${v2FunctionSource('spawnPool')}
    ${v2FunctionSource('createsFourAt')}
    ${v2FunctionSource('findMatches')}
    ${v2FunctionSource('hasScoringSwap')}
    ${v2FunctionSource('buildBoard')}
    return { buildBoard, findMatches, hasScoringSwap };
  })()`, context);

  for (let attempt = 0; attempt < 8; attempt++) {
    const board = boardFunctions.buildBoard(recipe);
    assert.equal(board.length, 36);
    assert.equal(board.filter(tile => tile.kind === 'koiki').length, 1);
    activePalette.forEach(id => assert.ok(board.some(tile => tile.id === id), `${id}が盤面にありません`));
    assert.equal(boardFunctions.findMatches(board).size, 0);
    assert.equal(boardFunctions.hasScoringSwap(board), true);
  }
});

test('v2ランタイムと3モード・食材バッグ調理UIを読み込む', () => {
  assert.match(source, /<script src="js\/koiki-puzzle-v2\.js\?v=20260901-2"><\/script>/);
  assert.match(source, /id="modeDialog"/);
  assert.match(source, /data-mode="endless"/);
  assert.match(source, /data-mode="normal"/);
  assert.match(source, /data-mode="ex"/);
  assert.match(source, /とことん<\/strong><span>無期限で記録に挑戦/);
  assert.match(source, /ノーマル<\/strong><span>1週間・必要食材70%・スキル＋1手/);
  assert.match(source, /EX<\/strong><span>1週間・必要食材100%・スキル＋2手/);
  assert.match(source, /id="cookButton"/);
  assert.match(source, /id="openAddFood"/);
  assert.match(source, /id="addFoodDialog"/);
  assert.match(source, /id="additionalIngredients" aria-label="食材バッグ"/);
  assert.match(source, /id="bagFullDialog"/);
  assert.doesNotMatch(source, /id="weeklyDialog"/);
  assert.match(source, /href="koiki-puzzle-legacy\.html"><strong>サバイバル<\/strong><span>手数が尽きるまで料理を続ける<\/span>/);
  assert.doesNotMatch(source, /const GAME_STATE_KEY = 'gaogao-pksr\.koiki-puzzle\.game\.v1'/);
});

test('あそびかたは3ステップと短いTipsに圧縮し詳細を折りたたむ', () => {
  const rulesDialog = source.slice(source.indexOf('<dialog id="rulesDialog">'), source.indexOf('</dialog>', source.indexOf('<dialog id="rulesDialog">')));
  const coreRules = rulesDialog.match(/<ol class="rules-list">[\s\S]*?<\/ol>/)?.[0] || '';
  assert.equal((coreRules.match(/<li>/g) || []).length, 3);
  assert.equal((rulesDialog.match(/class="rules-tip"/g) || []).length, 4);
  assert.match(rulesDialog, /<details class="rules-details">/);
  assert.match(rulesDialog, /<summary>モード・ボーナス<\/summary>/);
  assert.match(source, /\.rules-content \{[\s\S]*?max-height: calc\(100dvh - 24px\);[\s\S]*?overflow-y: auto;/);
  assert.match(source, /\.rules-close \{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;/);
});

test('SPの主要操作は下部1列ドックで常に見つけられる', () => {
  assert.match(source, /id="startButton" type="button" aria-label="モードを選ぶ">モード<\/button>/);
  assert.match(source, /body\.game-started \.actions\.v2-actions \{[\s\S]*?position: fixed;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto auto;/);
  assert.match(source, /body\.game-started \.actions\.v2-actions \.cook-button \{[\s\S]*?grid-column: auto;/);
  assert.match(source, /\.cook-button:disabled \{[\s\S]*?opacity: 1;/);
});

test('サバイバルはv1のページ・保存領域・ランタイムとしてv2から分離する', () => {
  assert.match(legacySource, /<title>お料理できるかな！！（サバイバル）<\/title>/);
  assert.match(legacySource, /class="legacy-label">サバイバル<\/p>/);
  assert.doesNotMatch(legacySource, /href="koiki-puzzle\.html"|新版へ/);
  assert.match(legacySource, /const GAME_STATE_KEY = 'gaogao-pksr\.koiki-puzzle\.game\.v1'/);
  assert.match(legacySource, /const RECORDS_KEY = 'gaogao-pksr\.koiki-puzzle\.records\.v1'/);
  assert.match(legacySource, /const RARE_RECIPE_WEIGHT = 0\.5;/);
  assert.match(legacySource, /id="survivalGuideDialog"/);
  assert.match(legacySource, /必要食材がそろうと自動調理！/);
  assert.match(legacySource, /SURVIVAL_GUIDE_HIDDEN_KEY = 'gaogao-pksr\.koiki-puzzle\.survival-guide-hidden\.v1'/);
  assert.match(legacySource, /showSurvivalGuide\(\);\s*setupLocalDebug\(\);\s*\n\}\)\(\);/);
  assert.doesNotMatch(legacySource, /js\/koiki-puzzle-v2\.js|game\.v2\.active/);
});

test('ローカルのdebug=1だけでV2とサバイバルの操作パネルを有効にする', () => {
  const sandboxWindow = {};
  vm.runInNewContext(debugSource, { window: sandboxWindow, document: {}, URLSearchParams });
  const { enabled } = sandboxWindow.KoikiDebugPanel;
  assert.equal(enabled({ protocol: 'file:', hostname: '', search: '?debug=1' }), true);
  assert.equal(enabled({ protocol: 'http:', hostname: '127.0.0.1', search: '?debug=1' }), true);
  assert.equal(enabled({ protocol: 'http:', hostname: 'localhost', search: '' }), false);
  assert.equal(enabled({ protocol: 'https:', hostname: 'ny-an.github.io', search: '?debug=1' }), false);
  assert.match(source, /js\/koiki-puzzle-debug-ui\.js[\s\S]*js\/koiki-puzzle-v2\.js/);
  assert.match(legacySource, /js\/koiki-puzzle-debug-ui\.js[\s\S]*<script>[\s\S]*setupLocalDebug\(\)/);
  assert.match(v2Source, /function setupLocalDebug\(\)[\s\S]*必要食材をそろえる[\s\S]*食材ゲット発動[\s\S]*日曜朝へ[\s\S]*21食目へ/);
  assert.match(legacySource, /function setupLocalDebug\(\)[\s\S]*今の料理を自動完成[\s\S]*追加食材 全種＋20[\s\S]*料理チャンス発動/);
  assert.match(v2Source, /const successful = debugForceCookingSuccess \|\| Math\.random\(\) < successChance\(\)/);
  assert.match(legacySource, /const isExtraTasty = debugForceCookingSuccess \|\| Math\.random\(\) < EXTRA_TASTY_CHANCE \+ extraTastyBonus/);
});

test('食材バッグは在庫と上限を一体表示し投入中の食材を編集できる', () => {
  assert.match(source, /class="[^"]*bag-meter[^"]*"[^>]*id="bagChip"/);
  assert.match(source, /id="bagChipText">食材バッグ（0\/∞）/);
  assert.match(v2FunctionSource('renderContext'), /食材バッグ（\$\{bagTotal\}\/\$\{BAG_CAPACITY\}）/);
  assert.match(source, />投入中</);
  assert.match(source, /id="cookingAdditions"/);
  assert.match(v2Source, /openAddFoodButton\.addEventListener\('click', openAdditionDialog\)/);
});

test('ノーマルとEXの必要食材倍率を仕様どおり計算する', () => {
  const scaleNeeds = vm.runInNewContext(`(${v2FunctionSource('scaleNeeds')})`);
  assert.deepEqual(JSON.parse(JSON.stringify(scaleNeeds({ a: 11, b: 2 }, 0.7))), { a: 8, b: 2 });
  const recipeNeeds = v2FunctionSource('recipeNeedsForMode');
  assert.match(recipeNeeds, /mode === 'normal' \? NORMAL_NEED_FACTOR : 1/);
  assert.doesNotMatch(v2Source, /normalNeedFactor|exNeedFactor|normalCandidateTotal/);
});

test('とことんの必要食材数はレシピLvと独立して増え続ける', () => {
  const recipeNeeds = v2FunctionSource('recipeNeedsForMode');
  assert.match(recipeNeeds, /mode === 'endless'\) return increaseRecipeNeeds\(recipe\.miniNeeds, completedDishes\)/);
  assert.doesNotMatch(recipeNeeds, /RECIPE_LEVEL_MAX/);
});

test('レシピLv必要エナジーは二次式でLv70までの累計値と一致する', () => {
  const functions = vm.runInNewContext(`(() => {
    ${v2FunctionSource('recipeLevelRequirement')}
    ${v2FunctionSource('recipeLevelCumulativeEnergy')}
    ${v2FunctionSource('recipeLevelForEnergy')}
    ${v2FunctionSource('recipeLevelProgress')}
    return { recipeLevelRequirement, recipeLevelCumulativeEnergy, recipeLevelForEnergy, recipeLevelProgress };
  })()`, { RECIPE_LEVEL_MAX: 70, Math, Number });

  assert.equal(functions.recipeLevelRequirement(1), 504);
  assert.equal(functions.recipeLevelRequirement(36), 5684);
  assert.equal(functions.recipeLevelRequirement(69), 19544);
  assert.equal(functions.recipeLevelRequirement(70), null);

  const milestones = { 10: 5640, 20: 19380, 30: 48720, 40: 101660, 50: 186200, 60: 310340, 70: 482080 };
  Object.entries(milestones).forEach(([level, energy]) => assert.equal(functions.recipeLevelCumulativeEnergy(Number(level)), energy));

  assert.equal(functions.recipeLevelForEnergy(0), 1);
  assert.equal(functions.recipeLevelForEnergy(503), 1);
  assert.equal(functions.recipeLevelForEnergy(504), 2);
  assert.equal(functions.recipeLevelForEnergy(5639), 9);
  assert.equal(functions.recipeLevelForEnergy(5640), 10);
  assert.equal(functions.recipeLevelForEnergy(482079), 69);
  assert.equal(functions.recipeLevelForEnergy(482080), 70);
  assert.deepEqual(JSON.parse(JSON.stringify(functions.recipeLevelProgress(482080))), {
    level: 70,
    cumulativeEnergy: 482080,
    remainingEnergy: null
  });
});

test('最終料理エナジーを加算後にレベルアップし新ボーナスは次の料理から使う', () => {
  const cookRecipe = v2FunctionSource('cookRecipe');
  const levelReadIndex = cookRecipe.indexOf('recipeEnergyAtLevel(cooked.energy, recipeLevelForEnergy(score))');
  const scoreAddIndex = cookRecipe.indexOf('score += energy.totalEnergy');
  assert.ok(levelReadIndex >= 0 && scoreAddIndex > levelReadIndex);
  assert.match(cookRecipe, /calculateCookingEnergy\(levelEnergy\.totalEnergy, extraEnergy, fbPercentForMode\(\), multiplier\)/);
  assert.match(v2FunctionSource('gameStateSnapshot'), /\bmoves, score, dishes\b/);
  assert.match(v2FunctionSource('applyRestoredGame'), /score = restored\.score/);
  assert.match(v2FunctionSource('renderRecordsDialog'), /recipeLevelForEnergy\(records\.totalEnergy\)/);
});

test('レシピLvをボタンで開きLv1〜70と現在・次・MAXを表示する', () => {
  assert.match(source, /id="recipeLevelButton"[\s\S]*?aria-haspopup="dialog"/);
  assert.match(source, /id="recipeLevelDialog"/);
  assert.match(source, /id="recipeLevelCumulative"/);
  assert.match(source, /id="recipeLevelRemaining"/);
  assert.match(source, /<th scope="col">Lv<\/th><th scope="col">ボーナス<\/th><th scope="col">次まで<\/th><th scope="col">累計<\/th>/);
  assert.match(v2FunctionSource('renderStatus'), /recipeLevelForEnergy\(score\)/);
  const render = v2FunctionSource('renderRecipeLevelDialog');
  assert.match(render, /Array\.from\(\{ length: RECIPE_LEVEL_MAX \}/);
  assert.match(render, /reached \? 'reached'/);
  assert.match(render, /current \? 'current'/);
  assert.match(render, /next \? 'next'/);
  assert.match(render, /requirement === null \? '<strong>MAX<\/strong>'/);
  assert.match(render, /scroller\.scrollTop = Math\.max/);
});

test('料理エナジーはとことんだけFBを適用して成功倍率を最後に掛ける', () => {
  const calculate = vm.runInNewContext(`(${v2FunctionSource('calculateCookingEnergy')})`);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calculate(1000, 333, 5, 3))),
    { baseEnergy: 1333, fbEnergy: 1399, totalEnergy: 4197 }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calculate(1000, 333, 0, 3))),
    { baseEnergy: 1333, fbEnergy: 1333, totalEnergy: 3999 }
  );
  assert.match(v2FunctionSource('cookRecipe'), /calculateCookingEnergy\(levelEnergy\.totalEnergy, extraEnergy, fbPercentForMode\(\), multiplier\)/);
});

test('とことんのFBは21食ごとに5%上がり85%で止まる', () => {
  const context = { dishes: 0, activeMode: 'endless', FB_MAX: 85, MEALS_PER_WEEK: 21, FB_STEP: 5, Math };
  const fbPercent = vm.runInNewContext(`(${v2FunctionSource('fbPercentForMode')})`, context);
  const weekNumber = vm.runInNewContext(`(${v2FunctionSource('endlessWeekNumber')})`, context);
  assert.equal(fbPercent(20, 'endless'), 0);
  assert.equal(fbPercent(21, 'endless'), 5);
  assert.equal(fbPercent(357, 'endless'), 85);
  assert.equal(fbPercent(999, 'endless'), 85);
  assert.equal(fbPercent(42, 'normal'), 0);
  assert.equal(fbPercent(42, 'ex'), 0);
  assert.equal(weekNumber(0), 1);
  assert.equal(weekNumber(21), 2);
});

test('開始時に週間カテゴリを均等抽選し21食の途中で変更しない', () => {
  const choose = vm.runInNewContext(`(${v2FunctionSource('chooseCategory')})`, { CATEGORIES: ['サラダ', 'カレー', 'デザート'], Math });
  assert.equal(choose(0.1), 'サラダ');
  assert.equal(choose(0.4), 'カレー');
  assert.equal(choose(0.8), 'デザート');
  assert.match(v2FunctionSource('resetState'), /currentCategory = mode === 'endless' \? null : chooseCategory\(\)/);
  assert.doesNotMatch(v2Source, /nextCategory|chooseNextCategory|categoryChangedThisWeek/);
});

test('料理は自動完成せず料理ボタンでのみ完成する', () => {
  assert.doesNotMatch(v2FunctionSource('resolveBoard'), /cookRecipe\(/);
  assert.match(v2Source, /cookButton\.addEventListener\('click', cookRecipe\)/);
  assert.match(v2FunctionSource('cookRecipe'), /if \(!started \|\| ended \|\| busy \|\| cooking \|\| !recipeComplete\(\)\) return/);
  assert.match(v2FunctionSource('renderStatus'), /cookButton\.disabled = [\s\S]*!recipeComplete\(\)/);
});

test('料理可否はロックを無視し追加食材は明示投入分だけを使う', () => {
  const recipeComplete = vm.runInNewContext(`(${v2FunctionSource('recipeComplete')})`, {
    pot: { apple: 3, milk: 2 },
    currentRecipe: () => ({ needs: { apple: 3, milk: 2 } })
  });
  assert.equal(recipeComplete(), true);

  const context = {
    pot: { apple: 5, milk: 4 },
    cookingAdditions: { honey: 2 },
    lockedIngredients: new Set(['apple']),
    ALL_FOOD_IDS: ['apple', 'milk', 'honey'],
    currentRecipe: () => ({ needs: { apple: 3, milk: 2 } })
  };
  const consumeBagForCooking = vm.runInNewContext(`(${v2FunctionSource('consumeBagForCooking')})`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(consumeBagForCooking())), { honey: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.pot)), { apple: 2, milk: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.cookingAdditions)), {});
  assert.deepEqual(Array.from(context.lockedIngredients), ['apple']);
});

test('新しくバッグへ入った食材は全モード共通でロックし解除済み種類は維持する', () => {
  const context = {
    FOODS: { apple: { name: 'りんご' } },
    pot: {},
    lockedIngredients: new Set(),
    totalAdditionalIngredients: {},
    autoInvestBagOverflow: () => ({}),
    Object
  };
  const addIngredient = vm.runInNewContext(`(${v2FunctionSource('addIngredient')})`, context);
  addIngredient('apple', 2);
  assert.equal(context.pot.apple, 2);
  assert.deepEqual(Array.from(context.lockedIngredients), ['apple']);
  context.lockedIngredients.delete('apple');
  addIngredient('apple', 1);
  assert.equal(context.pot.apple, 3);
  assert.deepEqual(Array.from(context.lockedIngredients), []);
  assert.match(source, /id="openAddFood"[^>]*>投入<\/button>/);
  assert.match(source, /id="addFoodConfirm"[^>]*>投入する<\/button>/);
});

test('週間モードは曜日・21食進捗・カテゴリ・食材バッグを表示する', () => {
  assert.match(v2FunctionSource('renderContext'), /`\$\{weekdayName\(mealIndex\)\} \$\{mealName\(mealIndex\)\}`/);
  assert.match(v2FunctionSource('renderContext'), /`\$\{Math\.min\(dishes \+ 1, MEALS_PER_WEEK\)\}\/21食`/);
  assert.match(v2FunctionSource('renderContext'), /食材バッグ（\$\{bagTotal\}\/\$\{BAG_CAPACITY\}）/);
  assert.match(v2FunctionSource('renderContext'), /`料理 \$\{currentRecipe\(\)\.category\}`/);
  assert.match(v2FunctionSource('renderContext'), /`今週 \$\{currentCategory \|\| '―'\}`/);
  assert.match(v2FunctionSource('renderContext'), /`\$\{endlessWeekNumber\(\)\}週目 FB\+\$\{fbPercentForMode\(\)\}%`/);
  const weekdayName = vm.runInNewContext(`(${v2FunctionSource('weekdayName')})`, { dishes: 0, MEALS_PER_WEEK: 21, MEALS_PER_DAY: 3, Math });
  assert.equal(weekdayName(0), '月曜');
  assert.equal(weekdayName(8), '水曜');
  assert.equal(weekdayName(18), '日曜');
  assert.doesNotMatch(source, /id="nextCategoryChip"|id="fbChip"/);
});

test('食材表示の基準順はエナジー昇順にする', () => {
  assert.match(v2Source, /const ALL_FOOD_IDS = Object\.keys\(FOODS\)\.sort/);
  assert.match(v2Source, /FOODS\[left\]\.energy - FOODS\[right\]\.energy/);
  assert.match(v2FunctionSource('renderRequirements'), /ingredientEntries\(currentRecipe\(\)\.needs\)/);
  assert.match(v2FunctionSource('renderAdditionalIngredients'), /const ingredientIds = ALL_FOOD_IDS\.filter/);
});

test('りんごとトマトは盤面の色だけで区別し文字バッジを載せない', () => {
  const renderBoard = v2FunctionSource('renderBoard');
  assert.match(renderBoard, /data-food-id="\$\{tile\.id\}"/);
  assert.doesNotMatch(renderBoard, /food-distinction|distinction/);
  assert.match(source, /data-food-id="とくせんリンゴ"/);
  assert.match(source, /data-food-id="あんみんトマト"/);
  assert.doesNotMatch(source, /\.food-distinction/);
});

test('月〜土はカボチャ・しっぽ料理を0.5倍、日曜TOP5は均等にする', () => {
  assert.match(v2Source, /const RARE_RECIPE_WEIGHT = 0\.5;/);
  assert.doesNotMatch(v2Source, /RARE_RECIPE_WEIGHT = 0\.12/);
  assert.match(v2FunctionSource('chooseRecipe'), /sunday \? 1 : \(isRareRecipe\(recipe\) \? RARE_RECIPE_WEIGHT : 1\)/);
});

test('月曜は30個以下、火曜以降は大皿を含む全料理から抽選する', () => {
  const context = {
    RECIPES: [
      { name: '小皿', category: 'カレー', originalNeeds: { a: 30 } },
      { name: '大皿', category: 'カレー', originalNeeds: { a: 60 } }
    ],
    activeMode: 'normal',
    currentCategory: 'カレー',
    dishes: 2,
    MEALS_PER_DAY: 3,
    MONDAY_RECIPE_MAX_INGREDIENTS: 30,
    RARE_RECIPE_WEIGHT: 0.5,
    isRareRecipe: () => false,
    isSundayMeal: () => false,
    Math: { random: () => 0.999 },
    Object
  };
  const chooseRecipe = vm.runInNewContext(
    `${v2FunctionSource('totalOf')}; ${v2FunctionSource('recipeIngredientTotal')}; (${v2FunctionSource('chooseRecipe')})`,
    context
  );
  assert.equal(chooseRecipe().name, '小皿');
  context.dishes = 3;
  assert.equal(chooseRecipe().name, '大皿');
  assert.match(v2FunctionSource('chooseRecipe'), /dishes < MEALS_PER_DAY/);
});

test('日曜は今週カテゴリの本家必要食材合計TOP5から抽選する', () => {
  const categoryRecipes = Array.from({ length: 7 }, (_, index) => ({
    name: `料理${index + 1}`,
    category: 'サラダ',
    energy: (index + 1) * 100,
    originalNeeds: { a: (index + 1) * 10 }
  }));
  const context = {
    RECIPES: [...categoryRecipes, { name: '別カテゴリ大皿', category: 'カレー', energy: 9999, originalNeeds: { a: 999 } }],
    activeMode: 'normal', currentCategory: 'サラダ', dishes: 18,
    MEALS_PER_DAY: 3, MONDAY_RECIPE_MAX_INGREDIENTS: 30, RARE_RECIPE_WEIGHT: 0.5,
    isSundayMeal: completed => completed >= 18 && completed < 21,
    isRareRecipe: () => false,
    Math: { random: () => 0.999 }, Object
  };
  const functions = vm.runInNewContext(`(() => {
    ${v2FunctionSource('totalOf')}
    ${v2FunctionSource('recipeIngredientTotal')}
    ${v2FunctionSource('topLargeRecipes')}
    ${v2FunctionSource('chooseRecipe')}
    return { topLargeRecipes, chooseRecipe };
  })()`, context);
  assert.deepEqual(
    Array.from(functions.topLargeRecipes(categoryRecipes), recipe => recipe.name),
    ['料理7', '料理6', '料理5', '料理4', '料理3']
  );
  assert.equal(functions.chooseRecipe('料理7').name, '料理3');
  assert.match(v2FunctionSource('chooseRecipe'), /topLargeRecipes\(categoryRecipes\)/);
  assert.match(v2FunctionSource('chooseRecipe'), /selectionWeight = recipe => sunday \? 1/);
});

test('まぜまぜは初回無料でEXだけ3回目以降2手消費する', () => {
  const shuffleCost = vm.runInNewContext(`(${v2FunctionSource('shuffleCost')})`);
  assert.deepEqual([0, 1, 2, 3].map(count => shuffleCost('endless', count)), [0, 1, 1, 1]);
  assert.deepEqual([0, 1, 2, 3].map(count => shuffleCost('normal', count)), [0, 1, 1, 1]);
  assert.deepEqual([0, 1, 2, 3].map(count => shuffleCost('ex', count)), [0, 1, 2, 2]);
  assert.match(v2FunctionSource('performShuffle'), /const cost = shuffleCost\(\)/);
  assert.match(v2FunctionSource('renderStatus'), /const nextShuffleCost = shuffleCost\(\)/);
});

test('スキル発動はとことん・ノーマル1手、EX2手で大消し・連鎖の別枠報酬はない', () => {
  const skillMoveAmount = vm.runInNewContext(`(${v2FunctionSource('skillMoveAmount')})`);
  assert.equal(skillMoveAmount('endless'), 1);
  assert.equal(skillMoveAmount('normal'), 1);
  assert.equal(skillMoveAmount('ex'), 2);
  const resolveBoard = v2FunctionSource('resolveBoard');
  assert.match(resolveBoard, /foodGet \? addMoves\(skillMoveAmount\(\)\) : null/);
  assert.match(resolveBoard, /cookingChanceBonus \? addMoves\(skillMoveAmount\(\)\) : null/);
  assert.doesNotMatch(v2Source, /exClearReward|exChainReward|chainMoveReward/);
});

test('800個では停止せず超過分を必要数・ロック・低エナジー順で自動投入する', () => {
  assert.match(v2FunctionSource('isBagFull'), /stockTotal\(\) > BAG_CAPACITY/);
  assert.match(v2FunctionSource('boardIsBlocked'), /moves <= 0 \|\| isBagFull\(\)/);
  assert.match(v2FunctionSource('addIngredient'), /pot\[id\] = \(pot\[id\] \|\| 0\) \+ count/);
  assert.match(v2FunctionSource('addIngredient'), /autoInvestBagOverflow\(\)/);

  const context = {
    BAG_CAPACITY: 800,
    ALL_FOOD_IDS: ['required', 'low', 'high'],
    FOODS: {
      required: { energy: 1, name: '必要' },
      low: { energy: 2, name: '低' },
      high: { energy: 100, name: '高' }
    },
    pot: { required: 10, low: 795, high: 5 },
    cookingAdditions: {},
    lockedIngredients: new Set(['low']),
    isCappedMode: () => true,
    stockTotal: () => Object.values(context.pot).reduce((sum, count) => sum + count, 0),
    currentRecipe: () => ({ needs: { required: 10 } }),
    Math, Number, Object
  };
  const autoInvest = vm.runInNewContext(`(${v2FunctionSource('autoInvestBagOverflow')})`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(autoInvest())), { high: 5, low: 5 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.pot)), { required: 10, low: 790 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.cookingAdditions)), { high: 5, low: 5 });
  assert.equal(context.stockTotal(), 800);

  context.pot = { required: 10, low: 800 };
  context.cookingAdditions = {};
  context.lockedIngredients = new Set(['low']);
  assert.deepEqual(JSON.parse(JSON.stringify(autoInvest())), { low: 10 });
  assert.equal(context.pot.required, 10);
  assert.equal(context.stockTotal(), 800);
});

test('投入で追加量を変更し全部戻す・全食材投入を選べる', () => {
  const context = {
    ALL_FOOD_IDS: ['apple', 'milk'],
    pot: { apple: 5, milk: 5 },
    cookingAdditions: { apple: 4 },
    additionDraft: { apple: 1, milk: 3 },
    lockedIngredients: new Set(),
    currentRecipe: () => ({ needs: { apple: 3, milk: 2 } }),
    addFoodDialog: {},
    closeDialog: () => {},
    renderAll: () => {},
    saveGame: () => {},
    autoInvestBagOverflow: () => ({}),
    totalOf: ingredients => Object.values(ingredients).reduce((sum, count) => sum + count, 0),
    showMessage: () => {},
    isBagFull: () => false,
    openBagFullDialog: () => {}
  };
  vm.runInNewContext(
    `${v2FunctionSource('bagSurplusAvailable')}; ${v2FunctionSource('additionPickerLimit')}; ${v2FunctionSource('applyCookingAdditions')}; applyCookingAdditions();`,
    context
  );
  assert.deepEqual(JSON.parse(JSON.stringify(context.pot)), { apple: 8, milk: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.cookingAdditions)), { apple: 1, milk: 3 });
  assert.match(v2Source, /addFoodList[\s\S]*?adjustAdditionPicker/);
  assert.match(v2Source, /addFoodConfirm[\s\S]*?applyCookingAdditions/);
  assert.match(source, /id="returnAllAdditions"[^>]*>全部戻す<\/button>/);
  assert.match(source, /id="addAllFoods"[^>]*>全食材を投入<\/button>/);

  const bulkContext = {
    ALL_FOOD_IDS: ['apple', 'milk'],
    additionDraft: { apple: 1 },
    additionPickerLimit: id => id === 'apple' ? 6 : 3,
    renderAdditionPicker: () => {},
    Object
  };
  vm.runInNewContext(`${v2FunctionSource('addAllFoods')}; addAllFoods();`, bulkContext);
  assert.deepEqual(JSON.parse(JSON.stringify(bulkContext.additionDraft)), { apple: 6, milk: 3 });
  vm.runInNewContext(`${v2FunctionSource('returnAllAdditions')}; returnAllAdditions();`, bulkContext);
  assert.deepEqual(JSON.parse(JSON.stringify(bulkContext.additionDraft)), {});
});

test('ノーマル・EXは1日3食・21食限定で19〜21食目だけ日曜にする', () => {
  const mealInWeek = vm.runInNewContext(`(${v2FunctionSource('mealInWeek')})`, { MEALS_PER_WEEK: 21 });
  const sundayContext = { activeMode: 'normal', dishes: 0, MEALS_PER_WEEK: 21 };
  const isSundayMeal = vm.runInNewContext(`(${v2FunctionSource('isSundayMeal')})`, sundayContext);
  assert.equal(mealInWeek(20), 21);
  assert.equal(isSundayMeal(18), true);
  assert.equal(isSundayMeal(20), true);
  assert.equal(isSundayMeal(21), false);
  sundayContext.activeMode = 'endless';
  assert.equal(isSundayMeal(18), false);
  const cookRecipe = v2FunctionSource('cookRecipe');
  assert.match(cookRecipe, /activeMode !== 'endless' && dishes >= MEALS_PER_WEEK/);
  assert.match(cookRecipe, /endGame\(\)/);
  assert.doesNotMatch(v2Source, /showWeeklyResult|continueNextWeek|weeklyResultPending/);
});

test('共通途中セーブにバッグと手動投入を保存し旧あふれ食材はバッグへ戻す', () => {
  assert.match(v2Source, /GAME_STATE_KEY = 'gaogao-pksr\.koiki-puzzle\.game\.v2\.active'/);
  assert.match(v2Source, /MODE_GAME_KEY_PREFIX = 'gaogao-pksr\.koiki-puzzle\.game\.v2\.'/);
  assert.match(v2Source, /RECORDS_KEY_PREFIX = 'gaogao-pksr\.koiki-puzzle\.records\.v2\.'/);
  const snapshot = v2FunctionSource('gameStateSnapshot');
  for (const field of ['mode', 'weekEnergy', 'currentCategory', 'inventoryModel', 'pot', 'cookingAdditions', 'totalUsedIngredients']) {
    assert.match(snapshot, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(snapshot, /overflowIngredients/);
  assert.match(snapshot, /inventoryModel: 'bag-with-manual-additions'/);
  assert.match(v2FunctionSource('saveGame'), /localStorage\.setItem\(GAME_STATE_KEY/);
  assert.match(v2FunctionSource('restoreGame'), /const restored = readSavedGame\(\)/);
  assert.match(v2FunctionSource('parseSavedGame'), /mergeIngredients\(savedPot, restoredProgress, restoredCooking, restoredOverflow\)/);
  assert.match(v2FunctionSource('parseSavedGame'), /hasLegacyOverflow[\s\S]*mergeIngredients\(savedPot, restoredOverflow\)/);
  assert.doesNotMatch(v2Source, /LEGACY_GAME_KEY|LEGACY_RECORDS_KEY|LEGACY_BEST_KEY|migrateLegacySave|migrateLegacyRecords/);
  assert.match(legacySource, /GAME_STATE_KEY = 'gaogao-pksr\.koiki-puzzle\.game\.v1'/);

  const foodIds = ['a', 'b', 'c', 'd', 'e', 'f'];
  const foods = Object.fromEntries(foodIds.map(id => [id, { id, name: id }]));
  const recipe = { name: '保存料理', needs: { a: 1 } };
  const saved = {
    version: 2, mode: 'normal', moves: 7, score: 0, dishes: 1, weekEnergy: 0,
    maxChain: 0, maxCookingEnergy: 0, bestBeforeRun: 0, extraTastyBonus: 0,
    shuffleCount: 0, foodGetActivations: 0, recipeName: recipe.name,
    activePalette: foodIds, pot: { a: 799 }, cookingAdditions: { b: 4, c: 2 },
    overflowIngredients: { b: 4 }, inventoryModel: 'bag-with-additions',
    totalAdditionalIngredients: {}, totalUsedIngredients: {}, lockedIngredientIds: [],
    currentCategory: 'カレー',
    cellIds: ['koiki', ...Array.from({ length: 35 }, (_, index) => foodIds[index % foodIds.length])]
  };
  const restored = vm.runInNewContext(
    `${v2FunctionSource('validSavedNumber')}; ${v2FunctionSource('normalizeIngredientCounts')}; ${v2FunctionSource('mergeIngredients')}; ${v2FunctionSource('parseSavedGame')}; parseSavedGame(raw, 'normal');`,
    {
      raw: JSON.stringify(saved), GAME_STATE_VERSION: 2, MODES: { normal: {} }, MAX_MOVES: 12,
      MAX_COOKING_CHANCE_BONUS: 0.7, RECIPES: [recipe], BOARD_FOOD_TYPES: 6,
      ROWS: 6, COLS: 6, ALL_FOOD_IDS: foodIds, FOODS: foods, CATEGORIES: ['カレー'],
      KOIKI: { id: 'koiki', kind: 'koiki' }, recipeAtDifficulty: base => base,
      makeFood: id => ({ ...foods[id], kind: 'food' }), Object, Array, Set, Number, JSON, Math
    }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(restored.pot)), { a: 799, b: 4 });
  assert.deepEqual(JSON.parse(JSON.stringify(restored.cookingAdditions)), { c: 2 });
});

test('旧モード別セーブは最新の1件だけ共通セーブへ移し旧キーを残す', () => {
  const keys = {
    'old.endless': JSON.stringify({ mode: 'endless', savedAt: 10 }),
    'old.normal': JSON.stringify({ mode: 'normal', savedAt: 30 }),
    'old.ex': JSON.stringify({ mode: 'ex', savedAt: 20 })
  };
  const context = {
    localStorage: {
      getItem: key => keys[key] ?? null,
      setItem: (key, value) => { keys[key] = value; }
    },
    MODE_SAVE_MIGRATION_KEY: 'migration',
    GAME_STATE_KEY: 'active',
    MODES: { endless: {}, normal: {}, ex: {} },
    modeGameKey: mode => `old.${mode}`,
    parseAnySavedGame: raw => raw ? JSON.parse(raw) : null,
    Object, Number, JSON
  };
  const migrate = vm.runInNewContext(`(${v2FunctionSource('migrateModeSavesToSingleSave')})`, context);
  migrate();
  assert.equal(JSON.parse(keys.active).mode, 'normal');
  assert.equal(keys.migration, '1');
  assert.ok(keys['old.endless']);
  assert.ok(keys['old.normal']);
  assert.ok(keys['old.ex']);
});

test('モード変更は確認後にだけ元ゲームを終了しリザルトへ進む', () => {
  const selectMode = v2FunctionSource('selectMode');
  const confirmModeSwitch = v2FunctionSource('confirmModeSwitch');
  const cancelModeSwitch = v2FunctionSource('cancelModeSwitch');
  assert.match(source, /id="modeSwitchDialog"/);
  assert.match(source, /id="modeSwitchConfirm"[^>]*>終了して開始<\/button>/);
  assert.match(selectMode, /pendingMode = mode;[\s\S]*openDialog\(modeSwitchDialog\)/);
  assert.doesNotMatch(selectMode, /endGame\(\)/);
  assert.match(confirmModeSwitch, /endGame\('mode_change'\)/);
  assert.match(confirmModeSwitch, /resultRestart'[\s\S]*\.textContent = `\$\{modeConfig\(nextMode\)\.name\}をはじめる`/);
  assert.match(cancelModeSwitch, /pendingMode = null;[\s\S]*closeDialog\(modeSwitchDialog\)/);
  assert.match(v2Source, /resultRestart'\)\.addEventListener\('click', \(\) => startGame\(pendingMode \|\| activeMode, true\)\)/);
  const renderModeDialog = v2FunctionSource('renderModeDialog');
  assert.match(renderModeDialog, /保存中：\$\{modeConfig\(currentMode\)\.name\}/);
  assert.match(renderModeDialog, /classList\.toggle\('current', currentMode === mode\)/);
  assert.match(renderModeDialog, /'● プレイ中'[\s\S]*'▶ つづきから'[\s\S]*'終了して開始'/);
  assert.match(source, /\.mode-card\.current \{/);
  const modeCardStyles = source.match(/\.mode-card \{([^}]*)\}/)?.[1] || '';
  const currentModeStyles = source.match(/\.mode-card\.current \{([^}]*)\}/)?.[1] || '';
  assert.match(modeCardStyles, /border-radius:\s*0/);
  assert.doesNotMatch(currentModeStyles, /box-shadow/);
  assert.doesNotMatch(source, /mode-card recommended/);
  assert.match(source, /途中セーブは1つ/);
});

test('開始と再開時にモード別ルールを表示しもう見ない設定をモード別保存する', () => {
  assert.match(source, /id="modeGuideDialog"/);
  assert.match(source, /data-mode-guide="endless"/);
  assert.match(source, /data-mode-guide="normal"/);
  assert.match(source, /data-mode-guide="ex"/);
  assert.match(source, /id="modeGuideNever"[^>]*type="checkbox"/);
  assert.match(source, /このモードではもう見ない/);
  assert.match(source, /\.mode-guide-list li \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(source, /食材バッグは全ロックが基本。<br>料理の必要分はそのまま使えます。<br>余りは「投入」で追加食材へ。/);
  assert.match(v2Source, /const MODE_GUIDE_HIDDEN_KEY_PREFIX = 'gaogao-pksr\.koiki-puzzle\.mode-guide-hidden\.v2\.'/);
  assert.match(v2FunctionSource('startGame'), /restoreGame\(mode\)[\s\S]*showModeGuide\(mode\)[\s\S]*resetState\(mode\)[\s\S]*showModeGuide\(mode\)/);
  assert.match(v2FunctionSource('showModeGuide'), /modeGuideHidden\(mode\)[\s\S]*section\.dataset\.modeGuide !== mode[\s\S]*openDialog\(modeGuideDialog\)/);
  assert.match(v2FunctionSource('closeModeGuide'), /MODE_GUIDE_HIDDEN_KEY_PREFIX[\s\S]*activeMode[\s\S]*'1'/);
});

test('献立表のクレジットからパズルへ移動できる', () => {
  assert.match(indexSource, /<a href="koiki-puzzle\.html">パズル<\/a>/);
});

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

test('食材ゲットはモード別の手数を回復してから料理チャンスを表示する', () => {
  assert.doesNotMatch(v2FunctionSource('activateFoodGet'), /addMoves|moveReward/);
  assert.doesNotMatch(v2FunctionSource('activateCookingChance'), /addMoves|moveReward/);
  const resolveBoard = v2FunctionSource('resolveBoard');
  assert.match(resolveBoard, /const foodGetMoveReward = foodGet \? addMoves\(skillMoveAmount\(\)\) : null;/);
  assert.match(resolveBoard, /if \(foodGetMoveReward\) \{[\s\S]*showActivationMoveMessage\(foodGetMoveReward\)/);
  const foodGetRewardIndex = resolveBoard.indexOf('if (foodGetMoveReward)');
  const cookingChanceIndex = resolveBoard.indexOf('if (cookingChanceBonus) {', foodGetRewardIndex);
  assert.ok(foodGetRewardIndex >= 0 && cookingChanceIndex > foodGetRewardIndex);
});

test('料理チャンスは2連鎖目以降の各連鎖で発動し上限到達後も回復する', () => {
  const resolveBoard = v2FunctionSource('resolveBoard');
  assert.match(resolveBoard, /const cookingChanceBonus = chain >= 2 \? activateCookingChance\(\) : 0;/);
  assert.match(resolveBoard, /const cookingChanceMoveReward = cookingChanceBonus \? addMoves\(skillMoveAmount\(\)\) : null;/);

  const context = {
    extraTastyBonus: 0.7,
    MAX_COOKING_CHANCE_BONUS: 0.7,
    COOKING_CHANCE_BONUS_STEP: 0.1
  };
  vm.runInNewContext(
    `${v2FunctionSource('activateCookingChance')}; result = activateCookingChance();`,
    context
  );

  assert.equal(context.result, 70);
  assert.equal(context.extraTastyBonus, 0.7);
  assert.match(v2FunctionSource('showCookingChanceMessage'), /料理チャンス発動！ 大成功＋10%/);
  assert.doesNotMatch(v2FunctionSource('showCookingChanceMessage'), /bonusPercent|extraTastyBonus/);
  const renderStatus = v2FunctionSource('renderStatus');
  assert.match(renderStatus, /cookingChanceValueEl\.textContent = `\+\$\{cookingChancePercent\}%`/);
  assert.match(renderStatus, /cookingChanceMeter'\)\.style\.setProperty\('--meter-progress'/);
  assert.match(renderStatus, /setAttribute\('aria-valuenow', String\(cookingChancePercent\)\)/);
  assert.match(source, /id="cookingChanceMeter"[^>]*role="meter"[^>]*aria-valuemax="70"/);
});

test('食材ゲットLvと21食進行を料理チャンス同様の背景メーターで表示する', () => {
  const renderStatus = v2FunctionSource('renderStatus');
  const renderContext = v2FunctionSource('renderContext');
  assert.match(source, /id="foodGetMeter"[^>]*role="meter"[^>]*aria-valuemax="7"/);
  assert.match(source, /id="dayChip"[^>]*role="meter"[^>]*aria-valuemax="21"/);
  assert.match(source, /\.status-meter::before \{[^}]*width: var\(--meter-progress, 0%\)/);
  assert.match(source, /\.food-get-meter,/);
  assert.match(source, /\.week-progress-meter,/);
  assert.match(renderStatus, /foodGetLevel \/ FOOD_GET_REWARDS\.length \* 100/);
  assert.match(renderStatus, /foodGetMeter'\)\.setAttribute\('aria-valuenow', String\(foodGetLevel\)\)/);
  assert.match(renderContext, /dishes % MEALS_PER_WEEK \+ 1/);
  assert.match(renderContext, /weekProgressMeal \/ MEALS_PER_WEEK \* 100/);
  assert.match(renderContext, /dayChip'\)\.setAttribute\('aria-valuenow', String\(weekProgressMeal\)\)/);
});

test('ステータスメーターを低彩度の同系色に統一し食材バッグ容量も表示する', () => {
  const renderContext = v2FunctionSource('renderContext');
  assert.match(source, /\.cooking-chance-meter,\s*\.food-get-meter,\s*\.week-progress-meter,\s*\.bag-meter\s*\{/);
  assert.match(source, /class="[^"]*bag-meter[^"]*"[^>]*id="bagChip"/);
  assert.match(renderContext, /Math\.min\(bagTotal \/ BAG_CAPACITY, 1\) \* 100/);
  assert.match(renderContext, /bagChip\.setAttribute\('role', cappedBag \? 'meter' : 'status'\)/);
  assert.match(renderContext, /bagChip\.setAttribute\('aria-valuenow', String\(bagTotal\)\)/);
  assert.match(renderContext, /bagChip\.removeAttribute\('aria-valuemax'\)/);
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
  assert.match(legacySource, /document\.addEventListener\('visibilitychange',[\s\S]*window\.addEventListener\('pagehide', saveGame\)/);
  assert.match(legacySource, /if \(restoreGame\(\)\)[\s\S]*つづきから再開しました！/);
});

test('料理チャンスの手数回復はスキル表示の後に独立して表示する', () => {
  const resolveBoard = v2FunctionSource('resolveBoard');
  const skillMessageIndex = resolveBoard.indexOf('if (cookingChanceBonus)');
  const rewardMessageIndex = resolveBoard.indexOf('showActivationMoveMessage(cookingChanceMoveReward)', skillMessageIndex);
  assert.ok(skillMessageIndex >= 0);
  assert.ok(rewardMessageIndex > skillMessageIndex);
  assert.doesNotMatch(resolveBoard, /for \(const reward/);
});

test('週間結果はモード・カテゴリ・食数・使用食材・獲得食材を表示する', () => {
  const endGame = v2FunctionSource('endGame');
  const renderIngredients = v2FunctionSource('renderResultIngredients');
  assert.match(endGame, /fbText = activeMode === 'endless'.*FB\+\$\{fbPercentForMode\(\)\}%/);
  assert.match(endGame, /`\$\{modeConfig\(\)\.name\}・\$\{categoryText\}・\$\{dishes\}食\$\{fbText\}`/);
  assert.match(endGame, /resultTitle.*activeMode === 'endless'.*1週間の結果/);
  assert.match(renderIngredients, /totalUsedIngredients/);
  assert.match(renderIngredients, /totalAdditionalIngredients/);
  assert.match(source, /id="resultUsedIngredients"/);
  assert.match(source, /id="resultIngredients"/);
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
  assert.match(v2Source, /lockAllIngredientsButton\.disabled = disabled \|\| ingredientIds\.length === 0 \|\| ingredientIds\.every\(id => lockedIngredients\.has\(id\)\)/);
  assert.match(v2Source, /function lockAllAdditionalIngredients\(\)[\s\S]*?\.forEach\(id => lockedIngredients\.add\(id\)\)/);
  assert.match(v2Source, /lockAllIngredientsButton\.addEventListener\('click'/);
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

  assert.match(legacySource, /const usedForRecipe = useUnlockedIngredientForRecipe\(id\)/);
  assert.match(legacySource, /if \(recipeComplete\(\)\) await cookRecipe\(\)/);
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
  assert.match(legacySource, /foodGetLevelEl\.textContent = `Lv\$\{Math\.min\(foodGetActivations, FOOD_GET_REWARDS\.length\)\}`/);
  assert.match(legacySource, /cookingChanceValueEl\.textContent = `\+\$\{Math\.round\(extraTastyBonus \* 100\)\}%`/);
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
