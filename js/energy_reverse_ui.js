(function() {
  const ALL_DISH_CATEGORIES_VALUE = '__all_categories__';
  const NO_DISH_CATEGORY_VALUE = '__no_dish__';
  const ALL_DISHES_VALUE = '__all_dishes__';
  const ALL_SUCCESS_VALUE = 'all';
  const ALL_FB_BONUSES_VALUE = 'all';
  const ALL_RECIPE_LEVELS_VALUE = 'all';
  const ALL_EVENT_BONUSES_VALUE = 'all';
  const CURRENT_POT_CAPACITY_MODE = 'current';
  const MAX_POT_CAPACITY_MODE = 'max';
  const MIN_CALCULATING_DISPLAY_MS = 400;
  const MAX_ALTERNATIVE_PATTERNS = 10;

  function copySelectOptions(sourceId, target) {
    const source = document.getElementById(sourceId);
    if (!source || !target) return;

    target.innerHTML = source.innerHTML;
    target.value = source.value;
  }

  function countRecipeFoods(dishFoods) {
    return Object.values(dishFoods || {}).reduce(
      (total, amount) => total + (Number(amount) || 0),
      0
    );
  }

  function getRecipeEntries(selectedCategory) {
    const candidates = [];
    for (const [categoryName, categoryDishes] of Object.entries(org_dishes)) {
      if (
        selectedCategory !== ALL_DISH_CATEGORIES_VALUE &&
        selectedCategory !== categoryName
      ) {
        continue;
      }

      for (const [dishName, dishFoods] of Object.entries(categoryDishes)) {
        if (!Object.prototype.hasOwnProperty.call(dishesEnergyList, dishName)) continue;

        candidates.push({
          name: dishName,
          category: categoryName,
          energy: dishesEnergyList[dishName],
          foodCount: countRecipeFoods(dishFoods),
        });
      }
    }

    return candidates.sort((left, right) => {
      if (right.energy !== left.energy) return right.energy - left.energy;
      return left.name.localeCompare(right.name, 'ja');
    });
  }

  function getRecipeCandidates(selectedCategory, selectedDish) {
    if (selectedCategory === NO_DISH_CATEGORY_VALUE) {
      return [{ name: '', category: '', energy: 0, foodCount: 0 }];
    }

    return getRecipeEntries(selectedCategory).filter(recipe => (
      selectedDish === ALL_DISHES_VALUE || selectedDish === recipe.name
    ));
  }

  function getDishCategory(dishName) {
    for (const [categoryName, categoryDishes] of Object.entries(org_dishes)) {
      if (Object.prototype.hasOwnProperty.call(categoryDishes, dishName)) {
        return categoryName;
      }
    }

    return ALL_DISH_CATEGORIES_VALUE;
  }

  function getSuccessMultipliers(value) {
    return value === ALL_SUCCESS_VALUE ? [1, 2, 3] : [Number(value)];
  }

  function getEventBonuses(value) {
    if (value !== ALL_EVENT_BONUSES_VALUE) return [value];

    return Array.from(document.getElementById('eventBonus')?.options || [])
      .map(option => option.value)
      .filter(Boolean);
  }

  function getFbBonusPercents(value) {
    if (value !== ALL_FB_BONUSES_VALUE) return [Number(value)];

    return Array.from(document.getElementById('fbBonus')?.options || [])
      .map(option => Number(option.value))
      .filter(percent => Number.isInteger(percent) && percent >= 0);
  }

  function getRecipeLevels(value) {
    if (value !== ALL_RECIPE_LEVELS_VALUE) return [Number(value)];

    return Object.keys(recipeLevelBonusList)
      .map(Number)
      .filter(level => Number.isInteger(level) && level >= 1)
      .sort((left, right) => left - right);
  }

  function populateRecipeLevelOptions(select) {
    copySelectOptions('recipeLevel', select);

    const allLevelsOption = document.createElement('option');
    allLevelsOption.value = ALL_RECIPE_LEVELS_VALUE;
    allLevelsOption.textContent = '指定なし（全Lv計算）';
    select.prepend(allLevelsOption);
    select.value = ALL_RECIPE_LEVELS_VALUE;
  }

  function populateFbBonusOptions(select) {
    copySelectOptions('fbBonus', select);
    const inheritedValue = select.value;

    const allBonusesOption = document.createElement('option');
    allBonusesOption.value = ALL_FB_BONUSES_VALUE;
    allBonusesOption.textContent = '指定なし（全計算）';
    select.prepend(allBonusesOption);
    select.value = inheritedValue;
  }

  function populateEventBonusOptions(select) {
    copySelectOptions('eventBonus', select);

    const allBonusesOption = document.createElement('option');
    allBonusesOption.value = ALL_EVENT_BONUSES_VALUE;
    allBonusesOption.textContent = '指定なし（全計算）';
    select.prepend(allBonusesOption);
    select.value = '1';
  }

  function getReversePotCapacity(mode) {
    if (typeof getEnergyReversePotCapacity === 'function') {
      return getEnergyReversePotCapacity(mode);
    }

    return typeof calculatePotCapacity === 'function' ? calculatePotCapacity() : 0;
  }

  function populatePotCapacityOptions(select) {
    const currentCapacity = getReversePotCapacity(CURRENT_POT_CAPACITY_MODE);
    const maximumCapacity = getReversePotCapacity(MAX_POT_CAPACITY_MODE);
    const options = [
      [CURRENT_POT_CAPACITY_MODE, `現在（${currentCapacity.toLocaleString()}個）`],
      [MAX_POT_CAPACITY_MODE, `自動（最大${maximumCapacity.toLocaleString()}個）`],
    ];

    select.replaceChildren(...options.map(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      return option;
    }));
    select.value = CURRENT_POT_CAPACITY_MODE;
  }

  function getSuccessLabel(multiplier) {
    if (Number(multiplier) === 3) return '超成功（3倍）';
    if (Number(multiplier) === 2) return '大成功（2倍）';
    return '通常';
  }

  function getEventBonusLabel(eventBonus) {
    return Number(eventBonus) === 1 ? '通常' : `${eventBonus}倍`;
  }

  function populateExcludedFoodOptions(container) {
    container.replaceChildren();

    Object.entries(foodEnergyMap)
      .sort((left, right) => {
        if (Number(right[1]) !== Number(left[1])) return Number(right[1]) - Number(left[1]);
        return left[0].localeCompare(right[0], 'ja');
      })
      .forEach(([foodName], index) => {
        const label = document.createElement('label');
        label.className = 'energy-reverse-exclusion-option';
        label.htmlFor = `energyReverseExcludedFood${index}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = label.htmlFor;
        checkbox.name = 'excludedExtraFood';
        checkbox.value = foodName;

        const name = document.createElement('span');
        name.textContent = foodName;

        label.append(checkbox, name);
        container.appendChild(label);
      });
  }

  function getExcludedFoodNames(container) {
    return Array.from(container.querySelectorAll('input:checked'))
      .map(checkbox => checkbox.value);
  }

  function renderExcludedFoodSelection(container, selectedElement, countElement) {
    const excludedFoodNames = getExcludedFoodNames(container);
    countElement.textContent = excludedFoodNames.length === 0
      ? 'なし'
      : `${excludedFoodNames.length}種`;

    container.querySelectorAll('.energy-reverse-exclusion-option').forEach(label => {
      label.classList.toggle('selected', label.querySelector('input')?.checked === true);
    });

    const chips = excludedFoodNames.map(foodName => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'energy-reverse-excluded-chip';
      chip.dataset.foodName = foodName;
      chip.setAttribute('aria-label', `${foodName}を除外から戻す`);

      const name = document.createElement('span');
      name.textContent = foodName;
      const remove = document.createElement('span');
      remove.textContent = '×';
      remove.setAttribute('aria-hidden', 'true');

      chip.append(name, remove);
      return chip;
    });

    selectedElement.replaceChildren(...chips);
    selectedElement.hidden = chips.length === 0;
  }

  function populateDishCategoryOptions(select) {
    select.replaceChildren();

    const categories = [
      [ALL_DISH_CATEGORIES_VALUE, '選択なし（全料理）'],
      [NO_DISH_CATEGORY_VALUE, '料理なし（追加食材のみ）'],
      ...['サラダ', 'カレー', 'デザート']
        .filter(categoryName => Object.prototype.hasOwnProperty.call(org_dishes, categoryName))
        .map(categoryName => [categoryName, categoryName]),
    ];

    for (const [value, label] of categories) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
  }

  function populateDishOptions(select, selectedCategory, preferredDish = ALL_DISHES_VALUE) {
    select.replaceChildren();

    if (selectedCategory === NO_DISH_CATEGORY_VALUE) {
      const noDishOption = document.createElement('option');
      noDishOption.value = ALL_DISHES_VALUE;
      noDishOption.textContent = '料理なし（追加食材のみ）';
      select.appendChild(noDishOption);
      select.disabled = true;
      return;
    }

    select.disabled = false;
    const allDishesOption = document.createElement('option');
    allDishesOption.value = ALL_DISHES_VALUE;
    allDishesOption.textContent = selectedCategory === ALL_DISH_CATEGORIES_VALUE
      ? '指定なし（全料理から計算）'
      : `指定なし（${selectedCategory}から計算）`;
    select.appendChild(allDishesOption);

    for (const recipe of getRecipeEntries(selectedCategory)) {
      const option = document.createElement('option');
      option.value = recipe.name;
      option.textContent = recipe.name;
      select.appendChild(option);
    }

    select.value = Array.from(select.options).some(option => option.value === preferredDish)
      ? preferredDish
      : ALL_DISHES_VALUE;
  }

  function clearResult(resultElement) {
    resultElement.className = 'energy-reverse-result';
    resultElement.replaceChildren();
  }

  function renderNoMatch(resultElement) {
    resultElement.className = 'energy-reverse-result no-match';

    const text = document.createElement('p');
    text.className = 'energy-reverse-no-match';
    text.textContent = '該当なし';

    const note = document.createElement('p');
    note.className = 'energy-reverse-result-note';
    note.textContent = '選択したなべ容量と設定では、目標に一致する追加食材がありません。';

    resultElement.replaceChildren(text, note);
  }

  function createFoodList(result, currentFoodEnergyMap) {
    const foodList = document.createElement('div');
    foodList.className = 'energy-reverse-food-list';
    const foods = Object.entries(result.foods).sort((left, right) => {
      const energyDifference = Number(currentFoodEnergyMap[right[0]]) -
        Number(currentFoodEnergyMap[left[0]]);
      if (energyDifference !== 0) return energyDifference;
      return left[0].localeCompare(right[0], 'ja');
    });

    if (foods.length === 0) {
      const noExtra = document.createElement('p');
      noExtra.className = 'energy-reverse-no-extra';
      noExtra.textContent = '追加食材なし';
      foodList.appendChild(noExtra);
    } else {
      for (const [foodName, quantity] of foods) {
        const item = document.createElement('div');
        item.className = 'energy-reverse-food-item';

        const image = document.createElement('img');
        image.src = getFoodImagePath(foodName);
        image.alt = foodName;

        const name = document.createElement('span');
        name.className = 'energy-reverse-food-name';
        name.textContent = foodName;

        const count = document.createElement('strong');
        count.textContent = `× ${quantity}`;

        item.append(image, name, count);
        foodList.appendChild(item);
      }
    }

    return foodList;
  }

  function getFoodCombinationKey(foods) {
    return Object.entries(foods)
      .filter(([, quantity]) => Number(quantity) > 0)
      .sort((left, right) => left[0].localeCompare(right[0], 'ja'))
      .map(([foodName, quantity]) => `${foodName}:${quantity}`)
      .join('|');
  }

  function createAlternativePattern(pattern, index, currentFoodEnergyMap) {
    const item = document.createElement('div');
    item.className = 'energy-reverse-alternative-pattern';

    const heading = document.createElement('p');
    const name = document.createElement('strong');
    name.textContent = `別パターン ${index + 1}`;
    const count = document.createElement('span');
    count.textContent = `追加 ${pattern.count}個`;
    heading.append(name, count);

    item.append(heading, createFoodList(pattern, currentFoodEnergyMap));
    return item;
  }

  function appendCondition(container, label, value) {
    const item = document.createElement('div');
    item.className = 'energy-reverse-condition';

    const name = document.createElement('span');
    name.textContent = label;

    const conditionValue = document.createElement('strong');
    conditionValue.textContent = value;

    item.append(name, conditionValue);
    container.appendChild(item);
  }

  function createCandidate(result, conditions) {
    const candidate = document.createElement('details');
    candidate.className = 'energy-reverse-candidate';

    const candidateSummary = document.createElement('summary');
    candidateSummary.className = 'energy-reverse-candidate-summary';

    const summaryMain = document.createElement('span');
    summaryMain.className = 'energy-reverse-candidate-main';

    const dishName = document.createElement('strong');
    dishName.textContent = result.dishName || '料理なし（追加食材のみ）';

    const foodCount = document.createElement('span');
    const levelText = result.dishName ? `Lv${result.recipeLevel} ／ ` : '';
    foodCount.textContent = `${levelText}料理 ${result.recipeFoodCount}個 ＋ 追加 ${result.extraFoodCount}個`;
    summaryMain.append(dishName, foodCount);

    const success = document.createElement('span');
    success.className = 'energy-reverse-success-badge';
    success.textContent = getSuccessLabel(result.successMultiplier);
    candidateSummary.append(summaryMain, success);

    const detail = document.createElement('div');
    detail.className = 'energy-reverse-candidate-detail';

    const conditionList = document.createElement('div');
    conditionList.className = 'energy-reverse-condition-list';
    appendCondition(conditionList, '目標', `${result.finalEnergy.toLocaleString()} エナジー`);
    appendCondition(
      conditionList,
      'なべ使用',
      `${result.recipeFoodCount + result.extraFoodCount} / ${result.potCapacity}個`
    );
    appendCondition(conditionList, 'FBボーナス', `${result.fbBonusPercent}%`);
    appendCondition(
      conditionList,
      'レシピレベル',
      result.dishName ? `Lv${result.recipeLevel}` : '対象外'
    );
    appendCondition(conditionList, 'イベント', getEventBonusLabel(result.eventBonus));
    appendCondition(conditionList, 'できばえ', getSuccessLabel(result.successMultiplier));
    appendCondition(conditionList, '料理エナジー', result.recipeDisplayEnergy.toLocaleString());
    appendCondition(conditionList, '追加エナジー', result.extraEnergy.toLocaleString());

    const foodHeading = document.createElement('p');
    foodHeading.className = 'energy-reverse-food-heading';
    foodHeading.textContent = '追加食材';

    const alternativeSection = document.createElement('div');
    alternativeSection.className = 'energy-reverse-alternatives';

    const alternativeHeader = document.createElement('div');
    alternativeHeader.className = 'energy-reverse-alternative-header';
    const alternativeHeading = document.createElement('p');
    alternativeHeading.textContent = '追加食材の別パターン';
    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.className = 'energy-reverse-alternative-search';
    searchButton.textContent = '再検索する';
    alternativeHeader.append(alternativeHeading, searchButton);

    const alternativeStatus = document.createElement('p');
    alternativeStatus.className = 'energy-reverse-alternative-status';
    alternativeStatus.setAttribute('role', 'status');
    alternativeStatus.setAttribute('aria-live', 'polite');

    const alternativeList = document.createElement('div');
    alternativeList.className = 'energy-reverse-alternative-list';
    alternativeSection.append(alternativeHeader, alternativeStatus, alternativeList);

    let isSearchingAlternatives = false;
    function searchAlternativePatterns() {
      if (isSearchingAlternatives) return;

      isSearchingAlternatives = true;
      searchButton.disabled = true;
      alternativeStatus.classList.add('calculating');
      alternativeStatus.textContent = '別パターンを検索中...';
      alternativeList.replaceChildren();

      requestAnimationFrame(() => {
        setTimeout(() => {
          const primaryKey = getFoodCombinationKey(result.foods);
          const alternatives = energyReverse.findFoodCombinations(
            result.extraEnergy,
            result.remainingCapacity,
            conditions.foodEnergyMap,
            MAX_ALTERNATIVE_PATTERNS + 1
          ).filter(pattern => getFoodCombinationKey(pattern.foods) !== primaryKey)
            .slice(0, MAX_ALTERNATIVE_PATTERNS);

          alternativeList.replaceChildren(
            ...alternatives.map((pattern, index) => (
              createAlternativePattern(pattern, index, conditions.foodEnergyMap)
            ))
          );
          alternativeStatus.classList.remove('calculating');
          alternativeStatus.textContent = alternatives.length > 0
            ? `別パターン ${alternatives.length}案`
            : '別の追加食材パターンはありません。';
          searchButton.disabled = false;
          isSearchingAlternatives = false;
        }, 0);
      });
    }

    searchButton.addEventListener('click', searchAlternativePatterns);

    detail.append(
      conditionList,
      foodHeading,
      createFoodList(result, conditions.foodEnergyMap),
      alternativeSection
    );
    candidate.append(candidateSummary, detail);
    return candidate;
  }

  function renderResults(resultElement, results, conditions) {
    resultElement.className = 'energy-reverse-result matched';

    const summary = document.createElement('div');
    summary.className = 'energy-reverse-summary';

    const exactLabel = document.createElement('span');
    exactLabel.className = 'energy-reverse-exact-label';
    exactLabel.textContent = 'ぴったり';

    const energy = document.createElement('strong');
    energy.textContent = `${results[0].finalEnergy.toLocaleString()} エナジー`;

    const resultCount = document.createElement('span');
    resultCount.className = 'energy-reverse-capacity-detail';
    resultCount.textContent = `${results.length}案（クリックで詳細）`;

    summary.append(exactLabel, energy, resultCount);

    const candidateList = document.createElement('div');
    candidateList.className = 'energy-reverse-candidate-list';
    for (const result of results) {
      candidateList.appendChild(createCandidate(result, conditions));
    }

    resultElement.replaceChildren(summary, candidateList);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('total21');
    const modal = document.getElementById('energyReverseModal');
    const dialog = modal?.querySelector('.energy-reverse-content');
    const closeButton = modal?.querySelector('.energy-reverse-close');
    const form = document.getElementById('energyReverseForm');
    const targetInput = document.getElementById('energyReverseTarget');
    const fbBonusSelect = document.getElementById('energyReverseFbBonus');
    const recipeLevelSelect = document.getElementById('energyReverseRecipeLevel');
    const eventBonusSelect = document.getElementById('energyReverseEventBonus');
    const successSelect = document.getElementById('energyReverseSuccess');
    const dishCategorySelect = document.getElementById('energyReverseDishCategory');
    const dishSelect = document.getElementById('energyReverseDish');
    const excludedOptions = document.getElementById('energyReverseExcludedOptions');
    const excludedSelected = document.getElementById('energyReverseExcludedSelected');
    const excludedCount = document.getElementById('energyReverseExcludedCount');
    const submitButton = form?.querySelector('.energy-reverse-submit');
    const calculatingElement = document.getElementById('energyReverseCalculating');
    const potCapacitySelect = document.getElementById('energyReversePotCapacityMode');
    const resultElement = document.getElementById('energyReverseResult');

    if (
      !trigger || !modal || !dialog || !closeButton || !form || !targetInput ||
      !fbBonusSelect || !recipeLevelSelect || !eventBonusSelect || !successSelect ||
      !dishCategorySelect || !dishSelect || !excludedOptions || !excludedSelected ||
      !excludedCount || !submitButton || !calculatingElement ||
      !potCapacitySelect || !resultElement
    ) {
      return;
    }

    populateDishCategoryOptions(dishCategorySelect);
    populateDishOptions(dishSelect, ALL_DISH_CATEGORIES_VALUE);
    populateExcludedFoodOptions(excludedOptions);
    renderExcludedFoodSelection(excludedOptions, excludedSelected, excludedCount);
    let calculationRequestId = 0;

    function closeModal() {
      calculationRequestId += 1;
      setCalculating(false);
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('energy-reverse-open');
    }

    function setCalculating(isCalculating) {
      calculatingElement.hidden = !isCalculating;
      submitButton.disabled = isCalculating;
      form.setAttribute('aria-busy', String(isCalculating));
    }

    function openModal() {
      populateFbBonusOptions(fbBonusSelect);
      populateRecipeLevelOptions(recipeLevelSelect);
      populateEventBonusOptions(eventBonusSelect);
      populatePotCapacityOptions(potCapacitySelect);
      successSelect.value = ALL_SUCCESS_VALUE;

      const currentDish = document.getElementById('foodSelect')?.value || '';
      dishCategorySelect.value = currentDish
        ? getDishCategory(currentDish)
        : ALL_DISH_CATEGORIES_VALUE;
      populateDishOptions(
        dishSelect,
        dishCategorySelect.value,
        currentDish || ALL_DISHES_VALUE
      );

      setCalculating(false);
      clearResult(resultElement);

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('energy-reverse-open');
      targetInput.focus({ preventScroll: true });
      targetInput.select();
    }

    trigger.addEventListener('dblclick', event => {
      event.preventDefault();
      openModal();
    });

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
    dialog.addEventListener('click', event => event.stopPropagation());

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    function handleCriteriaChange() {
      calculationRequestId += 1;
      clearResult(resultElement);
    }

    form.addEventListener('input', handleCriteriaChange);
    form.addEventListener('change', handleCriteriaChange);
    dishCategorySelect.addEventListener('change', () => {
      populateDishOptions(dishSelect, dishCategorySelect.value);
    });
    excludedOptions.addEventListener('change', () => {
      renderExcludedFoodSelection(excludedOptions, excludedSelected, excludedCount);
    });
    excludedSelected.addEventListener('click', event => {
      const chip = event.target.closest('.energy-reverse-excluded-chip');
      if (!chip) return;

      const checkbox = Array.from(excludedOptions.querySelectorAll('input'))
        .find(input => input.value === chip.dataset.foodName);
      if (!checkbox) return;

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    form.addEventListener('submit', event => {
      event.preventDefault();

      const targetEnergy = Number(targetInput.value);
      if (!Number.isSafeInteger(targetEnergy) || targetEnergy < 1) {
        targetInput.setCustomValidity('1以上の整数を入力してください。');
        targetInput.reportValidity();
        return;
      }
      targetInput.setCustomValidity('');

      const potCapacity = getReversePotCapacity(potCapacitySelect.value);
      const excludedFoodNames = getExcludedFoodNames(excludedOptions);
      const availableFoodEnergyMap = Object.fromEntries(
        Object.entries(foodEnergyMap)
          .filter(([foodName]) => !excludedFoodNames.includes(foodName))
      );
      const calculationOptions = {
        targetEnergy,
        recipeLevels: getRecipeLevels(recipeLevelSelect.value),
        recipeBonusPercentMap: recipeLevelBonusList,
        fbBonusPercents: getFbBonusPercents(fbBonusSelect.value),
        eventBonuses: getEventBonuses(eventBonusSelect.value),
        successMultipliers: getSuccessMultipliers(successSelect.value),
        potCapacity,
        recipes: getRecipeCandidates(dishCategorySelect.value, dishSelect.value),
        foodEnergyMap,
        excludedFoodNames,
        maxCandidates: 10,
      };
      const resultConditions = {
        foodEnergyMap: availableFoodEnergyMap,
      };

      clearResult(resultElement);
      const currentRequestId = ++calculationRequestId;
      const calculationStartedAt = performance.now();
      setCalculating(true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const results = energyReverse.solveExactEnergyCandidates(calculationOptions);
            const remainingDisplayMs = Math.max(
              0,
              MIN_CALCULATING_DISPLAY_MS - (performance.now() - calculationStartedAt)
            );
            setTimeout(() => {
              try {
                if (currentRequestId !== calculationRequestId) return;

                if (results.length > 0) {
                  renderResults(resultElement, results, resultConditions);
                } else {
                  renderNoMatch(resultElement);
                }
              } finally {
                setCalculating(false);
              }
            }, remainingDisplayMs);
          } catch (error) {
            setCalculating(false);
            throw error;
          }
        }, 0);
      });
    });
  });
})();
