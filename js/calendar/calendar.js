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

  } catch (error) {
    console.error("IndexedDBエラー:", error);
  }

  // イベントリスナーを設定
  setupEventListeners();
});


// --- イベントリスナー設定 ---
function setupEventListeners() {
  let currentCell = null;
  const hiddenFileInput = document.getElementById("hiddenFileInput");

  // DOMへのリスナー設置
  document.addEventListener("click", event => {
    // 「画像」ボタンの処理
    if (event.target.classList.contains("btn-ocr")) {
      const cell = event.target.closest(".day-cell");
      currentCell = cell;
      document.getElementById("hiddenFileInput").click();
    }

    // 「入力」ボタンの処理
    if (event.target.classList.contains("btn-manual")) {
      const cell = event.target.closest(".day-cell");
      const value = prompt("エナジー値を入力してください:");
      if (value !== null) {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {

          // セルの更新およびIndexedDBの更新
          updateCellDisplay(cell, num, "").then();

        } else {
          alert("有効な数字を入力してください。");
        }
      }
    }

    // 「リセット」ボタンの処理
    if (event.target.classList.contains("action-reset")) {
      const cell = event.target.closest(".day-cell");
      resetCell(cell).then(() => {
        console.log("リセット完了");
      });
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

  // hiddenFileInput: 画像アップロード後にOCRと画像圧縮を実施しDB更新
  hiddenFileInput.addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file || !currentCell) return;

    const displayEl = currentCell.querySelector(".energy-value");
    displayEl.innerText = "OCR処理中...";


    // ボタン非表示化
    // const actionButtonEl = currentCell.querySelector(".action-button");
    // actionButtonEl.innerHTML = "";

    try {

      // loading表示
      showLoading();

      // HSV処理で読みやすくする
      const redOnlyBlob = await extractRedTextImage(file);

      // OCRでエナジー値（数字のみ）を抽出
      const { data: { text } } = await Tesseract.recognize(
        redOnlyBlob,
        "eng", // 必要に応じて 'jpn' に変更
        { logger: m => console.log(m) }
      );

      const lines = text.split('\n');
      // 数字とカンマだけの行を抽出し、100未満の数字の行を除外
      const filteredLines = lines.filter(line => /^[0-9,]+$/.test(line))
        .filter(line => {
          const num = parseInt(line.replace(/,/g, ''), 10);
          return num >= 100;
        });

      // 抽出した行の数字を常にカンマ付きにフォーマット
      const energy = filteredLines.map(line => {
        const num = parseInt(line.replace(/,/g, ''), 10);
        return num.toLocaleString('en-US');
      });
      console.log('energy:',energy);

      // 画像を圧縮してBase64へ変換（例: 最大150×150）
      const compressedImage = await compressImage(file, 300, 300);

      // セルの更新およびIndexedDBの更新
      await updateCellDisplay(currentCell, energy, compressedImage);

    } catch (error) {
      // displayEl.innerText = "OCR/圧縮失敗";
      alert("画像解析失敗！手入力してください！！");
      console.error(error);
    }finally {
      hideLoading(); // OCR処理完了後にローディング非表示
    }

    // 次回のアップロードのためにファイル入力をリセット
    hiddenFileInput.value = "";
  });
}

/**
 * セル表示および IndexedDB の更新を行う関数
 * @param {HTMLElement} cell - 更新対象のセル
 * @param {number|string} energy - エナジー値
 * @param {string} compressedImage - 画像のURL（圧縮済み）
 */
async function updateCellDisplay(cell, energy, compressedImage) {
  // セル表示更新：料理名は今回は空文字とする
  cell.innerHTML = `
    <div class="menu-item"></div>
    <div class="energy-value">${energy.toLocaleString()}</div>
    <div class="menu-image action-reset">
        <img src="${compressedImage}" width="50">
        <button class="delete-image-btn action-reset">×</button>
    </div>
  `;

  // IndexedDB 更新: 現在のセルに対応するデータを更新
  await updateWeeklyRecord(cell, { dish: "", energy: energy, image: compressedImage });

  // エナジー合計の更新
  recalcEnergyTotals();

}


// 週ごとのエナジー合計を再計算する関数
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

  // ついでに全エナジー表示更新
  await recalcCumulativeEnergy();
}

// 全データの累計エナジーを再計算する関数
async function recalcCumulativeEnergy() {
  try {
    const allWeekRecords = await dbAPI.getAllWeeklyMenus();
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    const meals = ["朝", "昼", "夜"];
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