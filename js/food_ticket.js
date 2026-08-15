(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.foodTicketSimulator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const TICKET_CONFIGS = Object.freeze({
    S: Object.freeze({ key: 'S', label: '食材チケットS', types: 2, quantity: 5 }),
    M: Object.freeze({ key: 'M', label: '食材チケットM', types: 3, quantity: 10 }),
    L: Object.freeze({ key: 'L', label: '食材チケットL', types: 4, quantity: 25 }),
  });

  function getTicketConfig(ticketType) {
    const key = String(ticketType || '').toUpperCase();
    const config = TICKET_CONFIGS[key];
    if (!config) return null;

    return { ...config, total: config.types * config.quantity };
  }

  function getTicketConfigs() {
    return Object.values(TICKET_CONFIGS).map(config => ({
      ...config,
      total: config.types * config.quantity,
    }));
  }

  function normalizeFoodNames(foodNames) {
    return Array.from(new Set(
      (Array.isArray(foodNames) ? foodNames : [])
        .map(foodName => String(foodName || '').trim())
        .filter(Boolean)
    ));
  }

  function getRandomIndex(random, length) {
    const randomValue = Number(random());
    if (!Number.isFinite(randomValue)) return 0;

    return Math.min(
      length - 1,
      Math.max(0, Math.floor(randomValue * length))
    );
  }

  function drawTicket(ticketType, foodNames, random = Math.random) {
    const config = getTicketConfig(ticketType);
    if (!config) throw new RangeError('invalid-ticket-type');

    const availableFoodNames = normalizeFoodNames(foodNames);
    if (availableFoodNames.length < config.types) {
      throw new RangeError('not-enough-foods');
    }

    const candidates = [...availableFoodNames];
    const foods = {};
    for (let index = 0; index < config.types; index += 1) {
      const candidateIndex = getRandomIndex(random, candidates.length);
      const foodName = candidates.splice(candidateIndex, 1)[0];
      foods[foodName] = config.quantity;
    }

    return {
      ticketType: config.key,
      foods,
      count: config.total,
    };
  }

  function createFoodTotals(foodNames) {
    return Object.fromEntries(normalizeFoodNames(foodNames).map(foodName => [foodName, 0]));
  }

  function addFoodTotals(totals, foods) {
    for (const [foodName, quantity] of Object.entries(foods || {})) {
      totals[foodName] = (totals[foodName] || 0) + Number(quantity || 0);
    }
  }

  function validateTicketCount(ticketCount) {
    const normalized = Number(ticketCount);
    if (!Number.isSafeInteger(normalized) || normalized < 1) {
      throw new RangeError('invalid-ticket-count');
    }

    return normalized;
  }

  function simulateTickets(options = {}) {
    const config = getTicketConfig(options.ticketType);
    if (!config) throw new RangeError('invalid-ticket-type');

    const availableFoodNames = normalizeFoodNames(options.foodNames);
    if (availableFoodNames.length < config.types) {
      throw new RangeError('not-enough-foods');
    }

    const ticketCount = validateTicketCount(options.ticketCount);
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const totals = createFoodTotals(availableFoodNames);
    const draws = options.includeDraws ? [] : null;

    for (let index = 0; index < ticketCount; index += 1) {
      const draw = drawTicket(config.key, availableFoodNames, random);
      addFoodTotals(totals, draw.foods);
      if (draws) draws.push(draw.foods);
    }

    const result = {
      ticketType: config.key,
      ticketCount,
      totalFoodCount: ticketCount * config.total,
      foods: totals,
      expectedPerFood: (ticketCount * config.total) / availableFoodNames.length,
    };
    if (draws) result.draws = draws;

    return result;
  }

  function normalizeTargetFoods(targetFoods) {
    const entries = Array.isArray(targetFoods)
      ? targetFoods.map(target => [target?.name, target?.quantity])
      : Object.entries(targetFoods || {});
    const merged = new Map();

    for (const [foodName, quantity] of entries) {
      const normalizedName = String(foodName || '').trim();
      const normalizedQuantity = Number(quantity);
      if (
        !normalizedName ||
        !Number.isSafeInteger(normalizedQuantity) ||
        normalizedQuantity < 1
      ) {
        continue;
      }

      merged.set(
        normalizedName,
        (merged.get(normalizedName) || 0) + normalizedQuantity
      );
    }

    return Array.from(merged, ([name, quantity]) => ({ name, quantity }));
  }

  function hasReachedTarget(totals, targetFoods) {
    return targetFoods.every(target => (
      Number(totals[target.name] || 0) >= target.quantity
    ));
  }

  function getQuantile(completionCounts, trials, probability) {
    const requiredCompletions = Math.ceil(trials * probability);
    if (completionCounts.length < requiredCompletions) return null;

    return completionCounts[requiredCompletions - 1] ?? null;
  }

  function getTargetMinimumTickets(targetFoods, config) {
    return Math.max(
      ...targetFoods.map(target => Math.ceil(target.quantity / config.quantity)),
      0
    );
  }

  function simulateTargetReach(options = {}) {
    const config = getTicketConfig(options.ticketType);
    if (!config) throw new RangeError('invalid-ticket-type');

    const availableFoodNames = normalizeFoodNames(options.foodNames);
    if (availableFoodNames.length < config.types) {
      throw new RangeError('not-enough-foods');
    }

    const targetFoods = normalizeTargetFoods(options.targetFoods);
    if (targetFoods.length === 0) throw new RangeError('invalid-target');

    const availableFoodSet = new Set(availableFoodNames);
    if (targetFoods.some(target => !availableFoodSet.has(target.name))) {
      throw new RangeError('target-not-available');
    }

    const trials = Number(options.trials ?? 10000);
    if (!Number.isSafeInteger(trials) || trials < 1) {
      throw new RangeError('invalid-trials');
    }

    const maxTickets = Number(options.maxTickets ?? 500);
    if (!Number.isSafeInteger(maxTickets) || maxTickets < 1) {
      throw new RangeError('invalid-max-tickets');
    }

    const random = typeof options.random === 'function' ? options.random : Math.random;
    const completionCounts = [];

    for (let trial = 0; trial < trials; trial += 1) {
      const totals = {};
      let completionCount = null;

      for (let ticket = 1; ticket <= maxTickets; ticket += 1) {
        const draw = drawTicket(config.key, availableFoodNames, random);
        addFoodTotals(totals, draw.foods);
        if (hasReachedTarget(totals, targetFoods)) {
          completionCount = ticket;
          break;
        }
      }

      if (completionCount !== null) completionCounts.push(completionCount);
    }

    completionCounts.sort((left, right) => left - right);
    const completedTrials = completionCounts.length;
    const completionRate = completedTrials / trials;
    const totalCompletedTickets = completionCounts.reduce((sum, count) => sum + count, 0);

    return {
      ticketType: config.key,
      trials,
      maxTickets,
      targetFoods,
      targetMinimumTickets: getTargetMinimumTickets(targetFoods, config),
      completedTrials,
      completionRate,
      averageTickets: completedTrials > 0
        ? totalCompletedTickets / completedTrials
        : null,
      medianTickets: getQuantile(completionCounts, trials, 0.5),
      p90Tickets: getQuantile(completionCounts, trials, 0.9),
      completionCounts,
    };
  }

  return {
    drawTicket,
    getTicketConfig,
    getTicketConfigs,
    normalizeFoodNames,
    normalizeTargetFoods,
    simulateTargetReach,
    simulateTickets,
  };
});
