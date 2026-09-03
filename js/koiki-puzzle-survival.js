/* 同じゲームHTML内で読み込む、サバイバルの表示と既存ランタイム。 */
(() => {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'css/koiki-puzzle-survival.css?v=20260902-1';
  document.head.appendChild(stylesheet);
  document.title = 'お料理できるかな！！（サバイバル）';
  document.body.className = '';
  document.body.innerHTML = `<div class="page">
  <nav class="topbar" aria-label="ページ操作">
    <a class="back" href="games.html">← ゲーム一覧へ</a>
    <div class="topbar-actions">
      <button class="rules-button" id="rulesButton" type="button">あそびかた</button>
    </div>
  </nav>

  <header class="title">
    <div class="title-mascot" aria-hidden="true"></div>
    <div>
      <h1>お料理できるかな！！</h1>
      <p class="legacy-label">サバイバル</p>
    </div>
  </header>

  <main class="game-card">
    <section class="hud" aria-label="ゲーム状況">
      <div class="stat">
        <span class="stat-label">のこり</span>
        <strong class="stat-value" id="movesValue">12</strong>
      </div>
      <div class="stat">
        <span class="stat-label">エナジー</span>
        <strong class="stat-value" id="scoreValue">0</strong>
      </div>
      <div class="stat">
        <span class="stat-label">レシピレベル</span>
        <strong class="stat-value" id="recipeLevelValue">Lv1</strong>
      </div>
    </section>
    <button class="best-record" id="bestRecordButton" type="button" aria-haspopup="dialog" aria-label="自己ベストを開く">
      <span>自己ベスト</span><strong id="bestValue">0</strong><span>エナジー</span>
    </button>
    <section class="bonus-status" aria-label="発動状況">
      <span class="bonus-status-item"><span>食材ゲット</span><strong id="foodGetLevel">Lv0</strong></span>
      <span class="bonus-status-item"><span>料理チャンス</span><strong id="cookingChanceValue">+0%</strong></span>
    </section>

    <section class="order" aria-label="現在の料理">
      <div class="order-title"><span class="order-prefix">つぎは</span><strong class="order-name" id="recipeName">とくせんリンゴカレー</strong></div>
      <div class="requirements" id="requirements" aria-label="必要な食材"></div>
      <div class="additional-row">
        <div class="additional-header">
          <span class="additional-label">追加食材</span>
          <div class="additional-lock-actions" aria-label="追加食材の一括操作">
            <button class="additional-lock-action" id="lockAllIngredients" type="button" aria-controls="additionalIngredients">🔒 全ロック</button>
          </div>
        </div>
        <div class="additional-ingredients" id="additionalIngredients" aria-label="追加食材"></div>
      </div>
    </section>

    <div class="board-wrap">
      <div class="board" id="board" role="grid" aria-label="6かける6の食材パズル盤"></div>
      <div class="message" id="message" role="status" aria-live="polite"></div>
    </div>

    <div class="actions">
      <button class="primary" id="startButton" type="button">スタート</button>
      <button class="secondary" id="shuffleButton" type="button">まぜまぜ 0</button>
    </div>

    <section class="result" id="result" hidden role="dialog" aria-modal="true" aria-labelledby="resultTitle">
      <div class="result-card">
        <p class="result-kicker">RESULT</p>
        <h2 class="result-title" id="resultTitle">お料理おしまい！</h2>
        <p class="result-best-status" id="resultBestStatus"></p>
        <p class="result-score"><span id="resultScore">0</span><span class="result-score-unit">エナジー</span></p>
        <p class="result-meta" id="resultMeta"></p>
        <p class="result-cook-max" id="resultCookMax">最大料理エナジー 0</p>
        <div class="result-ingredients" aria-label="累計追加食材">
          <span class="result-ingredients-label">累計追加食材 <strong id="resultIngredientTotal">0個</strong></span>
          <div class="result-ingredient-list" id="resultIngredients"></div>
        </div>
        <div class="result-actions">
          <a class="x-share" id="xShareButton" href="#" target="_blank" rel="noopener">Xでシェア</a>
          <button class="result-restart" id="resultRestart" type="button">もういちど</button>
        </div>
      </div>
    </section>
  </main>

</div>

<dialog id="survivalGuideDialog" aria-labelledby="survivalGuideTitle">
  <div class="rules-content">
    <h2 id="survivalGuideTitle">サバイバルのルール</h2>
    <p class="survival-guide-lead">
      <strong>必要食材がそろうと自動調理！</strong>
      <span>「料理を作る」操作はありません。</span>
    </p>
    <ul class="survival-guide-list">
      <li><strong>期間</strong><span>手数が尽きるまで</span></li>
      <li><strong>手数回復</strong><span>料理完成で＋5手</span></li>
      <li><strong>持ち越し</strong><span>追加食材はロックできます</span></li>
    </ul>
    <label class="survival-guide-dismiss"><input id="survivalGuideNever" type="checkbox">サバイバルではもう見ない</label>
    <button class="primary rules-close" id="survivalGuideClose" type="button">プレイする</button>
  </div>
</dialog>

<dialog id="rulesDialog">
  <div class="rules-content">
    <h2>あそびかた</h2>
    <section class="rules-section">
      <h3>基本ルール</h3>
      <ol class="rules-list">
        <li>食材を1つタップすると、盤面の操作アイコンと場所が入れかわります。</li>
        <li>同じ食材を縦か横に4つ以上そろえると、鍋へ入ります。</li>
        <li>料理の必要数を超えて消した食材は、追加食材エナジーとしてたまります。</li>
        <li>材料がそろうと自動で料理が完成し、料理エナジーと追加食材エナジーを獲得。手数も5回復します。</li>
        <li>料理を作るたびにレシピレベルが上がり、次の料理からレシピレベルボーナスが加わります。</li>
        <li>途中のゲームはこの端末へ自動保存され、アプリを開き直すと続きから再開します。</li>
      </ol>
    </section>
    <section class="rules-section">
      <h3>Tips</h3>
      <ul class="rules-list tips-list">
        <li>一度に6個以上消すと「食材ゲット」が発動し、ランダムな3種類の食材を獲得して1手回復します。</li>
        <li>追加食材をタップしてロックすると次へ持ち越せます。次の料理で解除すると、必要な食材なら不足分へ使われます。</li>
        <li>まぜまぜは手動だけ。料理ごとに初回は0手、2回目からは1手使います。</li>
        <li>3連鎖目以降は連鎖ごとに「料理チャンス」が発動し、大成功しやすくなって1手回復します。</li>
        <li>料理完成時は10%の確率で大成功になり、完成料理エナジーが2倍になります。</li>
      </ul>
    </section>
    <button class="primary rules-close" id="rulesClose" type="button">わかった！</button>
  </div>
</dialog>

<dialog id="recordsDialog" aria-labelledby="recordsTitle">
  <div class="records-content">
    <h2 id="recordsTitle">自己ベスト</h2>
    <div class="records-list">
      <div class="records-row"><span>1度の最大エナジー</span><strong id="recordTotalEnergy">0 エナジー</strong></div>
      <div class="records-row"><span>最大料理エナジー</span><strong id="recordCookingEnergy">0 エナジー</strong></div>
      <div class="records-row"><span>最大連鎖数</span><strong id="recordMaxChain">0連鎖</strong></div>
      <div class="records-row"><span>最大レシピレベル</span><strong id="recordMaxRecipeLevel">Lv1</strong></div>
    </div>
    <div class="records-ingredients">
      <span class="records-ingredients-label">最大追加食材数 <strong id="recordAdditionalTotal">0個</strong></span>
      <div class="records-ingredient-list" id="recordAdditionalIngredients" aria-label="最大追加食材時の食材内訳"></div>
    </div>
    <button class="primary rules-close" id="recordsClose" type="button">とじる</button>
  </div>
</dialog>

<section class="cook-celebration" id="cookCelebration" hidden aria-live="assertive" aria-label="料理完成">
  <div class="cook-rays" aria-hidden="true"></div>
  <div class="cook-sparkles" aria-hidden="true">
    <i style="--spark-x:12%;--spark-y:18%;--spark-size:1.7rem;--spark-delay:.1s">✦</i>
    <i style="--spark-x:79%;--spark-y:16%;--spark-size:2rem;--spark-delay:.35s">✦</i>
    <i style="--spark-x:18%;--spark-y:67%;--spark-size:1.25rem;--spark-delay:.6s">★</i>
    <i style="--spark-x:84%;--spark-y:72%;--spark-size:1.45rem;--spark-delay:.2s">★</i>
    <i style="--spark-x:7%;--spark-y:45%;--spark-size:1rem;--spark-delay:.8s">✦</i>
    <i style="--spark-x:91%;--spark-y:43%;--spark-size:1.15rem;--spark-delay:.5s">✦</i>
  </div>
  <div class="cook-card">
    <p class="cook-kicker">料理完成！</p>
    <div class="cook-dish" aria-hidden="true"><img src="img/fire_energy_white.svg" alt=""></div>
    <div class="cook-extra-tasty" id="cookExtraTasty" hidden><img src="img/extra_tasty_red.svg" alt=""><strong>大成功！</strong></div>
    <strong class="cook-recipe-name" id="cookRecipeName"></strong>
    <strong class="cook-final-energy"><span id="cookFinalEnergy">0</span><span class="cook-final-unit">エナジー</span></strong>
    <div class="cook-additional" id="cookAdditional" hidden>
      <span class="cook-additional-label">追加食材</span>
      <div class="cook-additional-items" id="cookAdditionalItems" aria-label="この料理に使った追加食材"></div>
    </div>
  </div>
</section>`;
})();

