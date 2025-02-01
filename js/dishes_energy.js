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

// 料理エナジー計算
function getCookingEnergy() {
  console.log('getFinalEnergy start');
  const selectedDish = foodSelect.value;

  // 料理リストからレシピ基本エナジーを取得
  const energy = dishesEnergyList[selectedDish] || 0;
  console.log('energy:',energy)

  // 料理レシピボーナス
  const recipeLevel = 60;
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
  const fbBonus = 1.7;
  console.log('fbBonus:',fbBonus)

  // イベントボーナス
  const eventBonus = 1;
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
}