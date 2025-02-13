
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

