
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

// 初期表示の設定
updateIngredients();

// 初期表示として「サラダ」カテゴリを設定
updateFoodOptions("サラダ");


