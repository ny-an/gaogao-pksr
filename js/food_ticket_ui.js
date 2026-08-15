(function() {
  const TARGET_TRIALS = 10000;
  const MAX_SIMULATION_TICKETS = 1000;
  const MAX_TARGET_TICKETS = 2000;

  function formatNumber(value, maximumFractionDigits = 0) {
    return Number(value).toLocaleString('ja-JP', { maximumFractionDigits });
  }

  function getSelectedTicketType(container) {
    return container.querySelector('input[name="foodTicketType"]:checked')?.value || 'S';
  }

  function getFoodNames() {
    return Object.keys(foodEnergyMap || {});
  }

  function getAvailableFoodNames(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map(input => input.value);
  }

  function getErrorMessage(error) {
    switch (error?.message) {
      case 'not-enough-foods':
        return '選択中の食材が少なすぎます。チケットの種類数以上を選択してください。';
      case 'target-not-available':
        return '目標食材が抽選対象から外れています。抽選対象を確認してください。';
      case 'invalid-target':
        return '目当ての食材を1つ以上選択してください。';
      default:
        return '計算できませんでした。入力内容を確認してください。';
    }
  }

  function createFoodImage(foodName) {
    const image = document.createElement('img');
    image.src = typeof getFoodImagePath === 'function'
      ? getFoodImagePath(foodName)
      : '';
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    return image;
  }

  function createAvailableFoodOption(foodName, index) {
    const label = document.createElement('label');
    label.className = 'food-ticket-available-option';
    label.htmlFor = `foodTicketAvailable${index}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = label.htmlFor;
    checkbox.value = foodName;
    checkbox.checked = true;

    const name = document.createElement('span');
    name.textContent = foodName;

    label.append(checkbox, name);
    return label;
  }

  function createTargetFoodOption(foodName, index) {
    const label = document.createElement('label');
    label.className = 'food-ticket-target-option';
    label.dataset.foodName = foodName;
    label.htmlFor = `foodTicketTarget${index}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = label.htmlFor;
    checkbox.value = foodName;
    checkbox.className = 'food-ticket-target-checkbox';

    const image = createFoodImage(foodName);
    image.title = foodName;

    const quantity = document.createElement('input');
    quantity.type = 'number';
    quantity.className = 'food-ticket-target-quantity';
    quantity.min = '1';
    quantity.max = '10000';
    quantity.step = '1';
    quantity.value = '5';
    quantity.inputMode = 'numeric';
    quantity.disabled = true;
    quantity.setAttribute('aria-label', `${foodName}の目標数`);

    label.append(checkbox, image, quantity);
    return label;
  }

  function renderFoodOptions(availableContainer, targetContainer) {
    const foodNames = getFoodNames();
    availableContainer.replaceChildren(
      ...foodNames.map((foodName, index) => createAvailableFoodOption(foodName, index))
    );
    targetContainer.replaceChildren(
      ...foodNames.map((foodName, index) => createTargetFoodOption(foodName, index))
    );
  }

  function updateAvailableCount(availableContainer, countElement) {
    const count = getAvailableFoodNames(availableContainer).length;
    countElement.textContent = `${count}種`;
  }

  function updateTargetOptions(availableContainer, targetContainer) {
    const availableNames = new Set(getAvailableFoodNames(availableContainer));
    targetContainer.querySelectorAll('.food-ticket-target-option').forEach(option => {
      const checkbox = option.querySelector('.food-ticket-target-checkbox');
      const quantity = option.querySelector('.food-ticket-target-quantity');
      const isAvailable = availableNames.has(option.dataset.foodName);

      if (!isAvailable) checkbox.checked = false;
      checkbox.disabled = !isAvailable;
      quantity.disabled = !isAvailable || !checkbox.checked;
      option.classList.toggle('selected', checkbox.checked);
      option.classList.toggle('unavailable', !isAvailable);
    });
  }

  function getTargetFoods(targetContainer) {
    return Array.from(targetContainer.querySelectorAll('.food-ticket-target-option'))
      .filter(option => option.querySelector('.food-ticket-target-checkbox')?.checked)
      .map(option => ({
        name: option.dataset.foodName,
        quantity: Number(option.querySelector('.food-ticket-target-quantity')?.value),
      }));
  }

  function clearElement(element, className) {
    element.className = className;
    element.replaceChildren();
  }

  function createSummary(className, heading, detail) {
    const summary = document.createElement('div');
    summary.className = className;

    const title = document.createElement('strong');
    title.textContent = heading;
    const note = document.createElement('span');
    note.textContent = detail;
    summary.append(title, note);
    return summary;
  }

  function createSimulationFoodItem(foodName, quantity, expected) {
    const item = document.createElement('div');
    item.className = 'food-ticket-food-item';
    if (quantity === 0) item.classList.add('empty');

    item.appendChild(createFoodImage(foodName));

    const name = document.createElement('span');
    name.className = 'food-ticket-food-name';
    name.textContent = foodName;

    const quantityElement = document.createElement('strong');
    quantityElement.textContent = `${formatNumber(quantity)}個`;

    const expectedElement = document.createElement('small');
    expectedElement.textContent = `目安 ${formatNumber(expected, 1)}個`;

    const count = document.createElement('span');
    count.className = 'food-ticket-food-count';
    count.append(quantityElement, expectedElement);

    item.append(name, count);
    return item;
  }

  function renderSimulationResult(resultElement, result, availableFoodNames) {
    resultElement.className = 'food-ticket-result matched';
    const config = foodTicketSimulator.getTicketConfig(result.ticketType);

    const summary = createSummary(
      'food-ticket-result-summary',
      `${formatNumber(result.totalFoodCount)}個`,
      `${config.label}を${formatNumber(result.ticketCount)}枚回した結果`
    );

    const note = document.createElement('p');
    note.className = 'food-ticket-result-note';
    note.textContent = `抽選対象 ${availableFoodNames.length}種 ／ 1種あたりの目安 ${formatNumber(result.expectedPerFood, 1)}個`;

    const list = document.createElement('div');
    list.className = 'food-ticket-food-list';
    const sortedFoods = availableFoodNames
      .map(foodName => [foodName, result.foods[foodName] || 0])
      .filter(([, quantity]) => quantity > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ja'));
    list.append(
      ...sortedFoods.map(([foodName, quantity]) => (
        createSimulationFoodItem(foodName, quantity, result.expectedPerFood)
      ))
    );

    resultElement.replaceChildren(summary, note, list);
  }

  function createTargetStat(label, value, modifier = '') {
    const item = document.createElement('div');
    item.className = ['food-ticket-target-stat', modifier].filter(Boolean).join(' ');

    const name = document.createElement('span');
    name.textContent = label;
    const valueElement = document.createElement('strong');
    valueElement.textContent = value;
    item.append(name, valueElement);
    return item;
  }

  function formatTicketValue(value) {
    return value === null ? '到達せず' : `${formatNumber(value, 1)}枚`;
  }

  function renderTargetResult(resultElement, result, availableFoodNames) {
    resultElement.className = 'food-ticket-target-result matched';
    const config = foodTicketSimulator.getTicketConfig(result.ticketType);
    const targetLabel = result.targetFoods
      .map(target => `${target.name} × ${formatNumber(target.quantity)}`)
      .join(' ／ ');

    const heading = document.createElement('p');
    heading.className = 'food-ticket-target-heading';
    heading.textContent = targetLabel;

    const summary = document.createElement('p');
    summary.className = 'food-ticket-target-summary';
    const ticketLabel = document.createElement('strong');
    ticketLabel.className = 'food-ticket-target-ticket-label';
    ticketLabel.textContent = `${config.label}で`;
    const summaryDetail = document.createElement('span');
    summaryDetail.textContent = '、指定した食材をすべて目標数以上にするまで';
    summary.append(ticketLabel, summaryDetail);

    const stats = document.createElement('div');
    stats.className = 'food-ticket-target-stats';
    stats.append(
      createTargetStat('平均', formatTicketValue(result.averageTickets), 'food-ticket-target-stat-average'),
      createTargetStat('運が良ければ(50%)', formatTicketValue(result.medianTickets)),
      createTargetStat('余裕をみるなら(90%)', formatTicketValue(result.p90Tickets))
    );

    const note = document.createElement('p');
    note.className = 'food-ticket-target-note';
    note.textContent = `抽選対象${availableFoodNames.length}種・${formatNumber(result.trials)}回。最短の目安は${formatNumber(result.targetMinimumTickets)}枚です。`;

    resultElement.replaceChildren(heading, summary, stats, note);
  }

  function renderError(element, message, className) {
    element.className = `${className} error`;
    const text = document.createElement('p');
    text.textContent = message;
    element.replaceChildren(text);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const standalone = document.body.dataset.standalone === 'food-ticket';
    const foodTable = document.getElementById('foodTable');
    const openButton = document.getElementById('foodTicketOpenButton');
    const modal = document.getElementById('foodTicketModal');
    const dialog = modal?.querySelector('.food-ticket-content');
    const closeButton = modal?.querySelector('.food-ticket-close');
    const modeOptions = document.querySelector('.food-ticket-mode-options');
    const simulationMode = document.getElementById('foodTicketSimulationMode');
    const targetMode = document.getElementById('foodTicketTargetMode');
    const simulationForm = document.getElementById('foodTicketSimulationForm');
    const ticketCountInput = document.getElementById('foodTicketCount');
    const simulationResult = document.getElementById('foodTicketSimulationResult');
    const simulationCalculating = document.getElementById('foodTicketSimulationCalculating');
    const targetOptions = document.getElementById('foodTicketTargetOptions');
    const targetSubmit = document.getElementById('foodTicketTargetSubmit');
    const targetCalculating = document.getElementById('foodTicketTargetCalculating');
    const targetResult = document.getElementById('foodTicketTargetResult');
    const availableOptions = document.getElementById('foodTicketAvailableOptions');
    const availableCount = document.getElementById('foodTicketAvailableCount');

    if (
      (!foodTable && !openButton && !standalone) || !modal || !dialog || !closeButton || !simulationForm ||
      !modeOptions || !simulationMode || !targetMode ||
      !ticketCountInput || !simulationResult || !simulationCalculating ||
      !targetOptions || !targetSubmit || !targetCalculating || !targetResult ||
      !availableOptions || !availableCount || typeof foodTicketSimulator === 'undefined'
    ) {
      return;
    }

    renderFoodOptions(availableOptions, targetOptions);
    updateAvailableCount(availableOptions, availableCount);
    updateTargetOptions(availableOptions, targetOptions);
    let requestId = 0;

    function updateMode() {
      const mode = modeOptions.querySelector('input[name="foodTicketMode"]:checked')?.value;
      simulationMode.hidden = mode !== 'simulation';
      targetMode.hidden = mode !== 'target';
    }

    function setCalculating(element, button, isCalculating) {
      element.hidden = !isCalculating;
      button.disabled = isCalculating;
    }

    function clearResults() {
      requestId += 1;
      clearElement(simulationResult, 'food-ticket-result');
      clearElement(targetResult, 'food-ticket-target-result');
      setCalculating(simulationCalculating, simulationForm.querySelector('button'), false);
      setCalculating(targetCalculating, targetSubmit, false);
    }

    function closeModal() {
      clearResults();
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      if (!standalone) {
        document.body.classList.remove('food-ticket-open');
      }
    }

    function openModal() {
      clearResults();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      // 単独ページでは本文スクロールを維持するため overflow ロックしない
      if (!standalone) {
        document.body.classList.add('food-ticket-open');
      }
      ticketCountInput.focus({ preventScroll: true });
      ticketCountInput.select();
    }

    let lastFoodIcon = null;
    let lastFoodTapAt = 0;
    if (foodTable) {
      foodTable.addEventListener('dblclick', event => {
        const foodIcon = event.target.closest('.food-ticket-trigger');
        if (!foodIcon) return;

        event.preventDefault();
        openModal();
      });

      foodTable.addEventListener('touchend', event => {
        const foodIcon = event.target.closest('.food-ticket-trigger');
        if (!foodIcon) {
          lastFoodIcon = null;
          lastFoodTapAt = 0;
          return;
        }

        const now = Date.now();
        if (foodIcon === lastFoodIcon && now - lastFoodTapAt <= 400) {
          event.preventDefault();
          lastFoodIcon = null;
          lastFoodTapAt = 0;
          openModal();
          return;
        }

        lastFoodIcon = foodIcon;
        lastFoodTapAt = now;
      }, { passive: false });
    }
    if (openButton) openButton.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
    dialog.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    dialog.addEventListener('input', event => {
      if (event.target.matches('.food-ticket-target-quantity')) {
        clearElement(targetResult, 'food-ticket-target-result');
        requestId += 1;
      }
    });
    dialog.addEventListener('change', event => {
      if (event.target.matches('input[name="foodTicketMode"]')) {
        updateMode();
        clearResults();
        return;
      }
      if (event.target.matches('input[name="foodTicketType"]')) {
        clearResults();
        return;
      }
      if (event.target.closest('#foodTicketAvailableOptions')) {
        updateAvailableCount(availableOptions, availableCount);
        updateTargetOptions(availableOptions, targetOptions);
        clearResults();
        return;
      }
      if (event.target.matches('.food-ticket-target-checkbox')) {
        const option = event.target.closest('.food-ticket-target-option');
        const quantity = option?.querySelector('.food-ticket-target-quantity');
        if (quantity) quantity.disabled = !event.target.checked;
        option?.classList.toggle('selected', event.target.checked);
        clearElement(targetResult, 'food-ticket-target-result');
        requestId += 1;
      }
    });

    updateMode();

    simulationForm.addEventListener('submit', event => {
      event.preventDefault();
      const ticketCount = Number(ticketCountInput.value);
      if (!Number.isSafeInteger(ticketCount) || ticketCount < 1 || ticketCount > MAX_SIMULATION_TICKETS) {
        ticketCountInput.setCustomValidity(`1〜${MAX_SIMULATION_TICKETS}枚で入力してください。`);
        ticketCountInput.reportValidity();
        return;
      }
      ticketCountInput.setCustomValidity('');

      const availableFoodNames = getAvailableFoodNames(availableOptions);
      const currentRequestId = ++requestId;
      clearElement(simulationResult, 'food-ticket-result');
      setCalculating(simulationCalculating, simulationForm.querySelector('button'), true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const result = foodTicketSimulator.simulateTickets({
              ticketType: getSelectedTicketType(dialog),
              ticketCount,
              foodNames: availableFoodNames,
            });
            if (currentRequestId === requestId) {
              renderSimulationResult(simulationResult, result, availableFoodNames);
            }
          } catch (error) {
            if (currentRequestId === requestId) renderError(
              simulationResult,
              getErrorMessage(error),
              'food-ticket-result'
            );
          } finally {
            if (currentRequestId === requestId) {
              setCalculating(simulationCalculating, simulationForm.querySelector('button'), false);
            }
          }
        }, 0);
      });
    });

    targetSubmit.addEventListener('click', () => {
      const targetFoods = getTargetFoods(targetOptions);
      if (targetFoods.length === 0) {
        renderError(targetResult, getErrorMessage({ message: 'invalid-target' }), 'food-ticket-target-result');
        return;
      }

      if (targetFoods.some(target => !Number.isSafeInteger(target.quantity) || target.quantity < 1)) {
        renderError(targetResult, '目標数は1以上の整数で入力してください。', 'food-ticket-target-result');
        return;
      }

      const ticketType = getSelectedTicketType(dialog);
      const config = foodTicketSimulator.getTicketConfig(ticketType);
      const minimumTickets = Math.max(
        ...targetFoods.map(target => Math.ceil(target.quantity / config.quantity)),
        1
      );
      const maxTickets = Math.min(
        MAX_TARGET_TICKETS,
        Math.max(200, minimumTickets * 10)
      );
      const availableFoodNames = getAvailableFoodNames(availableOptions);
      const currentRequestId = ++requestId;
      clearElement(targetResult, 'food-ticket-target-result');
      setCalculating(targetCalculating, targetSubmit, true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const result = foodTicketSimulator.simulateTargetReach({
              ticketType,
              foodNames: availableFoodNames,
              targetFoods,
              trials: TARGET_TRIALS,
              maxTickets,
            });
            if (currentRequestId === requestId) {
              renderTargetResult(targetResult, result, availableFoodNames);
            }
          } catch (error) {
            if (currentRequestId === requestId) renderError(
              targetResult,
              getErrorMessage(error),
              'food-ticket-target-result'
            );
          } finally {
            if (currentRequestId === requestId) {
              setCalculating(targetCalculating, targetSubmit, false);
            }
          }
        }, 0);
      });
    });

    if (standalone) openModal();
  });
})();
