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
    +`<div class="energy-value">${(record.energy || 0).toLocaleString()}</div>`;
  if (record.energy) {
    content += `<div class="menu-image">
            <img src="${record.image}" >
            <button class="delete-image-btn action-reset">×</button>
        </div>`;
  }
  content += `<div class="action-buttons">
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
  cell.innerHTML = `<div class="energy-value"></div>
    <div class="action-buttons">
      <button class="btn-ocr">画像</button>
      <button class="btn-manual">入力</button>
    </div>
`;
}

// エナジー合計を再計算する関数
async function recalcEnergyTotals() {
  console.log('recalcEnergyTotals start');

  const selectedWeek = document.querySelector(".calendar-table").getAttribute("data-week");
  const weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
  const days = ["月", "火", "水", "木", "金", "土", "日"];
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
  const weeklyNumElement = document.getElementById("weeklyEnergyNum");
  const weeklyTotalElement = document.getElementById("weekly-total");
  if (weeklyNumElement) {
    weeklyNumElement.innerText = weeklyTotal.toLocaleString();
    weeklyTotalElement.innerText = weeklyTotal.toLocaleString();
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


