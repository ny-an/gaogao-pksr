// 追加食材リセットボタンの作成
const EXTRA_FOOD_MAX = 800;

function addResetButton(extraContainer) {
  // リセットボタン用のdivを作成
  const resetItemDiv = document.createElement('div');
  resetItemDiv.className = 'extra-food-item reset-item';

  // 画像コンテナの作成
  const resetImgContainer = document.createElement('div');
  resetImgContainer.className = 'img-container';

  // 仮置き画像の作成
  const resetImg = document.createElement('img');
  resetImg.src = 'img/icons/reload.svg'; // 仮置き画像のパス
  resetImg.alt = 'riset';
  resetItemDiv.appendChild(resetImgContainer);

  resetImgContainer.appendChild(resetImg);
  const resetLabel = document.createElement('div');
  resetLabel.className = 'food-label reset-icon';
  resetLabel.textContent = 'リセット';
  resetItemDiv.appendChild(resetLabel);


  // クリック時のリセット処理を追加
  resetItemDiv.addEventListener('click', () => {
    const extraFoodItems = document.querySelectorAll('.extra-food-item');
    extraFoodItems.forEach(item => {
      // リセットボタン自身は対象外
      if (item.classList.contains('reset-item')) return;
      const input = item.querySelector('.extra-food');
      if (input) {
        input.value = 0;
        const badge = item.querySelector('.food-count-badge');
        if (badge) {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  // リセットボタンを追加食材エリアの先頭に配置
  extraContainer.prepend(resetItemDiv);
}


// 追加食材ボタンの折りたたみ
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleExtraFoods');
  const extraContainer = document.getElementById('extraFoodsContainer');
  if (!toggleBtn || !extraContainer) {
    console.error('toggleボタンまたは追加食材エリアが見つかりません。IDを確認してください。');
    return;
  }

  // 初期状態を設定
  let isCollapsed = true;

  // ボタンのクリックイベント
  toggleBtn.addEventListener('click', () => {
    // 開いたときだけ色つける
    toggleBtn.classList.toggle('active', isCollapsed);
    // 折りたたみ状態を切り替え
    isCollapsed = !isCollapsed;
    extraContainer.classList.toggle('collapsed', isCollapsed);
    toggleBtn.textContent = isCollapsed ? '追加食材 ▶' : '追加食材 ▼';
  });

  // 初期状態で折りたたむ
  extraContainer.classList.add('collapsed');
  toggleBtn.textContent = '追加食材 ▶';
});


// render：追加食材エリアを表示
document.addEventListener('DOMContentLoaded', () => {
  // 追加食材エリアの要素を取得
  const extraContainer = document.getElementById('extraFoodsContainer');
  if (!extraContainer) return;

  // foodEnergyMapから全ての食材（food）のエナジー値を取得する
  const foods = Object.entries(foodEnergyMap);
  // 食材のエナジー値で降順に並べ替える
  foods.sort((a, b) => b[1] - a[1]);

  // 食材リセットボタンの追加
  addResetButton(extraContainer);

  // 各食材について、アイコン、数値入力、ラベルを持つボックスを作成する
  foods.forEach(([foodName, energy]) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'extra-food-item';

    // 画像コンテナを作成
    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';

    // 画像要素を作成
    const img = document.createElement('img');
    img.src = getFoodImagePath(foodName);
    img.alt = foodName;

    // バッジ要素を作成
    const badge = document.createElement('span');
    badge.className = 'food-count-badge';
    badge.textContent = '0';

    // 非表示のinput
    const input = document.createElement('input');
    input.type = 'number';
    input.value = "0";
    input.min = "0";
    input.max = String(EXTRA_FOOD_MAX);
    input.className = 'extra-food';
    input.setAttribute('data-food', foodName);
    input.style.display = 'none';

    // バッジの初期状態を非表示にする
    badge.style.display = 'none';

    // ラベル要素を作成する（エナジー数値を表示）
    const label = document.createElement('div');
    label.className = 'food-label';
    label.textContent = `${energy}`;

    // 左下(下三角)・右下(上三角)ボタンを作成
    const decrementBtn = document.createElement('button');
    decrementBtn.className = 'triangle-btn triangle-down';
    decrementBtn.setAttribute('aria-label', 'decrement');
    decrementBtn.type = 'button';
    decrementBtn.innerHTML = '&#9660;'; // ▼

    const incrementBtn = document.createElement('button');
    incrementBtn.className = 'triangle-btn triangle-up';
    incrementBtn.setAttribute('aria-label', 'increment');
    incrementBtn.type = 'button';
    incrementBtn.innerHTML = '&#9650;'; // ▲

    // アイコン、入力、ラベルをボックスに追加する
    imgContainer.appendChild(img);
    imgContainer.appendChild(badge);
    itemDiv.appendChild(imgContainer);
    itemDiv.appendChild(decrementBtn);
    itemDiv.appendChild(incrementBtn);
    itemDiv.appendChild(label);
    itemDiv.appendChild(input);

    // 値更新のユーティリティ
    function setValue(newValue) {
      const bounded = Math.max(0, Math.min(EXTRA_FOOD_MAX, Number(newValue)));
      input.value = String(bounded);
      badge.textContent = String(bounded);
      badge.style.display = bounded > 0 ? 'flex' : 'none';
      input.dispatchEvent(new Event('change'));
    }

    function step(delta) {
      const current = Number(input.value) || 0;
      setValue(current + delta);
    }

    // ▲▼ボタン 長押しで連続加減
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
      step(delta); // 初回即時反映
      holdStartAt = Date.now();
      clearInterval(holdInterval);
      let currentSpeed = computeSpeed(Date.now());
      holdInterval = setInterval(function tick() {
        step(delta);
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
    incrementBtn.addEventListener('mousedown', (e) => startHold(1, e));
    decrementBtn.addEventListener('mousedown', (e) => startHold(-1, e));
    incrementBtn.addEventListener('touchstart', (e) => startHold(1, e), { passive: false });
    decrementBtn.addEventListener('touchstart', (e) => startHold(-1, e), { passive: false });
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(type => {
      incrementBtn.addEventListener(type, stopHold);
      decrementBtn.addEventListener(type, stopHold);
    });

    // クリック(タップ)でモーダル起動（ボタン除外）
    itemDiv.addEventListener('click', (e) => {
      const target = e.target;
      if (target === incrementBtn || target === decrementBtn) return;
      openNumberInputModal(foodName, Number(input.value) || 0, (val) => {
        setValue(val);
      });
    });



    // 作成したボックスを追加食材エリアに追加する
    extraContainer.appendChild(itemDiv);
  });
});


// 追加食材の変更を検出して、料理エナジーを更新する
document.addEventListener('DOMContentLoaded', () => {
  const extraFoodInputs = document.querySelectorAll('.extra-food');
  extraFoodInputs.forEach(input => {
    input.addEventListener('change', () => {
      console.log('change ExtraFoods triggered');
      updateFoods();
    });
  });

});

// 数値入力用モーダル（簡易実装）
function openNumberInputModal(title, initialValue, onSubmit) {
  // 既存があれば削除
  const old = document.getElementById('extra-food-input-modal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'extra-food-input-modal';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '1000';

  const dialog = document.createElement('div');
  dialog.style.background = '#fff';
  dialog.style.borderRadius = '8px';
  dialog.style.padding = '16px';
  dialog.style.minWidth = '260px';
  dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';

  const h = document.createElement('div');
  h.textContent = `${title}`;
  h.style.fontWeight = '600';
  h.style.marginBottom = '8px';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = String(EXTRA_FOOD_MAX);
  input.value = String(initialValue);
  input.style.width = '250px';
  input.style.padding = '8px 12px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '6px';
  input.style.fontSize = '16px';
  input.style.textAlign = 'center';

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.justifyContent = 'flex-end';
  footer.style.marginTop = '12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.className = 'btn btn-text';

  const okBtn = document.createElement('button');
  okBtn.type = 'button';
  okBtn.textContent = 'OK';
  okBtn.className = 'btn btn-primary';

  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  okBtn.addEventListener('click', () => {
    const v = Number(input.value);
    if (!Number.isFinite(v)) return;
    onSubmit(Math.max(0, Math.min(EXTRA_FOOD_MAX, v)));
    overlay.remove();
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(okBtn);
  dialog.appendChild(h);
  dialog.appendChild(input);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Enterで確定
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      okBtn.click();
    }
  });
  input.focus();
  input.select();
}