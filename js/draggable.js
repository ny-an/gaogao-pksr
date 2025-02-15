document.addEventListener('DOMContentLoaded', () => {
  const settingsIcon = document.querySelector('.settings-icon');
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let animationFrameId = null;

  // pointerdownイベントでドラッグ開始
  settingsIcon.addEventListener('pointerdown', e => {
    isDragging = true;
    // ドラッグ開始時のマウス位置から、現時点のオフセット値を差し引いておく
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    // pointercaptureを開始することで、ドラッグ中のpointerイベントを確実に受け取る
    settingsIcon.setPointerCapture(e.pointerId);
  });

  // pointermoveイベントでドラッグ中の移動を処理
  settingsIcon.addEventListener('pointermove', e => {
    if (!isDragging) return;
    e.preventDefault();
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    // requestAnimationFrameで描画更新を最適化
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        settingsIcon.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        animationFrameId = null;
      });
    }
  });

  // pointerup/pointercancelでドラッグ終了
  settingsIcon.addEventListener('pointerup', e => {
    isDragging = false;
    settingsIcon.releasePointerCapture(e.pointerId);
  });

  settingsIcon.addEventListener('pointercancel', e => {
    isDragging = false;
    settingsIcon.releasePointerCapture(e.pointerId);
  });
});
