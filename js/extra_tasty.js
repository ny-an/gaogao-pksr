

// 大成功！
document.addEventListener('DOMContentLoaded', () => {
  const energyIcon = document.getElementById('energyIcon');
  const energyTastyIcon = document.getElementById('extraTastyIcon');
  const energyValue = document.getElementById('energyValue');

  // HTML要素の複製用関数を追加
  function duplicateExtraTastyIcon() {
    const originalIcon = document.getElementById('extraTastyIcon');
    const newIcon = originalIcon.cloneNode(true);
    newIcon.id = 'extraTastyIcon2';
    newIcon.classList.remove('disabled');
    originalIcon.parentNode.insertBefore(newIcon, originalIcon.nextSibling);
  }

  // クリック可能かどうかを示すフラグ
  let isClickable = true;

  // クリック状態管理
  let clickState = 0; // 0: 通常, 1: 2倍, 2: 3倍

  // Extra Tastyアイコンをクリックしたときの処理
  energyIcon.addEventListener('click', () => {
    if (!isClickable) return;
    const currentEnergy = parseInt(energyValue.textContent.replace(/,/g, ''), 10); // カンマを除去して数値に変換
    let targetEnergy;

    if (clickState === 0) {
      // 1回目のクリック: 2倍
      targetEnergy = currentEnergy * 2;
      clickState = 1;
      energyValue.classList.add('doubled');
    } else if (clickState === 1) {
      // 2回目のクリック: さらに1.5倍
      targetEnergy = currentEnergy * 1.5;
      clickState = 2;
      energyValue.classList.add('tripled');

      // クリック不可にする
      disableExtraTasty();

      // びっくりびっくり！
      duplicateExtraTastyIcon();

    }

    animateEnergyValue(currentEnergy, targetEnergy, energyValue);
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

        // 花火
        startCentralFire();
      }
    }

    // アニメーション開始
    requestAnimationFrame(update);
  }

  // リセット関数を更新
  function resetExtraTasty() {
    isClickable = true;
    clickState = 0;
    energyValue.classList.remove('doubled', 'tripled');
    energyTastyIcon.style.display = 'none';
    const secondIcon = document.getElementById('extraTastyIcon2');
    if (secondIcon) {
      secondIcon.remove();
    }
  }

  // disable関数も更新
  function disableExtraTasty() {
    isClickable = false;
    clickState = 0;
    energyValue.classList.remove('doubled', 'tripled');
    const secondIcon = document.getElementById('extraTastyIcon2');
    if (secondIcon) {
      secondIcon.remove();
    }
  }

  // リセット機能を外部から呼び出せるように公開
  window.resetExtraTasty = resetExtraTasty;

});
