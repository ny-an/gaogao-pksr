
// --- 曜日と食事時間帯 ---
const days = ["月", "火", "水", "木", "金", "土", "日"];
const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
const meals = ["朝", "昼", "夜"];


// --- 日付／週番号計算用ユーティリティ ---
// NOTE:
// - 週ロジックは `js/calendar/weekUtils.js` に集約（テスト可能にするため）
// - 旧バージョンへ戻す場合も、ここは共通化しておく
if (typeof window !== 'undefined' && window.weekUtils) {
  // 既存コード互換のため、従来のグローバル関数名を維持
  window.getISOWeekString = window.getISOWeekString || window.weekUtils.getISOWeekString;
  window.getMondayDateFromWeek = window.getMondayDateFromWeek || window.weekUtils.getMondayDateFromWeek;
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