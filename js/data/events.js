/**
 * イベントデータ
 * 献立表で使う料理エナジー倍率・なべ容量倍率を中心に、ややこしい週別ボーナスを整理する。
 *
 * 日付の切り替わりは公式どおり午前4時（JST）想定。
 * cookingEnergyMultiplier / potCapacityMultiplier がアプリの設定値に対応する。
 *
 * @see https://www.pokemonsleep.net/news/343138353434383532363837333838363733/
 */

/** 料理エナジーのイベント倍率の選択肢（設定UI用） */
const EVENT_COOKING_BONUS_VALUES = [1, 1.1, 1.25, 1.5];

/** なべ容量のイベント倍率の選択肢（設定UI用） */
const EVENT_POT_BONUS_VALUES = [1.0, 1.25, 1.5, 2.0];

/**
 * イベント一覧（新しいものが上）
 * @type {Array<Object>}
 */
const eventsList = [
  {
    id: "3rd-anniversary-festival-2026",
    name: "3周年記念フェスティバル",
    type: "event",
    sourceUrl: "https://www.pokemonsleep.net/news/343138353434383532363837333838363733/",
    summary:
      "グローバルリリース3周年記念。1週目は仲間集め、2週目は育成・料理エナジー強化。シンオウ御三家が新登場。",
    startAt: "2026-07-13T04:00:00+09:00",
    endAt: "2026-07-27T03:59:59+09:00",
    fields: "すべてのフィールド",
    newPokemon: [
      "ナエトル",
      "ハヤシガメ",
      "ドダイトス",
      "ヒコザル",
      "モウカザル",
      "ゴウカザル",
      "ポッチャマ",
      "ポッタイシ",
      "エンペルト",
    ],
    newPokemonAvailableAt: "2026-07-13T15:00:00+09:00",
    commonBonuses: [
      "その日の睡眠タイプに限らず、他の睡眠タイプのポケモンも出現",
      "睡眠リサーチにて、特定のポケモンの出現確率UP",
    ],
    notes: [
      "日付の切り替わりは午前4時",
      "開催期間中に計測開始した睡眠データのみボーナス対象",
      "7/20(月)の3周年当日にお祝いプレゼントあり",
      "2週目にイベント期間外でも使える新機能の登場予定",
    ],
    weeks: [
      {
        week: 1,
        label: "1週目：おてつだいポケモンをたくさん仲間にできる1週間",
        startAt: "2026-07-13T04:00:00+09:00",
        endAt: "2026-07-20T03:59:59+09:00",
        // 献立表で使う倍率（この週は料理・なべボーナスなし）
        cookingEnergyMultiplier: 1.0,
        potCapacityMultiplier: 1.0,
        cookingEnergyNote: null,
        bonuses: [
          "睡眠リサーチにて、チャンス1匹確定（1日1回のみ）",
          "すべてのおてつだいポケモンのメインスキル発生確率1.5倍",
          "おてつだいポケモンの睡眠EXP 1.5倍",
          "睡眠リサーチでのアメ獲得量1.5倍（1日1回のみ）",
          "期間限定「ドリームギフト」が使用可能",
        ],
        pickup: {
          level: "中ピックアップ",
          pokemon: ["ナエトル", "ヒコザル", "ポッチャマ"],
          byField: {
            "ワカクサ本島": ["ナエトル", "ヒコザル", "ポッチャマ"],
            "シアンの砂浜": ["ポッチャマ"],
            "トープ洞窟": ["ナエトル", "ヒコザル"],
            "ウノハナ雪原": ["ポッチャマ"],
            "ラピスラズリ湖畔": ["ナエトル"],
            "ゴールド旧発電所": [],
            "アンバー渓谷": ["ヒコザル"],
            "ワカクサ本島 EX": ["ナエトル", "ヒコザル", "ポッチャマ"],
          },
        },
        limitedFeatures: ["ドリームギフト"],
        missionsPeriod: {
          startAt: "2026-07-13T04:00:00+09:00",
          endAt: "2026-07-27T03:59:59+09:00",
          note: "1週目ミッションの実施期間は2週目終了まで",
        },
      },
      {
        week: 2,
        label: "2週目：おてつだいポケモンをたくさん育成できる1週間",
        startAt: "2026-07-20T04:00:00+09:00",
        endAt: "2026-07-27T03:59:59+09:00",
        // 献立表で使う倍率
        cookingEnergyMultiplier: 1.5,
        potCapacityMultiplier: 1.0,
        cookingEnergyNote: "料理の最終エナジー1.5倍（大成功：3倍 / 日曜日のみ4.5倍）",
        bonuses: [
          "料理の最終エナジー 1.5倍（大成功：3倍 / 日曜日のみ4.5倍）",
          "期間限定「ミニアメブースト」が使用可能",
          "期間限定「おいわいフラワー」が使用可能",
        ],
        pickup: {
          level: "中ピックアップ",
          pokemon: [
            "ナエトル",
            "ハヤシガメ",
            "ドダイトス",
            "ヒコザル",
            "モウカザル",
            "ゴウカザル",
            "ポッチャマ",
            "ポッタイシ",
            "エンペルト",
          ],
          byField: {
            "ワカクサ本島": [
              "ナエトル",
              "ハヤシガメ",
              "ドダイトス",
              "ヒコザル",
              "モウカザル",
              "ゴウカザル",
              "ポッチャマ",
              "ポッタイシ",
              "エンペルト",
            ],
            "シアンの砂浜": ["ポッチャマ", "ポッタイシ", "エンペルト"],
            "トープ洞窟": [
              "ナエトル",
              "ハヤシガメ",
              "ドダイトス",
              "ヒコザル",
              "モウカザル",
              "ゴウカザル",
            ],
            "ウノハナ雪原": ["ポッチャマ", "ポッタイシ", "エンペルト"],
            "ラピスラズリ湖畔": ["ナエトル", "ハヤシガメ", "ドダイトス"],
            "ゴールド旧発電所": [],
            "アンバー渓谷": ["ヒコザル", "モウカザル", "ゴウカザル"],
            "ワカクサ本島 EX": [
              "ナエトル",
              "ハヤシガメ",
              "ドダイトス",
              "ヒコザル",
              "モウカザル",
              "ゴウカザル",
              "ポッチャマ",
              "ポッタイシ",
              "エンペルト",
            ],
          },
        },
        limitedFeatures: ["ミニアメブースト", "おいわいフラワー"],
        festiveFlowerSeeds: [
          { name: "あかいタネ", effect: "1回目の睡眠リサーチでのアメ獲得量2.5倍" },
          { name: "あおいタネ", effect: "おてつだいポケモンが獲得する睡眠EXP3倍" },
          { name: "きいろいタネ", effect: "おやつタイムで1匹チャンス確定（1日1回のみ）" },
          { name: "むらさきのタネ", effect: "睡眠リサーチでのゆめのかけら獲得量2.5倍" },
          { name: "しろいタネ", effect: "まっしろミントを1つ獲得" },
        ],
        miniCandyBoost: {
          expMultiplier: 2,
          dreamShardCostMultiplier: 4,
          dailyCandyLimit: 50,
          defaultOn: true,
        },
        missionsPeriod: {
          startAt: "2026-07-20T04:00:00+09:00",
          endAt: "2026-07-27T03:59:59+09:00",
        },
      },
    ],
  },
  {
    id: "almost-3rd-anniversary-2026",
    name: "もうすぐ3周年キャンペーン",
    type: "campaign",
    sourceUrl: null,
    summary:
      "3周年フェス前の準備週。ゆめのかけら・リサーチEXP強化。料理エナジー／なべ容量ボーナスはなし。",
    startAt: "2026-07-06T04:00:00+09:00",
    endAt: "2026-07-13T03:59:59+09:00",
    fields: "すべてのフィールド",
    // 献立表で使う倍率（このキャンペーンは料理・なべボーナスなし）
    cookingEnergyMultiplier: 1.0,
    potCapacityMultiplier: 1.0,
    cookingEnergyNote: null,
    commonBonuses: [
      "睡眠リサーチで特定のポケモンの出現率UP",
      "リサーチで手に入るゆめのかけらの獲得量が1.5倍",
      "睡眠リサーチでのリサーチEXP1.5倍",
      "その日の睡眠タイプに限らず、他の睡眠タイプのポケモンも少し出現",
    ],
    notes: [
      "期間中はボーナススリープポイント×150を毎日プレゼント",
      "2周年記念フェスティバル登場ポケモンがピックアップ",
      "料理の最終エナジー倍率・なべ容量倍率のイベントボーナスはなし",
    ],
    weeks: [],
  },
];

