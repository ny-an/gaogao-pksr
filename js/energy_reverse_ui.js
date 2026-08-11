(function() {
  const ALL_DISH_CATEGORIES_VALUE = '__all_categories__';
  const NO_DISH_CATEGORY_VALUE = '__no_dish__';
  const ALL_DISHES_VALUE = '__all_dishes__';
  const ALL_SUCCESS_VALUE = 'all';
  const ALL_RECIPE_LEVELS_VALUE = 'all';
  const MIN_CALCULATING_DISPLAY_MS = 400;

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

  function getCurrentSuccessMultiplier() {
    if (document.getElementById('extraTastyIcon2')) return '3';

    const energyValue = document.getElementById('energyValue');
    return energyValue?.classList.contains('doubled') ? '2' : '1';
  }

  function getSuccessLabel(multiplier) {
    if (Number(multiplier) === 3) return '超成功（3倍）';
    if (Number(multiplier) === 2) return '大成功（2倍）';
    return '通常';
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
    note.textContent = '現在のなべ容量と設定では、目標に一致する追加食材がありません。';

    resultElement.replaceChildren(text, note);
  }

  function createFoodList(result) {
    const foodList = document.createElement('div');
    foodList.className = 'energy-reverse-food-list';
    const foods = Object.entries(result.foods).sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
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
    appendCondition(conditionList, 'FBボーナス', `${conditions.fbBonusPercent}%`);
    appendCondition(
      conditionList,
      'レシピレベル',
      result.dishName ? `Lv${result.recipeLevel}` : '対象外'
    );
    appendCondition(conditionList, 'イベント', conditions.eventBonusLabel);
    appendCondition(conditionList, 'できばえ', getSuccessLabel(result.successMultiplier));
    appendCondition(conditionList, '料理エナジー', result.recipeDisplayEnergy.toLocaleString());
    appendCondition(conditionList, '追加エナジー', result.extraEnergy.toLocaleString());

    const foodHeading = document.createElement('p');
    foodHeading.className = 'energy-reverse-food-heading';
    foodHeading.textContent = '追加食材';

    detail.append(conditionList, foodHeading, createFoodList(result));
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
    const submitButton = form?.querySelector('.energy-reverse-submit');
    const calculatingElement = document.getElementById('energyReverseCalculating');
    const potCapacityValue = document.getElementById('energyReversePotCapacity');
    const resultElement = document.getElementById('energyReverseResult');

    if (
      !trigger || !modal || !dialog || !closeButton || !form || !targetInput ||
      !fbBonusSelect || !recipeLevelSelect || !eventBonusSelect || !successSelect ||
      !dishCategorySelect || !dishSelect || !submitButton || !calculatingElement ||
      !potCapacityValue || !resultElement
    ) {
      return;
    }

    populateDishCategoryOptions(dishCategorySelect);
    populateDishOptions(dishSelect, ALL_DISH_CATEGORIES_VALUE);
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
      copySelectOptions('fbBonus', fbBonusSelect);
      populateRecipeLevelOptions(recipeLevelSelect);
      copySelectOptions('eventBonus', eventBonusSelect);
      successSelect.value = getCurrentSuccessMultiplier();

      const currentDish = document.getElementById('foodSelect')?.value || '';
      dishCategorySelect.value = currentDish
        ? getDishCategory(currentDish)
        : ALL_DISH_CATEGORIES_VALUE;
      populateDishOptions(
        dishSelect,
        dishCategorySelect.value,
        currentDish || ALL_DISHES_VALUE
      );

      const potCapacity = typeof calculatePotCapacity === 'function'
        ? calculatePotCapacity()
        : 0;
      potCapacityValue.textContent = potCapacity.toLocaleString();
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

    form.addEventListener('submit', event => {
      event.preventDefault();

      const targetEnergy = Number(targetInput.value);
      if (!Number.isSafeInteger(targetEnergy) || targetEnergy < 1) {
        targetInput.setCustomValidity('1以上の整数を入力してください。');
        targetInput.reportValidity();
        return;
      }
      targetInput.setCustomValidity('');

      const potCapacity = typeof calculatePotCapacity === 'function'
        ? calculatePotCapacity()
        : 0;
      const calculationOptions = {
        targetEnergy,
        recipeLevels: getRecipeLevels(recipeLevelSelect.value),
        recipeBonusPercentMap: recipeLevelBonusList,
        fbBonusPercent: Number(fbBonusSelect.value),
        eventBonus: eventBonusSelect.value,
        successMultipliers: getSuccessMultipliers(successSelect.value),
        potCapacity,
        recipes: getRecipeCandidates(dishCategorySelect.value, dishSelect.value),
        foodEnergyMap,
        maxCandidates: 10,
      };
      const resultConditions = {
        fbBonusPercent: calculationOptions.fbBonusPercent,
        eventBonusLabel: eventBonusSelect.selectedOptions[0]?.textContent || '通常',
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
