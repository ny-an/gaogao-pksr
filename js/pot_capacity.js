// 鍋容量設定の最小値と最大値
const POT_CAPACITY_MIN = 15;
const POT_CAPACITY_MAX = 81;
const POT_CAPACITY_STEP = 3;
const COOKING_POWER_UP_MIN = 0;
const COOKING_POWER_UP_MAX = 200;
const EVENT_BONUS_VALUES = [1.0, 1.25, 1.5, 2.0]; // イベントボーナスの選択肢

/**
 * 鍋容量を計算する
 * 計算式：{(なべ容量×イベントボーナス×ウィークエンドボーナス)}+料理パワーアップ増加分}×(いいキャンプチケットの効果)
 * 各ステップで四捨五入を実行
 * @returns {number} 計算された鍋容量
 */
function calculatePotCapacity() {
  // なべ容量を取得（デフォルトは81）
  const potCapacityElement = document.getElementById('potCapacity');
  if (!potCapacityElement) {
    return POT_CAPACITY_MAX; // 要素が存在しない場合は最大値（デフォルト）を返す
  }
  const potCapacity = parseInt(potCapacityElement.value, 10) || POT_CAPACITY_MAX;
  
  // イベントボーナスを取得（鍋容量設定専用のpotEventBonusを使用）
  const eventBonusElement = document.getElementById('potEventBonus');
  const eventBonus = eventBonusElement ? parseFloat(eventBonusElement.value) || 1.0 : 1.0;
  
  // ウィークエンドボーナス（2倍）を取得
  const weekendBonusCheckbox = document.getElementById('weekendBonus');
  const weekendBonus = weekendBonusCheckbox && weekendBonusCheckbox.checked ? 2.0 : 1.0;
  
  // 料理パワーアップ増加分を取得
  const cookingPowerUpElement = document.getElementById('cookingPowerUp');
  const cookingPowerUp = cookingPowerUpElement ? parseInt(cookingPowerUpElement.value, 10) || 0 : 0;
  
  // いいキャンプチケット（1.5倍）を取得
  const goodCampTicketCheckbox = document.getElementById('goodCampTicket');
  const goodCampTicket = goodCampTicketCheckbox && goodCampTicketCheckbox.checked ? 1.5 : 1.0;
  
  // ステップ1: なべ容量 × イベントボーナス → 四捨五入
  let step1 = Math.round(potCapacity * eventBonus);
  
  // ステップ2: ステップ1の結果 × ウィークエンドボーナス → 四捨五入
  let step2 = Math.round(step1 * weekendBonus);
  
  // ステップ3: ステップ2の結果 + 料理パワーアップ増加分
  let step3 = step2 + cookingPowerUp;
  
  // ステップ4: ステップ3の結果 × いいキャンプチケットの効果 → 四捨五入
  let finalCapacity = Math.round(step3 * goodCampTicket);
  
  return finalCapacity;
}

/**
 * なべ容量の値を検証し、step=3に合わせる
 */
function validatePotCapacity(value) {
  // 最小値・最大値の範囲内に収める
  let validated = validateInput(value, POT_CAPACITY_MIN, POT_CAPACITY_MAX);
  // step=3に合わせる（15, 18, 21, ... 81）
  const remainder = (validated - POT_CAPACITY_MIN) % POT_CAPACITY_STEP;
  if (remainder !== 0) {
    // 最も近いstepの値に丸める
    validated = Math.round((validated - POT_CAPACITY_MIN) / POT_CAPACITY_STEP) * POT_CAPACITY_STEP + POT_CAPACITY_MIN;
    validated = validateInput(validated, POT_CAPACITY_MIN, POT_CAPACITY_MAX);
  }
  return validated;
}

/**
 * イベントボーナス倍率のselectのoptionを生成する
 */
function initializePotEventBonusOptions() {
  const potEventBonusElement = document.getElementById('potEventBonus');
  if (!potEventBonusElement) {
    return;
  }
  
  // 既存のoptionをクリア
  potEventBonusElement.innerHTML = '';
  
  // EVENT_BONUS_VALUESからoptionを生成
  EVENT_BONUS_VALUES.forEach(value => {
    const option = document.createElement('option');
    // valueは文字列として統一（1.0は"1.0"、1.25は"1.25"など）
    option.value = value === 1.0 ? '1.0' : value.toString();
    option.textContent = `${value}倍`;
    potEventBonusElement.appendChild(option);
  });
}

/**
 * 鍋容量と料理パワーアップ増加分のinput要素の属性を初期化する
 */
