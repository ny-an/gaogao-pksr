// body
document.addEventListener('DOMContentLoaded', () => {

  // 設定関連のselect要素を初期化
  initializeSettingOptions();

  // カテゴリ選択が変更された際の処理
  categoryButtons.forEach(button => {
    button.addEventListener('click', function () {
      console.log('button click');

      // すべてのボタンからactiveクラスを外す
      categoryButtons.forEach(btn => btn.classList.remove('active'));

      // 選択されたボタンにactiveクラスを追加
      this.classList.add('active');

      // 選択されたカテゴリの料理リストを更新
      const selectedCategory = this.getAttribute('data-category');
      updateFoodOptions(selectedCategory);
      selectFirstFoodOption(); // 一番上の料理を自動で選択
    });
  });

  // 必要食材リストを更新
  foodSelect.addEventListener('change', updateFoods);

  // 初期表示の設定
  updateFoodOptions("サラダ");

  // 一番上の料理を自動で選択
  selectFirstFoodOption();

  // app-versionを記載
  document.getElementById('app-version').innerText = CACHE_VER;

  // versionをclickでスーパーリロード
  document.getElementById('app-version').addEventListener('click', () => {
    superReload();
  });

});
