/**
 * 曜日の型（日本語表記）
 * @typedef {"月"|"火"|"水"|"木"|"金"|"土"|"日"} DayOfWeek
 */

/**
 * 食事時刻の型
 * @typedef {"朝"|"昼"|"夜"} MealTime
 */

/**
 * 週間を表す型（ISO文字列等任意の文字列）
 * @typedef {string} ISOWeek
 */

/**
 * 食事レコードの型
 * @typedef {Object} MealRecord
 * @property {string} dish 料理名
 * @property {number} energy エナジー値
 * @property {string} image 画像パス
 * @property {boolean} extra 追加エナジーのフラグ
 */

/**
 * 週レコードの型
 * @typedef {Object} WeekRecord
 * @property {Week} week 対象週
 * @property {Object.<DayOfWeek, Object.<MealTime, MealRecord>>} [data] 各曜日・食事時刻の食事レコード
 */

