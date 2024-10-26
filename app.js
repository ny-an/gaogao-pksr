
const categorySelect = document.getElementById('categorySelect');
const foodSelect = document.getElementById('foodSelect');
const ingredientTableBody = document.querySelector('#ingredientTable tbody');
const total1 = document.getElementById('total1');
const total3 = document.getElementById('total3');
const total15 = document.getElementById('total15');
const total21 = document.getElementById('total21');

// 並べ替え済み料理
const dishes = sortDishesByTotalIngredients( org_dishes )

// カテゴリ選択時に料理選択を更新
categorySelect.addEventListener('change', function() {
  const selectedCategory = categorySelect.value;
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
  // 料理選択が変更された場合は食材リストを初期化
  updateIngredients();
});

// 必要食材リストを更新
foodSelect.addEventListener('change', updateIngredients);

function updateIngredients() {
  const selectedCategory = categorySelect.value;
  const selectedDish = foodSelect.value;

  ingredientTableBody.innerHTML = ""; // テーブルの内容を初期化
  let sum1 = 0, sum3 = 0, sum15 = 0, sum21 = 0;

  if (selectedCategory && selectedDish && dishes[selectedCategory] && dishes[selectedCategory][selectedDish]) {
    const ingredients = dishes[selectedCategory][selectedDish];

    for (const [ingredient, amount] of Object.entries(ingredients)) {
      const row = document.createElement('tr');
      const amount1 = amount;
      const amount3 = amount * 3;
      const amount15 = amount * 15;
      const amount21 = amount * 21;

      sum1 += amount1;
      sum3 += amount3;
      sum15 += amount15;
      sum21 += amount21;

      row.innerHTML = `
                    <td>${ingredient}</td>
                    <td>${amount1}</td>
                    <td>${amount3}</td>
                    <td>${amount15}</td>
                    <td>${amount21}</td>
                `;
      ingredientTableBody.appendChild(row);
    }
  }

  // 合計の表示を更新
  total1.textContent = sum1;
  total3.textContent = sum3;
  total15.textContent = sum15;
  total21.textContent = sum21;
}

// 初期表示の設定
updateIngredients();



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