/**
 * 指定日時に有効なイベント週（または単発イベント）を返す
 * @param {Date} [date=new Date()]
 * @returns {{ event: Object, week: Object|null }|null}
 */
function getActiveEventPeriod(date = new Date()) {
  const t = date.getTime();
  for (const event of eventsList) {
    const eventStart = Date.parse(event.startAt);
    const eventEnd = Date.parse(event.endAt);
    if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) continue;
    if (t < eventStart || t > eventEnd) continue;

    if (Array.isArray(event.weeks) && event.weeks.length > 0) {
      for (const week of event.weeks) {
        const weekStart = Date.parse(week.startAt);
        const weekEnd = Date.parse(week.endAt);
        if (Number.isNaN(weekStart) || Number.isNaN(weekEnd)) continue;
        if (t >= weekStart && t <= weekEnd) {
          return { event, week };
        }
      }
    }
    return { event, week: null };
  }
  return null;
}

/**
 * 献立表向け：有効な料理エナジー倍率を返す
 * @param {Date} [date=new Date()]
 * @returns {number}
 */
function getActiveCookingEnergyMultiplier(date = new Date()) {
  const active = getActiveEventPeriod(date);
  if (!active) return 1.0;
  if (active.week && typeof active.week.cookingEnergyMultiplier === "number") {
    return active.week.cookingEnergyMultiplier;
  }
  if (typeof active.event.cookingEnergyMultiplier === "number") {
    return active.event.cookingEnergyMultiplier;
  }
  return 1.0;
}

/**
 * 献立表向け：有効ななべ容量倍率を返す
 * @param {Date} [date=new Date()]
 * @returns {number}
 */
function getActivePotCapacityMultiplier(date = new Date()) {
  const active = getActiveEventPeriod(date);
  if (!active) return 1.0;
  if (active.week && typeof active.week.potCapacityMultiplier === "number") {
    return active.week.potCapacityMultiplier;
  }
  if (typeof active.event.potCapacityMultiplier === "number") {
    return active.event.potCapacityMultiplier;
  }
  return 1.0;
}

/**
 * IDからイベントを取得
 * @param {string} id
 * @returns {Object|undefined}
 */
function getEventById(id) {
  return eventsList.find((event) => event.id === id);
}
