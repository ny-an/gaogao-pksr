// 料理設定折りたたみ
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
  });

  // 初期状態で折りたたむ
  settingsContainer.classList.add('collapsed');
  toggleButton.textContent = '料理設定 ▶';
});
