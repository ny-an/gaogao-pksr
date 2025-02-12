// 設定値の最小値と最大値
const FB_BONUS_MIN = 0;
const FB_BONUS_MAX = 75;
const RECIPE_LEVEL_MIN = 0;
const RECIPE_LEVEL_MAX = 60;

/**
 * 入力値を検証し、範囲内に収める
 * @param {number} value - 検証する値
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @returns {number} - 検証後の値
 */
function validateInput(value, min, max) {
  if (isNaN(value) || value < min) {
    return min;
  } else if (value > max) {
    return max;
  }
  return value;
}

// 料理エナジー計算
function getCookingEnergy() {
  console.log('getFinalEnergy start');
  const selectedDish = foodSelect.value;

  // 料理リストからレシピ基本エナジーを取得
  const energy = dishesEnergyList[selectedDish] || 0;
  console.log('energy:',energy)

  // 料理レシピボーナス
  const recipeLevel = parseInt(document.getElementById('recipeLevel').value, 10);
  const recipeBonus = recipeLevelBonusList[recipeLevel] || 0;
  console.log('recipeLevel:',recipeLevel)
  console.log('recipeBonus:',recipeBonus)

  // レシピレベルボーナス分を計算（小数点以下を四捨五入）
  const recipeLevelBonus = Math.round(energy * (recipeBonus / 100));
  console.log('recipeLevelBonus:',recipeLevelBonus)

  // レシピ画面の表示エナジー
  const recipeDisplayEnergy = energy + recipeLevelBonus;
  console.log('recipeDisplayEnergy:',recipeDisplayEnergy)

  // 追加食材の総エナジー：追加食材ごとに[数*食材エナジー]を足し合わせる
  let extraAddEnergy = 0;
  document.querySelectorAll('.extra-food').forEach(input => {
    const quantity = parseInt(input.value, 10) || 0;
    const foodName = input.getAttribute('data-food');
    const foodEnergy = foodEnergyMap[foodName] || 0;
    extraAddEnergy += quantity * foodEnergy;
  });
  console.log('extraAddEnergy:',extraAddEnergy);

  // FBボーナス
  const fbBonus = 1 + (parseInt(document.getElementById('fbBonus').value, 10) / 100);
  console.log('fbBonus:',fbBonus)

  // イベントボーナス
  const eventBonus = parseFloat(document.getElementById('eventBonus').value);
  console.log('eventBonus:',eventBonus)

  // 最終エナジー
  const finalEnergy = Math.floor((recipeDisplayEnergy + extraAddEnergy ) * fbBonus * eventBonus);
  console.log('finalEnergy:',finalEnergy)
  console.log('type',typeof finalEnergy);

  return finalEnergy;
}

// 料理エナジー表示
function setCookingEnergy(energy) {
  const finalEnergy = energy ?? getCookingEnergy(); // エナジーを取得
  document.getElementById('energyValue').textContent = finalEnergy.toLocaleString(); // エナジーを表示

  // エナジーを送信
  sendEnergy(finalEnergy);
}

// 設定をlocalStorageから読み込む
function loadSettings() {
  // FBボーナスの検証
  const fbBonus = validateInput(parseInt(localStorage.getItem('fbBonus'), 10), FB_BONUS_MIN, FB_BONUS_MAX);
  // レシピボーナスの検証
  const recipeLevel = validateInput(parseInt(localStorage.getItem('recipeLevel'), 10), RECIPE_LEVEL_MIN, RECIPE_LEVEL_MAX);
  // イベントボーナス
  const eventBonus = localStorage.getItem('eventBonus') || 1;

  document.getElementById('fbBonus').value = fbBonus;
  document.getElementById('eventBonus').value = eventBonus;
  document.getElementById('recipeLevel').value = recipeLevel;
}

// 設定をlocalStorageに保存する
function saveSettings() {
  // FBボーナスの検証
  const fbBonusInput = document.getElementById('fbBonus');
  const fbBonus = validateInput(parseInt(fbBonusInput.value, 10), FB_BONUS_MIN, FB_BONUS_MAX);

  // レシピボーナスの検証
  const recipeLevelInput = document.getElementById('recipeLevel');
  const recipeLevel = validateInput(parseInt(recipeLevelInput.value, 10), RECIPE_LEVEL_MIN, RECIPE_LEVEL_MAX);

  // イベントボーナス
  const eventBonus = document.getElementById('eventBonus').value;

  localStorage.setItem('fbBonus', fbBonus);
  localStorage.setItem('recipeLevel', recipeLevel);
  localStorage.setItem('eventBonus', eventBonus);
}

// 設定変更時に再計算する
function handleSettingChange() {
  saveSettings();
  updateFoods(); // エナジーを再計算
}
