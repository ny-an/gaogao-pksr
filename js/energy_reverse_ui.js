(function() {
  function copySelectOptions(sourceId, target) {
    const source = document.getElementById(sourceId);
    if (!source || !target) return;

    target.innerHTML = source.innerHTML;
    target.value = source.value;
  }

  function getDishFoods(dishName) {
    if (!dishName) return {};

    for (const category of Object.values(org_dishes)) {
      if (Object.prototype.hasOwnProperty.call(category, dishName)) {
        return category[dishName];
      }
    }

    return {};
  }

  function countRecipeFoods(dishFoods) {
    return Object.values(dishFoods || {}).reduce(
      (total, amount) => total + (Number(amount) || 0),
      0
    );
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

    const noDishOption = document.createElement('option');
    noDishOption.value = '';
    noDishOption.textContent = '料理なし';
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

  function renderResult(resultElement, result, dishName) {
    resultElement.className = 'energy-reverse-result matched';

    const summary = document.createElement('div');
    summary.className = 'energy-reverse-summary';

    const exactLabel = document.createElement('span');
    exactLabel.className = 'energy-reverse-exact-label';
    exactLabel.textContent = 'ぴったり';

    const energy = document.createElement('strong');
    energy.textContent = `${result.finalEnergy.toLocaleString()} エナジー`;

    const capacity = document.createElement('span');
    capacity.className = 'energy-reverse-capacity-detail';
    const recipeDetail = dishName ? `料理 ${result.recipeFoodCount}個 ＋ ` : '';
    capacity.textContent = `${recipeDetail}追加 ${result.extraFoodCount}個 ／ なべ ${result.potCapacity}個`;

    summary.append(exactLabel, energy, capacity);

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

    const note = document.createElement('p');
    note.className = 'energy-reverse-result-note';
    note.textContent = `追加食材エナジー ${result.extraEnergy.toLocaleString()} ／ ${getSuccessLabel(result.successMultiplier)}`;

    resultElement.replaceChildren(summary, foodList, note);
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
        : '';

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

      const dishName = dishSelect.value;
      const dishFoods = getDishFoods(dishName);
      const recipeFoodCount = countRecipeFoods(dishFoods);
      const recipeLevel = Number(recipeLevelSelect.value);
      const potCapacity = typeof calculatePotCapacity === 'function'
        ? calculatePotCapacity()
        : 0;

      const result = energyReverse.solveExactEnergy({
        targetEnergy,
        recipeEnergy: dishName ? dishesEnergyList[dishName] : 0,
        recipeBonusPercent: Number(recipeLevelBonusList[recipeLevel] || 0),
        fbBonusPercent: Number(fbBonusSelect.value),
        eventBonus: eventBonusSelect.value,
        successMultiplier: Number(successSelect.value),
        potCapacity,
        recipeFoodCount,
        foodEnergyMap,
      });

      if (result.found) {
        renderResult(resultElement, result, dishName);
      } else {
        renderNoMatch(resultElement);
      }
    });
  });
})();
