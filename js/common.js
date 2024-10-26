// 画像ファイルパスを生成するための関数
function getIngredientImagePath(ingredient) {
  const imageMap = {
    "マメミート": "BeanSausage.png",
    "とくせんリンゴ": "FancyApple.png",
    "とくせんエッグ": "FancyEgg.png",
    "げきからハーブ": "FieryHerb.png",
    "ワカクサコーン": "GreengrassCorn.png",
    "ワカクサ大豆": "GreengrassSoybeans.png",
    "あまいミツ": "Honey.png",
    "ふといながねぎ": "LargeLeek.png",
    "モーモーミルク": "MoomooMilk.png",
    "ピュアなオイル": "PureOil.png",
    "めざましコーヒー": "RousingCoffee.png",
    "おいしいシッポ": "SlowpokeTail.png",
    "あんみんトマト": "SnoozyTomato.png",
    "ほっこりポテト": "SoftPotato.png",
    "リラックスカカオ": "SoothingCacao.png",
    "あじわいキノコ": "TastyMushroom.png",
    "あったかジンジャー": "WarmingGinger.png"
  };
  return `img/dishes/png/${imageMap[ingredient] || 'default.png'}`;
}



// 料理リストを更新する関数
function updateFoodOptions(selectedCategory) {
  foodSelect.innerHTML = '<option value="">-- 料理を選択 --</option>';

  if (selectedCategory && dishes[selectedCategory]) {
    // 選択されたカテゴリに属する料理をfoodSelectに追加
    for (const dish in dishes[selectedCategory]) {
      const option = document.createElement('option');
      option.value = dish;
      option.textContent = dish;
      foodSelect.appendChild(option);
    }
  }
  // 食材リストを初期化
  updateIngredients();
}


// カテゴリ内の料理を合計食材数が多い順にソートする関数
function sortDishesByTotalIngredients(dishes) {
  const sortedDishes = {};

  for (const category in dishes) {
    // 各料理の合計食材数を計算
    const recipes = Object.entries(dishes[category]).map(([dish, ingredients]) => {
      const totalIngredients = Object.values(ingredients).reduce((sum, amount) => sum + amount, 0);
      return { dish, ingredients, totalIngredients };
    });

    // 合計食材数でソート
    recipes.sort((a, b) => b.totalIngredients - a.totalIngredients);

    // ソートした結果を新しいオブジェクトとして保存
    sortedDishes[category] = recipes.reduce((acc, { dish, ingredients }) => {
      acc[dish] = ingredients;
      return acc;
    }, {});
  }

  return sortedDishes;
}