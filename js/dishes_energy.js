/**
 * 料理エナジー
 * @see https://wikiwiki.jp/poke_sleep/E69699E79086/E383ACE382B7E38394E38194E381A8E381AEE78DB2E5BE97E381A7E3818DE3828BE382A8E3838AE382B8E383BCE9878F
 */
const dishesEnergyList = {
  "とくせんリンゴカレー": 748,
  "あぶりテールカレー": 7483,
  "サンパワートマトカレー": 2078,
  "ぜったいねむりバターカレー": 9010,
  "からくちネギもりカレー": 5900,
  "キノコのほうしカレー": 4162,
  "おやこあいカレー": 4523,
  "満腹チーズバーグカレー": 1910,
  "ほっこりホワイトシチュー": 3181,
  "たんじゅんホワイトシチュー": 814,
  "マメバーグカレー": 856,
  "ベイビィハニーカレー": 839,
  "ニンジャカレー": 9445,
  "ひでりカツレツカレー": 1942,
  "とけるオムカレー": 2150,
  "ビルドアップマメカレー": 3372,
  "じゅうなんコーンシチュー": 4670,
  "れんごくコーンキーマカレー": 13690,
  "ピヨピヨパンチ辛口カレー": 5702,
  "めざめるパワーシチュー": 19061,
  "まけんきコーヒーサラダ": 20218,
  "クロスチョップドサラダ": 8755,
  "みだれづきコーンサラダ": 2785,
  "めいそうスイートサラダ": 7675,
  "ワカクササラダ": 11393,
  "ねっぷうとうふサラダ": 2114,
  "ニンジャサラダ": 11659,
  "メロメロりんごのチーズサラダ": 2655,
  "めんえきねぎサラダ": 2845,
  "とくせんリンゴサラダ": 855,
  "オーバーヒートサラダ": 5225,
  "ムラっけチョコミートサラダ": 3665,
  "モーモーカプレーゼ": 2942,
  "あんみんトマトサラダ": 1045,
  "マメハムサラダ": 978,
  "ばかぢからワイルドサラダ": 3046,
  "うるおいとうふサラダ": 3113,
  "くいしんぼうポテトサラダ": 5040,
  "ゆきかきシーザーサラダ": 1898,
  "キノコのほうしサラダ": 5859,
  "ヤドンテールのペッパーサラダ": 8169,
  "じゅくせいスイートポテト": 1907,
  "ふくつのジンジャークッキー": 4921,
  "とくせんリンゴジュース": 855,
  "クラフトサイコソーダ": 1079,
  "ひのこのジンジャーティー": 1913,
  "プリンのプリンアラモード": 7594,
  "あくまのキッスフルーツオレ": 4734,
  "ねがいごとアップルパイ": 1748,
  "ネロリのデトックスティー": 5065,
  "あまいかおりチョコケーキ": 3378,
  "モーモーホットミルク": 814,
  "かるわざソイケーキ": 1924,
  "はりきりプロテインスムージー": 3263,
  "マイペースやさいジュース": 1924,
  "おおきいマラサダ": 3015,
  "ちからもちソイドーナッツ": 5547,
  "だいばくはつポップコーン": 6048,
  "おちゃかいコーンスコーン": 10925,
  "はなびらのまいチョコタルト": 3314,
  "フラワーギフトマカロン": 13834,
  "はやおきコーヒーゼリー": 6793,
  "スパークスパイスコーラ": 17494
};

/**
 * 料理レシピボーナス
 * @see https://docs.google.com/spreadsheets/d/1L-vCvm0sMY-_gbPqXl2SebUW-94RndwcXSDJTB5NIik/edit?gid=959300040#gid=959300040
 */
const recipeLevelBonusList = {
  "0": "0",
  "1": "0",
  "2": "2",
  "3": "4",
  "4": "6",
  "5": "8",
  "6": "9",
  "7": "11",
  "8": "13",
  "9": "16",
  "10": "18",
  "11": "19",
  "12": "21",
  "13": "23",
  "14": "24",
  "15": "26",
  "16": "28",
  "17": "30",
  "18": "31",
  "19": "33",
  "20": "35",
  "21": "37",
  "22": "40",
  "23": "42",
  "24": "45",
  "25": "47",
  "26": "50",
  "27": "52",
  "28": "55",
  "29": "58",
  "30": "61",
  "31": "64",
  "32": "67",
  "33": "70",
  "34": "74",
  "35": "77",
  "36": "81",
  "37": "84",
  "38": "88",
  "39": "92",
  "40": "96",
  "41": "100",
  "42": "104",
  "43": "108",
  "44": "113",
  "45": "117",
  "46": "122",
  "47": "127",
  "48": "132",
  "49": "137",
  "50": "142",
  "51": "148",
  "52": "153",
  "53": "159",
  "54": "165",
  "55": "171",
  "56": "177",
  "57": "183",
  "58": "190",
  "59": "197",
  "60": "203"
};

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

  // FBボーナス
  const fbBonus = 1 + (parseInt(document.getElementById('fbBonus').value, 10) / 100);
  console.log('fbBonus:',fbBonus)

  // イベントボーナス
  const eventBonus = parseFloat(document.getElementById('eventBonus').value);
  console.log('eventBonus:',eventBonus)

  // 最終エナジー
  const finalEnergy = Math.floor(recipeDisplayEnergy * fbBonus * eventBonus);
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
  updateIngredients(); // エナジーを再計算
}

// 初期設定の読み込みとイベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 設定変更時のイベントリスナー
  document.getElementById('fbBonus').addEventListener('change', handleSettingChange);
  document.getElementById('eventBonus').addEventListener('change', handleSettingChange);
  document.getElementById('recipeLevel').addEventListener('change', handleSettingChange);
});

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
