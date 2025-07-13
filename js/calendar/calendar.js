// --- DOM初期化とDBからのデータ反映 ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // IndexedDBをオープン
    await dbAPI.openDatabase();

    // ページロード時に週セレクターを初期化し、現在の週データを表示する
    await populateWeekSelector();

    // 選択中の週
    const selectedWeek = document.getElementById("currentWeek").innerText;
    console.log("selected week:", selectedWeek);

    // table自体のdata-week属性を更新
    const calendarTable = document.querySelector(".calendar-table");
    calendarTable.setAttribute("data-week", selectedWeek);

    // DBから該当週のデータを取得
    const weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);
    if (weekRecord && weekRecord.data) {
      populateCalendar(weekRecord.data);
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
      setDefaultCells();

    }

    // 全エネルギー表示
    await recalcCumulativeEnergy();

    // 週間まとめエナジーModal関連
    initWeeklyMenuModal();

  } catch (error) {
    console.error("IndexedDBエラー:", error);
  }

  // イベントリスナーを設定
  setupEventListeners();
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

  // リセット（動的生成された要素）のイベントをデリゲーションで設定
  document.addEventListener("click", event => {
    if (event.target.classList.contains("action-reset")) {
      const cell = event.target.closest(".day-cell");
      resetCell(cell).then(() => {
        console.log("リセット完了");
      });
    }
  });
}

/**
 * セル表示の更新を行う関数
 * @param {HTMLElement} cell - 更新対象のセル
 * @param {Object} record - セルに表示するデータ
 * @param {number} record.energy - エネルギー値
 * @param {string|null} record.image - 画像データ（DataURL形式、またはnull）
 * @param {string} [record.dish] - 料理名（任意）
 * @param {boolean} [record.extra] - エクストラ料理フラグ（任意）
 * @returns {Promise<void>}
 */
async function updateCellDisplay(cell, record) {

  let content = `<div class="menu-item">${record.dish || ""}</div>
                 <div class="energy-value">${(record.energy || 0).toLocaleString()}</div>`;

  // エネルギー値が0より大きい場合はリセットボタンを表示
  if (record.energy > 0) {
    if (record.image) {
      // 画像がある場合は画像とリセットボタン
      content += `<div class="menu-image">
            <img src="${record.image}" >
            <button class="delete-image-btn action-reset">×</button>
        </div>`;
    } else {
      // 画像がない場合はリセットボタンのみ
      content += `<div class="menu-image"><button class="delete-image-btn action-reset">×</button></div>`;
    }
  } else {
    // エネルギー値がない場合は追加ボタンを表示
    content += `<button class="add-entry-button">追加</button>`;
  }

  cell.innerHTML = content;

  // DBに保存されたデータの extra プロパティが true なら、エナジー要素に extra-tasty クラスを追加
  if (record.extra) {
    const energyElement = cell.querySelector(".energy-value");
    if (energyElement) {
      energyElement.classList.add("extra-tasty");
    }
  }

}


// 週ごとのエナジー合計を再計算する関数
async function recalcEnergyTotals() {
  console.log('recalcEnergyTotals start');

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
  const weeklyNumElement = document.getElementById("weeklyEnergyNum");
  const weeklyTotalElement = document.getElementById("weekly-total-energy");
  if (weeklyNumElement) {
    weeklyNumElement.innerText = weeklyTotal.toLocaleString();
    weeklyTotalElement.innerText = weeklyTotal.toLocaleString();
  }

  // export画像の表示切り替え
  updateExportIconVisibility();

  // ついでに全エナジー表示更新
  await recalcCumulativeEnergy();
}

// 全データの累計エナジーを再計算する関数
async function recalcCumulativeEnergy() {
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

    // 全データの累計エナジーの表示更新
    const allEnergyNumEl = document.getElementById("allEnergyNum");

    if (allEnergyNumEl) {
      allEnergyNumEl.innerText = totalEnergy.toLocaleString();
    }
  } catch (error) {
    console.error("累計エナジー計算エラー:", error);
  }
}

