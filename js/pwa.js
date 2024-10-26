// pwa.js

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallHint(); // ヒント表示
});

function showInstallHint() {
  const hintElement = document.createElement('div');
  hintElement.textContent = 'このアプリをホーム画面に追加できます！';
  hintElement.classList.add('install-hint');

  const installButton = document.createElement('button');
  installButton.textContent = 'ホーム画面に追加';
  hintElement.appendChild(installButton);

  document.body.appendChild(hintElement);

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
}

// Service Workerの登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
