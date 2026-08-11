(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.energyReverse = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function greatestCommonDivisor(a, b) {
    let left = Math.abs(a);
    let right = Math.abs(b);

    while (right !== 0) {
      const remainder = left % right;
      left = right;
      right = remainder;
    }

    return left || 1;
  }

  function decimalToFraction(value) {
    const text = String(value).trim();
    const match = text.match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) return null;

    const decimalPlaces = match[2] ? match[2].length : 0;
    const denominator = 10 ** decimalPlaces;
    const numerator = Number(match[1]) * denominator + Number(match[2] || 0);
    const divisor = greatestCommonDivisor(numerator, denominator);

    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor,
    };
  }

  function getMultiplierFraction(fbBonusPercent, eventBonus, successMultiplier) {
    const eventFraction = decimalToFraction(eventBonus);
    const successFraction = decimalToFraction(successMultiplier ?? 1);
    if (
      !eventFraction || eventFraction.numerator <= 0 ||
      !successFraction || successFraction.numerator <= 0
    ) {
      return null;
    }

    const fbNumerator = 100 + Number(fbBonusPercent);
    if (!Number.isInteger(fbNumerator) || fbNumerator <= 0) return null;

    const numerator = fbNumerator * eventFraction.numerator * successFraction.numerator;
    const denominator = 100 * eventFraction.denominator * successFraction.denominator;
    const divisor = greatestCommonDivisor(numerator, denominator);

    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor,
    };
  }

  function ceilDivide(numerator, denominator) {
    return Math.floor((numerator + denominator - 1) / denominator);
  }

  function getCandidateBaseEnergies(targetEnergy, multiplier) {
    const minimum = ceilDivide(
      targetEnergy * multiplier.denominator,
      multiplier.numerator
    );
    const maximum = ceilDivide(
      (targetEnergy + 1) * multiplier.denominator,
      multiplier.numerator
    ) - 1;

    if (minimum > maximum) return [];

    const candidates = [];
    for (let energy = minimum; energy <= maximum; energy += 1) {
      candidates.push(energy);
    }
    return candidates;
  }

  function normalizeFoodEntries(foodEnergyMap) {
    return Object.entries(foodEnergyMap || {})
      .map(([name, energy]) => ({ name, energy: Number(energy) }))
      .filter(food => food.name && Number.isInteger(food.energy) && food.energy > 0)
      .sort((left, right) => {
        if (right.energy !== left.energy) return right.energy - left.energy;
        return left.name.localeCompare(right.name, 'ja');
      });
  }

  function findFoodCombination(requiredEnergy, maxFoodCount, foodEnergyMap) {
    if (!Number.isInteger(requiredEnergy) || requiredEnergy < 0) return null;
    if (!Number.isInteger(maxFoodCount) || maxFoodCount < 0) return null;
    if (requiredEnergy === 0) return { foods: {}, count: 0 };

    const foods = normalizeFoodEntries(foodEnergyMap);
    if (foods.length === 0 || maxFoodCount === 0) return null;

    const maxFoodEnergy = foods[0].energy;
    if (requiredEnergy > maxFoodCount * maxFoodEnergy) return null;

    const unreachable = maxFoodCount + 1;
    const minimumCounts = new Int32Array(requiredEnergy + 1);
    const previousFoodIndexes = new Int16Array(requiredEnergy + 1);
    minimumCounts.fill(unreachable);
    previousFoodIndexes.fill(-1);
    minimumCounts[0] = 0;

    for (let energy = 1; energy <= requiredEnergy; energy += 1) {
      for (let index = 0; index < foods.length; index += 1) {
        const foodEnergy = foods[index].energy;
        if (foodEnergy > energy) continue;

        const previousCount = minimumCounts[energy - foodEnergy];
        const nextCount = previousCount + 1;
        if (previousCount < maxFoodCount && nextCount < minimumCounts[energy]) {
          minimumCounts[energy] = nextCount;
          previousFoodIndexes[energy] = index;
        }
      }
    }

    if (minimumCounts[requiredEnergy] > maxFoodCount) return null;

    const result = {};
    let remainingEnergy = requiredEnergy;
    while (remainingEnergy > 0) {
      const foodIndex = previousFoodIndexes[remainingEnergy];
      if (foodIndex < 0) return null;

      const food = foods[foodIndex];
      result[food.name] = (result[food.name] || 0) + 1;
      remainingEnergy -= food.energy;
    }

    return {
      foods: result,
      count: minimumCounts[requiredEnergy],
    };
  }

  function calculateDisplayedEnergy(baseEnergy, fbBonusPercent, eventBonus, successMultiplier) {
    return Math.floor(
      Number(baseEnergy) *
      (1 + (Number(fbBonusPercent) / 100)) *
      Number(eventBonus) *
      Number(successMultiplier ?? 1)
    );
  }

  function solveExactEnergy(options) {
    const targetEnergy = Number(options.targetEnergy);
    const recipeEnergy = Number(options.recipeEnergy || 0);
    const recipeBonusPercent = Number(options.recipeBonusPercent || 0);
    const fbBonusPercent = Number(options.fbBonusPercent || 0);
    const successMultiplier = Number(options.successMultiplier ?? 1);
    const potCapacity = Math.floor(Number(options.potCapacity));
    const recipeFoodCount = Math.floor(Number(options.recipeFoodCount || 0));

    if (!Number.isSafeInteger(targetEnergy) || targetEnergy < 0) {
      return { found: false, reason: 'invalid-target' };
    }
    if (!Number.isFinite(recipeEnergy) || recipeEnergy < 0) {
      return { found: false, reason: 'invalid-recipe' };
    }
    if (
      !Number.isInteger(potCapacity) || potCapacity < 0 ||
      !Number.isInteger(recipeFoodCount) || recipeFoodCount < 0
    ) {
      return { found: false, reason: 'invalid-capacity' };
    }

    const remainingCapacity = potCapacity - recipeFoodCount;
    if (remainingCapacity < 0) {
      return { found: false, reason: 'recipe-over-capacity' };
    }

    const multiplier = getMultiplierFraction(
      fbBonusPercent,
      options.eventBonus,
      successMultiplier
    );
    if (!multiplier) {
      return { found: false, reason: 'invalid-multiplier' };
    }

    const recipeLevelBonus = Math.round(recipeEnergy * (recipeBonusPercent / 100));
    const recipeDisplayEnergy = recipeEnergy + recipeLevelBonus;
    // 画面側はJavaScriptの小数演算後に切り捨てるため、整数境界で理論値と
    // 1だけずれる場合がある。隣接する理論目標の候補も含め、表示式で最終確認する。
    const candidates = new Set();
    for (const nearbyTarget of [targetEnergy - 1, targetEnergy, targetEnergy + 1]) {
      if (nearbyTarget < 0) continue;
      for (const candidate of getCandidateBaseEnergies(nearbyTarget, multiplier)) {
        candidates.add(candidate);
      }
    }
    let bestResult = null;

    for (const baseEnergy of candidates) {
      const requiredExtraEnergy = baseEnergy - recipeDisplayEnergy;
      if (requiredExtraEnergy < 0) continue;

      const combination = findFoodCombination(
        requiredExtraEnergy,
        remainingCapacity,
        options.foodEnergyMap
      );
      if (!combination) continue;

      const finalEnergy = calculateDisplayedEnergy(
        baseEnergy,
        fbBonusPercent,
        options.eventBonus,
        successMultiplier
      );
      if (finalEnergy !== targetEnergy) continue;

      const result = {
        found: true,
        targetEnergy,
        finalEnergy,
        recipeDisplayEnergy,
        recipeLevelBonus,
        extraEnergy: requiredExtraEnergy,
        baseEnergy,
        recipeFoodCount,
        extraFoodCount: combination.count,
        remainingCapacity,
        potCapacity,
        successMultiplier,
        foods: combination.foods,
      };

      if (!bestResult || result.extraFoodCount < bestResult.extraFoodCount) {
        bestResult = result;
      }
    }

    return bestResult || {
      found: false,
      reason: 'no-match',
      remainingCapacity,
      potCapacity,
      recipeFoodCount,
      recipeDisplayEnergy,
    };
  }

  function solveExactEnergyCandidates(options) {
    const recipes = Array.isArray(options.recipes) && options.recipes.length > 0
      ? options.recipes
      : [{
          name: options.dishName || '',
          energy: options.recipeEnergy || 0,
          foodCount: options.recipeFoodCount || 0,
        }];
    const requestedMultipliers = Array.isArray(options.successMultipliers)
      ? options.successMultipliers
      : [options.successMultiplier ?? 1];
    const successMultipliers = Array.from(new Set(
      requestedMultipliers
        .map(Number)
        .filter(multiplier => Number.isFinite(multiplier) && multiplier > 0)
    ));
    const results = [];

    for (const recipe of recipes) {
      for (const successMultiplier of successMultipliers) {
        const result = solveExactEnergy({
          ...options,
          recipeEnergy: Number(recipe.energy || 0),
          recipeFoodCount: Number(recipe.foodCount || 0),
          successMultiplier,
        });

        if (!result.found) continue;

        results.push({
          ...result,
          dishName: String(recipe.name || ''),
          dishCategory: String(recipe.category || ''),
        });
      }
    }

    return results.sort((left, right) => {
      if (left.extraFoodCount !== right.extraFoodCount) {
        return left.extraFoodCount - right.extraFoodCount;
      }

      const leftFoodCount = left.recipeFoodCount + left.extraFoodCount;
      const rightFoodCount = right.recipeFoodCount + right.extraFoodCount;
      if (leftFoodCount !== rightFoodCount) return leftFoodCount - rightFoodCount;

      const dishOrder = left.dishName.localeCompare(right.dishName, 'ja');
      if (dishOrder !== 0) return dishOrder;
      return left.successMultiplier - right.successMultiplier;
    });
  }

  return {
    calculateDisplayedEnergy,
    decimalToFraction,
    findFoodCombination,
    getCandidateBaseEnergies,
    getMultiplierFraction,
    solveExactEnergy,
    solveExactEnergyCandidates,
  };
});