// カレンダーTableに日付を設定する関数を追加
function updateWeekDates(weekString) {
  const mondayDate = new Date(getMondayDateFromWeek(weekString));

  days.forEach((day, index) => {
    const currentDate = new Date(mondayDate);
    currentDate.setDate(mondayDate.getDate() + index);

    // 日付をYYYY-MM-DD形式に変換
    const dateStr = currentDate.toISOString().split('T')[0];

    // 各曜日に対応する日付要素を取得
    const dateElements = document.querySelectorAll('.date-container');
    const dateEl = dateElements[index].querySelector('.date');

    if (dateEl) {
      dateEl.textContent = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
    }

    // その日の全セル（朝・昼・夜）にdata-date属性を設定
    const dayCells = document.querySelectorAll(`.day-cell[data-day="${day}"]`);
    dayCells.forEach(cell => {
      cell.setAttribute('data-date', dateStr);
    });
  });

}

// 週間まとめモーダル表示
function initWeeklyMenuModal() {
  // CSVエクスポートボタンのイベントリスナー
  const exportButton = document.getElementById('exportWeeklyCSV');
  if (exportButton) {
    exportButton.addEventListener('click', showWeeklyDataCSV);
  }

  // コピーボタンのイベントリスナー
  const copyButton = document.getElementById('copyCSV');
  if (copyButton) {
    copyButton.addEventListener('click', copyCSVContent);
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

// 週間エナジー更新時にアイコンの表示/非表示を切り替える関数
function updateExportIconVisibility() {
  const weeklyEnergy = parseInt(document.getElementById('weeklyEnergyNum').textContent.replace(/,/g, '')) || 0;
  const exportIcon = document.getElementById('exportWeeklyCSV');

  if (weeklyEnergy > 0) {
    exportIcon.classList.add('active');
  } else {
    exportIcon.classList.remove('active');
  }
}

// CSV出力機能
async function showWeeklyDataCSV() {
  const calendarTable = document.querySelector(".calendar-table");
  const selectedWeek = calendarTable.getAttribute("data-week");
  const weekRecord = await dbAPI.getWeeklyMenu(selectedWeek);

  if (!weekRecord || !weekRecord.data) {
    alert('エクスポートするデータがありません。');
    return;
  }

  // 日付範囲の取得
  const mondayDate = new Date(getMondayDateFromWeek(selectedWeek));

  let csvContent = '日付,曜日,朝,昼,夜,日計\n';

  // 時間帯ごとの合計値を計算するための変数
  let morningTotal = 0;
  let noonTotal = 0;
  let nightTotal = 0;

  days.forEach((day, index) => {
    const currentDate = new Date(mondayDate);
    currentDate.setDate(mondayDate.getDate() + index);
    const dateStr = currentDate.getFullYear() + '/' +
      String(currentDate.getMonth() + 1).padStart(2, '0')  + '/' +
      String(currentDate.getDate()).padStart(2, '0');

    const dayData = weekRecord.data[day] || {};
    // エネルギー値からカンマを除去
    const morning = (dayData['朝'] && dayData['朝'].energy) ? dayData['朝'].energy.toString().replace(/,/g, '') : 0;
    const noon = (dayData['昼'] && dayData['昼'].energy) ? dayData['昼'].energy.toString().replace(/,/g, '') : 0;
    const night = (dayData['夜'] && dayData['夜'].energy) ? dayData['夜'].energy.toString().replace(/,/g, '') : 0;
    const dayTotal = parseInt(morning) + parseInt(noon) + parseInt(night);

    // 時間帯ごとの合計に加算
    morningTotal += parseInt(morning);
    noonTotal += parseInt(noon);
    nightTotal += parseInt(night);

    csvContent += `${dateStr},${day},${morning},${noon},${night},${dayTotal}\n`;
  });

  // 週間合計を追加（カンマを除去）
  const weeklyTotal = document.getElementById('weeklyEnergyNum').textContent.replace(/,/g, '');
  csvContent += `合計,${morningTotal},${noonTotal},${nightTotal},${weeklyTotal}\n`;

  // テキストエリアにCSVを設定
  const csvTextarea = document.getElementById('csvContent');
  csvTextarea.value = csvContent;

  // モーダルを表示
  const modal = document.getElementById('csvModal');
  modal.style.display = 'block';
}

// コピー機能
async function copyCSVContent() {
  const csvTextarea = document.getElementById('csvContent');

  try {
    await navigator.clipboard.writeText(csvTextarea.value);

    // コピー成功のフィードバック
    const copyButton = document.getElementById('copyCSV');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'コピーしました！';
    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 2000);
  } catch (err) {
    // フォールバック: 従来のコピー方法
    csvTextarea.select();
    document.execCommand('copy');
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
