// Exporterクラス
class WeeklyDataExporter {
  constructor(dbAPI, days) {
    this.dbAPI = dbAPI;
    this.days = days;
  }

  // CSV表示専用
  async showWeeklyDataCSV() {
    console.log('showWeeklyDataCSV start');
    const calendarTable = document.querySelector(".calendar-table");
    const selectedWeek = calendarTable.getAttribute("data-week");

    const csvContent = await this.createWeeklyDataCSV(selectedWeek);

    if (!csvContent) {
      alert('エクスポートするデータがありません。');
      return;
    }

    const csvTextarea = document.getElementById('csvContent');
    csvTextarea.value = csvContent;

    const modal = document.getElementById('csvModal');
    modal.style.display = 'block';

    // まとめ画像表示
    await this.writeOutAllImages(selectedWeek);

  }

  // CSV文字列作成専用
  async createWeeklyDataCSV (selectedWeek) {
    const weekRecord = await this.dbAPI.getWeeklyMenu(selectedWeek);

    if (!weekRecord || !weekRecord.data) {
      return null;
    }

    const mondayDate = new Date(getMondayDateFromWeek(selectedWeek));
    let csvContent = '日付,曜日,朝,昼,夜,日計\n';

    let morningTotal = 0;
    let noonTotal = 0;
    let nightTotal = 0;

    // 日ごとに1列のデータ作成処理
    this.days.forEach((day, index) => {
      const currentDate = new Date(mondayDate);
      currentDate.setDate(mondayDate.getDate() + index);

      const dateStr =
        currentDate.getFullYear() + '/' +
        String(currentDate.getMonth() + 1).padStart(2, '0')  + '/' +
        String(currentDate.getDate()).padStart(2, '0');

      const dayData = weekRecord.data[day] || {};
      let morning = (dayData['朝'] && dayData['朝'].energy) ? dayData['朝'].energy.toString().replace(/,/g, '') : 0;
      let noon = (dayData['昼'] && dayData['昼'].energy) ? dayData['昼'].energy.toString().replace(/,/g, '') : 0;
      let night = (dayData['夜'] && dayData['夜'].energy) ? dayData['夜'].energy.toString().replace(/,/g, '') : 0;
      const dayTotal = parseInt(morning) + parseInt(noon) + parseInt(night);

      morningTotal += parseInt(morning);
      noonTotal += parseInt(noon);
      nightTotal += parseInt(night);

      // 大成功考慮
      const morningObj = weekRecord.data[day]?.['朝'];
      const noonObj = weekRecord.data[day]?.['昼'];
      const nightObj = weekRecord.data[day]?.['夜'];

      if (morningObj?.extra) morning += '!';
      if (noonObj?.extra) noon += '!';
      if (nightObj?.extra) night += '!';

      const row = `${dateStr},${day},${morning},${noon},${night},${dayTotal}\n`;
      console.log('row:',row);

      csvContent += row;
    });

    // 週間合計を追加
    const weeklyTotal = document.getElementById('weeklyEnergyNum').textContent.replace(/,/g, '');
    csvContent += `合計,${morningTotal},${noonTotal},${nightTotal},${weeklyTotal}\n`;

    return csvContent;
  }

  // textareaをコピー
  async copyCSVContent() {
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

  // 週間エナジー更新時にアイコンの表示/非表示を切り替える関数
  updateExportIconVisibility() {
    const weeklyEnergy = parseInt(document.getElementById('weeklyEnergyNum').textContent.replace(/,/g, '')) || 0;
    const exportIcon = document.getElementById('exportWeeklyCSV');

    if (weeklyEnergy > 0) {
      exportIcon.classList.add('active');
    } else {
      exportIcon.classList.remove('active');
    }
  }


  /**
   * まとめ画像作成処理
   * すべての食事画像を1枚のまとめ画像として合成し、「コピー」ボタンの下に表示
   * @param {string} week 週情報 ("2024-W23" など)
   */
  async writeOutAllImages(week) {
    console.log('writeOutAllImages start');

    const emptyImage = "";
    const images = [];
    const daysArr = this.days;
    const mealsArr = ['朝', '昼', '夜'];

    // 各セル画像を集める
    const weekRecord = await this.dbAPI.getWeeklyMenu(week);
    for (let day of daysArr) {
      let row = [];
      for (let meal of mealsArr) {
        const rec = weekRecord?.data?.[day]?.[meal];
        const imgSrc = rec && rec.image ? rec.image : emptyImage;
        row.push(imgSrc);
      }
      images.push(row);
    }

    // images配列を作った後、不要な日(行)を除外してcanvasを作る
    const filteredImages = [];
    const filteredDays = [];
    const cellWidth = 210;
    const cellHeight = 400;
    const canvas = document.createElement('canvas');
    canvas.width = cellWidth * mealsArr.length;
    canvas.height = cellHeight * daysArr.length;
    const ctx = canvas.getContext('2d');

    // 各画像をまとめる
    for (let row = 0; row < daysArr.length; row++) {
      const rowImages = images[row];
      // [朝, 昼, 夜] のいずれかが空でなければ有効
      const hasAnyImage = rowImages.some(src => src && src.trim());
      if (hasAnyImage) {
        filteredImages.push(rowImages);
        filteredDays.push(daysArr[row]);
      }
    }

    // canvasサイズを有効なdaysだけに可変
    canvas.height = cellHeight * filteredImages.length;

    // ↓以降のfor文も有効な行だけ描画
    for (let row = 0; row < filteredImages.length; row++) {
      for (let col = 0; col < mealsArr.length; col++) {
        const imgSrc = filteredImages[row][col];
        if (!imgSrc || imgSrc.trim() === '' || imgSrc === emptyImage) {
          // 空欄は背景グレーにして描画スキップ
          ctx.fillStyle = '#efefef';
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
          continue;
        }

        const img = new window.Image();
        img.src = imgSrc;
        await new Promise(resolve => {
          img.onload = () => {
            // contain方式（縦横比維持で最大表示、余白は透明）
            const ratio = Math.min(cellWidth / img.width, cellHeight / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const dx = col * cellWidth + (cellWidth - w) / 2;
            const dy = row * cellHeight + (cellHeight - h) / 2;
            ctx.drawImage(img, dx, dy, w, h);
            resolve();
          };
          img.onerror = () => {
            // スキップ
            resolve();
          };
        });
      }
    }

    // まとめ画像をdataURLで取得
    // 「コピー」ボタン下のエリアに表示
    const dataUrl = canvas.toDataURL('image/png');
    let belowCopy = document.getElementById('belowCopyBtnArea');
    if (!belowCopy) {
      // idが無ければ作成し、コピーボタンの直下に挿入
      const copyBtn = document.getElementById('copyCSV');
      belowCopy = document.createElement('div');
      belowCopy.id = 'belowCopyBtnArea';
      belowCopy.style.textAlign = 'center';
      belowCopy.style.marginTop = '20px';
      copyBtn.insertAdjacentElement('afterend', belowCopy);
    }
    belowCopy.innerHTML = `
      <div style="font-weight:bold;margin-bottom:8px;">まとめ画像</div>
      <div style="overflow: scroll;max-height: 300px; border:1px solid #ccc;" data-simplebar>
        <img src="${dataUrl}" style="max-width:100%;">
      </div>
    `;
  }

}

// 利用例
// const exporter = new WeeklyDataExporter(window.dbAPI, days);
// exporter.showWeeklyDataCSV();
// exporter.copyCSVContent();