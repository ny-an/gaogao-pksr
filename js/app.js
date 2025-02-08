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
  document.getElementById('app-version').innerText = CACHE_VER;

  // versionをclickでスーパーリロード
  document.getElementById('app-version').addEventListener('click', () => {
    superReload();
  });

});

// 設定アイコン
document.addEventListener('DOMContentLoaded', () => {
  const settingsIcon = document.querySelector('.settings-icon');
  const creditModal = document.getElementById('creditModal');
  const closeModal = document.querySelector('.close');

  // 設定アイコンをクリックしたときにモーダルを表示
  settingsIcon.addEventListener('click', () => {
    creditModal.style.display = 'block';

    // 花火だドン！
    startSchoolPride();
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

// 設定折りたたみ
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleSettings');
  const settingsContainer = document.getElementById('settingsContainer');

  console.log('toggleButton:', toggleButton);
  console.log('settingsContainer:', settingsContainer);

  // 要素が存在するか確認
  if (!toggleButton || !settingsContainer) {
    console.error('要素が見つかりません。');
    return;
  }

  // 初期状態を設定
  let isCollapsed = true;

  // ボタンのクリックイベント
  toggleButton.addEventListener('click', () => {
    // 開いたときだけ色つける
    toggleButton.classList.toggle('active', isCollapsed);
    // 折りたたみ状態を切り替え
    isCollapsed = !isCollapsed;
    settingsContainer.classList.toggle('collapsed', isCollapsed);
    toggleButton.textContent = isCollapsed ? '料理設定 ▶' : '料理設定 ▼';

    // 開くときはページ下までスクロール
    if (!isCollapsed) {
      const doc = document.documentElement;
      const bottom = doc.scrollHeight - doc.clientHeight;
      window.scroll({top: bottom, behavior: 'smooth'})
    }
  });

  // 初期状態で折りたたむ
  settingsContainer.classList.add('collapsed');
  toggleButton.textContent = '料理設定 ▶';
});
