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

}

// 利用例
// const exporter = new WeeklyDataExporter(window.dbAPI, days);
// exporter.showWeeklyDataCSV();
// exporter.copyCSVContent();