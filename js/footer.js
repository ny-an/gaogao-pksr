document.addEventListener('DOMContentLoaded', () => {
  const pageId = document.body.id.replace('page-', '');
  const footerItems = document.querySelectorAll('.footer-item');

  // ページに応じたアクティブ状態の設定
  function setActiveItem() {
    footerItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageId) {
        item.classList.add('active');
        setTimeout(() => {
          const img = item.querySelector('img');
          const newSrc = img.src.replace('1.svg', '2.svg');
          img.src = newSrc;
        }, 3000);
      }
    });
  }

  // クリックイベントの設定
  footerItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      window.location.href = page === 'index' ? 'index.html' : `${page}.html`;
    });
  });

  // 初期状態の設定
  setActiveItem();
});