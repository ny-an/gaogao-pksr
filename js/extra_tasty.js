// 大成功！
document.addEventListener('DOMContentLoaded', () => {
  const energyIcon = document.getElementById('energyIcon');
  const energyTastyIcon = document.getElementById('extraTastyIcon');
  const energyValue = document.getElementById('energyValue');

  // クリック可能かどうかを示すフラグ
  let isClickable = true;

  // Extra Tastyアイコンをクリックしたときの処理
  energyIcon.addEventListener('click', () => {
    if (!isClickable) return;
    const currentEnergy = parseInt(energyValue.textContent.replace(/,/g, ''), 10); // カンマを除去して数値に変換
    const targetEnergy = currentEnergy * 2;
    animateEnergyValue(currentEnergy, targetEnergy, energyValue);

    // クリック不可にする
    disableExtraTasty();
  });

  // 数値アニメーション関数
  function animateEnergyValue(start, target, element) {
    const duration = 200; // アニメーション時間 (ミリ秒)
    const startTime = performance.now();

    // 膨れ上がるアニメーションを開始
    element.classList.add('pop');

    function update(currentTime) {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1); // 進捗 (0〜1)
      const currentValue = start + (target - start) * progress; // 現在の値

      // 数値を更新
      element.textContent = Math.floor(currentValue).toLocaleString();

      // アニメーションを続行
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // アニメーション終了後に膨れ上がりを解除
        element.classList.remove('pop');
        // 2倍時に赤文字にする
        element.classList.add('doubled');
        // Extra Tastyアイコンを表示
        energyTastyIcon.style.display = 'block';
      }
    }

    // アニメーション開始
    requestAnimationFrame(update);
  }

  // Extra Tasty Iconを無効化する関数
  function disableExtraTasty() {
    isClickable = false;
    // energyIcon.classList.add('disabled');
  }

  // Extra Tasty Iconをリセットする関数
  function resetExtraTasty() {
    isClickable = true;
    // energyIcon.classList.remove('disabled');
    // 赤文字を解除
    energyValue.classList.remove('doubled');
    // びっくり非表示
    energyTastyIcon.style.display = 'none';
  }

  // リセット機能を外部から呼び出せるように公開
  window.resetExtraTasty = resetExtraTasty;

});
