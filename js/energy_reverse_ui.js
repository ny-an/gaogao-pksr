(function() {
  const ALL_DISHES_VALUE = '__all__';
  const NO_DISH_VALUE = '__none__';
  const ALL_SUCCESS_VALUE = 'all';

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

  function getRecipeCandidates(selectedDish) {
    if (selectedDish === NO_DISH_VALUE) {
      return [{ name: '', category: '', energy: 0, foodCount: 0 }];
    }

    const candidates = [];
    for (const [categoryName, categoryDishes] of Object.entries(org_dishes)) {
      for (const [dishName, dishFoods] of Object.entries(categoryDishes)) {
        if (!Object.prototype.hasOwnProperty.call(dishesEnergyList, dishName)) continue;
        if (selectedDish !== ALL_DISHES_VALUE && selectedDish !== dishName) continue;

        candidates.push({
          name: dishName,
          category: categoryName,
          energy: dishesEnergyList[dishName],
          foodCount: countRecipeFoods(dishFoods),
        });
      }
    }

    return candidates;
  }

  function getSuccessMultipliers(value) {
    return value === ALL_SUCCESS_VALUE ? [1, 2, 3] : [Number(value)];
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

  function populateDishOptions(select) {
    select.innerHTML = '';

    const allDishesOption = document.createElement('option');
    allDishesOption.value = ALL_DISHES_VALUE;
    allDishesOption.textContent = '指定なし（全料理から計算）';
    select.appendChild(allDishesOption);

    const noDishOption = document.createElement('option');
    noDishOption.value = NO_DISH_VALUE;
    noDishOption.textContent = '料理なし（追加食材のみ）';
    select.appendChild(noDishOption);

    for (const [categoryName, categoryDishes] of Object.entries(org_dishes)) {
      const group = document.createElement('optgroup');
      group.label = categoryName;

      for (const dishName of Object.keys(categoryDishes)) {
        if (!Object.prototype.hasOwnProperty.call(dishesEnergyList, dishName)) continue;

        const option = document.createElement('option');
        option.value = dishName;
        option.textContent = dishName;
        group.appendChild(option);
      }

      if (group.children.length > 0) select.appendChild(group);
    }
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
    foodCount.textContent = `料理 ${result.recipeFoodCount}個 ＋ 追加 ${result.extraFoodCount}個`;
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
      result.dishName ? `Lv${conditions.recipeLevel}` : '対象外'
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
    const dishSelect = document.getElementById('energyReverseDish');
    const potCapacityValue = document.getElementById('energyReversePotCapacity');
    const resultElement = document.getElementById('energyReverseResult');

    if (
      !trigger || !modal || !dialog || !closeButton || !form || !targetInput ||
      !fbBonusSelect || !recipeLevelSelect || !eventBonusSelect || !successSelect || !dishSelect ||
      !potCapacityValue || !resultElement
    ) {
      return;
    }

    populateDishOptions(dishSelect);

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('energy-reverse-open');
    }

    function openModal() {
      copySelectOptions('fbBonus', fbBonusSelect);
      copySelectOptions('recipeLevel', recipeLevelSelect);
      copySelectOptions('eventBonus', eventBonusSelect);
      successSelect.value = getCurrentSuccessMultiplier();

      const currentDish = document.getElementById('foodSelect')?.value || '';
      dishSelect.value = Array.from(dishSelect.options).some(option => option.value === currentDish)
        ? currentDish
        : ALL_DISHES_VALUE;

      const potCapacity = typeof calculatePotCapacity === 'function'
        ? calculatePotCapacity()
        : 0;
      potCapacityValue.textContent = potCapacity.toLocaleString();
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

    form.addEventListener('input', () => clearResult(resultElement));
    form.addEventListener('change', () => clearResult(resultElement));

    form.addEventListener('submit', event => {
      event.preventDefault();

      const targetEnergy = Number(targetInput.value);
      if (!Number.isSafeInteger(targetEnergy) || targetEnergy < 1) {
        targetInput.setCustomValidity('1以上の整数を入力してください。');
        targetInput.reportValidity();
        return;
      }
      targetInput.setCustomValidity('');

      const recipeLevel = Number(recipeLevelSelect.value);
      const potCapacity = typeof calculatePotCapacity === 'function'
        ? calculatePotCapacity()
        : 0;

      const results = energyReverse.solveExactEnergyCandidates({
        targetEnergy,
        recipeBonusPercent: Number(recipeLevelBonusList[recipeLevel] || 0),
        fbBonusPercent: Number(fbBonusSelect.value),
        eventBonus: eventBonusSelect.value,
        successMultipliers: getSuccessMultipliers(successSelect.value),
        potCapacity,
        recipes: getRecipeCandidates(dishSelect.value),
        foodEnergyMap,
      });

      if (results.length > 0) {
        renderResults(resultElement, results, {
          fbBonusPercent: Number(fbBonusSelect.value),
          recipeLevel,
          eventBonusLabel: eventBonusSelect.selectedOptions[0]?.textContent || '通常',
        });
      } else {
        renderNoMatch(resultElement);
      }
    });
  });
})();
