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

  // 各食材について、アイコン、数値入力、ラベルを持つボックスを作成する
  foods.forEach(([foodName, energy]) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'extra-food-item';

    // 画像要素を作成
    const img = document.createElement('img');
    img.src = getFoodImagePath(foodName);
    img.alt = foodName;

    // 画像タップ時のイベントを追加
    img.addEventListener('click', () => {
      // inputを+1
      const input = itemDiv.querySelector('input');
      input.value ++;
      // 変更イベントを発火して料理エナジーを更新
      input.dispatchEvent(new Event('change'));
    });

    // 数値入力要素を作成する
    const input = document.createElement('input');
    input.type = 'number';
    input.value = "0";
    input.min = "0";
    input.className = 'extra-food';
    input.setAttribute('data-food', foodName);

    // ラベル要素を作成する（エナジー数値を表示）
    const label = document.createElement('div');
    label.className = 'food-label';
    label.textContent = `${energy}`;

    // アイコン、入力、ラベルをボックスに追加する
    itemDiv.appendChild(img);
    itemDiv.appendChild(label);
    itemDiv.appendChild(input);

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