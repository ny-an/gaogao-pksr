(() => {
  'use strict';

  function enabled(locationObject = window.location) {
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(locationObject.hostname);
    const localPage = locationObject.protocol === 'file:' || localHost;
    return localPage && new URLSearchParams(locationObject.search).get('debug') === '1';
  }

  function mount({ title = '料理パズル', getSummary, actions = [] } = {}) {
    if (!enabled() || document.querySelector('.koiki-debug')) return null;

    const style = document.createElement('style');
    style.textContent = `
      .koiki-debug { position: fixed; z-index: 12000; top: 8px; right: 8px; color: #f4f4f4; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .koiki-debug summary { width: max-content; margin-left: auto; padding: 7px 10px; border: 1px solid #e8a343; color: #fff; background: #24211d; cursor: pointer; list-style: none; font-weight: 900; letter-spacing: .08em; }
      .koiki-debug summary::-webkit-details-marker { display: none; }
      .koiki-debug-panel { width: min(320px, calc(100vw - 16px)); border: 1px solid #e8a343; background: rgba(29, 27, 24, .97); box-shadow: 0 10px 30px rgba(0, 0, 0, .35); }
      .koiki-debug-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 10px; border-bottom: 1px solid #595047; }
      .koiki-debug-head strong { color: #ffc46f; }
      .koiki-debug-head span { color: #aaa29a; font-size: 10px; }
      .koiki-debug-summary { margin: 0; padding: 9px 10px; color: #e9e3dc; line-height: 1.5; }
      .koiki-debug-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #595047; }
      .koiki-debug-actions button { min-height: 38px; padding: 7px 6px; border: 0; border-right: 1px solid #595047; border-bottom: 1px solid #595047; color: #f4f4f4; background: #35302b; font: inherit; font-weight: 800; cursor: pointer; }
      .koiki-debug-actions button:nth-child(2n) { border-right: 0; }
      .koiki-debug-actions button:hover { background: #494139; }
      .koiki-debug-actions button:disabled { opacity: .45; cursor: wait; }
      .koiki-debug-actions button[data-tone="danger"] { color: #ffaaa1; }
      .koiki-debug-status { min-height: 30px; margin: 0; padding: 7px 10px; color: #bdb6af; line-height: 1.4; }
      @media (max-width: 420px) { .koiki-debug { top: 4px; right: 4px; } }
    `;
    document.head.append(style);

    const root = document.createElement('details');
    root.className = 'koiki-debug';
    root.innerHTML = `
      <summary>DEBUG</summary>
      <div class="koiki-debug-panel" role="region" aria-label="ローカルデバッグ">
        <div class="koiki-debug-head"><strong>${title}</strong><span>LOCAL ONLY</span></div>
        <p class="koiki-debug-summary"></p>
        <div class="koiki-debug-actions"></div>
        <p class="koiki-debug-status">操作は現在のローカルセーブに反映されます。</p>
      </div>
    `;
    document.body.append(root);

    const summary = root.querySelector('.koiki-debug-summary');
    const actionList = root.querySelector('.koiki-debug-actions');
    const status = root.querySelector('.koiki-debug-status');

    function refresh() {
      summary.textContent = typeof getSummary === 'function' ? getSummary() : '';
    }

    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      if (action.tone) button.dataset.tone = action.tone;
      button.addEventListener('click', async () => {
        const buttons = [...actionList.querySelectorAll('button')];
        buttons.forEach(item => { item.disabled = true; });
        try {
          await action.run();
          status.textContent = `${action.label}：完了`;
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : '操作できませんでした。';
        } finally {
          buttons.forEach(item => { item.disabled = false; });
          refresh();
        }
      });
      actionList.append(button);
    });

    root.addEventListener('toggle', () => { if (root.open) refresh(); });
    refresh();
    return Object.freeze({ refresh });
  }

  window.KoikiDebugPanel = Object.freeze({ enabled, mount });
})();
