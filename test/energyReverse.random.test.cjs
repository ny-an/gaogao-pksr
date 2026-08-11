const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
  findFoodCombinations,
  solveExactEnergy,
  solveExactEnergyCandidates,
} = require('../js/energy_reverse.js');

function loadGameData() {
  const projectRoot = path.join(__dirname, '..');
  const source = [
    fs.readFileSync(path.join(projectRoot, 'js/data/dishes.js'), 'utf8'),
    fs.readFileSync(path.join(projectRoot, 'js/data/foods.js'), 'utf8'),
    'this.fixture = { dishesEnergyList, recipeLevelBonusList, org_dishes, foodEnergyMap };',
  ].join('\n');
  const context = {};
  vm.runInNewContext(source, context);
  return context.fixture;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInteger(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function pick(random, values) {
  return values[randomInteger(random, 0, values.length - 1)];
}

function calculateLikeScreen(baseEnergy, fbBonus, eventBonus, successMultiplier) {
  return Math.floor(
    baseEnergy *
    (1 + (fbBonus / 100)) *
    Number(eventBonus) *
    successMultiplier
  );
}

function calculateRandomPotCapacity(random) {
  const baseCapacity = 15 + (randomInteger(random, 0, 22) * 3);
  const potEventBonus = pick(random, [1, 1.25, 1.5, 2]);
  const weekendBonus = pick(random, [1, 2]);
  const cookingPowerUp = randomInteger(random, 0, 200);
  const goodCampTicket = pick(random, [1, 1.5]);

  const eventCapacity = Math.round(baseCapacity * potEventBonus);
  const weekendCapacity = Math.round(eventCapacity * weekendBonus);
  return Math.round((weekendCapacity + cookingPowerUp) * goodCampTicket);
}

function getRecipeEntries(gameData) {
  const entries = [{ name: '', energy: 0, foods: {}, foodCount: 0 }];

  for (const category of Object.values(gameData.org_dishes)) {
    for (const [name, foods] of Object.entries(category)) {
      if (!Object.prototype.hasOwnProperty.call(gameData.dishesEnergyList, name)) continue;

      entries.push({
        name,
        energy: gameData.dishesEnergyList[name],
        foods,
        foodCount: Object.values(foods).reduce((sum, amount) => sum + amount, 0),
      });
    }
  }

  return entries;
}

function getReturnedFoodTotals(foods, foodEnergyMap) {
  return Object.entries(foods).reduce(
    (totals, [name, quantity]) => ({
      count: totals.count + quantity,
      energy: totals.energy + (foodEnergyMap[name] * quantity),
    }),
    { count: 0, energy: 0 }
  );
}

function getFoodCombinationKey(foods) {
  return Object.entries(foods)
    .sort((left, right) => left[0].localeCompare(right[0], 'ja'))
    .map(([foodName, quantity]) => `${foodName}:${quantity}`)
    .join('|');
}

function getReachableExtraEnergies(maxCount, foodEnergyMap) {
  const allReachable = new Set([0]);
  let previousCounts = new Set([0]);
  const foodEnergies = Object.values(foodEnergyMap);

  for (let count = 1; count <= maxCount; count += 1) {
    const currentCounts = new Set();
    for (const previousEnergy of previousCounts) {
      for (const foodEnergy of foodEnergies) {
        currentCounts.add(previousEnergy + foodEnergy);
      }
    }
    for (const energy of currentCounts) allReachable.add(energy);
    previousCounts = currentCounts;
  }

  return allReachable;
}

const gameData = loadGameData();
const recipes = getRecipeEntries(gameData);
const foodNames = Object.keys(gameData.foodEnergyMap);
const eventBonuses = ['1', '1.1', '1.25', '1.5'];
const successMultipliers = [1, 2, 3];
const allRecipeLevels = Object.keys(gameData.recipeLevelBonusList)
  .map(Number)
  .filter(level => level >= 1)
  .sort((left, right) => left - right);

test('小規模ランダム200ケースで追加食材パターンを独立全探索結果と照合する', () => {
  const random = createRandom(0xa54ff53a);

  for (let caseIndex = 0; caseIndex < 200; caseIndex += 1) {
    const foodEnergyMap = Object.fromEntries(
      Array.from({ length: 4 }, (_, index) => [
        `食材${index + 1}`,
        randomInteger(random, 1, 12),
      ])
    );
    const maxFoodCount = randomInteger(random, 0, 7);
    const targetEnergy = randomInteger(
      random,
      0,
      Math.max(1, maxFoodCount * Math.max(...Object.values(foodEnergyMap)))
    );
    const bruteForceKeys = new Set();
    const entries = Object.entries(foodEnergyMap);

    function enumerate(index, remainingCount, energy, quantities) {
      if (index === entries.length) {
        if (energy === targetEnergy) {
          bruteForceKeys.add(getFoodCombinationKey(quantities));
        }
        return;
      }

      const [foodName, foodEnergy] = entries[index];
      for (let quantity = 0; quantity <= remainingCount; quantity += 1) {
        const nextQuantities = quantity > 0
          ? { ...quantities, [foodName]: quantity }
          : quantities;
        enumerate(
          index + 1,
          remainingCount - quantity,
          energy + (foodEnergy * quantity),
          nextQuantities
        );
      }
    }

    enumerate(0, maxFoodCount, 0, {});
    const results = findFoodCombinations(
      targetEnergy,
      maxFoodCount,
      foodEnergyMap,
      10
    );
    const message = `case=${caseIndex} ${JSON.stringify({ targetEnergy, maxFoodCount, foodEnergyMap })}`;

    assert.equal(results.length, Math.min(10, bruteForceKeys.size), message);
    assert.equal(new Set(results.map(result => getFoodCombinationKey(result.foods))).size, results.length, message);
    for (const result of results) {
      assert.ok(bruteForceKeys.has(getFoodCombinationKey(result.foods)), message);
    }
    for (let index = 1; index < results.length; index += 1) {
      assert.ok(results[index - 1].count <= results[index].count, message);
    }
  }
});

test('実データのランダム600ケースで生成済み目標を必ず逆算できる', () => {
  const random = createRandom(0x6a09e667);
  const coverage = { noDish: 0, double: 0, triple: 0 };

  for (let caseIndex = 0; caseIndex < 600; caseIndex += 1) {
    const potCapacity = calculateRandomPotCapacity(random);
    const eligibleRecipes = recipes.filter(recipe => recipe.foodCount <= potCapacity);
    const recipe = pick(random, eligibleRecipes);
    const recipeLevel = randomInteger(random, 1, 70);
    const recipeBonusPercent = Number(gameData.recipeLevelBonusList[recipeLevel]);
    const fbBonusPercent = randomInteger(random, 0, 85);
    const eventBonus = pick(random, eventBonuses);
    const successMultiplier = pick(random, successMultipliers);
    const remainingCapacity = potCapacity - recipe.foodCount;
    let extraFoodCount = randomInteger(random, 0, Math.min(remainingCapacity, 12));
    const generatedFoods = {};
    let extraEnergy = 0;

    if (!recipe.name && extraFoodCount === 0) extraFoodCount = 1;
    for (let index = 0; index < extraFoodCount; index += 1) {
      const foodName = pick(random, foodNames);
      generatedFoods[foodName] = (generatedFoods[foodName] || 0) + 1;
      extraEnergy += gameData.foodEnergyMap[foodName];
    }

    const recipeDisplayEnergy = recipe.energy + Math.round(
      recipe.energy * (recipeBonusPercent / 100)
    );
    const targetEnergy = calculateLikeScreen(
      recipeDisplayEnergy + extraEnergy,
      fbBonusPercent,
      eventBonus,
      successMultiplier
    );
    const options = {
      targetEnergy,
      recipeEnergy: recipe.energy,
      recipeBonusPercent,
      fbBonusPercent,
      eventBonus,
      successMultiplier,
      potCapacity,
      recipeFoodCount: recipe.foodCount,
      foodEnergyMap: gameData.foodEnergyMap,
    };
    const result = solveExactEnergy(options);
    const message = `case=${caseIndex} ${JSON.stringify({ ...options, foodEnergyMap: undefined, recipe: recipe.name, generatedFoods })}`;

    assert.equal(result.found, true, message);
    const returned = getReturnedFoodTotals(result.foods, gameData.foodEnergyMap);
    assert.ok(returned.count <= remainingCapacity, message);
    assert.equal(returned.energy, result.extraEnergy, message);
    assert.equal(
      calculateLikeScreen(
        result.recipeDisplayEnergy + returned.energy,
        fbBonusPercent,
        eventBonus,
        successMultiplier
      ),
      targetEnergy,
      message
    );

    if (!recipe.name) coverage.noDish += 1;
    if (successMultiplier === 2) coverage.double += 1;
    if (successMultiplier === 3) coverage.triple += 1;
  }

  assert.ok(coverage.noDish > 0);
  assert.ok(coverage.double > 150);
  assert.ok(coverage.triple > 150);
});

test('実データのランダム目標1000ケースを独立全探索結果と照合する', () => {
  const random = createRandom(0xbb67ae85);
  let foundCases = 0;
  let noMatchCases = 0;

  for (let caseIndex = 0; caseIndex < 1000; caseIndex += 1) {
    const recipe = pick(random, recipes);
    const extraCapacity = randomInteger(random, 0, 6);
    const potCapacity = recipe.foodCount + extraCapacity;
    const recipeLevel = randomInteger(random, 1, 70);
    const recipeBonusPercent = Number(gameData.recipeLevelBonusList[recipeLevel]);
    const fbBonusPercent = randomInteger(random, 0, 85);
    const eventBonus = pick(random, eventBonuses);
    const successMultiplier = pick(random, successMultipliers);
    const recipeDisplayEnergy = recipe.energy + Math.round(
      recipe.energy * (recipeBonusPercent / 100)
    );
    const reachableTargets = new Set(
      Array.from(getReachableExtraEnergies(extraCapacity, gameData.foodEnergyMap))
        .map(extraEnergy => calculateLikeScreen(
          recipeDisplayEnergy + extraEnergy,
          fbBonusPercent,
          eventBonus,
          successMultiplier
        ))
    );
    const maximumReachable = Math.max(...reachableTargets);
    const positiveReachableTargets = Array.from(reachableTargets).filter(target => target >= 1);
    const targetEnergy = random() < 0.3 && positiveReachableTargets.length > 0
      ? pick(random, positiveReachableTargets)
      : randomInteger(random, 1, Math.max(1, maximumReachable + 500));
    const expectedFound = reachableTargets.has(targetEnergy);
    const options = {
      targetEnergy,
      recipeEnergy: recipe.energy,
      recipeBonusPercent,
      fbBonusPercent,
      eventBonus,
      successMultiplier,
      potCapacity,
      recipeFoodCount: recipe.foodCount,
      foodEnergyMap: gameData.foodEnergyMap,
    };
    const result = solveExactEnergy(options);
    const message = `case=${caseIndex} ${JSON.stringify({ ...options, foodEnergyMap: undefined, recipe: recipe.name })}`;

    assert.equal(result.found, expectedFound, message);
    if (result.found) {
      foundCases += 1;
      const returned = getReturnedFoodTotals(result.foods, gameData.foodEnergyMap);
      assert.ok(returned.count <= extraCapacity, message);
      assert.equal(
        calculateLikeScreen(
          result.recipeDisplayEnergy + returned.energy,
          fbBonusPercent,
          eventBonus,
          successMultiplier
        ),
        targetEnergy,
        message
      );
    } else {
      noMatchCases += 1;
    }
  }

  assert.ok(foundCases > 250);
  assert.ok(noMatchCases > 500);
});

test('実データのランダム120ケースで複数料理・全レベル・全イベント・全できばえの候補に正解を含む', () => {
  const random = createRandom(0x3c6ef372);
  const namedRecipes = recipes.filter(recipe => recipe.name);

  for (let caseIndex = 0; caseIndex < 120; caseIndex += 1) {
    const recipe = pick(random, namedRecipes);
    const extraCapacity = randomInteger(random, 0, 5);
    const potCapacity = recipe.foodCount + extraCapacity;
    const recipeLevel = randomInteger(random, 1, 70);
    const recipeBonusPercent = Number(gameData.recipeLevelBonusList[recipeLevel]);
    const fbBonusPercent = randomInteger(random, 0, 30);
    const eventBonus = pick(random, eventBonuses);
    const successMultiplier = pick(random, successMultipliers);
    const excludedFoodNames = foodNames.filter(() => random() < 0.25);
    if (excludedFoodNames.length === foodNames.length) excludedFoodNames.pop();
    const availableFoodNames = foodNames.filter(foodName => !excludedFoodNames.includes(foodName));
    const extraFoodCount = randomInteger(random, 0, extraCapacity);
    let extraEnergy = 0;

    for (let index = 0; index < extraFoodCount; index += 1) {
      extraEnergy += gameData.foodEnergyMap[pick(random, availableFoodNames)];
    }

    const recipeDisplayEnergy = recipe.energy + Math.round(
      recipe.energy * (recipeBonusPercent / 100)
    );
    const targetEnergy = calculateLikeScreen(
      recipeDisplayEnergy + extraEnergy,
      fbBonusPercent,
      eventBonus,
      successMultiplier
    );
    const candidateRecipes = Array.from(new Map(
      [recipe, ...namedRecipes.slice(0, 7)].map(candidate => [candidate.name, candidate])
    ).values());
    const results = solveExactEnergyCandidates({
      targetEnergy,
      recipeLevels: allRecipeLevels,
      recipeBonusPercentMap: gameData.recipeLevelBonusList,
      fbBonusPercent,
      eventBonuses,
      potCapacity,
      foodEnergyMap: gameData.foodEnergyMap,
      excludedFoodNames,
      successMultipliers,
      recipes: candidateRecipes,
    });
    const message = `case=${caseIndex} ${JSON.stringify({
      recipe: recipe.name,
      successMultiplier,
      targetEnergy,
      potCapacity,
      recipeLevel,
      fbBonusPercent,
      eventBonus,
    })}`;

    assert.ok(
      results.some(result => (
        result.dishName === recipe.name &&
        result.eventBonus === eventBonus &&
        result.successMultiplier === successMultiplier &&
        result.finalEnergy === targetEnergy &&
        Object.keys(result.foods).every(foodName => !excludedFoodNames.includes(foodName)) &&
        result.recipeLevel >= 1 &&
        result.recipeLevel <= 70
      )),
      message
    );
  }
});
