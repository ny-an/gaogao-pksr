// --- リセット処理 ---
// セルの状態を初期状態に戻し、IndexedDBから該当データを削除する
async function resetCell(cell) {
  // セル表示を初期状態にリセット
  setDefaultCell(cell);

  // IndexedDBの該当週データから、該当の曜日、食事時刻の項目を削除して保存更新
  const day = cell.getAttribute("data-day");
  const meal = cell.getAttribute("data-meal");

  // table要素のdata-week属性から現在選択中の週を取得
  const calendarTable = document.querySelector(".calendar-table");
  const selectedWeek = calendarTable.getAttribute("data-week");

  try {
    let weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
    if (weekRecord && weekRecord.data && weekRecord.data[day]) {
      delete weekRecord.data[day][meal];
      // もし該当曜日の全項目がなくなったら、曜日自体も削除する
      if (Object.keys(weekRecord.data[day]).length === 0) {
        delete weekRecord.data[day];
      }
      await dbAPI.saveWeeklyMenu(weekRecord);
    }
  } catch (error) {
    console.error("DB更新(リセット)エラー:", error);
  }

  // エナジー合計の更新
  recalcEnergyTotals();

}