(() => {
  'use strict';

  const ROWS = 6;
  const COLS = 6;
  const BOARD_FOOD_TYPES = 6;
  const START_MOVES = 12;
  const MAX_MOVES = 12;
  const COOK_BONUS_MOVES = 5;
  const CLEAR_ANIMATION_DURATION = 720;
  const DROP_ANIMATION_DURATION = 1100;
  const FOOD_GET_MESSAGE_DURATION = 3000;
  const COOKING_CHANCE_MESSAGE_DURATION = 2300;
  const ACTIVATION_MOVE_MESSAGE_DURATION = 900;
  const EXTRA_TASTY_CHANCE = 0.1;
  const EXTRA_TASTY_MULTIPLIER = 2;
  const SUPER_SUCCESS_MULTIPLIER = 3;
  const SUNDAY_SUCCESS_BONUS = 0.2;
  const COOKING_CHANCE_BONUS_STEP = 0.1;
  const MAX_COOKING_CHANCE_BONUS = 0.7;
  const RARE_RECIPE_WEIGHT = 0.5;
  const RECIPE_LEVEL_MAX = Math.max(...Object.keys(recipeLevelBonusList).map(Number));
  const FOOD_GET_REWARDS = Object.freeze([6, 8, 11, 14, 17, 21, 24]);
  const CATEGORIES = Object.freeze(['サラダ', 'カレー', 'デザート']);
  const BAG_CAPACITY = 800;
  const MEALS_PER_WEEK = 21;
  const MEALS_PER_DAY = 3;
  const FB_STEP = 5;
  const FB_MAX = 85;
  const ENDLESS_NEEDS_CAP = 70;
  const NORMAL_NEED_FACTOR = 0.7;
  const MONDAY_RECIPE_MAX_INGREDIENTS = 30;
  const IDLE_SWAP_INTERVAL = 1450;
  const GAME_STATE_VERSION = 2;
  const GAME_STATE_KEY = 'gaogao-pksr.koiki-puzzle.game.v2.active';
  const MODE_GAME_KEY_PREFIX = 'gaogao-pksr.koiki-puzzle.game.v2.';
  const MODE_SAVE_MIGRATION_KEY = 'gaogao-pksr.koiki-puzzle.game.v2.mode-migration';
  const RECORDS_KEY_PREFIX = 'gaogao-pksr.koiki-puzzle.records.v2.';
  const MODE_GUIDE_HIDDEN_KEY_PREFIX = 'gaogao-pksr.koiki-puzzle.mode-guide-hidden.v2.';
  const EX_UNLOCKED_KEY = 'gaogao-pksr.koiki-puzzle.ex-unlocked.v2';
  const ENDLESS_UNLOCKED_KEY = 'gaogao-pksr.koiki-puzzle.endless-unlocked.v2';
  const EX_RECORDS_RULESET = 2;
  const MODE_RELEASE_AT = Object.freeze({
    ex: Date.UTC(2026, 8, 4, 15),
    endless: Date.UTC(2026, 8, 11, 15)
  });
  const SHARE_URL = 'https://ny-an.github.io/gaogao-pksr/koiki-puzzle.html';

  const MODES = Object.freeze({
    normal: { id: 'normal', name: 'ノーマル', capped: true },
    ex: { id: 'ex', name: 'EX', capped: true },
    endless: { id: 'endless', name: 'とことん', capped: false }
  });
  const ANALYTICS_CATEGORIES = Object.freeze({
    カレー: 'curry',
    サラダ: 'salad',
    デザート: 'dessert'
  });

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  function miniNeeds(needs) {
    const entries = Object.entries(needs);
    const maxNeed = Math.max(...entries.map(([, count]) => count));
    const cap = entries.length === 1 ? 7 : entries.length === 2 ? 7 : entries.length === 3 ? 6 : 5;
    return Object.fromEntries(entries.map(([name, count]) => [name, Math.max(4, Math.round((count / maxNeed) * cap))]));
  }

  function increaseRecipeNeeds(needs, extraTotal) {
    const ids = Object.keys(needs);
    const increased = { ...needs };
    for (let index = 0; index < extraTotal; index++) increased[ids[index % ids.length]]++;
    return increased;
  }

  function endlessExtraNeeds(completedDishes) {
    const normalizedDishes = Math.max(0, Math.floor(Number(completedDishes) || 0));
    const fbMaxMeals = (FB_MAX / FB_STEP) * MEALS_PER_WEEK;
    return Math.min(normalizedDishes, ENDLESS_NEEDS_CAP) + Math.max(0, normalizedDishes - fbMaxMeals);
  }

  function scaleNeeds(needs, factor) {
    return Object.fromEntries(Object.entries(needs).map(([id, count]) => [id, Math.max(1, Math.ceil(count * factor))]));
  }

  function recipeLevelRequirement(level) {
    const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
    if (normalizedLevel >= RECIPE_LEVEL_MAX) return null;
    return 500 + 4 * normalizedLevel ** 2;
  }

  function recipeLevelCumulativeEnergy(level) {
    const normalizedLevel = Math.min(RECIPE_LEVEL_MAX, Math.max(1, Math.floor(Number(level) || 1)));
    const completedLevels = normalizedLevel - 1;
    const squareTotal = completedLevels * (completedLevels + 1) * (completedLevels * 2 + 1) / 6;
    return completedLevels * 500 + 4 * squareTotal;
  }

  function recipeLevelForEnergy(totalEnergy) {
    const normalizedEnergy = Math.max(0, Math.floor(Number(totalEnergy) || 0));
    let level = 1;
    while (level < RECIPE_LEVEL_MAX && normalizedEnergy >= recipeLevelCumulativeEnergy(level + 1)) level++;
    return level;
  }

  function recipeLevelProgress(totalEnergy) {
    const cumulativeEnergy = Math.max(0, Math.floor(Number(totalEnergy) || 0));
    const level = recipeLevelForEnergy(cumulativeEnergy);
    const nextThreshold = level < RECIPE_LEVEL_MAX ? recipeLevelCumulativeEnergy(level + 1) : null;
    return {
      level,
      cumulativeEnergy,
      remainingEnergy: nextThreshold === null ? null : Math.max(0, nextThreshold - cumulativeEnergy)
    };
  }

  function recipeEnergyAtLevel(baseEnergy, recipeLevel) {
    const bonusPercent = Number(recipeLevelBonusList[recipeLevel] || 0);
    const bonusEnergy = Math.round(baseEnergy * (bonusPercent / 100));
    return { bonusPercent, bonusEnergy, totalEnergy: baseEnergy + bonusEnergy };
  }

  function calculateCookingEnergy(recipeEnergy, extraEnergy, fbPercent, multiplier) {
    const baseEnergy = recipeEnergy + extraEnergy;
    const fbEnergy = Math.floor(baseEnergy * (1 + fbPercent / 100));
    return { baseEnergy, fbEnergy, totalEnergy: fbEnergy * multiplier };
  }

  function fbPercentForMode(completedDishes = dishes, mode = activeMode) {
    if (mode !== 'endless') return 0;
    return Math.min(FB_MAX, Math.floor(Math.max(0, completedDishes) / MEALS_PER_WEEK) * FB_STEP);
  }

  function endlessWeekNumber(completedDishes = dishes) {
    return Math.floor(Math.max(0, completedDishes) / MEALS_PER_WEEK) + 1;
  }

  function foodGetReward(activationCount) {
    return FOOD_GET_REWARDS[Math.min(Math.max(activationCount - 1, 0), FOOD_GET_REWARDS.length - 1)];
  }

  function distributeFoodGet(total, selectedFoods) {
    const baseCount = Math.floor(total / selectedFoods.length);
    const remainder = total % selectedFoods.length;
    return Object.fromEntries(selectedFoods.map((id, index) => [id, baseCount + (index < remainder ? 1 : 0)]));
  }

  function chooseCategory(randomValue = Math.random()) {
    return CATEGORIES[Math.min(CATEGORIES.length - 1, Math.floor(randomValue * CATEGORIES.length))];
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
      .map(([name, originalNeeds]) => ({
        category,
        name,
        energy: dishesEnergyList[name],
        originalNeeds: { ...originalNeeds },
        miniNeeds: miniNeeds(originalNeeds)
      }))
  );

  const KOIKI = Object.freeze({ id: 'koiki', kind: 'koiki', name: '操作アイコン' });
  const ALL_FOOD_IDS = Object.keys(FOODS).sort((left, right) =>
    FOODS[left].energy - FOODS[right].energy || FOODS[left].name.localeCompare(FOODS[right].name, 'ja')
  );

  function ingredientEntries(ingredients) {
    return ALL_FOOD_IDS.filter(id => (ingredients[id] || 0) > 0).map(id => [id, ingredients[id]]);
  }

  const boardEl = $('board');
  const movesEl = $('movesValue');
  const scoreEl = $('scoreValue');
  const recipeLevelEl = $('recipeLevelValue');
  const bestEl = $('bestValue');
  const foodGetLevelEl = $('foodGetLevel');
  const cookingChanceValueEl = $('cookingChanceValue');
  const recipeNameEl = $('recipeName');
  const requirementsEl = $('requirements');
  const additionalIngredientsEl = $('additionalIngredients');
  const cookingAdditionsEl = $('cookingAdditions');
  const openAddFoodButton = $('openAddFood');
  const cookButton = $('cookButton');
  const startButton = $('startButton');
  const shuffleButton = $('shuffleButton');
  const messageEl = $('message');
  const resultEl = $('result');
  const resultUsedIngredientTotalEl = $('resultUsedIngredientTotal');
  const resultUsedIngredientsEl = $('resultUsedIngredients');
  const resultIngredientTotalEl = $('resultIngredientTotal');
  const resultIngredientsEl = $('resultIngredients');
  const xShareButton = $('xShareButton');
  const rulesDialog = $('rulesDialog');
  const recordsDialog = $('recordsDialog');
  const recipeLevelDialog = $('recipeLevelDialog');
  const modeDialog = $('modeDialog');
  const modeSwitchDialog = $('modeSwitchDialog');
  const modeGuideDialog = $('modeGuideDialog');
  const bagFullDialog = $('bagFullDialog');
  const addFoodDialog = $('addFoodDialog');
  const discardDialog = $('discardDialog');
  const cookCelebrationEl = $('cookCelebration');
  const cookExtraTastyEl = $('cookExtraTasty');
  const cookSuccessLabelEl = $('cookSuccessLabel');
  const cookRecipeNameEl = $('cookRecipeName');
  const cookFinalEnergyEl = $('cookFinalEnergy');
  const cookAdditionalEl = $('cookAdditional');
  const cookAdditionalItemsEl = $('cookAdditionalItems');

  let activeMode = null;
  let cells = [];
  let moves = START_MOVES;
  let score = 0;
  let dishes = 0;
  let weekEnergy = 0;
  let maxChain = 0;
  let maxCookingEnergy = 0;
  let bestBeforeRun = 0;
  let extraTastyBonus = 0;
  let currentCategory = null;
  let activeRecipe = null;
  let activePalette = [];
  let pot = {};
  let cookingAdditions = {};
  let totalAdditionalIngredients = {};
  let totalUsedIngredients = {};
  let shuffleCount = 0;
  let foodGetActivations = 0;
  let busy = false;
  let cooking = false;
  let started = false;
  let ended = false;
  let clearing = new Set();
  let dropping = new Map();
  let idleSwapping = new Map();
  let pickerDraft = {};
  let additionDraft = {};
  let messageTimer = 0;
  let idleMotionTimer = 0;
  let idleCleanupTimer = 0;
  let pendingMode = null;
  let debugForceCookingSuccess = false;

  function modeConfig(mode = activeMode) {
    return MODES[mode] || MODES.normal;
  }

  function analyticsCategory(mode = activeMode) {
    if (mode === 'endless') return 'all';
    return ANALYTICS_CATEGORIES[currentCategory || currentRecipe()?.category];
  }

  function analyticsPayload(parameters = {}) {
    return {
      game_version: 'v2',
      game_mode: activeMode,
      category: analyticsCategory(),
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
    sendAnalytics('startPlay', analyticsPayload());
  }

  function trackResume() {
    sendAnalytics('resumePlay', analyticsPayload({
      dish_number: dishes + 1,
      moves_remaining: moves,
      total_energy: score
    }));
  }

  function trackMealComplete(cookingEnergy, successType) {
    sendAnalytics('completeMeal', analyticsPayload({
      dish_number: dishes,
      recipe_level: recipeLevelForEnergy(score),
      cooking_energy: cookingEnergy,
      total_energy: score,
      success_type: successType === 'super' ? 'super_success' : successType === 'great' ? 'extra_tasty' : 'normal'
    }));
  }

  function trackPlayEnd(endReason) {
    const reason = endReason || (activeMode !== 'endless' && dishes >= MEALS_PER_WEEK
      ? 'week_complete'
      : moves <= 0 && !recipeComplete() ? 'moves_zero' : 'manual_end');
    sendAnalytics('endPlay', analyticsPayload({
      end_reason: reason,
      dishes_completed: dishes,
      total_energy: score,
      max_cooking_energy: maxCookingEnergy,
      max_chain: maxChain,
      recipe_level: recipeLevelForEnergy(score)
    }));
  }

  function modeGameKey(mode) {
    return `${MODE_GAME_KEY_PREFIX}${mode}`;
  }

  function recordsKey(mode = activeMode) {
    if (mode === 'ex') return `${RECORDS_KEY_PREFIX}ex.ruleset${EX_RECORDS_RULESET}`;
    return `${RECORDS_KEY_PREFIX}${mode || 'endless'}`;
  }

  function exUnlocked() {
    try {
      if (localStorage.getItem(EX_UNLOCKED_KEY) === '1') return true;
      if (readRecords('normal').dishes < MEALS_PER_WEEK) return false;
      localStorage.setItem(EX_UNLOCKED_KEY, '1');
      return true;
    } catch (_) {
      return readRecords('normal').dishes >= MEALS_PER_WEEK;
    }
  }

  function unlockEx() {
    try {
      if (localStorage.getItem(EX_UNLOCKED_KEY) === '1') return false;
      localStorage.setItem(EX_UNLOCKED_KEY, '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function recordDishesForKey(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      return saved && typeof saved === 'object' ? Math.max(0, Number(saved.dishes) || 0) : 0;
    } catch (_) { return 0; }
  }

  function hasPastEndlessPlay() {
    const records = readRecords('endless');
    if (records.dishes > 0 || records.totalEnergy > 0) return true;
    return readSavedGame()?.mode === 'endless';
  }

  function endlessUnlocked() {
    try {
      if (localStorage.getItem(ENDLESS_UNLOCKED_KEY) === '1') return true;
      const completedEx = Math.max(
        readRecords('ex').dishes,
        recordDishesForKey(`${RECORDS_KEY_PREFIX}ex`)
      ) >= MEALS_PER_WEEK;
      if (!completedEx && !hasPastEndlessPlay()) return false;
      localStorage.setItem(ENDLESS_UNLOCKED_KEY, '1');
      return true;
    } catch (_) { return false; }
  }

  function unlockEndless() {
    try {
      if (localStorage.getItem(ENDLESS_UNLOCKED_KEY) === '1') return false;
      localStorage.setItem(ENDLESS_UNLOCKED_KEY, '1');
      return true;
    } catch (_) { return false; }
  }

  function localDebugEnabled() {
    try { return window.KoikiDebugPanel?.enabled() === true; } catch (_) { return false; }
  }

  function modeReleased(mode, now = Date.now(), debugEnabled = localDebugEnabled()) {
    const releaseAt = MODE_RELEASE_AT[mode];
    return !releaseAt || debugEnabled || Number(now) >= releaseAt;
  }

  function currentRecipe() {
    return activeRecipe;
  }

  function mealInWeek(completedDishes = dishes) {
    return (completedDishes % MEALS_PER_WEEK) + 1;
  }

  function weekdayName(completedDishes = dishes) {
    return ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜'][Math.floor((completedDishes % MEALS_PER_WEEK) / MEALS_PER_DAY)];
  }

  function mealName(completedDishes = dishes) {
    return ['朝', '昼', '晩'][completedDishes % MEALS_PER_DAY];
  }

  function isSundayMeal(completedDishes = dishes) {
    return activeMode !== 'endless' && completedDishes >= 18 && completedDishes < MEALS_PER_WEEK;
  }

  function stockTotal() {
    return Object.values(pot).reduce((sum, count) => sum + count, 0);
  }

  function isCappedMode() {
    return modeConfig().capped;
  }

  function isBagFull() {
    return started && !ended && isCappedMode() && stockTotal() > BAG_CAPACITY;
  }

  function requiredDiscardCount() {
    return isCappedMode() ? Math.max(0, stockTotal() - BAG_CAPACITY) : 0;
  }

  function totalOf(ingredients) {
    return Object.values(ingredients).reduce((sum, count) => sum + count, 0);
  }

  function isRareRecipe(recipe) {
    return Boolean(recipe.originalNeeds['ずっしりカボチャ'] || recipe.originalNeeds['おいしいシッポ']);
  }

  function recipeIngredientTotal(recipe) {
    return totalOf(recipe.originalNeeds);
  }

  function topLargeRecipes(recipes, limit = 5) {
    return [...recipes].sort((left, right) =>
      recipeIngredientTotal(right) - recipeIngredientTotal(left)
      || right.energy - left.energy
      || left.name.localeCompare(right.name, 'ja')
    ).slice(0, limit);
  }

  function singleIngredientId(recipe) {
    const ids = Object.keys(recipe?.originalNeeds || {});
    return ids.length === 1 ? ids[0] : '';
  }

  function excludeEndlessMercyRecipes(recipes, previousName, mode = activeMode) {
    if (mode !== 'endless' || !previousName) return recipes;
    const previousIngredient = singleIngredientId(RECIPES.find(recipe => recipe.name === previousName));
    if (!previousIngredient) return recipes;
    return recipes.filter(recipe => singleIngredientId(recipe) !== previousIngredient);
  }

  function recipeNeedsForMode(recipe, completedDishes = dishes, mode = activeMode) {
    if (mode === 'endless') return increaseRecipeNeeds(recipe.miniNeeds, endlessExtraNeeds(completedDishes));
    return scaleNeeds(recipe.originalNeeds, mode === 'normal' ? NORMAL_NEED_FACTOR : 1);
  }

  function recipeAtDifficulty(recipe, completedDishes = dishes, mode = activeMode) {
    return { ...recipe, needs: recipeNeedsForMode(recipe, completedDishes, mode) };
  }

  function chooseRecipe(excludedName = '', requiredIngredientCount = 0) {
    let categoryRecipes = RECIPES;
    if (activeMode !== 'endless' && currentCategory) categoryRecipes = categoryRecipes.filter(recipe => recipe.category === currentCategory);

    const sunday = activeMode !== 'endless' && isSundayMeal(dishes);
    let candidates = sunday
      ? topLargeRecipes(categoryRecipes).filter(recipe => recipe.name !== excludedName)
      : categoryRecipes.filter(recipe => recipe.name !== excludedName);
    candidates = excludeEndlessMercyRecipes(candidates, excludedName);

    if (!sunday) {
      const needsOneIngredient = requiredIngredientCount === 1 || dishes === 0;
      if (needsOneIngredient) candidates = candidates.filter(recipe => Object.keys(recipe.originalNeeds).length === 1);
      else if (activeMode !== 'endless' && dishes < MEALS_PER_DAY) {
        const mondayCandidates = candidates.filter(recipe => recipeIngredientTotal(recipe) <= MONDAY_RECIPE_MAX_INGREDIENTS);
        if (mondayCandidates.length) candidates = mondayCandidates;
      }
    }

    if (!candidates.length) {
      candidates = excludeEndlessMercyRecipes(categoryRecipes.filter(recipe => recipe.name !== excludedName), excludedName);
    }
    const selectionWeight = recipe => sunday ? 1 : (isRareRecipe(recipe) ? RARE_RECIPE_WEIGHT : 1);
    const totalWeight = candidates.reduce((sum, recipe) => sum + selectionWeight(recipe), 0);
    let target = Math.random() * totalWeight;
    for (const recipe of candidates) {
      target -= selectionWeight(recipe);
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

  function foodImage(food) { return `img/foods/svg/${food.image}.svg`; }
  function makeFood(id) { return { ...FOODS[id], kind: 'food' }; }
  function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

  function ingredientShortages(recipe = currentRecipe()) {
    const shortages = Object.fromEntries(Object.entries(recipe.needs).map(([id, required]) => [
      id,
      Math.max(0, required - (pot[id] || 0))
    ]));
    return {
      shortages,
      total: Object.values(shortages).reduce((sum, count) => sum + count, 0)
    };
  }

  function chooseVirtualShortage(recipe = currentRecipe(), randomValue = Math.random()) {
    if (ingredientShortages(recipe).total > 0) return null;
    const requiredIds = Object.keys(recipe.needs);
    if (requiredIds.length === 0) return null;
    return requiredIds[Math.min(requiredIds.length - 1, Math.floor(randomValue * requiredIds.length))];
  }

  function spawnPool(recipe = currentRecipe(), { reset = false, virtualShortageId } = {}) {
    const { shortages, total } = ingredientShortages(recipe);
    const resetVirtualId = reset && total === 0
      ? (virtualShortageId === undefined ? chooseVirtualShortage(recipe) : virtualShortageId)
      : null;
    const pool = [];
    activePalette.forEach(id => {
      let weight = 1;
      if (recipe.needs[id]) {
        if (reset) {
          if (total > 0) weight = Math.max(1, Math.ceil((shortages[id] / total) * 8));
          else if (id === resetVirtualId) weight = 8;
        } else {
          weight = total > 0
            ? Math.max(2, Math.ceil((shortages[id] / total) * 8))
            : 2;
        }
      }
      for (let count = 0; count < weight; count++) pool.push(id);
    });
    return pool;
  }

  function createsFourAt(board, index, foodId) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    if (col >= 3 && [1, 2, 3].every(offset => board[index - offset]?.id === foodId)) return true;
    return row >= 3 && [1, 2, 3].every(offset => board[index - offset * COLS]?.id === foodId);
  }

  function buildBoard(recipe = currentRecipe()) {
    const virtualShortageId = chooseVirtualShortage(recipe);
    const pool = spawnPool(recipe, { reset: true, virtualShortageId });
    let lastBoard = [];
    for (let attempt = 0; attempt < 120; attempt++) {
      const next = new Array(ROWS * COLS);
      const koikiIndex = Math.floor(Math.random() * next.length);
      for (let index = 0; index < next.length; index++) {
        if (index === koikiIndex) { next[index] = KOIKI; continue; }
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
        while (first?.kind === 'food' && end < COLS && board[row * COLS + end]?.id === first.id) end++;
        if (first?.kind === 'food' && end - start >= 4) for (let col = start; col < end; col++) found.add(row * COLS + col);
        start = end;
      }
    }
    for (let col = 0; col < COLS; col++) {
      let start = 0;
      while (start < ROWS) {
        const first = board[start * COLS + col];
        let end = start + 1;
        while (first?.kind === 'food' && end < ROWS && board[end * COLS + col]?.id === first.id) end++;
        if (first?.kind === 'food' && end - start >= 4) for (let row = start; row < end; row++) found.add(row * COLS + col);
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

  function recipeComplete() {
    return Object.entries(currentRecipe().needs).every(([id, need]) => (pot[id] || 0) >= need);
  }

  function boardIsBlocked() {
    return !started || ended || busy || cooking || moves <= 0 || isBagFull();
  }

  function renderBoard() {
    const disabled = boardIsBlocked();
    boardEl.classList.toggle('busy', busy || isBagFull());
    boardEl.innerHTML = cells.map((tile, index) => {
      const row = Math.floor(index / COLS);
      const dropDistance = dropping.get(index) || 0;
      const dropClass = dropDistance ? ' dropping' : '';
      const idleMotion = idleSwapping.get(index);
      const idleClass = idleMotion ? ' idle-swapping' : '';
      const motionStyle = `--drop-row:${row};--drop-y:-${dropDistance * 110}%;${idleMotion ? `--idle-x:${idleMotion.x}%;--idle-y:${idleMotion.y}%;` : ''}`;
      if (tile?.kind === 'koiki') return `<button class="tile koiki${dropClass}${idleClass}" type="button" role="gridcell" disabled style="${motionStyle}" aria-label="操作アイコン"><span class="koiki-avatar" aria-hidden="true"></span></button>`;
      if (!tile) return '<span class="tile" role="gridcell" aria-hidden="true"></span>';
      const clearClass = clearing.has(index) ? ' clearing' : '';
      return `<button class="tile food${clearClass}${dropClass}${idleClass}" type="button" role="gridcell" data-index="${index}" data-food-id="${tile.id}" style="--tile-bg:${tile.bg};${motionStyle}" ${disabled ? 'disabled' : ''} aria-label="${tile.name}を操作アイコンと入れ替える"><img src="${foodImage(tile)}" alt=""></button>`;
    }).join('');
  }

  function miniFoodHtml(id, count) {
    const food = FOODS[id];
    return `<span class="mini-food" aria-label="${food.name} ${count}個"><img src="${foodImage(food)}" alt=""><b>${count}</b></span>`;
  }

  function renderRequirements() {
    requirementsEl.innerHTML = ingredientEntries(currentRecipe().needs).map(([id, need]) => {
      const food = FOODS[id];
      const current = Math.min(pot[id] || 0, need);
      return `<div class="requirement${current >= need ? ' done' : ''}" aria-label="${food.name} ${current}/${need}"><img src="${foodImage(food)}" alt=""><span class="requirement-count">${current}/${need}</span></div>`;
    }).join('');
  }

  function renderAdditionalIngredients() {
    const ingredientIds = ALL_FOOD_IDS.filter(id => (pot[id] || 0) > 0);
    additionalIngredientsEl.innerHTML = ingredientIds.map(id => {
      const food = FOODS[id];
      return `<span class="additional-item" aria-label="${food.name} ${pot[id]}個"><img src="${foodImage(food)}" alt=""><span class="additional-count">${pot[id]}</span></span>`;
    }).join('');
  }

  function bagSurplusAvailable(id) {
    return Math.max(0, (pot[id] || 0) - (currentRecipe().needs[id] || 0));
  }

  function renderCookingAdditions() {
    cookingAdditionsEl.innerHTML = ingredientEntries(cookingAdditions).map(([id, count]) => miniFoodHtml(id, count)).join('');
    const canEdit = ALL_FOOD_IDS.some(id => bagSurplusAvailable(id) > 0 || (cookingAdditions[id] || 0) > 0);
    openAddFoodButton.disabled = !started || ended || busy || cooking || !canEdit;
  }

  function successChance() {
    return Math.min(1, EXTRA_TASTY_CHANCE + extraTastyBonus + (isSundayMeal() ? SUNDAY_SUCCESS_BONUS : 0));
  }

  function renderContext() {
    const mode = modeConfig();
    const mealIndex = activeMode === 'endless' ? dishes : Math.min(dishes, MEALS_PER_WEEK - 1);
    const weekProgressMeal = activeMode === 'endless'
      ? dishes % MEALS_PER_WEEK + 1
      : Math.min(dishes + 1, MEALS_PER_WEEK);
    $('modeChip').textContent = mode.name;
    $('dayChipText').textContent = activeMode === 'endless' ? `${endlessWeekNumber()}週目 FB+${fbPercentForMode()}%` : `${weekdayName(mealIndex)} ${mealName(mealIndex)}`;
    $('dayChip').style.setProperty('--meter-progress', `${weekProgressMeal / MEALS_PER_WEEK * 100}%`);
    $('dayChip').setAttribute('aria-valuenow', String(weekProgressMeal));
    $('dayChip').setAttribute('aria-label', activeMode === 'endless' ? '次のFBボーナスまでの進行' : '週間の食事進行');
    $('mealChip').textContent = activeMode === 'endless' ? `${dishes + 1}食目` : `${Math.min(dishes + 1, MEALS_PER_WEEK)}/21食`;
    $('categoryChip').textContent = activeMode === 'endless' ? `料理 ${currentRecipe().category}` : `今週 ${currentCategory || '―'}`;
    $('successChip').textContent = `${isSundayMeal() ? '超成功' : '大成功'} ${Math.round(successChance() * 100)}%`;
    $('successChip').classList.toggle('sunday', isSundayMeal());
    const bagTotal = stockTotal();
    const cappedBag = isCappedMode();
    const bagChip = $('bagChip');
    $('bagChipText').textContent = cappedBag ? `食材バッグ（${bagTotal}/${BAG_CAPACITY}）` : `食材バッグ（${bagTotal}/∞）`;
    bagChip.style.setProperty('--meter-progress', cappedBag ? `${Math.min(bagTotal / BAG_CAPACITY, 1) * 100}%` : '0%');
    bagChip.setAttribute('role', cappedBag ? 'meter' : 'status');
    bagChip.setAttribute('aria-label', cappedBag ? '食材バッグ容量' : '食材バッグ在庫、上限なし');
    if (cappedBag) {
      bagChip.setAttribute('aria-valuemin', '0');
      bagChip.setAttribute('aria-valuemax', String(BAG_CAPACITY));
      bagChip.setAttribute('aria-valuenow', String(bagTotal));
    } else {
      bagChip.removeAttribute('aria-valuemin');
      bagChip.removeAttribute('aria-valuemax');
      bagChip.removeAttribute('aria-valuenow');
    }
    $('bagFullCount').textContent = `食材バッグ（${bagTotal}/${BAG_CAPACITY}）`;
  }

  function renderStatus() {
    movesEl.textContent = String(moves);
    scoreEl.textContent = score.toLocaleString('ja-JP');
    const recipeLevel = recipeLevelForEnergy(score);
    recipeLevelEl.textContent = `Lv${recipeLevel}`;
    $('recipeLevelButton').setAttribute('aria-label', `レシピレベル${recipeLevel}。詳細を開く`);
    bestEl.textContent = readRecords().totalEnergy.toLocaleString('ja-JP');
    const foodGetLevel = Math.min(foodGetActivations, FOOD_GET_REWARDS.length);
    foodGetLevelEl.textContent = `Lv${foodGetLevel}`;
    $('foodGetMeter').style.setProperty('--meter-progress', `${foodGetLevel / FOOD_GET_REWARDS.length * 100}%`);
    $('foodGetMeter').setAttribute('aria-valuenow', String(foodGetLevel));
    const cookingChancePercent = Math.round(extraTastyBonus * 100);
    cookingChanceValueEl.textContent = `+${cookingChancePercent}%`;
    $('cookingChanceMeter').style.setProperty('--meter-progress', `${cookingChancePercent / (MAX_COOKING_CHANCE_BONUS * 100) * 100}%`);
    $('cookingChanceMeter').setAttribute('aria-valuenow', String(cookingChancePercent));
    recipeNameEl.textContent = currentRecipe().name;
    const nextShuffleCost = shuffleCost();
    shuffleButton.textContent = `まぜまぜ ${nextShuffleCost === 0 ? '0' : `−${nextShuffleCost}`}`;
    shuffleButton.disabled = boardIsBlocked();
    startButton.disabled = busy || cooking;
    cookButton.disabled = !started || ended || busy || cooking || !recipeComplete();
    cookButton.textContent = recipeComplete() ? '料理を作る' : '食材をそろえよう';
    renderContext();
    renderRequirements();
    renderAdditionalIngredients();
    renderCookingAdditions();
  }

  function renderAll() {
    document.body.classList.toggle('game-started', started && !ended);
    renderStatus();
    renderBoard();
  }

  function addIngredient(id, count = 1) {
    if (!FOODS[id] || count <= 0) return;
    pot[id] = (pot[id] || 0) + count;
    totalAdditionalIngredients[id] = (totalAdditionalIngredients[id] || 0) + count;
    autoInvestBagOverflow();
  }

  function autoInvestBagOverflow() {
    let remaining = isCappedMode() ? Math.max(0, stockTotal() - BAG_CAPACITY) : 0;
    if (remaining === 0) return {};
    const invested = {};
    const candidates = ALL_FOOD_IDS
      .filter(id => (pot[id] || 0) > (currentRecipe().needs[id] || 0))
      .sort((left, right) =>
        FOODS[left].energy - FOODS[right].energy
        || FOODS[left].name.localeCompare(FOODS[right].name, 'ja')
      );
    for (const id of candidates) {
      if (remaining <= 0) break;
      const available = Math.max(0, (pot[id] || 0) - (currentRecipe().needs[id] || 0));
      const count = Math.min(available, remaining);
      if (count <= 0) continue;
      pot[id] -= count;
      if (pot[id] <= 0) delete pot[id];
      cookingAdditions[id] = (cookingAdditions[id] || 0) + count;
      invested[id] = count;
      remaining -= count;
    }
    return invested;
  }

  function mergeIngredients(...groups) {
    const merged = {};
    groups.forEach(group => Object.entries(group).forEach(([id, count]) => { if (count > 0) merged[id] = (merged[id] || 0) + count; }));
    return merged;
  }

  function additionalIngredientEnergy(ingredients) {
    return Object.entries(ingredients).reduce((sum, [id, count]) => sum + (FOODS[id]?.energy || 0) * count, 0);
  }

  function consumeBagForCooking() {
    const additional = { ...cookingAdditions };
    cookingAdditions = {};
    Object.entries(currentRecipe().needs).forEach(([id, need]) => {
      pot[id] -= need;
      if (pot[id] <= 0) delete pot[id];
    });
    return additional;
  }

  function showMessage(text, tone = '', duration = 1400) {
    window.clearTimeout(messageTimer);
    messageEl.textContent = text;
    messageEl.className = `message show${tone ? ` ${tone}` : ''}`;
    messageTimer = window.setTimeout(() => { messageEl.className = 'message'; }, duration);
  }

  function showFoodGetMessage(foodGet) {
    window.clearTimeout(messageTimer);
    messageEl.innerHTML = `<div class="food-get-title">食材ゲットLv${foodGet.level} 発動！ + ${foodGet.total}個</div><div class="food-get-items">${ingredientEntries(foodGet.foods).map(([id, count]) => `<span class="food-get-item" aria-label="${FOODS[id].name} ${count}個"><img src="${foodImage(FOODS[id])}" alt=""><span class="food-get-count">${count}</span></span>`).join('')}</div>`;
    messageEl.className = 'message show food-get';
    messageTimer = window.setTimeout(() => { messageEl.className = 'message'; }, FOOD_GET_MESSAGE_DURATION);
  }

  function showCookingChanceMessage() { showMessage('料理チャンス発動！ 大成功＋10%', 'chance', COOKING_CHANCE_MESSAGE_DURATION); }
  function showActivationMoveMessage(reward) { showMessage(reward.maxed ? '手数MAX' : `＋${reward.amount}手`, 'move', ACTIVATION_MOVE_MESSAGE_DURATION); }

  function addMoves(amount, maxed = false) {
    if (maxed) moves = MAX_MOVES;
    else moves = Math.min(MAX_MOVES, moves + amount);
    return { amount, maxed };
  }

  function skillMoveAmount(skill, mode = activeMode) {
    return skill === 'cookingChance' && mode === 'ex' ? 2 : 1;
  }

  function activateCookingChance() {
    extraTastyBonus = Math.min(MAX_COOKING_CHANCE_BONUS, extraTastyBonus + COOKING_CHANCE_BONUS_STEP);
    return Math.round(extraTastyBonus * 100);
  }

  function activateFoodGet() {
    foodGetActivations++;
    const level = Math.min(foodGetActivations, FOOD_GET_REWARDS.length);
    const total = foodGetReward(foodGetActivations);
    const candidates = [...ALL_FOOD_IDS];
    for (let index = candidates.length - 1; index > 0; index--) {
      const target = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
    }
    const selectedFoods = candidates.slice(0, 3);
    const foods = distributeFoodGet(total, selectedFoods);
    Object.entries(foods).forEach(([id, count]) => addIngredient(id, count));
    return { level, total, foods };
  }

  function applyGravity() {
    const pool = spawnPool(currentRecipe(), { reset: false });
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

  async function resolveBoard() {
    let chain = 0;
    while (true) {
      const matches = findMatches();
      if (matches.size === 0) break;
      chain++;
      const foodGet = matches.size >= 6 ? activateFoodGet() : null;
      const foodGetMoveReward = foodGet ? addMoves(skillMoveAmount('foodGet')) : null;
      const cookingChanceBonus = chain >= 2 ? activateCookingChance() : 0;
      const cookingChanceMoveReward = cookingChanceBonus ? addMoves(skillMoveAmount('cookingChance')) : null;
      maxChain = Math.max(maxChain, chain);
      matches.forEach(index => {
        const food = cells[index];
        if (food?.kind === 'food') addIngredient(food.id);
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
        if (foodGetMoveReward) {
          showActivationMoveMessage(foodGetMoveReward);
          await sleep(ACTIVATION_MOVE_MESSAGE_DURATION);
        }
      }
      if (cookingChanceBonus) {
        if (foodGet) { showCookingChanceMessage(cookingChanceBonus); await sleep(COOKING_CHANCE_MESSAGE_DURATION); }
        else await sleep(Math.max(0, COOKING_CHANCE_MESSAGE_DURATION - CLEAR_ANIMATION_DURATION - DROP_ANIMATION_DURATION));
        showActivationMoveMessage(cookingChanceMoveReward);
        await sleep(ACTIVATION_MOVE_MESSAGE_DURATION);
      }
    }
  }

  async function playMove(index) {
    if (boardIsBlocked() || cells[index]?.kind !== 'food') return;
    busy = true;
    moves--;
    const koikiIndex = cells.findIndex(tile => tile?.kind === 'koiki');
    [cells[koikiIndex], cells[index]] = [cells[index], cells[koikiIndex]];
    renderAll();
    await sleep(150);
    await resolveBoard();
    busy = false;
    renderAll();
    finishStableAction();
  }

  async function performShuffle() {
    if (boardIsBlocked()) return;
    busy = true;
    const cost = shuffleCost();
    moves = Math.max(0, moves - cost);
    shuffleCount++;
    renderStatus();
    showMessage('まぜまぜ！');
    await sleep(520);
    cells = buildBoard();
    dropping = new Map();
    busy = false;
    renderAll();
    finishStableAction();
  }

  function shuffleCost(mode = activeMode, usedCount = shuffleCount) {
    if (usedCount <= 0) return 0;
    return mode === 'ex' ? Math.min(usedCount, 2) : 1;
  }

  function finishStableAction() {
    if (moves <= 0 && !recipeComplete()) return endGame();
    saveGame();
    if (isBagFull()) openBagFullDialog();
  }

  function prepareNextRecipe(excludedName = '') {
    activeRecipe = recipeAtDifficulty(chooseRecipe(excludedName), dishes, activeMode);
    activePalette = choosePalette(activeRecipe);
    shuffleCount = 0;
    cells = buildBoard();
  }

  function animateCookEnergy(from, to) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 1100;
    if (!duration || from === to) { cookFinalEnergyEl.textContent = to.toLocaleString('ja-JP'); return Promise.resolve(); }
    return new Promise(resolve => {
      const startedAt = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const value = Math.round(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
        cookFinalEnergyEl.textContent = value.toLocaleString('ja-JP');
        if (progress < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  function renderCookAdditionalIngredients(ingredients) {
    const entries = ingredientEntries(ingredients);
    cookAdditionalEl.hidden = entries.length === 0;
    cookAdditionalItemsEl.innerHTML = entries.map(([id, count]) => `<span class="cook-additional-item" aria-label="${FOODS[id].name} ${count}個"><img src="${foodImage(FOODS[id])}" alt=""><span class="cook-additional-count">${count}</span></span>`).join('');
  }

  async function showCookCelebration(recipe, recipeEnergy, finalEnergy, successType, additionalIngredients) {
    cookRecipeNameEl.textContent = recipe.name;
    cookExtraTastyEl.hidden = successType === 'normal';
    cookSuccessLabelEl.textContent = successType === 'super' ? '超成功！' : '大成功！';
    cookCelebrationEl.classList.toggle('extra-tasty', successType === 'great');
    cookCelebrationEl.classList.toggle('super-success', successType === 'super');
    cookFinalEnergyEl.textContent = recipeEnergy.toLocaleString('ja-JP');
    renderCookAdditionalIngredients(additionalIngredients);
    cookCelebrationEl.hidden = false;
    await animateCookEnergy(recipeEnergy, finalEnergy);
    await sleep(1800);
    cookCelebrationEl.hidden = true;
  }

  async function cookRecipe() {
    if (!started || ended || busy || cooking || !recipeComplete()) return;
    cooking = true;
    closeDialog(bagFullDialog);
    renderAll();
    const cooked = currentRecipe();
    const usedAdditionalIngredients = consumeBagForCooking();
    const extraEnergy = additionalIngredientEnergy(usedAdditionalIngredients);
    const levelEnergy = recipeEnergyAtLevel(cooked.energy, recipeLevelForEnergy(score));
    const sunday = isSundayMeal();
    const successful = debugForceCookingSuccess || Math.random() < successChance();
    debugForceCookingSuccess = false;
    const successType = successful ? (sunday ? 'super' : 'great') : 'normal';
    const multiplier = successType === 'super' ? SUPER_SUCCESS_MULTIPLIER : successType === 'great' ? EXTRA_TASTY_MULTIPLIER : 1;
    const energy = calculateCookingEnergy(levelEnergy.totalEnergy, extraEnergy, fbPercentForMode(), multiplier);
    if (successful) extraTastyBonus = 0;
    totalUsedIngredients = mergeIngredients(totalUsedIngredients, cooked.needs, usedAdditionalIngredients);
    maxCookingEnergy = Math.max(maxCookingEnergy, energy.totalEnergy);
    score += energy.totalEnergy;
    weekEnergy += energy.totalEnergy;
    dishes++;
    moves = Math.min(MAX_MOVES, moves + COOK_BONUS_MOVES);
    const unlockedExNow = activeMode === 'normal' && dishes >= MEALS_PER_WEEK ? unlockEx() : false;
    const unlockedEndlessNow = activeMode === 'ex' && dishes >= MEALS_PER_WEEK ? unlockEndless() : false;
    trackMealComplete(energy.totalEnergy, successType);
    updateRecords();
    renderStatus();
    await showCookCelebration(cooked, levelEnergy.totalEnergy, energy.totalEnergy, successType, usedAdditionalIngredients);
    if (activeMode !== 'endless' && dishes >= MEALS_PER_WEEK) {
      cooking = false;
      endGame('', unlockedExNow ? 'EX' : unlockedEndlessNow ? 'とことん' : '');
      return;
    }

    prepareNextRecipe(cooked.name);
    cooking = false;
    renderAll();
    showMessage(`＋${COOK_BONUS_MOVES}手`, 'cook');
    saveGame();
    if (isBagFull()) openBagFullDialog();
  }

  function pickerAvailable(id) {
    return pot[id] || 0;
  }

  function additionPickerLimit(id) {
    return (cookingAdditions[id] || 0) + bagSurplusAvailable(id);
  }

  function renderAdditionPicker() {
    const ids = ALL_FOOD_IDS.filter(id => additionPickerLimit(id) > 0);
    $('addFoodList').innerHTML = ids.map(id => {
      const limit = additionPickerLimit(id);
      const value = Math.min(additionDraft[id] || 0, limit);
      return `<div class="picker-row" data-add-food="${id}"><img src="${foodImage(FOODS[id])}" alt=""><span class="picker-name">${FOODS[id].name}<small>最大${limit}個</small></span><span class="stepper"><button type="button" data-add-step="-1" aria-label="1個戻す">−</button><output>${value}</output><button type="button" data-add-step="1" aria-label="1個追加する">＋</button><button type="button" data-add-step="10" aria-label="10個追加する">+10</button><button type="button" data-add-step="all" aria-label="全部追加する">全部</button></span></div>`;
    }).join('');
    const draftTotal = totalOf(additionDraft);
    $('addFoodTotal').textContent = `${draftTotal}個`;
    $('returnAllAdditions').disabled = draftTotal === 0;
    $('addAllFoods').disabled = !ids.some(id => (additionDraft[id] || 0) < additionPickerLimit(id));
  }

  function adjustAdditionPicker(id, delta) {
    const limit = additionPickerLimit(id);
    additionDraft[id] = delta === 'all' ? limit : Math.max(0, Math.min(limit, (additionDraft[id] || 0) + delta));
    if (!additionDraft[id]) delete additionDraft[id];
    renderAdditionPicker();
  }

  function returnAllAdditions() {
    additionDraft = {};
    renderAdditionPicker();
  }

  function addAllFoods() {
    additionDraft = Object.fromEntries(ALL_FOOD_IDS
      .map(id => [id, additionPickerLimit(id)])
      .filter(([, count]) => count > 0));
    renderAdditionPicker();
  }

  function openAdditionDialog() {
    additionDraft = { ...cookingAdditions };
    renderAdditionPicker();
    openDialog(addFoodDialog);
  }

  function applyCookingAdditions() {
    const nextAdditions = {};
    ALL_FOOD_IDS.forEach(id => {
      const current = cookingAdditions[id] || 0;
      const next = Math.min(additionDraft[id] || 0, additionPickerLimit(id));
      const delta = next - current;
      if (delta > 0) {
        pot[id] -= delta;
        if (pot[id] <= 0) delete pot[id];
      } else if (delta < 0) pot[id] = (pot[id] || 0) - delta;
      if (next > 0) nextAdditions[id] = next;
    });
    cookingAdditions = nextAdditions;
    const autoInvested = autoInvestBagOverflow();
    additionDraft = {};
    closeDialog(addFoodDialog);
    renderAll();
    saveGame();
    const autoCount = totalOf(autoInvested);
    if (autoCount > 0) showMessage(`バッグ超過 ${autoCount}個を自動投入`, 'cook');
    if (isBagFull()) openBagFullDialog();
  }

  function renderPicker() {
    const listEl = $('discardList');
    const totalEl = $('discardTotal');
    const ids = ALL_FOOD_IDS.filter(id => pickerAvailable(id) > 0);
    listEl.innerHTML = ids.map(id => {
      const available = pickerAvailable(id);
      const value = Math.min(pickerDraft[id] || 0, available);
      return `<div class="picker-row" data-picker-food="${id}"><img src="${foodImage(FOODS[id])}" alt=""><span class="picker-name">${FOODS[id].name}<small>${available}個</small></span><span class="stepper"><button type="button" data-step="-1" aria-label="1個減らす">−</button><output>${value}</output><button type="button" data-step="1" aria-label="1個増やす">＋</button><button type="button" data-step="10" aria-label="10個増やす">+10</button><button type="button" data-step="all" aria-label="全部選ぶ">全部</button></span></div>`;
    }).join('');
    const selected = totalOf(pickerDraft);
    const remaining = Math.max(0, requiredDiscardCount() - selected);
    totalEl.textContent = `${selected}個`;
    $('discardNeed').textContent = remaining > 0 ? `再開まであと${remaining}個` : '再開できます';
    $('discardConfirm').textContent = selected > 0 ? `${selected}個捨てる` : '捨てる';
    $('discardConfirm').disabled = selected <= 0;
  }

  function adjustPicker(id, delta) {
    const available = pickerAvailable(id);
    pickerDraft[id] = delta === 'all' ? available : Math.max(0, Math.min(available, (pickerDraft[id] || 0) + delta));
    if (!pickerDraft[id]) delete pickerDraft[id];
    renderPicker();
  }

  function openBagFullDialog() {
    if (!isBagFull() || cooking || ended) return;
    const over = Math.max(0, stockTotal() - BAG_CAPACITY);
    $('bagFullCategory').textContent = `料理 ${currentRecipe().category}`;
    $('bagOverflowStatus').textContent = over > 0
      ? `${over}個オーバー・再開には${requiredDiscardCount()}個捨てる`
      : '上限到達・再開には1個捨てる';
    $('bagCookButton').disabled = !recipeComplete();
    openDialog(bagFullDialog);
  }

  function openDiscardDialog() {
    closeDialog(bagFullDialog);
    pickerDraft = {};
    renderPicker();
    openDialog(discardDialog);
  }

  function confirmDiscard() {
    if (totalOf(pickerDraft) <= 0) return;
    Object.entries(pickerDraft).forEach(([id, count]) => {
      const discarded = Math.min(count, pot[id] || 0);
      pot[id] -= discarded;
      if (pot[id] <= 0) delete pot[id];
    });
    pickerDraft = {};
    closeDialog(discardDialog);
    renderAll();
    saveGame();
    if (isBagFull()) openBagFullDialog();
    else showMessage('食材を捨てました');
  }

  function openDialog(dialog) { if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal(); }
  function closeDialog(dialog) { if (dialog?.open) dialog.close(); }

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
      mode: activeMode,
      savedAt: Date.now(),
      moves, score, dishes, weekEnergy, maxChain, maxCookingEnergy, bestBeforeRun, extraTastyBonus,
      currentCategory,
      recipeName: activeRecipe.name,
      activePalette: [...activePalette],
      inventoryModel: 'bag-with-manual-additions',
      pot: { ...pot },
      cookingAdditions: { ...cookingAdditions },
      totalAdditionalIngredients: { ...totalAdditionalIngredients },
      totalUsedIngredients: { ...totalUsedIngredients },
      shuffleCount, foodGetActivations,
      cellIds: cells.map(tile => tile?.kind === 'koiki' ? KOIKI.id : tile?.id)
    };
  }

  function saveGame() {
    if (!started || ended || busy || cooking || clearing.size > 0 || dropping.size > 0 || !activeMode) return false;
    try { localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameStateSnapshot())); return true; } catch (_) { return false; }
  }

  function clearSavedGame() { try { localStorage.removeItem(GAME_STATE_KEY); } catch (_) {} }

  function parseSavedGame(raw, expectedMode) {
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== GAME_STATE_VERSION || saved.mode !== expectedMode || !MODES[saved.mode]) return null;
      if (!validSavedNumber(saved.moves, 0, MAX_MOVES) || !validSavedNumber(saved.score) || !validSavedNumber(saved.dishes)) return null;
      if (!validSavedNumber(saved.weekEnergy) || !validSavedNumber(saved.maxChain) || !validSavedNumber(saved.maxCookingEnergy)) return null;
      if (!validSavedNumber(saved.bestBeforeRun || 0)) return null;
      if (!validSavedNumber(saved.extraTastyBonus, 0, MAX_COOKING_CHANCE_BONUS, false)) return null;
      if (!validSavedNumber(saved.shuffleCount) || !validSavedNumber(saved.foodGetActivations)) return null;
      const baseRecipe = RECIPES.find(recipe => recipe.name === saved.recipeName);
      if (!baseRecipe) return null;

      const restoredRecipe = recipeAtDifficulty(baseRecipe, saved.dishes, saved.mode);
      const requiredIds = Object.keys(restoredRecipe.needs);
      const palette = Array.isArray(saved.activePalette) ? saved.activePalette : [];
      if (palette.length !== BOARD_FOOD_TYPES || new Set(palette).size !== palette.length || palette.some(id => !FOODS[id]) || requiredIds.some(id => !palette.includes(id))) return null;

      const restoredProgress = normalizeIngredientCounts(saved.recipeProgress || {}, requiredIds);
      const savedPot = normalizeIngredientCounts(saved.pot);
      const restoredCooking = normalizeIngredientCounts(saved.cookingAdditions || {});
      const restoredOverflow = normalizeIngredientCounts(saved.overflowIngredients || {});
      const restoredTotals = normalizeIngredientCounts(saved.totalAdditionalIngredients);
      const restoredUsed = normalizeIngredientCounts(saved.totalUsedIngredients || {});
      if (!restoredProgress || !savedPot || !restoredCooking || !restoredOverflow || !restoredTotals || !restoredUsed) return null;
      if (Object.entries(restoredProgress).some(([id, count]) => count > restoredRecipe.needs[id])) return null;
      const hasManualAdditions = saved.inventoryModel === 'bag-with-manual-additions';
      const hasLegacyOverflow = saved.inventoryModel === 'bag-with-additions';
      if (hasLegacyOverflow && Object.entries(restoredOverflow).some(([id, count]) => count > (restoredCooking[id] || 0))) return null;
      const restoredPot = saved.inventoryModel === 'bag' || hasManualAdditions
        ? savedPot
        : hasLegacyOverflow
          ? mergeIngredients(savedPot, restoredOverflow)
          : mergeIngredients(savedPot, restoredProgress, restoredCooking, restoredOverflow);
      const cookingAdditions = hasManualAdditions
        ? restoredCooking
        : hasLegacyOverflow
          ? Object.fromEntries(Object.entries(restoredCooking)
            .map(([id, count]) => [id, Math.max(0, count - (restoredOverflow[id] || 0))])
            .filter(([, count]) => count > 0))
          : {};

      const cellIds = Array.isArray(saved.cellIds) ? saved.cellIds : [];
      if (cellIds.length !== ROWS * COLS || cellIds.filter(id => id === KOIKI.id).length !== 1 || cellIds.some(id => id !== KOIKI.id && !palette.includes(id))) return null;
      if (saved.mode !== 'endless' && !CATEGORIES.includes(saved.currentCategory)) return null;

      return {
        mode: saved.mode,
        moves: saved.moves,
        score: saved.score,
        dishes: saved.dishes,
        weekEnergy: saved.weekEnergy,
        maxChain: saved.maxChain,
        maxCookingEnergy: saved.maxCookingEnergy,
        bestBeforeRun: saved.bestBeforeRun || 0,
        extraTastyBonus: saved.extraTastyBonus,
        currentCategory: saved.currentCategory || null,
        activeRecipe: restoredRecipe,
        activePalette: [...palette],
        pot: restoredPot,
        cookingAdditions,
        totalAdditionalIngredients: restoredTotals,
        totalUsedIngredients: restoredUsed,
        shuffleCount: saved.shuffleCount,
        foodGetActivations: saved.foodGetActivations,
        cells: cellIds.map(id => id === KOIKI.id ? KOIKI : makeFood(id))
      };
    } catch (_) { return null; }
  }

  function parseAnySavedGame(raw) {
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      return saved && MODES[saved.mode] ? parseSavedGame(raw, saved.mode) : null;
    } catch (_) { return null; }
  }

  function readSavedGame() {
    try { return parseAnySavedGame(localStorage.getItem(GAME_STATE_KEY)); } catch (_) { return null; }
  }

  function applyRestoredGame(restored) {
    activeMode = restored.mode;
    moves = restored.moves;
    score = restored.score;
    dishes = restored.dishes;
    weekEnergy = restored.weekEnergy;
    maxChain = restored.maxChain;
    maxCookingEnergy = restored.maxCookingEnergy;
    bestBeforeRun = restored.bestBeforeRun;
    extraTastyBonus = restored.extraTastyBonus;
    currentCategory = restored.currentCategory;
    activeRecipe = restored.activeRecipe;
    activePalette = restored.activePalette;
    pot = restored.pot;
    cookingAdditions = restored.cookingAdditions;
    totalAdditionalIngredients = restored.totalAdditionalIngredients;
    totalUsedIngredients = restored.totalUsedIngredients;
    shuffleCount = restored.shuffleCount;
    foodGetActivations = restored.foodGetActivations;
    cells = restored.cells;
    autoInvestBagOverflow();
    busy = false;
    cooking = false;
    started = true;
    ended = false;
    clearing = new Set();
    dropping = new Map();
  }

  function restoreGame(mode) {
    const restored = readSavedGame();
    if (!restored || restored.mode !== mode) return false;
    applyRestoredGame(restored);
    return true;
  }

  function migrateModeSavesToSingleSave() {
    try {
      if (localStorage.getItem(MODE_SAVE_MIGRATION_KEY)) return;
      if (!localStorage.getItem(GAME_STATE_KEY)) {
        const candidates = Object.keys(MODES).map(mode => {
          const raw = localStorage.getItem(modeGameKey(mode));
          const restored = parseAnySavedGame(raw);
          if (!restored) return null;
          const savedAt = Number(JSON.parse(raw).savedAt) || 0;
          return { raw, savedAt };
        }).filter(Boolean).sort((left, right) => right.savedAt - left.savedAt);
        if (candidates[0]) localStorage.setItem(GAME_STATE_KEY, candidates[0].raw);
      }
      localStorage.setItem(MODE_SAVE_MIGRATION_KEY, '1');
    } catch (_) {}
  }

  function emptyRecords() {
    return { totalEnergy: 0, cookingEnergy: 0, chain: 0, dishes: 0, additionalTotal: 0, additionalIngredients: {}, highestWeek: 0, highestMeal: 0, weeklyEnergy: 0 };
  }

  function readRecords(mode = activeMode || 'endless') {
    const fallback = emptyRecords();
    try {
      const saved = JSON.parse(localStorage.getItem(recordsKey(mode)) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      const ingredients = Object.fromEntries(ALL_FOOD_IDS.filter(id => Number(saved.additionalIngredients?.[id]) > 0).map(id => [id, Math.floor(Number(saved.additionalIngredients[id]))]));
      return {
        totalEnergy: Math.max(0, Number(saved.totalEnergy) || 0),
        cookingEnergy: Math.max(0, Number(saved.cookingEnergy) || 0),
        chain: Math.max(0, Number(saved.chain) || 0),
        dishes: Math.max(0, Number(saved.dishes) || 0),
        additionalTotal: Math.max(0, Number(saved.additionalTotal) || 0),
        additionalIngredients: ingredients,
        highestWeek: Math.max(0, Number(saved.highestWeek) || 0),
        highestMeal: Math.max(0, Number(saved.highestMeal) || 0),
        weeklyEnergy: Math.max(0, Number(saved.weeklyEnergy) || 0)
      };
    } catch (_) { return fallback; }
  }

  function writeRecords(records, mode = activeMode) { try { localStorage.setItem(recordsKey(mode), JSON.stringify(records)); } catch (_) {} }

  function updateRecords() {
    const old = readRecords();
    const additionalTotal = totalOf(totalAdditionalIngredients);
    const records = {
      totalEnergy: Math.max(old.totalEnergy, score),
      cookingEnergy: Math.max(old.cookingEnergy, maxCookingEnergy),
      chain: Math.max(old.chain, maxChain),
      dishes: Math.max(old.dishes, dishes),
      additionalTotal: Math.max(old.additionalTotal, additionalTotal),
      additionalIngredients: additionalTotal > old.additionalTotal ? { ...totalAdditionalIngredients } : old.additionalIngredients,
      highestWeek: Math.max(old.highestWeek, activeMode === 'endless' ? 0 : 1),
      highestMeal: Math.max(old.highestMeal, dishes),
      weeklyEnergy: Math.max(old.weeklyEnergy, weekEnergy)
    };
    writeRecords(records);
    return { old, records };
  }

  function renderRecordsDialog() {
    const records = readRecords();
    $('recordsTitle').textContent = `${modeConfig().name}の自己ベスト`;
    $('recordTotalEnergy').textContent = `${records.totalEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recordCookingEnergy').textContent = `${records.cookingEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recordMaxChain').textContent = `${records.chain}連鎖`;
    $('recordMaxRecipeLevel').textContent = `Lv${recipeLevelForEnergy(records.totalEnergy)}`;
    $('recordAdditionalTotal').textContent = `${records.additionalTotal}個`;
    $('recordAdditionalIngredients').innerHTML = ALL_FOOD_IDS.filter(id => (records.additionalIngredients[id] || 0) > 0).map(id => miniFoodHtml(id, records.additionalIngredients[id])).join('');
  }

  function renderRecipeLevelDialog() {
    const progress = recipeLevelProgress(score);
    $('recipeLevelDialogTitle').textContent = `レシピLv ${progress.level}`;
    $('recipeLevelCumulative').textContent = `${progress.cumulativeEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recipeLevelRemaining').textContent = progress.remainingEnergy === null
      ? 'MAX'
      : `${progress.remainingEnergy.toLocaleString('ja-JP')} エナジー`;
    $('recipeLevelRows').innerHTML = Array.from({ length: RECIPE_LEVEL_MAX }, (_, index) => {
      const level = index + 1;
      const reached = level <= progress.level;
      const current = level === progress.level;
      const next = level === progress.level + 1;
      const bonus = Number(recipeLevelBonusList[level] || 0);
      const requirement = recipeLevelRequirement(level);
      const classes = [reached ? 'reached' : '', current ? 'current' : '', next ? 'next' : ''].filter(Boolean).join(' ');
      return `<tr id="recipe-level-row-${level}" class="${classes}"><th scope="row"><span class="recipe-level-check" aria-hidden="true">${reached ? '✓' : ''}</span>Lv${level}</th><td>+${bonus}%</td><td>${requirement === null ? '<strong>MAX</strong>' : requirement.toLocaleString('ja-JP')}</td><td>${recipeLevelCumulativeEnergy(level).toLocaleString('ja-JP')}</td></tr>`;
    }).join('');
    window.requestAnimationFrame(() => {
      const row = $(`recipe-level-row-${progress.level}`);
      const scroller = $('recipeLevelTableWrap');
      if (row && scroller) scroller.scrollTop = Math.max(0, row.offsetTop - (scroller.clientHeight - row.offsetHeight) / 2);
    });
  }

  function renderResultIngredients() {
    const usedTotal = totalOf(totalUsedIngredients);
    resultUsedIngredientTotalEl.textContent = `${usedTotal}個`;
    resultUsedIngredientsEl.innerHTML = ALL_FOOD_IDS.filter(id => (totalUsedIngredients[id] || 0) > 0).map(id => miniFoodHtml(id, totalUsedIngredients[id])).join('');
    const total = totalOf(totalAdditionalIngredients);
    resultIngredientTotalEl.textContent = `${total}個`;
    resultIngredientsEl.innerHTML = ALL_FOOD_IDS.filter(id => (totalAdditionalIngredients[id] || 0) > 0).map(id => miniFoodHtml(id, totalAdditionalIngredients[id])).join('');
  }

  function endGame(endReason = '', unlockedMode = '') {
    if (!started || ended) return;
    trackPlayEnd(endReason);
    ended = true;
    busy = false;
    cooking = false;
    closeDialog(bagFullDialog);
    clearSavedGame();
    updateRecords();
    const isBest = score > bestBeforeRun;
    $('resultTitle').textContent = activeMode === 'endless' ? 'お料理おしまい！' : '1週間の結果';
    $('resultBestStatus').textContent = [unlockedMode ? `${unlockedMode}モード解放！` : '', isBest ? '自己ベスト更新！' : '今回の結果'].filter(Boolean).join('・');
    $('resultBestStatus').classList.toggle('updated', isBest);
    $('resultScore').textContent = score.toLocaleString('ja-JP');
    const categoryText = activeMode === 'endless' ? '全カテゴリ' : currentCategory;
    const fbText = activeMode === 'endless' ? `・FB+${fbPercentForMode()}%` : '';
    $('resultMeta').textContent = `${modeConfig().name}・${categoryText}・${dishes}食${fbText}`;
    $('resultCookMax').textContent = `最大料理エナジー ${maxCookingEnergy.toLocaleString('ja-JP')}・最大${maxChain}連鎖`;
    renderResultIngredients();
    const shareText = `お料理できるかな！！ ${modeConfig().name}で${score.toLocaleString('ja-JP')}エナジー！\n${categoryText}・${dishes}食${fbText}・最大${maxChain}連鎖\n#お料理できるかな`;
    xShareButton.href = `https://x.com/intent/post?text=${encodeURIComponent(`${shareText}\n${SHARE_URL}`)}`;
    resultEl.hidden = false;
    renderAll();
  }

  function resetState(mode) {
    activeMode = mode;
    moves = START_MOVES;
    score = 0;
    dishes = 0;
    weekEnergy = 0;
    maxChain = 0;
    maxCookingEnergy = 0;
    bestBeforeRun = readRecords(mode).totalEnergy;
    extraTastyBonus = 0;
    debugForceCookingSuccess = false;
    currentCategory = mode === 'endless' ? null : chooseCategory();
    pot = {};
    cookingAdditions = {};
    totalAdditionalIngredients = {};
    totalUsedIngredients = {};
    shuffleCount = 0;
    foodGetActivations = 0;
    busy = false;
    cooking = false;
    started = true;
    ended = false;
    clearing = new Set();
    dropping = new Map();
    prepareNextRecipe();
  }

  function startGame(mode = activeMode || 'normal', forceNew = true) {
    if (!modeReleased(mode)) {
      renderModeDialog();
      openDialog(modeDialog);
      showMessage('このモードはまだ開始できません。');
      return;
    }
    stopIdleMotion();
    closeDialog(modeDialog);
    resultEl.hidden = true;
    pendingMode = null;
    $('resultRestart').textContent = 'もういちど';
    if (!forceNew && restoreGame(mode)) {
      trackResume();
      renderAll();
      showMessage('つづきから再開しました！', 'cook');
      if (activeMode !== 'endless' && dishes >= MEALS_PER_WEEK) endGame();
      else if (moves <= 0 && !recipeComplete()) endGame();
      else {
        if (isBagFull()) openBagFullDialog();
        showModeGuide(mode);
      }
      return;
    }
    if (forceNew && started && !ended) trackPlayEnd('manual_end');
    clearSavedGame();
    resetState(mode);
    trackPlayStart();
    renderAll();
    saveGame();
    showMessage('お料理スタート！');
    showModeGuide(mode);
  }

  function hasSavedMode(mode) {
    const saved = readSavedGame();
    return Boolean(saved && saved.mode === mode);
  }

  function modeGuideHidden(mode) {
    try { return localStorage.getItem(`${MODE_GUIDE_HIDDEN_KEY_PREFIX}${mode}`) === '1'; } catch (_) { return false; }
  }

  function showModeGuide(mode = activeMode) {
    if (!MODES[mode] || modeGuideHidden(mode)) return;
    $('modeGuideTitle').textContent = `${modeConfig(mode).name}のルール`;
    document.querySelectorAll('[data-mode-guide]').forEach(section => { section.hidden = section.dataset.modeGuide !== mode; });
    $('modeGuideNever').checked = false;
    openDialog(modeGuideDialog);
  }

  function closeModeGuide() {
    if ($('modeGuideNever').checked) {
      try { localStorage.setItem(`${MODE_GUIDE_HIDDEN_KEY_PREFIX}${activeMode}`, '1'); } catch (_) {}
    }
    closeDialog(modeGuideDialog);
  }

  function renderModeDialog() {
    const saved = readSavedGame();
    const currentMode = started && !ended ? activeMode : saved?.mode;
    const exAvailable = modeReleased('ex') && (exUnlocked() || currentMode === 'ex');
    const endlessAvailable = modeReleased('endless') && (endlessUnlocked() || currentMode === 'endless');
    const endlessBest = fbPercentForMode(readRecords('endless').dishes, 'endless');
    $('modeSaveHint').textContent = currentMode ? `保存中：${modeConfig(currentMode).name}` : '途中セーブは1つ';
    const endlessBestEl = document.querySelector('[data-mode-best="endless"]');
    if (endlessBestEl) endlessBestEl.textContent = `自己ベスト FB+${endlessBest}%`;
    Object.keys(MODES).forEach(mode => {
      const status = document.querySelector(`[data-mode-status="${mode}"]`);
      const card = document.querySelector(`[data-mode="${mode}"]`);
      if (!status) return;
      const available = mode === 'normal' || (mode === 'ex' && exAvailable) || (mode === 'endless' && endlessAvailable);
      if (card) card.disabled = !available;
      card?.classList.toggle('current', currentMode === mode);
      if (mode === 'ex' && !exAvailable) status.textContent = 'ノーマル完走で解放';
      else if (mode === 'endless' && !endlessAvailable) status.textContent = 'EX完走で解放';
      else if (currentMode === mode) status.textContent = started && !ended ? '● プレイ中' : '▶ つづきから';
      else status.textContent = currentMode ? '終了して開始' : 'はじめる';
    });
    $('activeModeActions').hidden = !started || ended;
    $('restartCurrentMode').textContent = `${modeConfig().name}を最初から`;
  }

  function selectMode(mode) {
    const saved = readSavedGame();
    const currentMode = started && !ended ? activeMode : saved?.mode;
    if (!modeReleased(mode)) {
      showMessage('このモードはまだ開始できません。');
      return;
    }
    if (mode === 'ex' && !exUnlocked() && currentMode !== 'ex') {
      showMessage('EXはノーマル21食完走で解放！');
      return;
    }
    if (mode === 'endless' && !endlessUnlocked() && currentMode !== 'endless') {
      showMessage('とことんはEX21食完走で解放！');
      return;
    }
    if (currentMode && mode !== currentMode) {
      pendingMode = mode;
      $('modeSwitchTitle').textContent = `${modeConfig(currentMode).name}を終了しますか？`;
      $('modeSwitchMessage').textContent = `${modeConfig(mode).name}を始めると、現在のプレイは終了してリザルトになります。`;
      closeDialog(modeDialog);
      openDialog(modeSwitchDialog);
      return;
    }
    if (started && !ended && mode === activeMode) {
      closeDialog(modeDialog);
      return;
    }
    startGame(mode, !hasSavedMode(mode));
  }

  function cancelModeSwitch() {
    pendingMode = null;
    closeDialog(modeSwitchDialog);
  }

  function confirmModeSwitch() {
    const nextMode = pendingMode;
    if (!nextMode) return;
    const saved = readSavedGame();
    const currentMode = started && !ended ? activeMode : saved?.mode;
    closeDialog(modeSwitchDialog);
    if (!currentMode || currentMode === nextMode) {
      startGame(nextMode, true);
      return;
    }
    if (!(started && !ended) && !restoreGame(currentMode)) {
      clearSavedGame();
      startGame(nextMode, true);
      return;
    }
    endGame('mode_change');
    $('resultRestart').textContent = `${modeConfig(nextMode).name}をはじめる`;
  }

  function openModeDialog() {
    if (busy || cooking) return;
    renderModeDialog();
    openDialog(modeDialog);
  }

  function stopIdleMotion() {
    window.clearTimeout(idleMotionTimer);
    window.clearTimeout(idleCleanupTimer);
    idleMotionTimer = 0;
    idleCleanupTimer = 0;
    idleSwapping = new Map();
  }

  function performIdleSwap() {
    if (started || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const koikiIndex = cells.findIndex(tile => tile?.kind === 'koiki');
    const candidates = cells.map((tile, index) => tile?.kind === 'food' ? index : -1).filter(index => index >= 0);
    const targetIndex = randomFrom(candidates);
    const offset = (source, destination) => ({ x: ((source % COLS) - (destination % COLS)) * 108, y: (Math.floor(source / COLS) - Math.floor(destination / COLS)) * 108 });
    [cells[koikiIndex], cells[targetIndex]] = [cells[targetIndex], cells[koikiIndex]];
    idleSwapping = new Map([[targetIndex, offset(koikiIndex, targetIndex)], [koikiIndex, offset(targetIndex, koikiIndex)]]);
    renderBoard();
    idleCleanupTimer = window.setTimeout(() => { idleSwapping = new Map(); if (!started) renderBoard(); }, 1050);
    idleMotionTimer = window.setTimeout(performIdleSwap, IDLE_SWAP_INTERVAL);
  }

  function startIdleMotion() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) idleMotionTimer = window.setTimeout(performIdleSwap, 650);
  }

  function setupLocalDebug() {
    const debugPanel = window.KoikiDebugPanel;
    if (!debugPanel?.enabled()) return;

    const requireGame = () => {
      if (!started || ended || busy || cooking) throw new Error('先にモードを開始し、演出が終わってから操作してください。');
    };
    const persist = message => {
      renderAll();
      saveGame();
      showMessage(`DEBUG: ${message}`, 'cook');
    };
    const jumpToMeal = completedDishes => {
      requireGame();
      if (activeMode === 'endless') throw new Error('週間モード専用の操作です。');
      dishes = completedDishes;
      moves = MAX_MOVES;
      cookingAdditions = {};
      closeDialog(bagFullDialog);
      prepareNextRecipe();
      persist(`${completedDishes + 1}食目へ移動`);
    };
    const advanceEndlessDishes = count => {
      requireGame();
      if (activeMode !== 'endless') throw new Error('とことん専用の操作です。');
      const previousName = currentRecipe().name;
      dishes += count;
      moves = MAX_MOVES;
      cookingAdditions = {};
      prepareNextRecipe(previousName);
      persist(`完成食数＋${count}`);
    };

    debugPanel.mount({
      title: 'V2 DEBUG',
      getSummary: () => !started
        ? '開始前：先にモードを選択'
        : ended
          ? 'ゲーム終了済み'
          : `${modeConfig().name} / ${dishes + 1}食目 / ${moves}手 / バッグ${stockTotal()} / 料理チャンス+${Math.round(extraTastyBonus * 100)}%${debugForceCookingSuccess ? ' / 次回成功100%' : ''}`,
      actions: [
        { label: '手数＋5', run: () => { requireGame(); moves = Math.min(MAX_MOVES, moves + 5); persist('手数＋5'); } },
        { label: '手数を1に', run: () => { requireGame(); moves = 1; persist('残り1手'); } },
        { label: '必要食材をそろえる', run: () => {
          requireGame();
          Object.entries(currentRecipe().needs).forEach(([id, need]) => {
            const shortage = Math.max(0, need - (pot[id] || 0));
            if (shortage) addIngredient(id, shortage);
          });
          persist('必要食材を補充');
        } },
        { label: '全食材＋20', run: () => { requireGame(); ALL_FOOD_IDS.forEach(id => addIngredient(id, 20)); persist('全食材＋20'); } },
        { label: 'バッグを空に', run: () => {
          requireGame();
          pot = {};
          cookingAdditions = {};
          closeDialog(bagFullDialog);
          persist('バッグを空に');
        } },
        { label: '食材ゲット発動', run: () => {
          requireGame();
          const result = activateFoodGet();
          addMoves(skillMoveAmount('foodGet'));
          renderAll();
          saveGame();
          showFoodGetMessage(result);
        } },
        { label: '料理チャンス発動', run: () => {
          requireGame();
          activateCookingChance();
          addMoves(skillMoveAmount('cookingChance'));
          renderAll();
          saveGame();
          showCookingChanceMessage();
        } },
        { label: '次回成功100%', run: () => { requireGame(); debugForceCookingSuccess = true; persist('次回成功100%'); } },
        { label: '完成食数＋10', run: () => advanceEndlessDishes(10) },
        { label: '日曜朝へ', run: () => jumpToMeal(18) },
        { label: '21食目へ', run: () => jumpToMeal(20) },
        { label: 'ゲーム終了', tone: 'danger', run: () => { requireGame(); endGame('manual_end'); } }
      ]
    });
  }

  boardEl.addEventListener('click', event => {
    const tile = event.target.closest('[data-index]');
    if (tile) playMove(Number(tile.dataset.index));
  });

  cookButton.addEventListener('click', cookRecipe);
  $('bagCookButton').addEventListener('click', cookRecipe);
  shuffleButton.addEventListener('click', performShuffle);
  startButton.addEventListener('click', openModeDialog);
  $('modeCancel').addEventListener('click', () => closeDialog(modeDialog));
  $('modeSwitchCancel').addEventListener('click', cancelModeSwitch);
  $('modeSwitchConfirm').addEventListener('click', confirmModeSwitch);
  modeSwitchDialog.addEventListener('cancel', event => {
    event.preventDefault();
    cancelModeSwitch();
  });
  $('modeGuideClose').addEventListener('click', closeModeGuide);
  modeGuideDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeModeGuide();
  });
  $('restartCurrentMode').addEventListener('click', () => {
    if (window.confirm(`${modeConfig().name}の途中データを消して、最初から始めますか？`)) startGame(activeMode, true);
  });

  $('modeList').addEventListener('click', event => {
    const card = event.target.closest('[data-mode]');
    if (!card) return;
    selectMode(card.dataset.mode);
  });

  $('addFoodList').addEventListener('click', event => {
    const step = event.target.closest('[data-add-step]');
    const row = event.target.closest('[data-add-food]');
    if (step && row) adjustAdditionPicker(row.dataset.addFood, step.dataset.addStep === 'all' ? 'all' : Number(step.dataset.addStep));
  });
  openAddFoodButton.addEventListener('click', openAdditionDialog);
  $('returnAllAdditions').addEventListener('click', returnAllAdditions);
  $('addAllFoods').addEventListener('click', addAllFoods);
  $('addFoodCancel').addEventListener('click', () => { additionDraft = {}; closeDialog(addFoodDialog); });
  $('addFoodConfirm').addEventListener('click', applyCookingAdditions);

  $('discardList').addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    const row = event.target.closest('[data-picker-food]');
    if (step && row) adjustPicker(row.dataset.pickerFood, step.dataset.step === 'all' ? 'all' : Number(step.dataset.step));
  });
  $('openDiscard').addEventListener('click', openDiscardDialog);
  $('discardCancel').addEventListener('click', () => { closeDialog(discardDialog); openBagFullDialog(); });
  $('discardConfirm').addEventListener('click', confirmDiscard);
  $('rulesButton').addEventListener('click', () => openDialog(rulesDialog));
  $('rulesClose').addEventListener('click', () => closeDialog(rulesDialog));
  $('bestRecordButton').addEventListener('click', () => { renderRecordsDialog(); openDialog(recordsDialog); });
  $('recordsClose').addEventListener('click', () => closeDialog(recordsDialog));
  $('recipeLevelButton').addEventListener('click', () => { renderRecipeLevelDialog(); openDialog(recipeLevelDialog); });
  $('recipeLevelClose').addEventListener('click', () => closeDialog(recipeLevelDialog));
  $('resultRestart').addEventListener('click', () => startGame(pendingMode || activeMode, true));
  xShareButton.addEventListener('click', () => sendAnalytics('share', 'v2'));

  bagFullDialog.addEventListener('cancel', event => event.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });
  window.addEventListener('pagehide', saveGame);

  migrateModeSavesToSingleSave();
  activeMode = 'normal';
  const previewRecipe = RECIPES.find(recipe => Object.keys(recipe.originalNeeds).length === 1) || RECIPES[0];
  currentCategory = previewRecipe.category;
  activeRecipe = recipeAtDifficulty(previewRecipe, 0, 'normal');
  activePalette = choosePalette(activeRecipe);
  cells = buildBoard();
  renderAll();
  started = false;
  renderAll();
  startIdleMotion();
  setupLocalDebug();
  window.setTimeout(openModeDialog, 0);
})();