function initializePotCapacityInputAttributes() {
  // なべ容量のinput要素
  const potCapacityElement = document.getElementById('potCapacity');
  if (potCapacityElement) {
    potCapacityElement.min = POT_CAPACITY_MIN.toString();
    potCapacityElement.max = POT_CAPACITY_MAX.toString();
    potCapacityElement.step = POT_CAPACITY_STEP.toString();
    potCapacityElement.value = POT_CAPACITY_MAX.toString(); // デフォルト値
  }
  
  // 料理パワーアップ増加分のinput要素
  const cookingPowerUpElement = document.getElementById('cookingPowerUp');
  if (cookingPowerUpElement) {
    cookingPowerUpElement.min = COOKING_POWER_UP_MIN.toString();
    cookingPowerUpElement.max = COOKING_POWER_UP_MAX.toString();
    cookingPowerUpElement.value = COOKING_POWER_UP_MIN.toString(); // デフォルト値
  }
}

/**
 * 鍋容量設定をlocalStorageから読み込む
 */
function loadPotCapacitySettings() {
  // なべ容量（デフォルトは81）
  const potCapacity = validatePotCapacity(
    parseInt(localStorage.getItem('potCapacity'), 10) || POT_CAPACITY_MAX
  );
  const potCapacityElement = document.getElementById('potCapacity');
  if (potCapacityElement) {
    potCapacityElement.value = potCapacity;
  }
  
  // 料理パワーアップ増加分
  const cookingPowerUp = validateInput(
    parseInt(localStorage.getItem('cookingPowerUp'), 10),
    COOKING_POWER_UP_MIN,
    COOKING_POWER_UP_MAX
  );
  const cookingPowerUpElement = document.getElementById('cookingPowerUp');
  if (cookingPowerUpElement) {
    cookingPowerUpElement.value = isNaN(cookingPowerUp) ? COOKING_POWER_UP_MIN : cookingPowerUp;
  }
  
  // いいキャンプチケット
  const goodCampTicket = localStorage.getItem('goodCampTicket') === 'true';
  const goodCampTicketElement = document.getElementById('goodCampTicket');
  if (goodCampTicketElement) {
    goodCampTicketElement.checked = goodCampTicket;
  }
  
  // イベントボーナス（デフォルトは1.0倍）
  const potEventBonusElement = document.getElementById('potEventBonus');
  if (potEventBonusElement) {
    const savedValue = localStorage.getItem('potEventBonus');
    if (savedValue) {
      // localStorageに保存された値がEVENT_BONUS_VALUESに含まれているか確認
      const parsedValue = parseFloat(savedValue);
      const isValidValue = EVENT_BONUS_VALUES.includes(parsedValue);
      if (isValidValue) {
        // 値が有効な場合、対応するvalue形式に変換（1.0は"1.0"、それ以外はそのまま）
        potEventBonusElement.value = parsedValue === 1.0 ? '1.0' : savedValue;
      } else {
        // 無効な値の場合はデフォルトの1.0倍を設定
        potEventBonusElement.value = '1.0';
      }
    } else {
      // localStorageに値が無い場合はデフォルトの1.0倍を設定
      potEventBonusElement.value = '1.0';
    }
  }
  
  // ウィークエンドボーナス
  const weekendBonus = localStorage.getItem('weekendBonus') === 'true';
  const weekendBonusElement = document.getElementById('weekendBonus');
  if (weekendBonusElement) {
    weekendBonusElement.checked = weekendBonus;
  }
  
  // 作成できない料理を非表示にする
  const hideUncookable = localStorage.getItem('hideUncookableDishes') === 'true';
  const hideUncookableElement = document.getElementById('hideUncookableDishes');
  if (hideUncookableElement) {
    hideUncookableElement.checked = hideUncookable;
  }
}

/**
 * 鍋容量設定をlocalStorageに保存する
 */
