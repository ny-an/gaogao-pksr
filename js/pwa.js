let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // ユーザーが閉じた日時を取得
  const lastDismissed = localStorage.getItem('installHintDismissedAt');

  // 現在の日時と比較して24時間以上経過していればヒントを表示
  if (!lastDismissed || isMoreThanOneDay(new Date(lastDismissed))) {
    showInstallHint();
  }
});

function showInstallHint() {
  const hintElement = document.createElement('div');
  hintElement.classList.add('install-hint');
  hintElement.innerHTML = `
    <p>このアプリをホーム画面に追加できます！<a href="#" id="closeHint" class="close-hint">[閉じる]</a></p>
    <button id="installButton">ホーム画面に追加</button>
  `;

  document.body.appendChild(hintElement);

  const installButton = document.getElementById('installButton');
  const closeHint = document.getElementById('closeHint');

  // インストールボタンが押されたときの処理
  installButton.addEventListener('click', () => {
    hintElement.style.display = 'none';
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('ユーザーがインストールを承認しました');
      } else {
        console.log('ユーザーがインストールを拒否しました');
      }
      deferredPrompt = null;
    });
  });

  // 閉じるリンクが押されたときの処理
  closeHint.addEventListener('click', (e) => {
    e.preventDefault();
    hintElement.style.display = 'none';
    localStorage.setItem('installHintDismissedAt', new Date().toISOString()); // ヒントを閉じた日時を記録
  });
}

// 1日経過したかどうかをチェックする関数
function isMoreThanOneDay(lastDismissedDate) {
  const now = new Date();
  const lastDismissed = new Date(lastDismissedDate);
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  return (now - lastDismissed) > oneDayInMilliseconds;
}




// pwa
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/gaogao-pksr/sw.js')  // リポジトリのパスに応じて変更
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    alert("新しいバージョンが利用可能です。アプリを再読み込みしてください。");
    location.reload();
  });
}

