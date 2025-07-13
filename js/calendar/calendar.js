// exporter
const exporter = new WeeklyDataExporter(window.dbAPI, days);
const calendarRender = new CalendarRenderer();

// --- DOM初期化とDBからのデータ反映 ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // IndexedDBをオープン
    await dbAPI.openDatabase();

    // ページロード時に週セレクターを初期化し、現在の週データを表示する
    await initialWeekSelector();

    // 選択中の週
    const selectedWeek = document.getElementById("currentWeek").innerText;
    console.log("selected week:", selectedWeek);

    // table自体のdata-week属性を更新
    const calendarTable = document.querySelector(".calendar-table");
    calendarTable.setAttribute("data-week", selectedWeek);

    // DBから該当週のデータを取得
    const weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
    if (weekRecord && weekRecord.data) {
      await calendarRender.populateCalendar(weekRecord.data);
    } else {

      const currentDate = new Date();
      const weekStr = getISOWeekString(currentDate);

      // 週データが存在しなければ、空のデータで作成
      const newWeekRecord = {
        week: weekStr,
        data: {} // 空の初期状態
      };
      await dbAPI.saveWeeklyMenu(newWeekRecord);
      console.log("新しい週データを自動作成しました:", selectedWeek);

      // 空の表を追加
      calendarRender.setAllDefaultCells();
    }

    // 全エネルギー表示
    await recalcCumulativeEnergy();

    // 週間まとめエナジー表示
    await recalcEnergyTotals();

    // 週間まとめエナジーModal関連
    initWeeklyMenuModal();

    // 各種イベントリスナーを設定
    setupEventListeners();

  } catch (error) {
    console.error("IndexedDBエラー:", error);
  }
});


// --- イベントリスナー設定 ---
function setupEventListeners() {

  // 追加ボタンのクリックイベント
  document.addEventListener("click", event => {
    if (event.target.classList.contains("add-entry-button")) {
      const cell = event.target.closest(".day-cell");
      const date = cell.getAttribute("data-date");
      const meal = cell.getAttribute("data-meal");
      window.entryModal.open(date, meal);
    }
  });

  // リセット処理
  document.addEventListener("click", event => {
    if (event.target.classList.contains("action-reset")) {
      const cell = event.target.closest(".day-cell");
      calendarRender.resetCell(cell).then(() => {
        console.log("リセット完了");
      }).then(async()=>{
        // エナジー合計の更新
        await recalcEnergyTotals();
      });
    }
  });

  // 週セレクターの選択変更イベント：選択された週のカレンダーをロードする
  document.getElementById("weekSelector").addEventListener("change", event => {

    const selectedWeek = event.target.value;
    document.getElementById("currentWeek").innerText = selectedWeek;

    // 月曜日の日付を計算して表示
    const mondayDate = getMondayDateFromWeek(selectedWeek);
    document.getElementById("mondayDate").innerText = mondayDate;

    // table自体のdata-week属性を更新
    const calendarTable = document.querySelector(".calendar-table");
    calendarTable.setAttribute("data-week", selectedWeek);

    // IndexedDB やその他のデータソースから該当週のデータを取得して、カレンダーを更新する
    dbAPI.getWeeklyMenu(selectedWeek).then(async(weekRecord) => {
      // weekRecord.data が存在しなければ空オブジェクトを渡す
      await calendarRender.populateCalendar(weekRecord && weekRecord.data ? weekRecord.data : {});

      // エナジー合計の更新
      await recalcEnergyTotals();

    }).catch(async(error) => {
      console.error("週情報の取得エラー:", error);
      // エラーが発生した場合は空の状態にする
      await calendarRender.populateCalendar({});
    });

  });

  // calendar画面のエナジー大成功classトグル処理
  document.addEventListener("click", event => {
    // event.target が存在し、HTMLElement か確認
    if (!(event.target instanceof Element)) return;

    // energy-value または menu-image の場合のみ処理
    if (event.target.classList.contains("energy-value") || event.target.classList.contains("menu-image")) {

      // クリックされた要素の祖先からセル要素を取得
      const cell = event.target.closest(".day-cell");
      let targetEl = event.target;

      // クリックされたが menu-image の場合、対象は energy-value 要素に変更
      if (event.target.classList.contains("menu-image") && cell) {
        const energyEl = cell.querySelector(".energy-value");
        if (energyEl) {
          targetEl = energyEl;
        }
      }

      // 対象要素に対してクラスの付与状況を反転
      targetEl.classList.toggle("extra-tasty");

      if (cell) {
        // DB 更新：クラスの有無に応じて extra フラグを更新
        const extra = targetEl.classList.contains("extra-tasty");
        updateExtraFlag(cell, extra);
      }
    }
  });

}

