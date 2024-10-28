// body
document.addEventListener('DOMContentLoaded', () => {

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
  foodSelect.addEventListener('change', updateIngredients);

  // 初期表示の設定
  updateFoodOptions("サラダ");

  // 一番上の料理を自動で選択
  selectFirstFoodOption();

  // app-versionを記載
  document.getElementById('app-version').innerText = CACHE_NAME;
});

// 設定アイコン
document.addEventListener('DOMContentLoaded', () => {
  const settingsIcon = document.querySelector('.settings-icon');
  const creditModal = document.getElementById('creditModal');
  const closeModal = document.querySelector('.close');

  // 設定アイコンをクリックしたときにモーダルを表示
  settingsIcon.addEventListener('click', () => {
    creditModal.style.display = 'block';
  });

  // モーダルの「×」ボタンをクリックしてモーダルを閉じる
  closeModal.addEventListener('click', () => {
    creditModal.style.display = 'none';
  });

  // モーダルの外側をクリックしてモーダルを閉じる
  window.addEventListener('click', (event) => {
    if (event.target === creditModal) {
      creditModal.style.display = 'none';
    }
  });

  // SPタッチイベント対応：モーダルの外側をクリックしてモーダルを閉じる
  window.addEventListener('touchstart', (event) => {
    if (event.target === creditModal) {
      creditModal.style.display = 'none';
    }
  });
});
