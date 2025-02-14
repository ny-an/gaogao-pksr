const categoryButtons = document.querySelectorAll('.category-btn');
const foodSelect = document.getElementById('foodSelect');
const foodTableBody = document.querySelector('#foodTable tbody');
const total1 = document.getElementById('total1');
const total3 = document.getElementById('total3');
const total15 = document.getElementById('total15');
const total21 = document.getElementById('total21');

// 並べ替え済み料理を使用する
const dishes = typeof org_dishes !== 'undefined' ? sortDishesByTotalFoods(org_dishes) : {};

// カテゴリ内の料理を合計食材数が多い順にソートする関数
function sortDishesByTotalFoods(dishes) {
  const sortedDishes = {};

  for (const category in dishes) {
    // 各料理の合計食材数を計算
    const recipes = Object.entries(dishes[category]).map(([dish, foods]) => {
      const totalFoods = Object.values(foods).reduce((sum, amount) => sum + amount, 0);
      return { dish, foods, totalFoods };
    });

    // 合計食材数でソート
    recipes.sort((a, b) => b.totalFoods - a.totalFoods);

    // ソートした結果を新しいオブジェクトとして保存
    sortedDishes[category] = recipes.reduce((acc, { dish, foods }) => {
      acc[dish] = foods;
      return acc;
    }, {});
  }

  return sortedDishes;
}

// 画像ファイルパスを生成するための関数
function getFoodImagePath(food) {
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
  return `img/foods/svg/${imageMap[food] || 'default.svg'}.svg`;
}

// カテゴリ選択時に料理リストを更新する関数
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
  updateFoods();
}

// 最初の料理を自動で選択する関数
function selectFirstFoodOption() {
  console.log('selectFirstFoodOption')
  const foodSelect = document.getElementById('foodSelect');
  setTimeout(()=>{
    if (foodSelect.options.length > 0) {
      foodSelect.selectedIndex = 1; // 最初の項目を選択

      // 食材テーブル更新
      updateFoods();
    }
  },50)

}

// 表示中の料理の食材リストを取得する関数
const getViewingFoods = () => {
  const selectedCategoryButton = document.querySelector('.category-btn.active');
  const selectedCategory = selectedCategoryButton ? selectedCategoryButton.getAttribute('data-category') : null;
  const selectedDish = foodSelect.value;
  const foods = dishes[selectedCategory][selectedDish];

  return foods;
}

// 料理選択時のテーブル更新
function updateFoods() {

  // 表示中の食材取得
  const foods = getViewingFoods();

  foodTableBody.innerHTML = ""; // テーブルの内容を初期化
  let sum1 = 0, sum3 = 0, sum15 = 0, sum21 = 0;

  if (foods) {
    let rowsHtml = ""; // HTML文字列を一度に生成

    // 各食材ごとに行のHTMLを作成
    for (const [food, amount] of Object.entries(foods)) {
      const amount1 = amount;
      const amount3 = amount * 3;
      const amount15 = amount * 15;
      const amount21 = amount * 21;

      sum1 += amount1;
      sum3 += amount3;
      sum15 += amount15;
      sum21 += amount21;

      // 画像のHTMLコードを生成
      const imgPath = getFoodImagePath(food);
      const imgTag = `<img src="${imgPath}" alt="${food}" style="width: 30px; height: 30px;">`;

      // 各行のHTMLを生成し、rowsHtmlに追加
      rowsHtml += `
        <tr>
          <td>${imgTag}</td>
          <td>${amount1}</td>
          <td>${amount3}</td>
          <td>${amount15}</td>
          <td>${amount21}</td>
        </tr>
      `;
    }

    // 生成したHTMLを一度に挿入
    foodTableBody.innerHTML = rowsHtml;

    // 料理エナジー表示
    setCookingEnergy();

    // 大成功リセット
    resetExtraTasty();

  }else{
    // 料理が選択されていない場合、エナジーを0に設定
    document.getElementById('energyValue').textContent = "0";
  }

  // 合計の表示を更新
  total1.textContent = sum1;
  total3.textContent = sum3;
  total15.textContent = sum15;
  total21.textContent = sum21;
}

// スーパーリロードを実行する関数
function superReload() {
  // キャッシュを削除してからリロード
  caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_VER) {
          return caches.delete(cacheName);
        }
      })
    );
  }).then(() => {
    // キャッシュ削除後にリロード
    const url = window.location.href.split('?')[0] + '?reload=' + new Date().getTime();
    window.location.href = url;
  });
}

// titleページ遷移：クリックイベントを設定
document.getElementById('title').addEventListener('click', () => {
  console.log('titleページ遷移');
  const body_id = document.querySelector('body').id;
  const currentPage = body_id.split('-')[1];
  console.log(currentPage);

  if (currentPage === 'index') {
    location.href = 'calender.html?ver=' + CACHE_VER;
  } else if (currentPage === 'calendar') {
    location.href = 'index.html?ver=' + CACHE_VER;
  }
});