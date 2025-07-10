// version_manager.js
const VersionManager = {
  init() {
    const versionElement = document.getElementById('app-version');
    if (!versionElement) return;

    // バージョン表示
    versionElement.innerText = CACHE_VER;

    // クリックイベントの設定
    versionElement.addEventListener('click', () => {
      this.handleVersionClick();
    });
  },

  handleVersionClick() {
    if (typeof superReload === 'function') {
      superReload();
    } else {
      console.warn('superReload function is not defined');
    }
  }
};

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', () => {
  VersionManager.init();
});