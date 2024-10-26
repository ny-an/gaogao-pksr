const categoryRadios = document.querySelectorAll('input[name="category"]');
const foodSelect = document.getElementById('foodSelect');
const ingredientTableBody = document.querySelector('#ingredientTable tbody');
const total1 = document.getElementById('total1');
const total3 = document.getElementById('total3');
const total15 = document.getElementById('total15');
const total21 = document.getElementById('total21');

// 並べ替え済み料理を使用する
const dishes = sortDishesByTotalIngredients( org_dishes )

// カテゴリ選択が変更された際の処理
categoryRadios.forEach(radio => {
  radio.addEventListener('change', function() {
    const selectedCategory = document.querySelector('input[name="category"]:checked').value;
    updateFoodOptions(selectedCategory);
  });
});

// 必要食材リストを更新
foodSelect.addEventListener('change', updateIngredients);

function updateIngredients() {
  const selectedCategory = document.querySelector('input[name="category"]:checked')?.value;
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

      // 画像のHTMLコードを生成
      const imgPath = getIngredientImagePath(ingredient);
      const imgTag = `<img src="${imgPath}" alt="${ingredient}" style="width: 30px; height: 30px;">`;

      row.innerHTML = `
                <td>${imgTag}</td>
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

// 初期表示として「サラダ」カテゴリを設定
updateFoodOptions("サラダ");


