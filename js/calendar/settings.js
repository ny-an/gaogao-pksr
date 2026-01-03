
// --- 曜日と食事時間帯 ---
const days = ["月", "火", "水", "木", "金", "土", "日"];
const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
const meals = ["朝", "昼", "夜"];


// --- 日付／週番号計算用ユーティリティ ---
function getISOWeek(date) {
  const tmpDate = new Date(date.getTime());
  tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
  const week1 = new Date(tmpDate.getFullYear(), 0, 4);
  const week = 1 + Math.round(((tmpDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return week;
}
function getISOWeekString(date) {
  const week = getISOWeek(date);
  // ISO週の年は、その週の木曜日が含まれる年
  // 週の大部分（4日以上）が含まれる年を使用する
  const tmpDate = new Date(date.getTime());
  tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7)); // その週の木曜日
  const year = tmpDate.getFullYear();
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// 月曜日の日付を取得
function getMondayDateFromWeek(weekString) {
  // 週文字列から年と週番号を抽出 (例: "2024-W01")
  const year = parseInt(weekString.substring(0, 4));
  const week = parseInt(weekString.substring(6));

  // 1月4日を基準に週の月曜日を計算
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
  // ISO週では、1月4日を含む週が第1週
  // 1月4日が月曜日の場合、その週の月曜日は1月4日
  // 1月4日が日曜日の場合、その週の月曜日は前年の12月29日
  // dayOffset: 1月4日からその週の月曜日までの日数
  const dayOffset = (jan4DayOfWeek === 0 ? 6 : jan4DayOfWeek - 1); // 日曜日の場合は6、それ以外は-1
  const firstMonday = new Date(jan4.getTime() - dayOffset * 24 * 60 * 60 * 1000);

  // 目的の週の月曜日を計算
  const targetMonday = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);

  // 日付をISO形式でフォーマット (例: "2024-01-01") - タイムゾーン問題を避けるため
  const resultYear = targetMonday.getFullYear();
  const resultMonth = String(targetMonday.getMonth() + 1).padStart(2, '0');
  const resultDate = String(targetMonday.getDate()).padStart(2, '0');
  const result = `${resultYear}-${resultMonth}-${resultDate}`;
  return result;
}


// 保存設定
// 設定のキー定義
const SETTINGS_KEYS = {
  IMAGE_QUALITY: 'imageQuality'
};

// デフォルト設定
const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.IMAGE_QUALITY]: 'high'
};

// 設定値に対応する画像サイズ
const IMAGE_QUALITY_SIZES = {
  high: { width: 1200, height: 1200 },
  middle: { width: 600, height: 600 },
  low: { width: 300, height: 300 }
};

// 設定の取得
function getSetting(key) {
  const value = localStorage.getItem(key);
  return value !== null ? value : DEFAULT_SETTINGS[key];
}

// 設定の保存
function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

// 設定の初期化
function initSettings() {
  const qualitySelect = document.getElementById('imageQualitySetting');
  if (!qualitySelect) return;

  // 現在の設定を反映
  qualitySelect.value = getSetting(SETTINGS_KEYS.IMAGE_QUALITY);

  // 設定変更時の処理
  qualitySelect.addEventListener('change', (e) => {
    saveSetting(SETTINGS_KEYS.IMAGE_QUALITY, e.target.value);
  });

}

// 初期化
document.addEventListener('DOMContentLoaded', initSettings);