function savePotCapacitySettings() {
  // なべ容量
  const potCapacityInput = document.getElementById('potCapacity');
  if (potCapacityInput) {
    const potCapacity = validatePotCapacity(
      parseInt(potCapacityInput.value, 10) || POT_CAPACITY_MAX
    );
    localStorage.setItem('potCapacity', potCapacity);
  }
  
  // 料理パワーアップ増加分
  const cookingPowerUpInput = document.getElementById('cookingPowerUp');
  if (cookingPowerUpInput) {
    const cookingPowerUp = validateInput(
      parseInt(cookingPowerUpInput.value, 10),
      COOKING_POWER_UP_MIN,
      COOKING_POWER_UP_MAX
    );
    localStorage.setItem('cookingPowerUp', isNaN(cookingPowerUp) ? COOKING_POWER_UP_MIN : cookingPowerUp);
  }
  
  // いいキャンプチケット
  const goodCampTicketCheckbox = document.getElementById('goodCampTicket');
  if (goodCampTicketCheckbox) {
    localStorage.setItem('goodCampTicket', goodCampTicketCheckbox.checked);
  }
  
  // イベントボーナス
  const potEventBonusSelect = document.getElementById('potEventBonus');
  if (potEventBonusSelect) {
    localStorage.setItem('potEventBonus', potEventBonusSelect.value);
  }
  
  // ウィークエンドボーナス
  const weekendBonusCheckbox = document.getElementById('weekendBonus');
  if (weekendBonusCheckbox) {
    localStorage.setItem('weekendBonus', weekendBonusCheckbox.checked);
  }
  
  // 作成できない料理を非表示にする
  const hideUncookableCheckbox = document.getElementById('hideUncookableDishes');
  if (hideUncookableCheckbox) {
    localStorage.setItem('hideUncookableDishes', hideUncookableCheckbox.checked);
  }
}

/**
 * 鍋容量設定のイベントリスナーを設定
 */
