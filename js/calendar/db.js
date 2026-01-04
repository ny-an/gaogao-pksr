const dbName = "GaogaoCalendarDB";
const dbVersion = 2;
let db;

// --- ストア/移行設定 ---
const STORE_LEGACY = "weeklyMenus";       // 旧ストア（破壊しない）
const STORE_V2 = "weeklyMenus_v2";        // 新ストア（ISO週年に統一）
const STORAGE_WEEK_SYSTEM = "calendarWeekSystem"; // 'v2' | 'legacy'

function getActiveStoreName() {
  try {
    const v = localStorage.getItem(STORAGE_WEEK_SYSTEM);
    return v === 'legacy' ? STORE_LEGACY : STORE_V2;
  } catch (_) {
    return STORE_V2;
  }
}

/**
 * v2ストア上で WeekRecord をマージして保存（既存データを壊さない）
 * - 既存が優先
 * - 既存に無い(day/meal)だけを埋める
 * @param {IDBObjectStore} store
 * @param {{week: string, data: object}} incoming
 * @param {Function} done コールバック
 */
function mergePutWeekRecord(store, incoming, done) {
  const getReq = store.get(incoming.week);
  getReq.onsuccess = (e) => {
    const existing = e.target.result;
    if (!existing || !existing.data) {
      store.put(incoming);
      done();
      return;
    }
    const merged = { week: incoming.week, data: existing.data || {} };
    const inData = incoming.data || {};
    Object.keys(inData).forEach((day) => {
      merged.data[day] = merged.data[day] || {};
      const mealsObj = inData[day] || {};
      Object.keys(mealsObj).forEach((meal) => {
        if (merged.data[day][meal] == null) {
          merged.data[day][meal] = mealsObj[meal];
        }
      });
    });
    store.put(merged);
    done();
  };
  getReq.onerror = () => {
    // getに失敗しても put は試す（保険）
    store.put(incoming);
    done();
  };
}

// IndexedDBを初期化する関数
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      const tx = event.target.transaction;

      // 旧ストア（存在しなければ作るが、基本は既存ユーザーが持っている想定）
      if (!db.objectStoreNames.contains(STORE_LEGACY)) {
        db.createObjectStore(STORE_LEGACY, { keyPath: "week" });
      }
      // 新ストア（v2）
      if (!db.objectStoreNames.contains(STORE_V2)) {
        db.createObjectStore(STORE_V2, { keyPath: "week" });
      }

      // --- v1 -> v2 への複製移行 ---
      // 旧ストアは残し、v2に「複製」する。年またぎの ambiguity もあるため
      // 旧キーから推測できる複数候補へコピーする（データ保全優先）。
      try {
        const legacyStore = tx.objectStore(STORE_LEGACY);
        const v2Store = tx.objectStore(STORE_V2);
        const cursorReq = legacyStore.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const legacyRecord = cursor.value;
          const legacyWeek = legacyRecord && legacyRecord.week;
          const data = legacyRecord && legacyRecord.data ? legacyRecord.data : {};

          const infer = (typeof window !== 'undefined' && window.weekUtils && window.weekUtils.inferIsoTargetsFromLegacyWeekString)
            ? window.weekUtils.inferIsoTargetsFromLegacyWeekString
            : null;

          const targets = infer ? infer(String(legacyWeek || '')) : [String(legacyWeek || '')];
          let pending = targets.length;
          if (pending === 0) {
            cursor.continue();
            return;
          }
          targets.forEach((t) => {
            const incoming = { week: t, data };
            mergePutWeekRecord(v2Store, incoming, () => {
              pending -= 1;
              if (pending === 0) cursor.continue();
            });
          });
        };
      } catch (err) {
        console.warn('v2 migration skipped:', err);
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

/**
 * HTMLのcell要素から week, day, meal を取得する共通ユーティリティ関数
 * @param {HTMLElement} cell
 * @returns {{ week: string, day: string, meal: string }}
 */
function extractWeekDayMealFromCell(cell) {
  const day = cell.getAttribute("data-day");
  const meal = cell.getAttribute("data-meal");
  const calendarTable = document.querySelector(".calendar-table");
  const week = calendarTable.getAttribute("data-week");
  return { week, day, meal };
}


/**
 * セル要素から当日のrecordデータを取得
 * @param {HTMLElement} cell
 * @return {Promise<Object|null>} recordデータ、なければnull
 */
async function getRecordFromCell(cell) {
  const { week, day, meal } = extractWeekDayMealFromCell(cell);
  const weekRecord = await dbAPI.getWeeklyMenu(week);
  if (weekRecord && weekRecord.data
    && weekRecord.data[day]
    && weekRecord.data[day][meal]) {
    return weekRecord.data[day][meal];
  }
  return null;
}

/**
 * 指定された日付・食事時間のrecordデータを返す関数
 * @param {string} week - 週番号 (例: "2024-W21")
 * @param {string} day - 曜日名 (例: "月", "火" ...)
 * @param {string} meal - 食事時間帯 (例: "朝", "昼", "夜")
 * @return {Promise<Object|null>} recordがあればそのオブジェクト、なければnull
 */
async function getRecordForDate(week, day, meal) {
  const weekRecord = await dbAPI.getWeeklyMenu(week);
  if (weekRecord && weekRecord.data
    && weekRecord.data[day]
    && weekRecord.data[day][meal]) {
    return weekRecord.data[day][meal];
  }
  return null;
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
    const storeName = getActiveStoreName();
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
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
    const storeName = getActiveStoreName();
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
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
    const storeName = getActiveStoreName();
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = (event) => resolve(event.target.result || []);
    request.onerror = (event) => reject(event.target.error);
  });
}


// 他のスクリプトから利用できるようにグローバルにセット
window.dbAPI = {
  openDatabase,
  getRecordForDate,
  getRecordFromCell,
  updateWeeklyRecord,
  saveWeeklyMenu,
  getWeeklyMenu,
  getAllWeeklyMenus,
};
