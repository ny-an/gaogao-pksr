
// --- 曜日と食事時間帯 ---
const days = ["月", "火", "水", "木", "金", "土", "日"];
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