function setupPotCapacityEventListeners() {
  // なべ容量
  const potCapacityInput = document.getElementById('potCapacity');
  const potCapacityIncrementBtn = document.getElementById('potCapacityIncrement');
  const potCapacityDecrementBtn = document.getElementById('potCapacityDecrement');
  
  if (potCapacityInput) {
    // 値更新のユーティリティ
    function setPotCapacityValue(newValue) {
      const bounded = validatePotCapacity(newValue);
      potCapacityInput.value = bounded;
      savePotCapacitySettings();
      updatePotCapacityDisplay();
    }

    function stepPotCapacity(delta) {
      const current = parseInt(potCapacityInput.value, 10) || POT_CAPACITY_MIN;
      setPotCapacityValue(current + (delta * POT_CAPACITY_STEP));
    }

    // 入力値の検証
    potCapacityInput.addEventListener('input', () => {
      const value = validatePotCapacity(parseInt(potCapacityInput.value, 10));
      potCapacityInput.value = isNaN(value) ? '' : value;
    });
    
    potCapacityInput.addEventListener('change', () => {
      const value = validatePotCapacity(parseInt(potCapacityInput.value, 10));
      setPotCapacityValue(value);
      // 表示フラグがONの場合のみ料理リストを更新
      if (shouldUpdateFoodOptions()) {
        updateFoodOptionsIfNeeded();
      }
    });

    // ▲▼ボタン 長押しで連続加減
    if (potCapacityIncrementBtn && potCapacityDecrementBtn) {
      let holdInterval;
      let holdStartAt = 0;
      const defaultSpeed = 200; // ms
      const middleSpeed = 120;  // ms
      const highSpeed = 80;     // ms
      const durationToMiddle = 1500; // ms
      const durationToHigh = 4000;   // ms

      function computeSpeed(now) {
        const elapsed = now - holdStartAt;
        if (elapsed > durationToHigh) return highSpeed;
        if (elapsed > durationToMiddle) return middleSpeed;
        return defaultSpeed;
      }

      function startHold(delta, e) {
        e.preventDefault();
        e.stopPropagation();
        stepPotCapacity(delta); // 初回即時反映
        holdStartAt = Date.now();
        clearInterval(holdInterval);
        let currentSpeed = computeSpeed(Date.now());
        holdInterval = setInterval(function tick() {
          stepPotCapacity(delta);
          const nextSpeed = computeSpeed(Date.now());
          if (nextSpeed !== currentSpeed) {
            currentSpeed = nextSpeed;
            clearInterval(holdInterval);
            holdInterval = setInterval(tick, currentSpeed);
          }
        }, currentSpeed);
      }

      function stopHold(e) {
        if (e) e.stopPropagation();
        clearInterval(holdInterval);
      }

      // マウス/タッチの両方に対応
      potCapacityIncrementBtn.addEventListener('mousedown', (e) => startHold(1, e));
      potCapacityDecrementBtn.addEventListener('mousedown', (e) => startHold(-1, e));
      potCapacityIncrementBtn.addEventListener('touchstart', (e) => startHold(1, e), { passive: false });
      potCapacityDecrementBtn.addEventListener('touchstart', (e) => startHold(-1, e), { passive: false });
      ['mouseup','mouseleave','touchend','touchcancel'].forEach(type => {
        potCapacityIncrementBtn.addEventListener(type, stopHold);
        potCapacityDecrementBtn.addEventListener(type, stopHold);
      });
    }
  }
  
  // 料理パワーアップ増加分
  const cookingPowerUpInput = document.getElementById('cookingPowerUp');
  const cookingPowerUpIncrementBtn = document.getElementById('cookingPowerUpIncrement');
  const cookingPowerUpDecrementBtn = document.getElementById('cookingPowerUpDecrement');
  
  if (cookingPowerUpInput) {
    // 値更新のユーティリティ
    function setCookingPowerUpValue(newValue) {
      const bounded = validateInput(
        newValue,
        COOKING_POWER_UP_MIN,
        COOKING_POWER_UP_MAX
      );
      cookingPowerUpInput.value = bounded;
      savePotCapacitySettings();
      updatePotCapacityDisplay();
    }

    function stepCookingPowerUp(delta) {
      const current = parseInt(cookingPowerUpInput.value, 10) || 0;
      setCookingPowerUpValue(current + delta);
    }

    // 入力値の検証
    cookingPowerUpInput.addEventListener('input', () => {
      const value = validateInput(
        parseInt(cookingPowerUpInput.value, 10),
        COOKING_POWER_UP_MIN,
        COOKING_POWER_UP_MAX
      );
      cookingPowerUpInput.value = isNaN(value) ? '' : value;
    });
    
      cookingPowerUpInput.addEventListener('change', () => {
        savePotCapacitySettings();
        updatePotCapacityDisplay();
        // 表示フラグがONの場合のみ料理リストを更新
        if (shouldUpdateFoodOptions()) {
          updateFoodOptionsIfNeeded();
        }
      });

    // ▲▼ボタン 長押しで連続加減
    if (cookingPowerUpIncrementBtn && cookingPowerUpDecrementBtn) {
      let holdInterval;
      let holdStartAt = 0;
      const defaultSpeed = 200; // ms
      const middleSpeed = 120;  // ms
      const highSpeed = 80;     // ms
      const durationToMiddle = 1500; // ms
      const durationToHigh = 4000;   // ms

      function computeSpeed(now) {
        const elapsed = now - holdStartAt;
        if (elapsed > durationToHigh) return highSpeed;
        if (elapsed > durationToMiddle) return middleSpeed;
        return defaultSpeed;
      }

      function startHold(delta, e) {
        e.preventDefault();
        e.stopPropagation();
        stepCookingPowerUp(delta); // 初回即時反映
        holdStartAt = Date.now();
        clearInterval(holdInterval);
        let currentSpeed = computeSpeed(Date.now());
        holdInterval = setInterval(function tick() {
          stepCookingPowerUp(delta);
          const nextSpeed = computeSpeed(Date.now());
          if (nextSpeed !== currentSpeed) {
            currentSpeed = nextSpeed;
            clearInterval(holdInterval);
            holdInterval = setInterval(tick, currentSpeed);
          }
        }, currentSpeed);
      }

      function stopHold(e) {
        if (e) e.stopPropagation();
        clearInterval(holdInterval);
      }

      // マウス/タッチの両方に対応
      cookingPowerUpIncrementBtn.addEventListener('mousedown', (e) => startHold(1, e));
      cookingPowerUpDecrementBtn.addEventListener('mousedown', (e) => startHold(-1, e));
      cookingPowerUpIncrementBtn.addEventListener('touchstart', (e) => startHold(1, e), { passive: false });
      cookingPowerUpDecrementBtn.addEventListener('touchstart', (e) => startHold(-1, e), { passive: false });
      ['mouseup','mouseleave','touchend','touchcancel'].forEach(type => {
        cookingPowerUpIncrementBtn.addEventListener(type, stopHold);
        cookingPowerUpDecrementBtn.addEventListener(type, stopHold);
      });
    }
  }
  
  // いいキャンプチケット
  const goodCampTicketCheckbox = document.getElementById('goodCampTicket');
  if (goodCampTicketCheckbox) {
    goodCampTicketCheckbox.addEventListener('change', () => {
      savePotCapacitySettings();
      updatePotCapacityDisplay();
      // 表示フラグがONの場合のみ料理リストを更新
      if (shouldUpdateFoodOptions()) {
        updateFoodOptionsIfNeeded();
      }
    });
  }
  
  // ウィークエンドボーナス
  const weekendBonusCheckbox = document.getElementById('weekendBonus');
  if (weekendBonusCheckbox) {
    weekendBonusCheckbox.addEventListener('change', () => {
      savePotCapacitySettings();
      updatePotCapacityDisplay();
      // 表示フラグがONの場合のみ料理リストを更新
      if (shouldUpdateFoodOptions()) {
        updateFoodOptionsIfNeeded();
      }
    });
  }
  
  // イベントボーナス（鍋容量設定専用）
  const potEventBonusSelect = document.getElementById('potEventBonus');
  if (potEventBonusSelect) {
    potEventBonusSelect.addEventListener('change', () => {
      savePotCapacitySettings();
      updatePotCapacityDisplay();
      // 表示フラグがONの場合のみ料理リストを更新
      if (shouldUpdateFoodOptions()) {
        updateFoodOptionsIfNeeded();
      }
    });
  }
  
  // 作成できる料理だけ表示するチェックボックス
  const hideUncookableCheckbox = document.getElementById('hideUncookableDishes');
  if (hideUncookableCheckbox) {
    hideUncookableCheckbox.addEventListener('change', () => {
      const isChecked = hideUncookableCheckbox.checked;
      localStorage.setItem('hideUncookableDishes', isChecked);
      // チェックボックスの状態が変更されたら、必ず料理リストを更新
      updateFoodOptionsIfNeeded();
      // 制限表示も更新
      if (typeof updateFoodFilterIndicator === 'function') {
        updateFoodFilterIndicator(isChecked);
      }
    });
  }
}

