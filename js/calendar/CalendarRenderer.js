// 日記帳のテーブル表示
class CalendarRenderer {

  // カレンダーの全セルを対象データで描画
  async populateCalendar(weekData) {
    days.forEach(day => {
      meals.forEach(meal => {
        const cell = document.querySelector(`.day-cell[data-day="${day}"][data-meal="${meal}"]`);
        const record = weekData[day]?.[meal] || null;
        if (cell) {
          if (record) {
            this.updateCellContent(cell, record);
          } else {
            this.setDefaultCell(cell);
          }
        }
      });
    });
  }

  // 単一セルの内容を表示切替
  updateCellContent(cell, record) {

    // 状態管理でclass変更
    let imgClass = record.isManual ? "image-manual" : "";
    if(record.energy == 0) imgClass = "image-manual";

    // メモプレビュー：1行目の15文字まで取得
    const maxLen = 15;
    const memoText = record?.memo || "";
    const firstLine = memoText.includes('\n')
      ? memoText.split('\n')[0]
      : memoText;
    const shortMemo = firstLine.length > maxLen
      ? firstLine.slice(0, maxLen) + "…"
      : firstLine;

    let content = `<div class="menu-item">${record.dish || ""}</div>`;
    content += `<div class="energy-value">${(record.energy || 0).toLocaleString()}</div>`;
    content += `<div class="menu-image">`;
    content += `<img src="${record.image}" class="${imgClass}" onerror="this.src='img/foods/svg/SlowpokeTail.svg';this.classList.add('image-error');" >`;
    content += `</div>`;
    content += `<div class="memo-preview-area"><span class="memo-preview">${shortMemo}</span></div>`;
    cell.innerHTML = content;

    if (record.extra) {
      const energyElement = cell.querySelector(".energy-value");
      if (energyElement) energyElement.classList.add("extra-tasty");
    }
  }

  // 全セルを初期表示にする
  setAllDefaultCells() {
    document.querySelectorAll(".day-cell").forEach(cell => {
      this.setDefaultCell(cell);
    });
  }

  // 指定セルを初期表示にする
  setDefaultCell(cell) {
    cell.innerHTML = `
      <div class="energy-value"></div>
      <button class="add-entry-button">
          <img src="img/icons/pen_white.svg" alt="Pen Icon" class="icon pen-icon">
      </button>
    `;
  }

  // カレンダーテーブルに選択週の日付を反映
  updateWeekDates(weekString) {
    const mondayDate = new Date(getMondayDateFromWeek(weekString));
    days.forEach((day, idx) => {
      const currentDate = new Date(mondayDate);
      currentDate.setDate(mondayDate.getDate() + idx);
      const dateStr = currentDate.toISOString().split('T')[0];
      // 日付要素
      const dateElements = document.querySelectorAll('.date-container');
      const dateEl = dateElements[idx]?.querySelector('.date');
      if (dateEl) {
        dateEl.textContent = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      }
      // データ属性へ反映
      const dayCells = document.querySelectorAll(`.day-cell[data-day="${day}"]`);
      dayCells.forEach(cell => { cell.setAttribute('data-date', dateStr); });
    });
  }

  // --- リセット処理 ---
  // セルの状態を初期状態に戻し、IndexedDBから該当データを削除する
  async resetCell(cell) {
    // セル表示を初期状態にリセット
    this.setDefaultCell(cell);

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

  }

}
