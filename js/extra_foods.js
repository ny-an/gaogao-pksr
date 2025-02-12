document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleExtraFoods');
  const extraContainer = document.getElementById('extraFoodsContainer');
  if (!toggleBtn || !extraContainer) {
    console.error('toggleボタンまたは追加食材エリアが見つかりません。IDを確認してください。');
    return;
  }

  // 初期状態でエリアを非表示にする
  extraContainer.style.display = 'none';

  toggleBtn.addEventListener('click', () => {
    // getComputedStyleを利用して正確な表示状態を取得
    const currentDisplay = window.getComputedStyle(extraContainer).display;

    if (currentDisplay === 'none') {
      extraContainer.style.display = 'grid'; // CSSで定義したグリッドレイアウトが適用される前提
      toggleBtn.textContent = '追加食材 ▼';
    } else {
      extraContainer.style.display = 'none';
      toggleBtn.textContent = '追加食材 ▶';
    }
  });
});


// render
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

    // common.js に定義されている getFoodImagePath 関数を使用して画像要素を作成する
    const img = document.createElement('img');
    img.src = getFoodImagePath(foodName);
    img.alt = foodName;

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