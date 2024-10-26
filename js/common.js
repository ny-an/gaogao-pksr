// 画像ファイルパスを生成するための関数
function getIngredientImagePath(ingredient) {
  const imageMap = {
    "マメミート": "BeanSausage",
    "とくせんリンゴ": "FancyApple",
    "とくせんエッグ": "FancyEgg",
    "げきからハーブ": "FieryHerb",
    "ワカクサコーン": "GreengrassCorn",
    "ワカクサ大豆": "GreengrassSoybeans",
    "あまいミツ": "Honey",
    "ふといながねぎ": "LargeLeek",
    "モーモーミルク": "MoomooMilk",
    "ピュアなオイル": "PureOil",
    "おいしいシッポ": "SlowpokeTail",
    "あんみんトマト": "SnoozyTomato",
    "ほっこりポテト": "SoftPotato",
    "リラックスカカオ": "SoothingCacao",
    "あじわいキノコ": "TastyMushroom",
    "あったかジンジャー": "WarmingGinger",
    "めざましコーヒー": "RousingCoffee",
  };
  return `img/ingredients/svg/${imageMap[ingredient] || 'default.svg'}.svg`;
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