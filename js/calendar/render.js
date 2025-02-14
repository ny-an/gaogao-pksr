// --- カレンダーのセル表示更新 ---
function populateCalendar(weekData) {
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
function updateCellContent(cell, record) {
  let content = `<div class="menu-item">${record.dish || ""}</div>`
    +`<div class="energy-display">${(record.energy || 0).toLocaleString()}</div>`;
  if (record.energy) {
    content += `<div class="menu-image"><img src="${record.image}" ></div>`;
  }
  // リセットボタンを追加
  content += `<div class="action-buttons">
                <button class="btn-reset">リセット</button>
              </div>`;

  cell.innerHTML = content;

  // セルの内容を書き換えないエナジー合計専用関数を呼び出す
  recalcEnergyTotals();

}

// セル全体の表示を初期状態に戻す
function setDefaultCells() {
  document.querySelectorAll(".day-cell").forEach(cell => {
    setDefaultCell(cell);
  });
}

// セルの表示を初期状態に戻す
function setDefaultCell(cell) {
  cell.innerHTML = `<div class="energy-display"></div>
    <div class="action-buttons">
      <button class="btn-ocr">画像</button>
      <button class="btn-manual">入力</button>
    </div>
`;
}

// エナジー合計を再計算する関数
function recalcEnergyTotals() {
  const days = ["月", "火", "水", "木", "金", "土", "日"];
  // 曜日ごとの合計を初期化
  const dailyTotals = {};
  days.forEach(day => dailyTotals[day] = 0);

  // 全てのセルからエナジー値を集計
  const cells = document.querySelectorAll(".day-cell");
  cells.forEach(cell => {
    const energyDisplay = cell.querySelector(".energy-display");
    if (energyDisplay) {
      // 表示例："エナジー: 1,234"
      const text = energyDisplay.innerText;
      if (text) {
        // カンマを除去して数値に変換
        const energy = parseInt(text.replace(/,/g, ""), 10);
        if (!isNaN(energy)) {
          const day = cell.getAttribute("data-day");
          if (dailyTotals.hasOwnProperty(day)) {
            dailyTotals[day] += energy;
          }
        }
      }
    }
  });

  // 各曜日の合計をtfootのセルに反映
  const dailyTotalCells = document.querySelectorAll(".daily-total");
  dailyTotalCells.forEach(cell => {
    const day = cell.getAttribute("data-day");
    if (dailyTotals.hasOwnProperty(day)) {
      cell.innerText = dailyTotals[day].toLocaleString();
    }
  });

  // 週間合計の計算と表示（#weeklyEnergyの更新）
  const weeklyTotal = days.reduce((sum, day) => sum + dailyTotals[day], 0);
  const weeklyNumElement = document.getElementById("weeklyEnergyNum");
  if (weeklyNumElement) {
    weeklyNumElement.innerText = weeklyTotal.toLocaleString();
  }
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
    document.getElementById("mondayDate").innerText = mondayDate;

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
  dbAPI.getWeeklyMenu(selectedWeek).then(weekRecord => {
    // weekRecord.data が存在しなければ空オブジェクトを渡す
    populateCalendar(weekRecord && weekRecord.data ? weekRecord.data : {});

    // エナジー合計の更新
    recalcEnergyTotals();

  }).catch(error => {
    console.error("週情報の取得エラー:", error);
    // エラーが発生した場合は空の状態にする
    populateCalendar({});
  });

});


