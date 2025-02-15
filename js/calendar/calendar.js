
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
    if (event.target.classList.contains("btn-reset")) {
      const cell = event.target.closest(".day-cell");
      resetCell(cell).then(() => {
        console.log("リセット完了");
      });
    }
  });

  // リセットボタン（動的生成された要素）のイベントをデリゲーションで設定
  document.addEventListener("click", event => {
    // リセットボタン (btn-reset) の処理
    if (event.target.classList.contains("btn-reset")) {
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

      // OCRでエナジー値（数字のみ）を抽出
      const { data: { text } } = await Tesseract.recognize(
        file,
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
    <div class="menu-image"><img src="${compressedImage}" width="50"></div>
    <button class="btn-reset">リセット</button>
  `;

  // IndexedDB 更新: 現在のセルに対応するデータを更新
  await updateWeeklyRecord(cell, { dish: "", energy: energy, image: compressedImage });

  // エナジー合計の更新
  recalcEnergyTotals();

}