// IndexedDBにデータのある週だけ表示するための週セレクター初期化関数
async function initialWeekSelector() {
  const weekSelector = document.getElementById("weekSelector");
  weekSelector.innerHTML = "";
  const currentDate = new Date();
  const currentWeekStr = getISOWeekString(currentDate);
  const weeksToShow = 100; // 遡り表示する週数
  const validWeeks = [];

  for (let i = 0; i < weeksToShow; i++) {
    // 現在の日付から1週間ずつ過去にずらす
    const pastDate = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000 * i));
    const weekStr = getISOWeekString(pastDate);

    try {
      const weekRecord = await dbAPI.getWeeklyMenu(weekStr);
      console.log("週データ:", weekStr, weekRecord);

      // データが存在する場合のみ有効な週として追加
      if (weekRecord && weekRecord.data && Object.keys(weekRecord.data).length > 0) {
        validWeeks.push(weekStr);
        const option = document.createElement("option");
        option.value = weekStr;
        option.text = weekStr;
        weekSelector.appendChild(option);
      }else{
        // 何もないデータ状態の場合は、現在の週だけ表示する
        if (weekStr === currentWeekStr) {
          validWeeks.push(weekStr);
          const option = document.createElement("option");
          option.value = weekStr;
          option.text = weekStr;
          weekSelector.appendChild(option);
        }
      }
    } catch (error) {
      // データがなければエラーとなる可能性があるので、その場合は何もしない（スキップ）
      console.warn("データが無い週:", weekStr, error);
    }
  }

  // 存在する週があれば初期表示にセット
  if (validWeeks.length > 0) {
    document.getElementById("currentWeek").innerText = validWeeks[0];

    // 月曜日の日付を計算して表示
    const mondayDate = getMondayDateFromWeek(validWeeks[0]);
    const mondayDateObj = new Date(mondayDate);
    const formattedMondayDate = mondayDateObj.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric'
    });
    document.getElementById("mondayDate").innerText = formattedMondayDate;

    // 日曜も追加
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const formattedSundayDate = sundayDate.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric'
    });
    document.getElementById("sundayDate").innerText = formattedSundayDate;

  } else {
    // 週データが存在しなければ、空のデータで作成
    const newWeekRecord = {
      week: currentWeekStr,
      data: {} // 空の初期状態
    };
    await dbAPI.saveWeeklyMenu(newWeekRecord);
    console.log("新しい週データを自動作成しました:", currentWeekStr);

    document.getElementById("currentWeek").innerText = currentWeekStr;
  }

  // 週の選択が変更されたときのイベントリスナー
  weekSelector.addEventListener("change", (event) => {
    const selectedWeek = event.target.value;
    calendarRender.updateWeekDates(selectedWeek);  // 日付を更新
  });

  // 初期表示時の日付設定
  const currentWeek = weekSelector.value;
  calendarRender.updateWeekDates(currentWeek);

}

// 週ごとのエナジー合計を計算して表示更新までする関数
async function recalcEnergyTotals() {
  console.log('recalcEnergyTotals start');

  // 週合計を計算
  const weeklyTotal = await calcEnergyTotals();
  console.log('weeklyTotal:',weeklyTotal);

  // 表示更新
  await updateWeeklyEnergyView(weeklyTotal);
}

// 週まとめエナジー合計を計算して返す
async function calcEnergyTotals() {

  const selectedWeek = document.querySelector(".calendar-table").getAttribute("data-week");
  const weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
  const dailyTotals = {};

  // 各曜日の合計を初期化
  days.forEach(day => dailyTotals[day] = 0);

  // DBデータから各曜日の合計を計算
  if (weekRecord && weekRecord.data) {
    days.forEach(day => {
      if (weekRecord.data[day]) {
        console.log('day:'+day);
        ["朝", "昼", "夜"].forEach(meal => {
          if (weekRecord.data[day][meal] && weekRecord.data[day][meal].energy) {
            console.log('meal:'+meal);
            console.log('energy:',weekRecord.data[day][meal].energy);

            // energyが配列の場合は最初の要素を取得
            let energyValue = Array.isArray(weekRecord.data[day][meal].energy)
              ? weekRecord.data[day][meal].energy[0]
              : weekRecord.data[day][meal].energy;

            // 文字列化してからカンマを除去
            energyValue = String(energyValue).replace(/,/g, '');

            // 数値に変換
            const energy = parseInt(energyValue, 10);

            if (!isNaN(energy)) {
              dailyTotals[day] += energy;
            }
          }
        });
      }
    });
  }

  console.log('dailyTotals:',dailyTotals);

  // 週間合計の計算と表示
  const weeklyTotal = Object.values(dailyTotals).reduce((sum, value) => sum + value, 0);

  return weeklyTotal;
}