/**
 * 表示フラグがONかどうかを確認する
 * @returns {boolean} 表示フラグがONの場合true
 */
function shouldUpdateFoodOptions() {
  const hideUncookableCheckbox = document.getElementById('hideUncookableDishes');
  return hideUncookableCheckbox && hideUncookableCheckbox.checked;
}

/**
 * 料理リストを更新する（必要に応じて）
 */
function updateFoodOptionsIfNeeded() {
  // updateFoodOptions関数が存在する場合、現在のカテゴリで更新
  if (typeof updateFoodOptions === 'function') {
    const selectedCategoryButton = document.querySelector('.category-btn.active');
    if (selectedCategoryButton) {
      const selectedCategory = selectedCategoryButton.getAttribute('data-category');
      updateFoodOptions(selectedCategory);
      // updateFoodOptions内で既に保存された料理の復元処理が行われるため、ここでは処理しない
    } else {
      // カテゴリボタンがアクティブでない場合、デフォルトカテゴリで更新
      // または、app.jsの初期化を待つ
      setTimeout(() => {
        const selectedCategoryButton = document.querySelector('.category-btn.active');
        if (selectedCategoryButton) {
          const selectedCategory = selectedCategoryButton.getAttribute('data-category');
          updateFoodOptions(selectedCategory);
          // updateFoodOptions内で既に保存された料理の復元処理が行われるため、ここでは処理しない
        }
      }, 100);
    }
  }
}

/**
 * 鍋容量の計算結果を表示する
 */
function updatePotCapacityDisplay() {
  const capacity = calculatePotCapacity();
  const displayElement = document.getElementById('potCapacityDisplay');
  if (displayElement) {
    displayElement.textContent = capacity;
  }
}

// 鍋容量設定の折りたたみ
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('togglePotCapacity');
  const potCapacityContainer = document.getElementById('potCapacityContainer');

  if (!toggleButton || !potCapacityContainer) {
    console.error('鍋容量設定のトグルボタンまたはコンテナが見つかりません。');
    return;
  }

  // 初期状態を設定
  let isCollapsed = true;

  // ボタンのクリックイベント
  toggleButton.addEventListener('click', () => {
    // 開いたときだけ色つける
    toggleButton.classList.toggle('active', isCollapsed);
    // 折りたたみ状態を切り替え
    isCollapsed = !isCollapsed;
    potCapacityContainer.classList.toggle('collapsed', isCollapsed);
    toggleButton.textContent = isCollapsed ? '鍋容量設定 ▶' : '鍋容量設定 ▼';
  });

  // 初期状態で折りたたむ
  potCapacityContainer.classList.add('collapsed');
  toggleButton.textContent = '鍋容量設定 ▶';
});

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
  // input要素の属性を初期化（loadPotCapacitySettingsより先に実行）
  initializePotCapacityInputAttributes();
  // イベントボーナス倍率のoptionを生成（loadPotCapacitySettingsより先に実行）
  initializePotEventBonusOptions();
  loadPotCapacitySettings();
  setupPotCapacityEventListeners();
  updatePotCapacityDisplay();
  
  // 初期化後に料理リストを更新（チェックボックスの状態を反映）
  // app.jsの初期化を待つため、少し遅延させる
  setTimeout(() => {
    updateFoodOptionsIfNeeded();
    // 制限表示も初期化
    const hideUncookableCheckbox = document.getElementById('hideUncookableDishes');
    if (hideUncookableCheckbox && typeof updateFoodFilterIndicator === 'function') {
      updateFoodFilterIndicator(hideUncookableCheckbox.checked);
    }
  }, 200);
});

