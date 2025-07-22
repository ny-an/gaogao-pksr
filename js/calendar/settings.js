
// --- 曜日と食事時間帯 ---
const days = ["月", "火", "水", "木", "金", "土", "日"];
const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
const meals = ["朝", "昼", "夜"];


// --- 日付／週番号計算用ユーティリティ ---
function getISOWeek(date) {
  const tmpDate = new Date(date.getTime());
  tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
  const week1 = new Date(tmpDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tmpDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
function getISOWeekString(date) {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// 月曜日の日付を取得
function getMondayDateFromWeek(weekString) {
  // 週文字列から年と週番号を抽出 (例: "2024-W01")
  const year = parseInt(weekString.substring(0, 4));
  const week = parseInt(weekString.substring(6));

  // 1月4日を基準に週の月曜日を計算
  const jan4 = new Date(year, 0, 4);
  const dayOffset = jan4.getDay() - 1; // 月曜日を基準(0)とする
  const firstMonday = new Date(jan4.getTime() - dayOffset * 24 * 60 * 60 * 1000);

  // 目的の週の月曜日を計算
  const targetMonday = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);

  // 日付をフォーマット (例: "2024/1/1")
  return `${targetMonday.getFullYear()}/${targetMonday.getMonth() + 1}/${targetMonday.getDate()}`;
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