// 週まとめエナジーの表示更新
async function updateWeeklyEnergyView(weeklyTotal) {
  const weeklyNumElement = document.getElementById("weeklyEnergyNum");
  const weeklyTotalElement = document.getElementById("weekly-total-energy");
  if (weeklyNumElement) {
    weeklyNumElement.innerText = weeklyTotal.toLocaleString();
    weeklyTotalElement.innerText = weeklyTotal.toLocaleString();
  }

  // export画像の表示切り替くえ
  exporter.updateExportIconVisibility();

  // ついでに全エナジー表示更新
  await recalcCumulativeEnergy();
}

// 累計エナジーを再計算して表示関数
async function recalcCumulativeEnergy() {
  try {

    const totalEnergy = await calcCumulativeEnergy();

    // 全データの累計エナジーの表示更新
    const allEnergyNumEl = document.getElementById("allEnergyNum");
    if (allEnergyNumEl) {
      allEnergyNumEl.innerText = totalEnergy.toLocaleString();
    }
  } catch (error) {
    console.error("累計エナジー計算エラー:", error);
  }
}

// 累計エナジーを計算して返す
async function calcCumulativeEnergy() {
  try {
    const allWeekRecords = await dbAPI.getAllWeeklyMenus();
    let totalEnergy = 0;

    allWeekRecords.forEach(weekRecord => {
      if (weekRecord && weekRecord.data) {
        days.forEach(day => {
          if (weekRecord.data[day]) {
            meals.forEach(meal => {
              const record = weekRecord.data[day][meal];
              if (record && record.energy) {
                // energyが配列の場合は最初の要素を取得
                let energyValue = Array.isArray(record.energy)
                  ? record.energy[0]
                  : record.energy;
                // 数値として扱えるように、文字列のカンマを除去してから parseInt
                energyValue = parseInt(String(energyValue).replace(/,/g, ''), 10);
                if (!isNaN(energyValue)) {
                  totalEnergy += energyValue;
                }
              }
            });
          }
        });
      }
    });

    return totalEnergy;

  } catch (error) {
    console.error("累計エナジー計算エラー:", error);
  }
}

/**
 * 指定のセルのDBレコードに extra プロパティを更新する関数
 * @param {HTMLElement} cell - 更新対象のセル (.day-cell)
 * @param {boolean} extra - 付与する extra のフラグ
 */
function updateExtraFlag(cell, extra) {
  const calendarTable = document.querySelector(".calendar-table");
  const selectedWeek = calendarTable.getAttribute("data-week");
  dbAPI.getWeeklyMenu(selectedWeek)
    .then(weekRecord => {
      if (!weekRecord) {
        weekRecord = { week: selectedWeek, data: {} };
      }
      const day = cell.getAttribute("data-day");
      const meal = cell.getAttribute("data-meal");
      if (!weekRecord.data[day]) {
        weekRecord.data[day] = {};
      }
      if (!weekRecord.data[day][meal]) {
        weekRecord.data[day][meal] = {};
      }
      weekRecord.data[day][meal].extra = extra;
      return dbAPI.saveWeeklyMenu(weekRecord);
    })
    .catch(error => console.error("DB更新(Extra)エラー:", error));
}

// 週間まとめモーダル表示
function initWeeklyMenuModal() {
  // CSVエクスポートボタンのイベントリスナー
  const exportButton = document.getElementById('exportWeeklyCSV');
  if (exportButton) {
    exportButton.addEventListener('click', exporter.showWeeklyDataCSV);
  }

  // コピーボタンのイベントリスナー
  const copyButton = document.getElementById('copyCSV');
  if (copyButton) {
    copyButton.addEventListener('click', exporter.copyCSVContent);
  }

  // モーダルを閉じる機能
  const modal = document.getElementById('csvModal');
  const closeBtn = modal.querySelector('.close');

  if (closeBtn) {
    closeBtn.onclick = function() {
      modal.style.display = 'none';
    }
  }

  // モーダル外クリックで閉じる
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  }
}


// 画像クリック時の拡大表示処理
document.addEventListener("click", event => {
  const menuImage = event.target.closest(".menu-image img");
  if (menuImage && !event.target.classList.contains("delete-image-btn")) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");

    modal.style.display = "block";
    modalImg.src = menuImage.src;

    // モーダルの閉じるボタンのイベント
    const closeBtn = modal.querySelector(".close");
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };

    // モーダル外クリックで閉じる
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };
  }
});
