// js/calendar/entry-modal.js として新規作成
class EntryModal {
  constructor() {
    this.modal = document.getElementById('addEntryModal');
    this.dateDisplay = document.getElementById('modalDate');
    this.dayDisplay = document.getElementById('modalDay');
    this.ocrEnergyValue = document.getElementById('ocrEnergyValue');
    this.manualEnergyInput = document.getElementById('manualEnergyInput');
    this.confirmEnergyButton = document.getElementById('confirmEnergyButton'); // 追加
    this.saveButton = document.getElementById('saveEntryButton');
    this.imageButton = document.getElementById('imageSelectButton');
    this.imagePreview = document.getElementById('selectedImagePreview');

    this.currentCell = null;
    this.imageData = null;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // 保存ボタンセット
    this.saveButton.addEventListener('click', () => this.save());

    // 画像選択ボタンのイベントハンドラ
    this.imageButton.addEventListener('click', () => {
      const fileInput = document.getElementById('hiddenFileInput');
      fileInput.click();
    });

    // ファイル選択時の処理
    document.getElementById('hiddenFileInput').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      let compressedImage;

      try {
        // ローディング表示
        showLoading();

        // 画像の圧縮処理
        const quality = getSetting(SETTINGS_KEYS.IMAGE_QUALITY);
        const { width, height } = IMAGE_QUALITY_SIZES[quality];
        compressedImage = await compressImage(file, width, height);

        // OCR処理
        const energy = await performOCR(file);

        // プレビューと結果の更新
        this.updateWithOCRResult(energy, compressedImage);

      } catch (error) {
        console.error('OCR処理エラー:', error);
        // OCRが失敗しても画像は保存できるようにする
        this.handleOCRError(compressedImage);
      } finally {
        hideLoading();
        event.target.value = ''; // ファイル入力をリセット
      }
    });

    // 確定ボタンのイベントリスナーを追加
    this.confirmEnergyButton.addEventListener('click', () => {
      const value = this.manualEnergyInput.value;
      if (value) {
        this.ocrEnergyValue.textContent = parseInt(value).toLocaleString();
      }
    });


    // 保存ボタンのイベントハンドラ
    this.saveButton.addEventListener('click', () => this.save());

    // モーダルを閉じるボタンの処理
    const closeBtn = this.modal.querySelector('.close');
    closeBtn.onclick = () => this.close();

    // モーダル外クリックで閉じる
    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.close();
    };
  }

  open(date, meal) {
    this.currentCell = document.querySelector(`.day-cell[data-date="${date}"][data-meal="${meal}"]`);
    this.updateDateDisplay(date, meal);
    this.reset();
    this.modal.style.display = 'block';
  }

  close() {
    this.modal.style.display = 'none';
    this.reset();
  }

  reset() {
    this.imagePreview.innerHTML = '';
    this.ocrEnergyValue.textContent = '-';
    this.manualEnergyInput.value = '';
    this.imageData = null;
  }

  updateDateDisplay(date, meal) {
    const dateObj = new Date(date);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    this.dateDisplay.textContent = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
    this.dayDisplay.textContent = `(${days[dateObj.getDay()]}) ${meal}`;
  }

  updateWithOCRResult(energy, imageData) {
    this.ocrEnergyValue.innerHTML = energy;
    this.manualEnergyInput.value = energy;
    this.imageData = imageData;

    // プレビュー表示
    const img = document.createElement('img');
    img.src = imageData;
    this.imagePreview.innerHTML = '';
    this.imagePreview.appendChild(img);
  }

  handleOCRError(imageData) {
    this.ocrEnergyValue.innerHTML = '<span style="color:red">OCR失敗</span>';
    this.imageData = imageData;

    // プレビュー表示
    const img = document.createElement('img');
    img.src = imageData;
    this.imagePreview.innerHTML = '';
    this.imagePreview.appendChild(img);
  }

  async save() {
    // #ocrEnergyValue に確定値が表示されている場合のみ取得
    const ocrText = this.ocrEnergyValue.textContent.replace(/,/g, '').replace(/[^\d]/g, '');
    const energy = ocrText && !isNaN(parseInt(ocrText)) ? parseInt(ocrText) : 0;

    if (!energy && !this.imageData) {
      alert('エナジー値を手動入力して確定するか、料理画像を選択してください。');
      return;
    }

    // 保存データ
    const record = {
      dish: "",
      energy: energy,
      image: this.imageData,
    };

    try {
      // セルの更新
      await updateCellDisplay(this.currentCell, record);

      // データベースの更新
      await updateWeeklyRecord(this.currentCell, record);

      // エネルギー合計の再計算
      await recalcEnergyTotals();

      this.close();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存中にエラーが発生しました。');
    }
  }
}

// グローバルなインスタンスを作成
window.entryModal = new EntryModal();