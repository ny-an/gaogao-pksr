// 初期設定の読み込みと食事エナジー再計算イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 設定変更時のイベントリスナー
  document.getElementById('fbBonus').addEventListener('change', handleSettingChange);
  document.getElementById('eventBonus').addEventListener('change', handleSettingChange);
  document.getElementById('recipeLevel').addEventListener('change', handleSettingChange);

});

// 料理設定：入力値チェック
document.addEventListener('DOMContentLoaded', () => {
  const fbBonusInput = document.getElementById('fbBonus');
  const recipeLevelInput = document.getElementById('recipeLevel');

  // FBボーナスの入力値検証
  fbBonusInput.addEventListener('input', () => {
    const value = validateInput(parseInt(fbBonusInput.value, 10), FB_BONUS_MIN, FB_BONUS_MAX);
    fbBonusInput.value = isNaN(value) ? '' : value;
  });

  fbBonusInput.addEventListener('change', () => {
    const value = validateInput(parseInt(fbBonusInput.value, 10), FB_BONUS_MIN, FB_BONUS_MAX);
    fbBonusInput.value = isNaN(value) ? '' : value;
  });

  // レシピボーナスの入力値検証
  recipeLevelInput.addEventListener('input', () => {
    const value = validateInput(parseInt(recipeLevelInput.value, 10), RECIPE_LEVEL_MIN, RECIPE_LEVEL_MAX);
    recipeLevelInput.value = isNaN(value) ? '' : value;
  });

  recipeLevelInput.addEventListener('change', () => {
    const value = validateInput(parseInt(recipeLevelInput.value, 10), RECIPE_LEVEL_MIN, RECIPE_LEVEL_MAX);
    recipeLevelInput.value = isNaN(value) ? '' : value;
  });
});
