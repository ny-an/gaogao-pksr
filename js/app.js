// LocalStorageのキー定数
const STORAGE_KEY = {
  LAST_CATEGORY: 'lastCategory',
  CATEGORY_FOODS: 'categoryFoods'  // カテゴリごとの最後に選択した料理を保存
};

document.addEventListener('DOMContentLoaded', () => {
  // 設定関連のselect要素を初期化
  initializeSettingOptions();

  // LocalStorageから前回の設定を読み込む
  let lastCategory = localStorage.getItem(STORAGE_KEY.LAST_CATEGORY) || "サラダ";
  let lastCategoryFoods = JSON.parse(localStorage.getItem(STORAGE_KEY.CATEGORY_FOODS) || "{}");

  // カテゴリ選択が変更された際の処理
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      // すべてのボタンからactiveクラスを外す
      categoryButtons.forEach(btn => btn.classList.remove('active'));

      // 選択されたボタンにactiveクラスを追加
      this.classList.add('active');

      // 選択されたカテゴリの料理リストを更新
      const selectedCategory = this.getAttribute('data-category');

      // カテゴリを保存
      localStorage.setItem(STORAGE_KEY.LAST_CATEGORY, selectedCategory);

      // 料理リストを更新
      updateFoodOptions(selectedCategory);

      // このカテゴリの前回選択した料理があれば選択
      const savedFood = lastCategoryFoods[selectedCategory];
      if (savedFood && foodSelect.querySelector(`option[value="${savedFood}"]`)) {
        foodSelect.value = savedFood;
        updateFoods();
      } else {
        // デフォルト初期表示
        selectFirstFoodOption();
      }
    });
  });

  // 料理選択が変更された際の処理
  foodSelect.addEventListener('change', function() {
    const selectedCategory = document.querySelector('.category-btn.active').getAttribute('data-category');

    // 現在のカテゴリの選択料理を保存
    lastCategoryFoods[selectedCategory] = this.value;
    localStorage.setItem(STORAGE_KEY.CATEGORY_FOODS, JSON.stringify(lastCategoryFoods));

    // 食材table更新
    updateFoods();
  });

  // 初期表示の設定
  // 前回選択していたカテゴリのボタンを探して押下
  const lastCategoryButton = [...categoryButtons].find(btn =>
    btn.getAttribute('data-category') === lastCategory
  );
  if (lastCategoryButton) {
    lastCategoryButton.click();
  }

});