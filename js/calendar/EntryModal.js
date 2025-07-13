// 入力総合窓口
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
        compressedImage = await this.compressImage(file, width, height);

        // OCR処理
        const ocrReader = new OcrReader();
        const energy = await ocrReader.performOCR(file);

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

  // OCRエラー処理
  handleOCRError(imageData) {
    this.ocrEnergyValue.innerHTML = '<span style="color:red">OCR失敗</span>';
    this.imageData = imageData;

    // プレビュー表示
    const img = document.createElement('img');
    img.src = imageData;
    this.imagePreview.innerHTML = '';
    this.imagePreview.appendChild(img);
  }

  // 保存ボタン
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
      await calendarRender.updateCellContent(this.currentCell, record);

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

  /**
   * 画像を指定サイズに圧縮してBase64データに変換する関数
   * @param {File} file - アップロードされた画像ファイル
   * @param {number} maxWidth - 最大幅 (デフォルト300)
   * @param {number} maxHeight - 最大高さ (デフォルト300)
   * @returns {Promise<string>} 圧縮後のBase64データ
   */
  async compressImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          let width = img.width;
          let height = img.height;
          // アスペクト比を維持して縮小
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          // 画質は必要に応じて調整。第二引数の0.7はJPEGのクオリティ
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = function(error) {
          reject(error);
        };
        img.src = e.target.result;
      };
      reader.onerror = function(error) {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}

// グローバルなインスタンスを作成
window.entryModal = new EntryModal();