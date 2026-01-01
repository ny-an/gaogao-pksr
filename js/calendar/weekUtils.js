/**
 * 週番号(ISO-8601)ユーティリティ
 *
 * - ブラウザでは window.weekUtils として利用
 * - Nodeでは module.exports として利用（テスト用）
 *
 * ISOの要点:
 * - 週は月曜始まり
 * - Week 1 は「その年の1/4を含む週」
 * - 年またぎ週は「週の木曜が属する年(=ISO週年)」が年となる
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.weekUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /**
   * Date(ローカル)から ISO週年 + ISO週番号 を返す
   * @param {Date} date
   * @returns {{ isoYear: number, isoWeek: number }}
   */
  function getISOWeekInfo(date) {
    const d = new Date(date.getTime());
    // ISO: 木曜を含む年が ISO週年
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const isoYear = d.getFullYear();
    const week1 = new Date(isoYear, 0, 4);
    const isoWeek =
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      );
    return { isoYear, isoWeek };
  }

  /**
   * Date(ローカル)から ISO週キー文字列を返す (例: "2026-W01")
   * @param {Date} date
   * @returns {string}
   */
  function getISOWeekString(date) {
    const { isoYear, isoWeek } = getISOWeekInfo(date);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
  }

  /**
   * ISO週キー文字列 ("YYYY-Www") から月曜の日付(Date)を返す
   * @param {string} isoWeekString
   * @returns {Date}
   */
  function getMondayDateObjectFromWeekString(isoWeekString) {
    const year = parseInt(isoWeekString.substring(0, 4), 10);
    const week = parseInt(isoWeekString.substring(6), 10);
    if (!Number.isFinite(year) || !Number.isFinite(week)) {
      throw new Error(`Invalid isoWeekString: ${isoWeekString}`);
    }

    // 1/4 を含む週が week1、そこから月曜に戻す
    const jan4 = new Date(year, 0, 4);
    const jan4Monday = new Date(jan4.getTime());
    jan4Monday.setDate(jan4Monday.getDate() - ((jan4Monday.getDay() + 6) % 7));

    const targetMonday = new Date(jan4Monday.getTime());
    targetMonday.setDate(targetMonday.getDate() + (week - 1) * 7);
    return targetMonday;
  }

  /**
   * ISO週キー文字列 ("YYYY-Www") から月曜の日付文字列 ("YYYY/M/D") を返す
   * @param {string} isoWeekString
   * @returns {string}
   */
  function getMondayDateFromWeek(isoWeekString) {
    const monday = getMondayDateObjectFromWeekString(isoWeekString);
    return `${monday.getFullYear()}/${monday.getMonth() + 1}/${monday.getDate()}`;
  }

  /**
   * legacyキー(旧: `${date.getFullYear()}-W${getISOWeek(date)}`) を
   * 新ISOキーへ移行するための「候補ISOキー一覧」を返す。
   *
   * 旧実装では year が暦年で固定だったため、
   * 例: 2025-12-29 は legacyだと "2025-W01" になり得る。
   *
   * そのため、同じ legacyキーが「年始側」「年末側」の両方に該当する可能性がある週(特にW01)は
   * 破壊的変換せず、両方に複製する（旧へ戻れる方針 + データ保全）。
   *
   * @param {string} legacyWeekString
   * @returns {string[]} 重複なし・安定順
   */
  function inferIsoTargetsFromLegacyWeekString(legacyWeekString) {
    const year = parseInt(legacyWeekString.substring(0, 4), 10);
    const week = parseInt(legacyWeekString.substring(6), 10);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return [];

    // 旧 getISOWeek と同等（yearは使わず、週番号のみ）
    function legacyGetISOWeek(date) {
      const tmpDate = new Date(date.getTime());
      tmpDate.setDate(tmpDate.getDate() + 3 - ((tmpDate.getDay() + 6) % 7));
      const week1 = new Date(tmpDate.getFullYear(), 0, 4);
      return (
        1 +
        Math.round(
          ((tmpDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
        )
      );
    }

    const targets = [];
    const seen = new Set();

    // 旧キーの year を満たす日付範囲から候補を拾う（年始・年末の2窓で十分）
    const windows = [
      { start: new Date(year, 0, 1), days: 14 },  // 年始側
      { start: new Date(year, 11, 18), days: 14 } // 年末側（W01を拾いやすい）
    ];

    for (const w of windows) {
      for (let i = 0; i < w.days; i++) {
        const d = new Date(w.start.getTime());
        d.setDate(d.getDate() + i);
        if (d.getFullYear() !== year) continue;
        if (legacyGetISOWeek(d) !== week) continue;
        const isoKey = getISOWeekString(d);
        if (!seen.has(isoKey)) {
          seen.add(isoKey);
          targets.push(isoKey);
        }
      }
    }

    // 最低でも1つは欲しいので、見つからない場合は「そのまま」も候補に含める（保険）
    if (targets.length === 0) targets.push(legacyWeekString);
    return targets;
  }

  return {
    getISOWeekInfo,
    getISOWeekString,
    getMondayDateObjectFromWeekString,
    getMondayDateFromWeek,
    inferIsoTargetsFromLegacyWeekString,
  };
});

