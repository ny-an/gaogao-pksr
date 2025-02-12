// 追加食材リセットボタンの作成
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
    input.className = 'extra-food';
    input.setAttribute('data-food', foodName);
    input.style.display = 'none';

    // バッジの初期状態を非表示にする
    badge.style.display = 'none';

    // ラベル要素を作成する（エナジー数値を表示）
    const label = document.createElement('div');
    label.className = 'food-label';
    label.textContent = `${energy}`;

    // アイコン、入力、ラベルをボックスに追加する
    imgContainer.appendChild(img);
    imgContainer.appendChild(badge);
    itemDiv.appendChild(imgContainer);
    itemDiv.appendChild(label);
    itemDiv.appendChild(input);

    let incrementInterval;
    let isIncrementing = false;
    let pressStartTime;

    // 初速
    const defaultSpeed = 200; // 初期速度: 200ms 少ないほど速い
    let currentSpeed = defaultSpeed; // 変化するスピード

    // 中速
    const middleSpeed = 150; // 中速モード速度: ms
    const durationToMiddle = 3000; // 中速モード起動時間

    // 高速
    const highSpeed = 100; // 高速モード速度: ms
    const durationToHigh = 7000; // 高速モード起動時間

    // 長押し開始時の処理
    itemDiv.addEventListener('mousedown', startIncrementing);
    itemDiv.addEventListener('touchstart', startIncrementing);

    // 長押し終了時の処理
    itemDiv.addEventListener('mouseup', stopIncrementing);
    itemDiv.addEventListener('mouseleave', stopIncrementing);
    itemDiv.addEventListener('touchend', stopIncrementing);
    itemDiv.addEventListener('touchcancel', stopIncrementing);

    function startIncrementing(e) {
      if (e.type === 'touchstart') {
        e.preventDefault();
      }
      isIncrementing = true;
      pressStartTime = Date.now();
      incrementValue();

      function updateInterval() {
        clearInterval(incrementInterval);
        incrementInterval = setInterval(() => {
          if (isIncrementing) {
            const pressDuration = Date.now() - pressStartTime;

            // 速度変更の判定
            if (pressDuration > durationToHigh) {
              currentSpeed = highSpeed;
            } else if (pressDuration > durationToMiddle) {
              currentSpeed = middleSpeed;
            }

            incrementValue();
            updateInterval(); // 新しい速度で再設定
          }
        }, currentSpeed);
      }

      updateInterval();
    }

    function stopIncrementing() {
      isIncrementing = false;
      currentSpeed = defaultSpeed; // 速度を初期値に戻す
      clearInterval(incrementInterval);
    }

    function incrementValue() {
      const newValue = parseInt(input.value) + 1;
      input.value = newValue;
      badge.textContent = newValue;
      badge.style.display = newValue > 0 ? 'flex' : 'none';
      input.dispatchEvent(new Event('change'));
    }



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