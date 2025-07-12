// --- カレンダーのセル表示更新 ---
async function populateCalendar(weekData) {
  days.forEach(day => {
    meals.forEach(meal => {
      const cell = document.querySelector(`.day-cell[data-day="${day}"][data-meal="${meal}"]`);
      const record = weekData[day] ? weekData[day][meal] : null;
      if (cell) {
        if (record) {
          updateCellContent(cell, record);
        } else {
          setDefaultCell(cell);
        }
      }
    });
  });
}

// --- カレンダーのセル表示更新 ---
async function updateCellContent(cell, record) {
  let content = `<div class="menu-item">${record.dish || ""}</div>`
    +`<div class="energy-value">${(record.energy || 0).toLocaleString()}</div>`;
  if (record.energy) {
    content += `<div class="menu-image">`;
    if(record.image)content += `<img src="${record.image}" >`;
    content += `<button class="delete-image-btn action-reset">×</button>`
    content += `</div>`;
  }
  content += `<div class="action-buttons">
              </div>`;

  cell.innerHTML = content;

  // DBに保存されたデータの extra プロパティが true なら、エナジー要素に extra-tasty クラスを追加
  if (record.extra) {
    const energyElement = cell.querySelector(".energy-value");
    if (energyElement) {
      energyElement.classList.add("extra-tasty");
    }
  }

  // セルの内容を書き換えないエナジー合計専用関数を呼び出す
  await recalcEnergyTotals();

}

// セル全体の表示を初期状態に戻す
function setDefaultCells() {
  document.querySelectorAll(".day-cell").forEach(cell => {
    setDefaultCell(cell);
  });
}

// セルの表示を初期状態に戻す
function setDefaultCell(cell) {
  cell.innerHTML = `
    <div class="energy-value"></div>
    <button class="add-entry-button">追加</button>
  `;
}


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

// IndexedDBにデータのある週だけ表示するための週セレクター初期化関数
async function populateWeekSelector() {
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
    updateWeekDates(selectedWeek);  // 日付を更新
  });

  // 初期表示時の日付設定
  const currentWeek = weekSelector.value;
  updateWeekDates(currentWeek);

}


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
    await populateCalendar(weekRecord && weekRecord.data ? weekRecord.data : {});

    // エナジー合計の更新
    await recalcEnergyTotals();

  }).catch(error => {
    console.error("週情報の取得エラー:", error);
    // エラーが発生した場合は空の状態にする
    populateCalendar({});
  });

});