(() => {
  'use strict';

  const ROWS = 6;
  const COLS = 6;
  const BOARD_FOOD_TYPES = 6;
  const START_MOVES = 12;
  const MAX_MOVES = 12;
  const COOK_BONUS_MOVES = 5;
  const ACTIVATION_BONUS_MOVES = 1;
  const CLEAR_ANIMATION_DURATION = 720;
  const DROP_ANIMATION_DURATION = 1100;
  const FOOD_GET_MESSAGE_DURATION = 3000;
  const COOKING_CHANCE_MESSAGE_DURATION = 2300;
  const ACTIVATION_MOVE_MESSAGE_DURATION = 900;
  const EXTRA_TASTY_CHANCE = 0.1;
  const EXTRA_TASTY_MULTIPLIER = 2;
  const COOKING_CHANCE_BONUS_STEP = 0.1;
  const MAX_COOKING_CHANCE_BONUS = 0.7;
  const RARE_RECIPE_WEIGHT = 0.5;
  const RECIPE_LEVEL_MAX = Math.max(...Object.keys(recipeLevelBonusList).map(Number));
  const FOOD_GET_REWARDS = Object.freeze([6, 8, 11, 14, 17, 21, 24]);
  const IDLE_SWAP_INTERVAL = 1450;
  const BEST_KEY = 'gaogao-pksr.koiki-puzzle.best.v7';
  const RECORDS_KEY = 'gaogao-pksr.koiki-puzzle.records.v1';
  const GAME_STATE_KEY = 'gaogao-pksr.koiki-puzzle.game.v1';
  const SURVIVAL_GUIDE_HIDDEN_KEY = 'gaogao-pksr.koiki-puzzle.survival-guide-hidden.v1';
  const GAME_STATE_VERSION = 1;
  const SHARE_URL = 'https://ny-an.github.io/gaogao-pksr/koiki-puzzle.html';

  function survivalAnalyticsPayload(parameters = {}) {
    return {
      game_version: 'survival',
      game_mode: 'survival',
      category: 'all',
      ...parameters
    };
  }

  function sendAnalytics(method, parameters) {
    try {
      return window.KoikiPuzzleAnalytics?.[method]?.(parameters) || false;
    } catch (_) {
      return false;
    }
  }

  function trackPlayStart() {
    sendAnalytics('startPlay', survivalAnalyticsPayload());
  }

  function trackMealComplete(cookingEnergy, isExtraTasty) {
    sendAnalytics('completeMeal', survivalAnalyticsPayload({
      dish_number: dishes,
      recipe_level: recipeLevelForCompletedDishes(dishes),
      cooking_energy: cookingEnergy,
      total_energy: score,
      success_type: isExtraTasty ? 'extra_tasty' : 'normal'
    }));
  }

  function trackPlayEnd(endReason) {
    sendAnalytics('endPlay', survivalAnalyticsPayload({
      end_reason: endReason || (moves <= 0 ? 'moves_zero' : 'manual_end'),
      dishes_completed: dishes,
      total_energy: score,
      max_cooking_energy: maxCookingEnergy,
      max_chain: maxChain,
      recipe_level: recipeLevelForCompletedDishes(dishes)
    }));
  }

  function miniNeeds(needs) {
    const entries = Object.entries(needs);
    const maxNeed = Math.max(...entries.map(([, count]) => count));
    const cap = entries.length === 1 ? 7 : entries.length === 2 ? 7 : entries.length === 3 ? 6 : 5;
    return Object.fromEntries(entries.map(([name, count]) => [name, Math.max(4, Math.round((count / maxNeed) * cap))]));
  }

  function increaseRecipeNeeds(needs, extraTotal) {
    const ids = Object.keys(needs);
    const increased = { ...needs };
    for (let index = 0; index < extraTotal; index++) {
      const id = ids[index % ids.length];
      increased[id]++;
    }
    return increased;
  }

  function recipeAtDifficulty(recipe, completedDishes) {
    return { ...recipe, needs: increaseRecipeNeeds(recipe.needs, completedDishes) };
  }

  function recipeLevelForCompletedDishes(completedDishes) {
    return Math.min(RECIPE_LEVEL_MAX, Math.max(0, completedDishes) + 1);
  }

  function recipeEnergyAtLevel(baseEnergy, recipeLevel) {
    const bonusPercent = Number(recipeLevelBonusList[recipeLevel] || 0);
    const bonusEnergy = Math.round(baseEnergy * (bonusPercent / 100));
    return { bonusPercent, bonusEnergy, totalEnergy: baseEnergy + bonusEnergy };
  }

  function foodGetReward(activationCount) {
    return FOOD_GET_REWARDS[Math.min(Math.max(activationCount - 1, 0), FOOD_GET_REWARDS.length - 1)];
  }

  const FOODS = Object.fromEntries(Object.entries(foodEnergyMap).map(([name, energy]) => [name, {
    id: name,
    name,
    energy,
    image: foodImageMap[name],
    bg: `${foodColorMap[name]}22`
  }]));

  const RECIPES = Object.entries(org_dishes).flatMap(([category, recipes]) =>
    Object.entries(recipes)
      .filter(([name, needs]) => Object.keys(needs).length > 0 && dishesEnergyList[name])
      .map(([name, needs]) => ({ category, name, energy: dishesEnergyList[name], needs: miniNeeds(needs) }))
  );

  const KOIKI = Object.freeze({ id: 'koiki', kind: 'koiki', name: '操作アイコン' });
  const ALL_FOOD_IDS = Object.keys(FOODS);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = id => document.getElementById(id);

  const boardEl = $('board');
  const movesEl = $('movesValue');
  const scoreEl = $('scoreValue');
  const recipeLevelEl = $('recipeLevelValue');
  const bestEl = $('bestValue');
  const foodGetLevelEl = $('foodGetLevel');
  const cookingChanceValueEl = $('cookingChanceValue');
  const bestRecordButton = $('bestRecordButton');
  const recipeNameEl = $('recipeName');
  const requirementsEl = $('requirements');
  const additionalIngredientsEl = $('additionalIngredients');
  const lockAllIngredientsButton = $('lockAllIngredients');
  const messageEl = $('message');
  const startButton = $('startButton');
  const shuffleButton = $('shuffleButton');
  const resultEl = $('result');
  const resultIngredientTotalEl = $('resultIngredientTotal');
  const resultIngredientsEl = $('resultIngredients');
  const xShareButton = $('xShareButton');
  const rulesDialog = $('rulesDialog');
  const survivalGuideDialog = $('survivalGuideDialog');
  const recordsDialog = $('recordsDialog');
  const cookCelebrationEl = $('cookCelebration');
  const cookExtraTastyEl = $('cookExtraTasty');
  const cookRecipeNameEl = $('cookRecipeName');
  const cookFinalEnergyEl = $('cookFinalEnergy');
  const cookAdditionalEl = $('cookAdditional');
  const cookAdditionalItemsEl = $('cookAdditionalItems');

  let cells = [];
  let moves = START_MOVES;
  let score = 0;
  let dishes = 0;
  let maxChain = 0;
  let maxCookingEnergy = 0;
  let extraTastyBonus = 0;
  let activeRecipe = recipeAtDifficulty(chooseRecipe('', 1), 0);
  let activePalette = choosePalette(activeRecipe);
  let recipeProgress = {};
  let pot = {};
  let lockedIngredients = new Set();
  let totalAdditionalIngredients = {};
  let shuffleCount = 0;
  let foodGetActivations = 0;
  let busy = false;
  let cooking = false;
  let started = false;
  let ended = false;
  let clearing = new Set();
  let dropping = new Map();
  let idleSwapping = new Map();
  let messageTimer = 0;
  let idleMotionTimer = 0;
  let idleCleanupTimer = 0;
  let debugForceCookingSuccess = false;

  function currentRecipe() {
    return activeRecipe;
  }

  function isRareRecipe(recipe) {
    return Boolean(recipe.needs['ずっしりカボチャ'] || recipe.needs['おいしいシッポ']);
  }

  function chooseRecipe(excludedName = '', requiredIngredientCount = 0) {
    const candidates = RECIPES.filter(recipe =>
      recipe.name !== excludedName &&
      (!requiredIngredientCount || Object.keys(recipe.needs).length === requiredIngredientCount)
    );
    const totalWeight = candidates.reduce((sum, recipe) => sum + (isRareRecipe(recipe) ? RARE_RECIPE_WEIGHT : 1), 0);
    let target = Math.random() * totalWeight;
    for (const recipe of candidates) {
      target -= isRareRecipe(recipe) ? RARE_RECIPE_WEIGHT : 1;
      if (target <= 0) return recipe;
    }
    return candidates[candidates.length - 1];
  }

  function choosePalette(recipe) {
    const required = Object.keys(recipe.needs);
    const fillers = ALL_FOOD_IDS
      .filter(id => !required.includes(id))
      .map(id => ({ id, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .map(item => item.id);
    return [...required, ...fillers].slice(0, BOARD_FOOD_TYPES);
  }

  function foodImage(food) {
    return `img/foods/svg/${food.image}.svg`;
  }

  function makeFood(id) {
    return { ...FOODS[id], kind: 'food' };
  }

  function paletteForRecipe(recipe) {
    return recipe === activeRecipe ? activePalette : choosePalette(recipe);
  }

  function spawnPool(recipe) {
    const palette = paletteForRecipe(recipe);
    const requiredIds = Object.keys(recipe.needs);
    const remainingTotal = requiredIds.reduce(
      (sum, id) => sum + Math.max(0, recipe.needs[id] - (recipeProgress[id] || 0)),
      0
    ) || 1;
    const pool = [];
    palette.forEach(id => {
      if (!recipe.needs[id]) {
        pool.push(id);
        return;
      }
      const remaining = Math.max(0, recipe.needs[id] - (recipeProgress[id] || 0));
      const weight = Math.max(1, Math.ceil((remaining / remainingTotal) * 8));
      for (let count = 0; count < weight; count++) pool.push(id);
    });
    return pool;
  }

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function createsFourAt(board, index, foodId) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    if (col >= 3) {
      const left = [1, 2, 3].every(offset => board[index - offset]?.id === foodId);
      if (left) return true;
    }
    if (row >= 3) {
      const up = [1, 2, 3].every(offset => board[index - offset * COLS]?.id === foodId);
      if (up) return true;
    }
    return false;
  }

  function buildBoard() {
    const recipe = currentRecipe();
    const pool = spawnPool(recipe);
    let lastBoard = [];

    for (let attempt = 0; attempt < 120; attempt++) {
      const next = new Array(ROWS * COLS);
      const koikiIndex = Math.floor(Math.random() * next.length);
      for (let index = 0; index < next.length; index++) {
        if (index === koikiIndex) {
          next[index] = KOIKI;
          continue;
        }
        let candidates = [...pool];
        let id = randomFrom(candidates);
        while (createsFourAt(next, index, id) && candidates.length > 1) {
          candidates = candidates.filter(candidate => candidate !== id);
          id = randomFrom(candidates);
        }
        next[index] = makeFood(id);
      }
      lastBoard = next;
      const allPaletteFoodsPresent = activePalette.every(id => next.some(tile => tile?.id === id));
      if (allPaletteFoodsPresent && findMatches(next).size === 0 && hasScoringSwap(next)) return next;
    }
    return lastBoard;
  }

  function findMatches(board = cells) {
    const found = new Set();

    for (let row = 0; row < ROWS; row++) {
      let start = 0;
      while (start < COLS) {
        const first = board[row * COLS + start];
        let end = start + 1;
        while (
          first?.kind === 'food' &&
          end < COLS &&
          board[row * COLS + end]?.id === first.id
        ) end++;
        if (first?.kind === 'food' && end - start >= 4) {
          for (let col = start; col < end; col++) found.add(row * COLS + col);
        }
        start = end;
      }
    }

    for (let col = 0; col < COLS; col++) {
      let start = 0;
      while (start < ROWS) {
        const first = board[start * COLS + col];
        let end = start + 1;
        while (
          first?.kind === 'food' &&
          end < ROWS &&
          board[end * COLS + col]?.id === first.id
        ) end++;
        if (first?.kind === 'food' && end - start >= 4) {
          for (let row = start; row < end; row++) found.add(row * COLS + col);
        }
        start = end;
      }
    }

    return found;
  }

  function hasScoringSwap(board = cells) {
    const koikiIndex = board.findIndex(tile => tile?.kind === 'koiki');
    if (koikiIndex < 0) return false;
    for (let index = 0; index < board.length; index++) {
      if (board[index]?.kind !== 'food') continue;
      const preview = board.slice();
      [preview[koikiIndex], preview[index]] = [preview[index], preview[koikiIndex]];
      if (findMatches(preview).size > 0) return true;
    }
    return false;
  }

  function renderBoard() {
    const disabled = !started || ended || busy;
    boardEl.classList.toggle('busy', busy);
    boardEl.innerHTML = cells.map((tile, index) => {
      const row = Math.floor(index / COLS);
      const dropDistance = dropping.get(index) || 0;
      const dropClass = dropDistance ? ' dropping' : '';
      const idleMotion = idleSwapping.get(index);
      const idleClass = idleMotion ? ' idle-swapping' : '';
      const motionStyle = `--drop-row:${row};--drop-y:-${dropDistance * 110}%;${idleMotion ? `--idle-x:${idleMotion.x}%;--idle-y:${idleMotion.y}%;` : ''}`;
      if (tile?.kind === 'koiki') {
        return `<button class="tile koiki${dropClass}${idleClass}" type="button" role="gridcell" disabled style="${motionStyle}" aria-label="操作アイコン"><span class="koiki-avatar" aria-hidden="true"></span></button>`;
      }
      if (!tile) return '<span class="tile" role="gridcell" aria-hidden="true"></span>';
      const clearClass = clearing.has(index) ? ' clearing' : '';
      return `<button class="tile food${clearClass}${dropClass}${idleClass}" type="button" role="gridcell" data-index="${index}" style="--tile-bg:${tile.bg};${motionStyle}" ${disabled ? 'disabled' : ''} aria-label="${tile.name}を操作アイコンと入れ替える"><img src="${foodImage(tile)}" alt=""></button>`;
    }).join('');
  }

  function renderRequirements() {
    const recipe = currentRecipe();
    requirementsEl.innerHTML = Object.entries(recipe.needs).map(([id, need]) => {
      const food = FOODS[id];
      const collected = recipeProgress[id] || 0;
      const current = Math.min(collected, need);
      const done = collected >= need;
      return `<div class="requirement${done ? ' done' : ''}" aria-label="${food.name} ${current}/${need}"><img src="${foodImage(food)}" alt=""><span class="requirement-count">${current}/${need}</span></div>`;
    }).join('');
  }

  function renderAdditionalIngredients() {
    const disabled = !started || ended || cooking;
    const ingredientIds = ALL_FOOD_IDS.filter(id => (pot[id] || 0) > 0);
    lockAllIngredientsButton.disabled = disabled || ingredientIds.length === 0 || ingredientIds.every(id => lockedIngredients.has(id));
    additionalIngredientsEl.innerHTML = ingredientIds
      .map(id => {
        const food = FOODS[id];
        const locked = lockedIngredients.has(id);
        const action = locked ? 'ロック中。タップで解除' : 'タップでロック';
        return `<button class="additional-item${locked ? ' locked' : ''}" type="button" data-lock-food="${id}" aria-pressed="${locked}" aria-label="${food.name} ${pot[id]}個 ${action}" ${disabled ? 'disabled' : ''}><img src="${foodImage(food)}" alt=""><span class="additional-count">${pot[id]}</span>${locked ? '<span class="additional-lock" aria-hidden="true">🔒</span>' : ''}</button>`;
      }).join('');
  }

  function lockAllAdditionalIngredients() {
    ALL_FOOD_IDS
      .filter(id => (pot[id] || 0) > 0)
      .forEach(id => lockedIngredients.add(id));
    renderAdditionalIngredients();
    saveGame();
    showMessage('追加食材をすべてロック！', 'cook');
  }

  function renderResultIngredients() {
    const total = Object.values(totalAdditionalIngredients).reduce((sum, count) => sum + count, 0);
    resultIngredientTotalEl.textContent = `${total}個`;
    resultIngredientsEl.innerHTML = ALL_FOOD_IDS
      .filter(id => (totalAdditionalIngredients[id] || 0) > 0)
      .map(id => {
        const food = FOODS[id];
        const count = totalAdditionalIngredients[id];
        return `<span class="result-ingredient-item" title="${food.name}" aria-label="${food.name} ${count}個"><img src="${foodImage(food)}" alt=""><span class="result-ingredient-count">${count}</span></span>`;
      }).join('');
  }

  function addIngredient(id, count = 1) {
    const needed = currentRecipe().needs[id] || 0;
    const collected = recipeProgress[id] || 0;
    const usedForRecipe = Math.min(count, Math.max(0, needed - collected));
    const extraCount = count - usedForRecipe;

    if (usedForRecipe > 0) recipeProgress[id] = collected + usedForRecipe;
    if (extraCount > 0) {
      pot[id] = (pot[id] || 0) + extraCount;
      totalAdditionalIngredients[id] = (totalAdditionalIngredients[id] || 0) + extraCount;
    }
  }

  function useUnlockedIngredientForRecipe(id) {
    const available = pot[id] || 0;
    const needed = currentRecipe().needs[id] || 0;
    const collected = recipeProgress[id] || 0;
    const usedForRecipe = Math.min(available, Math.max(0, needed - collected));
    if (usedForRecipe <= 0) return 0;

    recipeProgress[id] = collected + usedForRecipe;
    pot[id] = available - usedForRecipe;
    if (pot[id] <= 0) delete pot[id];
    return usedForRecipe;
  }

  function cookingAdditionalIngredients() {
    return Object.fromEntries(
      Object.entries(pot).filter(([id, count]) => count > 0 && !lockedIngredients.has(id))
    );
  }

  function additionalIngredientEnergy(ingredients = cookingAdditionalIngredients()) {
    return Object.entries(ingredients).reduce(
      (sum, [id, count]) => sum + (FOODS[id]?.energy || 0) * count,
      0
    );
  }

  function renderStatus() {
    const recipe = currentRecipe();
    movesEl.textContent = String(moves);
    scoreEl.textContent = score.toLocaleString('ja-JP');
    recipeLevelEl.textContent = `Lv${recipeLevelForCompletedDishes(dishes)}`;
    bestEl.textContent = readRecords().totalEnergy.toLocaleString('ja-JP');
    foodGetLevelEl.textContent = `Lv${Math.min(foodGetActivations, FOOD_GET_REWARDS.length)}`;
    cookingChanceValueEl.textContent = `+${Math.round(extraTastyBonus * 100)}%`;
    recipeNameEl.textContent = recipe.name;
    shuffleButton.textContent = `まぜまぜ ${shuffleCount ? '−1' : '0'}`;
    renderRequirements();
    renderAdditionalIngredients();
  }

  function renderAll() {
    renderStatus();
    renderBoard();
  }

  function validSavedNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER, integer = true) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
  }

  function normalizeIngredientCounts(value, allowedIds = ALL_FOOD_IDS) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const allowed = new Set(allowedIds);
    const normalized = {};
    for (const [id, count] of Object.entries(value)) {
      if (!allowed.has(id) || !validSavedNumber(count)) return null;
      if (count > 0) normalized[id] = count;
    }
    return normalized;
  }

  function gameStateSnapshot() {
    return {
      version: GAME_STATE_VERSION,
      savedAt: Date.now(),
      moves,
      score,
      dishes,
      maxChain,
      maxCookingEnergy,
      extraTastyBonus,
      recipeName: activeRecipe.name,
      activePalette: [...activePalette],
      recipeProgress: { ...recipeProgress },
      pot: { ...pot },
      lockedIngredientIds: [...lockedIngredients],
      totalAdditionalIngredients: { ...totalAdditionalIngredients },
      shuffleCount,
      foodGetActivations,
      cellIds: cells.map(tile => tile?.kind === 'koiki' ? KOIKI.id : tile?.id)
    };
  }

  function saveGame() {
    if (!started || ended || busy || cooking || clearing.size > 0 || dropping.size > 0) return false;
    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameStateSnapshot()));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearSavedGame() {
    try { localStorage.removeItem(GAME_STATE_KEY); } catch (_) {}
  }

  function parseSavedGame(raw) {
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== GAME_STATE_VERSION) return null;
      if (!validSavedNumber(saved.moves, 1, MAX_MOVES)) return null;
      if (!validSavedNumber(saved.score)) return null;
      if (!validSavedNumber(saved.dishes)) return null;
      if (!validSavedNumber(saved.maxChain)) return null;
      if (!validSavedNumber(saved.maxCookingEnergy)) return null;
      if (!validSavedNumber(saved.extraTastyBonus, 0, MAX_COOKING_CHANCE_BONUS, false)) return null;
      if (!validSavedNumber(saved.shuffleCount)) return null;
      if (!validSavedNumber(saved.foodGetActivations)) return null;

      const baseRecipe = RECIPES.find(recipe => recipe.name === saved.recipeName);
      if (!baseRecipe) return null;
      const restoredRecipe = recipeAtDifficulty(baseRecipe, saved.dishes);
      const requiredIds = Object.keys(restoredRecipe.needs);
      const palette = Array.isArray(saved.activePalette) ? saved.activePalette : [];
      if (
        palette.length !== BOARD_FOOD_TYPES ||
        new Set(palette).size !== palette.length ||
        palette.some(id => !FOODS[id]) ||
        requiredIds.some(id => !palette.includes(id))
      ) return null;

      const restoredProgress = normalizeIngredientCounts(saved.recipeProgress, requiredIds);
      const restoredPot = normalizeIngredientCounts(saved.pot);
      const restoredTotals = normalizeIngredientCounts(saved.totalAdditionalIngredients);
      if (!restoredProgress || !restoredPot || !restoredTotals) return null;
      if (Object.entries(restoredProgress).some(([id, count]) => count > restoredRecipe.needs[id])) return null;

      const lockedIds = Array.isArray(saved.lockedIngredientIds) ? saved.lockedIngredientIds : [];
      if (new Set(lockedIds).size !== lockedIds.length || lockedIds.some(id => !restoredPot[id])) return null;

      const cellIds = Array.isArray(saved.cellIds) ? saved.cellIds : [];
      if (
        cellIds.length !== ROWS * COLS ||
        cellIds.filter(id => id === KOIKI.id).length !== 1 ||
        cellIds.some(id => id !== KOIKI.id && !palette.includes(id))
      ) return null;

      return {
        moves: saved.moves,
        score: saved.score,
        dishes: saved.dishes,
        maxChain: saved.maxChain,
        maxCookingEnergy: saved.maxCookingEnergy,
        extraTastyBonus: saved.extraTastyBonus,
        activeRecipe: restoredRecipe,
        activePalette: [...palette],
        recipeProgress: restoredProgress,
        pot: restoredPot,
        lockedIngredients: new Set(lockedIds),
        totalAdditionalIngredients: restoredTotals,
        shuffleCount: saved.shuffleCount,
        foodGetActivations: saved.foodGetActivations,
        cells: cellIds.map(id => id === KOIKI.id ? KOIKI : makeFood(id))
      };
    } catch (_) {
      return null;
    }
  }

  function restoreGame() {
    let restored;
    try {
      restored = parseSavedGame(localStorage.getItem(GAME_STATE_KEY));
    } catch (_) {
      return false;
    }
    if (!restored) return false;

    moves = restored.moves;
    score = restored.score;
    dishes = restored.dishes;
    maxChain = restored.maxChain;
    maxCookingEnergy = restored.maxCookingEnergy;
    extraTastyBonus = restored.extraTastyBonus;
    activeRecipe = restored.activeRecipe;
    activePalette = restored.activePalette;
    recipeProgress = restored.recipeProgress;
    pot = restored.pot;
    lockedIngredients = restored.lockedIngredients;
    totalAdditionalIngredients = restored.totalAdditionalIngredients;
    shuffleCount = restored.shuffleCount;
    foodGetActivations = restored.foodGetActivations;
    cells = restored.cells;
    busy = false;
    cooking = false;
    started = true;
    ended = false;
    clearing = new Set();
    dropping = new Map();
    return true;
  }

  function stopIdleMotion() {
    clearTimeout(idleMotionTimer);
    clearTimeout(idleCleanupTimer);
    idleMotionTimer = 0;
    idleCleanupTimer = 0;
    idleSwapping = new Map();
  }

  function performIdleSwap() {
    if (started || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const koikiIndex = cells.findIndex(tile => tile?.kind === 'koiki');
    const candidates = cells
      .map((tile, index) => tile?.kind === 'food' ? index : -1)
      .filter(index => index >= 0);
    const targetIndex = randomFrom(candidates);
    const offset = (source, destination) => ({
      x: ((source % COLS) - (destination % COLS)) * 108,
      y: (Math.floor(source / COLS) - Math.floor(destination / COLS)) * 108
    });

    [cells[koikiIndex], cells[targetIndex]] = [cells[targetIndex], cells[koikiIndex]];
    idleSwapping = new Map([
      [targetIndex, offset(koikiIndex, targetIndex)],
      [koikiIndex, offset(targetIndex, koikiIndex)]
    ]);
    renderBoard();

    idleCleanupTimer = window.setTimeout(() => {
      idleSwapping = new Map();
      if (!started) renderBoard();
    }, 1050);
    idleMotionTimer = window.setTimeout(performIdleSwap, IDLE_SWAP_INTERVAL);
  }

  function startIdleMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    idleMotionTimer = window.setTimeout(performIdleSwap, 650);
  }

  function showMessage(text, tone = '', duration = 1400) {
    clearTimeout(messageTimer);
    messageEl.textContent = text;
    messageEl.className = `message show${tone ? ` ${tone}` : ''}`;
    messageTimer = window.setTimeout(() => {
      messageEl.className = 'message';
    }, duration);
  }

  function addActivationMove() {
    moves = Math.min(MAX_MOVES, moves + ACTIVATION_BONUS_MOVES);
  }

  function activateCookingChance() {
    addActivationMove();
    extraTastyBonus = Math.min(MAX_COOKING_CHANCE_BONUS, extraTastyBonus + COOKING_CHANCE_BONUS_STEP);
    return Math.round(extraTastyBonus * 100);
  }

  function showCookingChanceMessage(bonusPercent) {
    showMessage(`料理チャンス発動！ 大成功＋${bonusPercent}%`, 'chance', COOKING_CHANCE_MESSAGE_DURATION);
  }

  function showActivationMoveMessage() {
    showMessage(`＋${ACTIVATION_BONUS_MOVES}手`, 'move', ACTIVATION_MOVE_MESSAGE_DURATION);
  }

  function showFoodGetMessage(foodGet) {
    clearTimeout(messageTimer);
    messageEl.innerHTML = `
      <div class="food-get-title">食材ゲットLv${foodGet.level} 発動！ + ${foodGet.total}個</div>
      <div class="food-get-items">
        ${Object.entries(foodGet.foods).map(([id, count]) => {
          const food = FOODS[id];
          return `<span class="food-get-item" aria-label="${food.name} ${count}個"><img src="${foodImage(food)}" alt=""><span class="food-get-count">${count}</span></span>`;
        }).join('')}
      </div>`;
    messageEl.className = 'message show food-get';
    messageTimer = window.setTimeout(() => {
      messageEl.className = 'message';
    }, FOOD_GET_MESSAGE_DURATION);
  }

  function animateCookEnergy(from, to) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 1100;
    if (!duration || from === to) {
      cookFinalEnergyEl.textContent = to.toLocaleString('ja-JP');
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const startedAt = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + (to - from) * eased);
        cookFinalEnergyEl.textContent = value.toLocaleString('ja-JP');
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  function renderCookAdditionalIngredients(ingredients) {
    const entries = Object.entries(ingredients);
    cookAdditionalEl.hidden = entries.length === 0;
    cookAdditionalItemsEl.innerHTML = entries.map(([id, count]) => {
      const food = FOODS[id];
      return `<span class="cook-additional-item" aria-label="${food.name} ${count}個"><img src="${foodImage(food)}" alt=""><span class="cook-additional-count">${count}</span></span>`;
    }).join('');
  }

  async function showCookCelebration(recipe, recipeEnergy, finalEnergy, isExtraTasty, additionalIngredients) {
    cookRecipeNameEl.textContent = recipe.name;
    cookExtraTastyEl.hidden = !isExtraTasty;
    cookCelebrationEl.classList.toggle('extra-tasty', isExtraTasty);
    cookFinalEnergyEl.textContent = recipeEnergy.toLocaleString('ja-JP');
    renderCookAdditionalIngredients(additionalIngredients);
    cookCelebrationEl.hidden = false;
    await animateCookEnergy(recipeEnergy, finalEnergy);
    await sleep(1800);
    cookCelebrationEl.hidden = true;
  }

  function applyGravity() {
    const pool = spawnPool(currentRecipe());
    const falling = new Map();
    for (let col = 0; col < COLS; col++) {
      const kept = [];
      for (let row = ROWS - 1; row >= 0; row--) {
        const tile = cells[row * COLS + col];
        if (tile) kept.push({ tile, sourceRow: row });
      }
      for (let row = 0; row < ROWS; row++) cells[row * COLS + col] = null;

      let destinationRow = ROWS - 1;
      kept.forEach(({ tile, sourceRow }) => {
        const destination = destinationRow * COLS + col;
        cells[destination] = tile;
        if (destinationRow !== sourceRow) falling.set(destination, destinationRow - sourceRow);
        destinationRow--;
      });

      const missingCount = destinationRow + 1;
      while (destinationRow >= 0) {
        const destination = destinationRow * COLS + col;
        cells[destination] = makeFood(randomFrom(pool));
        falling.set(destination, missingCount);
        destinationRow--;
      }
    }
    return falling;
  }

  function recipeComplete() {
    return Object.entries(currentRecipe().needs).every(([id, need]) => (recipeProgress[id] || 0) >= need);
  }

  function distributeFoodGet(total, selectedFoods) {
    const baseCount = Math.floor(total / selectedFoods.length);
    const remainder = total % selectedFoods.length;
    return Object.fromEntries(selectedFoods.map((id, index) => [
      id,
      baseCount + (index < remainder ? 1 : 0)
    ]));
  }

  function activateFoodGet() {
    addActivationMove();
    foodGetActivations++;
    const level = Math.min(foodGetActivations, FOOD_GET_REWARDS.length);
    const bonusCount = foodGetReward(foodGetActivations);
    const candidates = [...ALL_FOOD_IDS];
    for (let index = candidates.length - 1; index > 0; index--) {
      const target = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
    }
    const selectedFoods = candidates.slice(0, 3);
    const foods = distributeFoodGet(bonusCount, selectedFoods);
    Object.entries(foods).forEach(([id, count]) => addIngredient(id, count));
    return { level, total: bonusCount, foods };
  }

  async function performShuffle() {
    const cost = shuffleCount === 0 ? 0 : 1;
    moves = Math.max(0, moves - cost);
    shuffleCount++;
    renderStatus();
    showMessage('まぜまぜ！');
    await sleep(520);
    cells = buildBoard();
    dropping = new Map();
    renderAll();
  }

  async function cookRecipe() {
    cooking = true;
    renderAdditionalIngredients();
    const cooked = currentRecipe();
    const carriedIngredients = Object.fromEntries(
      [...lockedIngredients]
        .filter(id => (pot[id] || 0) > 0)
        .map(id => [id, pot[id]])
    );
    const usedAdditionalIngredients = cookingAdditionalIngredients();
    const extraEnergy = additionalIngredientEnergy(usedAdditionalIngredients);
    const recipeLevel = recipeLevelForCompletedDishes(dishes);
    const recipeLevelEnergy = recipeEnergyAtLevel(cooked.energy, recipeLevel);
    const isExtraTasty = debugForceCookingSuccess || Math.random() < EXTRA_TASTY_CHANCE + extraTastyBonus;
    debugForceCookingSuccess = false;
    if (isExtraTasty) extraTastyBonus = 0;
    const baseCookingEnergy = recipeLevelEnergy.totalEnergy + extraEnergy;
    const cookingEnergy = baseCookingEnergy * (isExtraTasty ? EXTRA_TASTY_MULTIPLIER : 1);
    maxCookingEnergy = Math.max(maxCookingEnergy, cookingEnergy);
    dishes++;
    // 料理基礎エナジーへレシピLvボーナスを加え、追加食材、大成功の順で計算する。
    score += cookingEnergy;
    moves = Math.min(MAX_MOVES, moves + COOK_BONUS_MOVES);
    trackMealComplete(cookingEnergy, isExtraTasty);
    renderStatus();
    await showCookCelebration(cooked, recipeLevelEnergy.totalEnergy, cookingEnergy, isExtraTasty, usedAdditionalIngredients);

    activeRecipe = recipeAtDifficulty(chooseRecipe(cooked.name), dishes);
    activePalette = choosePalette(activeRecipe);
    recipeProgress = {};
    pot = carriedIngredients;
    lockedIngredients = new Set(Object.keys(carriedIngredients));
    shuffleCount = 0;
    cooking = false;
    cells = buildBoard();
    renderAll();
    showMessage(`＋${COOK_BONUS_MOVES}手`, 'cook');
  }

  async function resolveBoard() {
    let chain = 0;

    while (true) {
      const matches = findMatches();
      if (matches.size === 0) break;
      const foodGet = matches.size >= 6 ? activateFoodGet() : null;

      chain++;
      const cookingChanceBonus = chain >= 3 ? activateCookingChance() : 0;
      maxChain = Math.max(maxChain, chain);
      matches.forEach(index => {
        const food = cells[index];
        if (!food || food.kind !== 'food') return;
        addIngredient(food.id);
      });
      clearing = matches;
      renderAll();
      if (foodGet) showFoodGetMessage(foodGet);
      else if (cookingChanceBonus) showCookingChanceMessage(cookingChanceBonus);
      else if (chain > 1) showMessage(`${chain}れんさ！`);
      await sleep(CLEAR_ANIMATION_DURATION);

      matches.forEach(index => { cells[index] = null; });
      clearing = new Set();
      dropping = applyGravity();
      renderBoard();
      await sleep(DROP_ANIMATION_DURATION);
      dropping = new Map();
      renderBoard();
      if (foodGet) {
        await sleep(Math.max(0, FOOD_GET_MESSAGE_DURATION - CLEAR_ANIMATION_DURATION - DROP_ANIMATION_DURATION));
        showActivationMoveMessage();
        await sleep(ACTIVATION_MOVE_MESSAGE_DURATION);
      }
      if (cookingChanceBonus) {
        if (foodGet) {
          showCookingChanceMessage(cookingChanceBonus);
          await sleep(COOKING_CHANCE_MESSAGE_DURATION);
        } else {
          await sleep(Math.max(0, COOKING_CHANCE_MESSAGE_DURATION - CLEAR_ANIMATION_DURATION - DROP_ANIMATION_DURATION));
        }
        showActivationMoveMessage();
        await sleep(ACTIVATION_MOVE_MESSAGE_DURATION);
      }
    }

    if (recipeComplete()) {
      await cookRecipe();
      return;
    }

  }

  async function playMove(index) {
    if (!started || ended || busy || cells[index]?.kind !== 'food') return;

    busy = true;
    moves--;
    const koikiIndex = cells.findIndex(tile => tile?.kind === 'koiki');
    [cells[koikiIndex], cells[index]] = [cells[index], cells[koikiIndex]];
    renderAll();
    await sleep(150);
    await resolveBoard();
    busy = false;
    renderAll();

    if (moves <= 0) endGame();
    else saveGame();
  }

  function readBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch (_) {
      return 0;
    }
  }

  function writeBest(value) {
    try { localStorage.setItem(BEST_KEY, String(value)); } catch (_) {}
  }

  function readRecords() {
    const fallback = {
      totalEnergy: readBest(),
      cookingEnergy: 0,
      chain: 0,
      dishes: 0,
      additionalTotal: 0,
      additionalIngredients: {}
    };
    try {
      const saved = JSON.parse(localStorage.getItem(RECORDS_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      const additionalIngredients = Object.fromEntries(
        ALL_FOOD_IDS
          .filter(id => Number(saved.additionalIngredients?.[id]) > 0)
          .map(id => [id, Math.floor(Number(saved.additionalIngredients[id]))])
      );
      return {
        totalEnergy: Math.max(fallback.totalEnergy, Number(saved.totalEnergy) || 0),
        cookingEnergy: Math.max(0, Number(saved.cookingEnergy) || 0),
        chain: Math.max(0, Number(saved.chain) || 0),
        dishes: Math.max(0, Number(saved.dishes) || 0),
        additionalTotal: Math.max(0, Number(saved.additionalTotal) || 0),
        additionalIngredients
      };
    } catch (_) {
      return fallback;
    }
  }

  function writeRecords(records) {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      writeBest(records.totalEnergy);
    } catch (_) {}
  }

  function renderRecordsDialog() {
    const records = readRecords();
    $('recordTotalEnergy').textContent = `${records.totalEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recordCookingEnergy').textContent = `${records.cookingEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recordMaxChain').textContent = `${records.chain}連鎖`;
    $('recordMaxRecipeLevel').textContent = `Lv${recipeLevelForCompletedDishes(records.dishes)}`;
    $('recordAdditionalTotal').textContent = `${records.additionalTotal}個`;
    $('recordAdditionalIngredients').innerHTML = ALL_FOOD_IDS
      .filter(id => (records.additionalIngredients[id] || 0) > 0)
      .map(id => {
        const food = FOODS[id];
        const count = records.additionalIngredients[id];
        return `<span class="result-ingredient-item" title="${food.name}" aria-label="${food.name} ${count}個"><img src="${foodImage(food)}" alt=""><span class="result-ingredient-count">${count}</span></span>`;
      }).join('');
  }

  function endGame(endReason = '') {
    if (!started || ended) return;
    trackPlayEnd(endReason);
    ended = true;
    busy = false;
    cooking = false;
    clearSavedGame();
    const oldRecords = readRecords();
    const additionalTotal = Object.values(totalAdditionalIngredients).reduce((sum, count) => sum + count, 0);
    const isBest = score > oldRecords.totalEnergy;
    const records = {
      totalEnergy: Math.max(oldRecords.totalEnergy, score),
      cookingEnergy: Math.max(oldRecords.cookingEnergy, maxCookingEnergy),
      chain: Math.max(oldRecords.chain, maxChain),
      dishes: Math.max(oldRecords.dishes, dishes),
      additionalTotal: Math.max(oldRecords.additionalTotal, additionalTotal),
      additionalIngredients: additionalTotal > oldRecords.additionalTotal
        ? { ...totalAdditionalIngredients }
        : oldRecords.additionalIngredients
    };
    writeRecords(records);
    const scoreText = score.toLocaleString('ja-JP');
    const shareHeadline = `お料理できるかな！！で${scoreText}エナジー！`;
    const shareStats = `レシピLv${recipeLevelForCompletedDishes(dishes)}・最大${maxChain}連鎖`;
    const resultBestStatusEl = $('resultBestStatus');
    resultBestStatusEl.textContent = isBest
      ? '自己ベスト更新！'
      : `自己ベスト更新ならず（${oldRecords.totalEnergy.toLocaleString('ja-JP')} エナジー）`;
    resultBestStatusEl.classList.toggle('updated', isBest);
    $('resultScore').textContent = scoreText;
    $('resultMeta').textContent = `今回の結果：${shareStats}`;
    $('resultCookMax').textContent = `最大料理エナジー ${maxCookingEnergy.toLocaleString('ja-JP')}`;
    renderResultIngredients();
    const shareText = `${shareHeadline}\n${shareStats}\n#お料理できるかな`;
    xShareButton.href = `https://x.com/intent/post?text=${encodeURIComponent(`${shareText}\n${SHARE_URL}`)}`;
    resultEl.hidden = false;
    startButton.textContent = 'もういちど';
    showMessage('お料理おしまい！', 'cook');
    renderAll();
  }

  function startGame() {
    if (started && !ended && !window.confirm('いまのゲームをやめて、最初からあそびますか？')) return;
    if (started && !ended) trackPlayEnd('manual_end');
    clearSavedGame();
    stopIdleMotion();
    moves = START_MOVES;
    score = 0;
    dishes = 0;
    maxChain = 0;
    maxCookingEnergy = 0;
    extraTastyBonus = 0;
    debugForceCookingSuccess = false;
    activeRecipe = recipeAtDifficulty(chooseRecipe('', 1), 0);
    activePalette = choosePalette(activeRecipe);
    recipeProgress = {};
    pot = {};
    lockedIngredients = new Set();
    totalAdditionalIngredients = {};
    shuffleCount = 0;
    foodGetActivations = 0;
    busy = false;
    cooking = false;
    started = true;
    ended = false;
    clearing = new Set();
    dropping = new Map();
    cells = buildBoard();
    resultEl.hidden = true;
    startButton.textContent = 'やりなおす';
    trackPlayStart();
    renderAll();
    saveGame();
    showMessage('お料理スタート！');
  }

  function survivalGuideHidden() {
    try { return localStorage.getItem(SURVIVAL_GUIDE_HIDDEN_KEY) === '1'; } catch (_) { return false; }
  }

  function showSurvivalGuide() {
    if (survivalGuideHidden()) return;
    $('survivalGuideNever').checked = false;
    if (typeof survivalGuideDialog.showModal === 'function') survivalGuideDialog.showModal();
  }

  function closeSurvivalGuide() {
    if ($('survivalGuideNever').checked) {
      try { localStorage.setItem(SURVIVAL_GUIDE_HIDDEN_KEY, '1'); } catch (_) {}
    }
    survivalGuideDialog.close();
  }

  function setupLocalDebug() {
    const debugPanel = window.KoikiDebugPanel;
    if (!debugPanel?.enabled()) return;

    const requireGame = () => {
      if (!started || ended || busy || cooking) throw new Error('先にゲームを開始し、演出が終わってから操作してください。');
    };
    const persist = message => {
      renderAll();
      saveGame();
      showMessage(`DEBUG: ${message}`, 'cook');
    };

    debugPanel.mount({
      title: 'SURVIVAL DEBUG',
      getSummary: () => !started
        ? '開始前：先にスタート'
        : ended
          ? 'ゲーム終了済み'
          : `${dishes + 1}食目 / ${moves}手 / 追加食材${Object.values(pot).reduce((sum, count) => sum + count, 0)} / 料理チャンス+${Math.round(extraTastyBonus * 100)}%${debugForceCookingSuccess ? ' / 次回成功100%' : ''}`,
      actions: [
        { label: '手数＋5', run: () => { requireGame(); moves = Math.min(MAX_MOVES, moves + 5); persist('手数＋5'); } },
        { label: '手数を1に', run: () => { requireGame(); moves = 1; persist('残り1手'); } },
        { label: '今の料理を自動完成', run: async () => {
          requireGame();
          Object.entries(currentRecipe().needs).forEach(([id, need]) => { recipeProgress[id] = need; });
          renderAll();
          saveGame();
          await cookRecipe();
        } },
        { label: '追加食材 全種＋20', run: () => {
          requireGame();
          ALL_FOOD_IDS.forEach(id => {
            pot[id] = (pot[id] || 0) + 20;
            totalAdditionalIngredients[id] = (totalAdditionalIngredients[id] || 0) + 20;
            lockedIngredients.add(id);
          });
          persist('追加食材 全種＋20');
        } },
        { label: '追加食材を空に', run: () => {
          requireGame();
          pot = {};
          lockedIngredients = new Set();
          persist('追加食材を空に');
        } },
        { label: '食材ゲット発動', run: () => {
          requireGame();
          const result = activateFoodGet();
          renderAll();
          saveGame();
          showFoodGetMessage(result);
        } },
        { label: '料理チャンス発動', run: () => {
          requireGame();
          const bonus = activateCookingChance();
          renderAll();
          saveGame();
          showCookingChanceMessage(bonus);
        } },
        { label: '次回成功100%', run: () => { requireGame(); debugForceCookingSuccess = true; persist('次回成功100%'); } },
        { label: 'ゲーム終了', tone: 'danger', run: () => { requireGame(); endGame('manual_end'); } }
      ]
    });
  }

  boardEl.addEventListener('click', event => {
    const tile = event.target.closest('[data-index]');
    if (!tile) return;
    playMove(Number(tile.dataset.index));
  });

  additionalIngredientsEl.addEventListener('click', async event => {
    const item = event.target.closest('[data-lock-food]');
    if (!item || !started || ended || busy || cooking) return;
    const id = item.dataset.lockFood;
    if (!(pot[id] > 0)) return;

    if (lockedIngredients.has(id)) {
      lockedIngredients.delete(id);
      const usedForRecipe = useUnlockedIngredientForRecipe(id);
      renderAll();
      if (usedForRecipe > 0) {
        showMessage(`${FOODS[id].name} ${usedForRecipe}個を料理に使用！`, 'cook');
        if (recipeComplete()) await cookRecipe();
      }
      saveGame();
      return;
    }

    lockedIngredients.add(id);
    renderAdditionalIngredients();
    saveGame();
  });

  lockAllIngredientsButton.addEventListener('click', () => {
    if (!started || ended || busy || cooking) return;
    lockAllAdditionalIngredients();
  });

  startButton.addEventListener('click', startGame);
  $('resultRestart').addEventListener('click', startGame);
  xShareButton.addEventListener('click', () => sendAnalytics('share', 'survival'));

  shuffleButton.addEventListener('click', async () => {
    if (!started || ended || busy) return;
    busy = true;
    renderAll();
    await performShuffle();
    busy = false;
    renderAll();
    if (moves <= 0) endGame();
    else saveGame();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGame();
  });
  window.addEventListener('pagehide', saveGame);

  $('rulesButton').addEventListener('click', () => {
    if (typeof rulesDialog.showModal === 'function') rulesDialog.showModal();
  });
  $('rulesClose').addEventListener('click', () => rulesDialog.close());
  $('survivalGuideClose').addEventListener('click', closeSurvivalGuide);
  survivalGuideDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeSurvivalGuide();
  });

  bestRecordButton.addEventListener('click', () => {
    renderRecordsDialog();
    if (typeof recordsDialog.showModal === 'function') recordsDialog.showModal();
  });
  $('recordsClose').addEventListener('click', () => recordsDialog.close());

  if (restoreGame()) {
    resultEl.hidden = true;
    startButton.textContent = 'やりなおす';
    renderAll();
    // 自動復元はプレイヤーが「つづきから」を選んでいないため、再開イベントを送らない。
    showMessage('つづきから再開しました！', 'cook');
  } else {
    cells = buildBoard();
    renderAll();
    startIdleMotion();
  }
  showSurvivalGuide();
  setupLocalDebug();
})();
