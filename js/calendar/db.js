const dbName = "GaogaoCalendarDB";
const dbVersion = 1;
let db;

// IndexedDBを初期化する関数
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      // "weeklyMenus" オブジェクトストアを作成（キーはweek）
      if (!db.objectStoreNames.contains("weeklyMenus")) {
        db.createObjectStore("weeklyMenus", { keyPath: "week" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}


// --- IndexedDB 更新用処理 ---
async function updateWeeklyRecord(cell, recordData) {
  const day = cell.getAttribute("data-day");
  const meal = cell.getAttribute("data-meal");

  // table要素のdata-week属性から現在選択中の週を取得
  const calendarTable = document.querySelector(".calendar-table");
  const selectedWeek = calendarTable.getAttribute("data-week");

  let weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
  if (!weekRecord) {
    weekRecord = { week: selectedWeek, data: {} };
  }
  if (!weekRecord.data[day]) {
    weekRecord.data[day] = {};
  }
  weekRecord.data[day][meal] = recordData;

  try {
    await dbAPI.saveWeeklyMenu(weekRecord);
  } catch (error) {
    console.error("DB保存エラー:", error);
  }

}

/**
 * 週ごとのメニューを保存する関数
 * @param {WeekRecord} weekRecord
 * @return {Promise<unknown>}
 */
function saveWeeklyMenu(weekRecord) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["weeklyMenus"], "readwrite");
    const store = transaction.objectStore("weeklyMenus");
    const request = store.put(weekRecord);

    request.onsuccess = () => resolve(weekRecord);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * 指定した週のメニューを取得する関数
 * @param {ISOWeek} week
 * @return {Promise<unknown>}
 */
function getWeeklyMenu(week) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["weeklyMenus"], "readonly");
    const store = transaction.objectStore("weeklyMenus");
    const request = store.get(week);

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * 週ごとの全メニューを取得する関数（全件取得）
 * @return {Promise<unknown>}
 */
function getAllWeeklyMenus() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["weeklyMenus"], "readonly");
    const store = transaction.objectStore("weeklyMenus");
    const request = store.getAll();
    request.onsuccess = (event) => resolve(event.target.result || []);
    request.onerror = (event) => reject(event.target.error);
  });
}


// 他のスクリプトから利用できるようにグローバルにセット
window.dbAPI = {
  openDatabase,
  saveWeeklyMenu,
  getWeeklyMenu,
  getAllWeeklyMenus,
};
