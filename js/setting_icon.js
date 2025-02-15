// 設定アイコン
document.addEventListener('DOMContentLoaded', () => {
  const settingsIcon = document.querySelector('.settings-icon');
  const creditModal = document.getElementById('creditModal');
  const closeModal = document.querySelector('.close');

  // 設定アイコンをクリックしたときにモーダルを表示
  settingsIcon.addEventListener('click', () => {
    creditModal.style.display = 'block';

    // 花火だドン！
    startSideFire();
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
