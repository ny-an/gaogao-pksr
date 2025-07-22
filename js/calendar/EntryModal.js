// 入力総合窓口
class EntryModal {
  constructor() {
    this.selectedWeek = null;

    // 各種フラグ
    this.isManualInputFlg = false;
    this.extraFlg = false;

    this.modal = document.getElementById('addEntryModal');
    this.dateDisplay = document.getElementById('modalDate');
    this.dayDisplay = document.getElementById('modalDay');
    this.energyIcon = document.getElementById('energyIcon');
    this.ocrEnergyValue = document.getElementById('ocrEnergyValue');
    this.manualEnergyInput = document.getElementById('manualEnergyInput');
    // 訂正ボタン
    this.manualEnergyInputViewButton = document.getElementById("manualEnergyInputViewButton");
    // 訂正エリア
    this.energyInputDiv = document.getElementById("energyInputDiv");
    // 確定ボタン
    this.confirmEnergyButton = document.getElementById('confirmEnergyButton');
    this.saveButton = document.getElementById('saveEntryButton');
    this.imageButton = document.getElementById('imageSelectButton');
    this.imagePreview = document.getElementById('selectedImagePreview');

    // memo
    this.memoEditArea = document.getElementById('memoEditArea');
    this.memoTextArea = document.getElementById('memoTextArea');

    // modal内memoプレビュー
    this.modalMemoPreviewText = document.getElementById('modalMemoPreviewText');


    // 表示対象の日付
    this.currentWeekDay = null;
    this.currentMeal = null;

    this.currentCell = null;
    this.imageData = null;

    this.initializeEventListeners();
  }

  initializeEventListeners() {

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
        if(quality !== 'raw') {
          const {width, height} = IMAGE_QUALITY_SIZES[quality];
          compressedImage = await this.compressImage(file, width, height);
        }else{
          compressedImage = await this.fileToBase64(file);
        }

        // OCR処理
        const ocrReader = new OcrReader();
        const energy = await ocrReader.performOCR(file);

        // プレビューと結果の更新
        this.updateWithOCRResult(energy, compressedImage);

        // 状態管理
        this.isManualInputFlg = false;

      } catch (error) {
        console.error('OCR処理エラー:', error);
        // OCRが失敗しても画像は保存できるようにする
        this.handleOCRError(compressedImage);
      } finally {
        hideLoading();
        event.target.value = ''; // ファイル入力をリセット
      }
    });

    // modal自身へイベントリスナー付与
    this.modal.addEventListener('click', async (event) => {

      // メモ追加ボタン
      if (event.target.closest('#addMemoButton')) {
        this.memoEditArea.classList.toggle('active');
        this.memoTextArea.focus();
      }
      // メモ確定ボタン
      if (event.target.closest('#saveMemoButton')) {
        const memoText = this.memoTextArea.value.trim() ?? '';

        if (!this.selectedWeek || !this.currentWeekDay || !this.currentMeal){
          console.error('selectedWeek, currentDate, currentMeal is null');
          console.error(this.selectedWeek, this.currentWeekDay, this.currentMeal);
          return;
        }

        // 当日のデータのmemoだけ更新
        let record = await dbAPI.getRecordFromCell(this.currentCell);
        if(!record){
          console.warn('record is null');

          record = {};
          record.memo = memoText;
        }

        await dbAPI.updateWeeklyRecord(this.currentCell, record);
        this.memoEditArea.classList.toggle('active');

        // memo プレビュー
        this.memoPreviewText(memoText);

        // const memoPreviewText = (record?.memo ?? '').slice(0, 50).replace(/\n/g, '<br>');
        // this.modalMemoPreviewText.innerHTML = memoPreviewText;
      }

      // エナジー訂正ボタン
      if (event.target.closest('#manualEnergyInputViewButton')) {
        this.manualEnergyInputViewButton.classList.toggle("active");
        this.energyInputDiv.classList.toggle("active");

        // 値を現在表示の値にする
        const ocrText = this.ocrEnergyValue.textContent.replace(/,/g, '').replace(/[^\d]/g, '');
        const energy = ocrText && !isNaN(parseInt(ocrText)) ? parseInt(ocrText) : 0;
        this.manualEnergyInput.value = energy;

        return;
      }

      // エナジー訂正確定ボタン
      if (event.target.closest('#confirmEnergyButton')) {
        const value = this.manualEnergyInput.value;
        if (value) {
          this.ocrEnergyValue.textContent = parseInt(value).toLocaleString();
          this.manualEnergyInputViewButton.classList.toggle("active");
          this.energyInputDiv.classList.toggle("active");

          // 状態管理
          this.isManualInputFlg = true;
        }
        return;
      }

      // エナジーボタン：大成功トグル
      if (event.target.closest('#energyIcon')) {
        console.log('energyIcon clicked');

        try {

          // エナジー表示の大成功切り替え
          this.ocrEnergyValue.classList.toggle("extra-tasty");

          // モーダル要素に対してクラスの付与状況を反転
          this.currentCell.classList.toggle("extra-tasty");

          // DB 更新：クラスの有無に応じて extra フラグを更新
          this.extraFlg = !this.extraFlg;
          console.log('set extraFlg:', this.extraFlg);

        }catch(error) {
          console.error('updateExtraFlag error:', error)
          return;
        }
      }

      // 画像ボタン
      if (event.target.closest('#imageSelectButton')) {
        const fileInput = document.getElementById('hiddenFileInput');
        fileInput.click();
        return;
      }

      // 画像
      if(event.target.closest('#selectedImagePreview')){

        // 料理画像クリック時の拡大表示処理
        document.getElementById('selectedImagePreview').classList.toggle('max-view');


      }

      // 保存ボタン
      if (event.target.closest('#saveEntryButton')) {
        await this.save();
        return;
      }

      // リセットボタン
      if (event.target.closest('#resetEntryButton')) {
        console.log('reset-button clicked');
        const confirm_text = `【${this.currentWeekDay}曜の${this.currentMeal}】のデータを削除します。\n本当によろしいですか？`;
        if(!confirm(confirm_text)){
          return;
        }

        // リセット
        await calendarRender.resetCell(this.currentCell);
        // エナジー合計の更新
        await recalcEnergyTotals();

        this.close();
        return;
      }

      // 閉じるボタン
      if (event.target.closest('.close')) {
        this.close();
        return;
      }

      // モーダル背景クリックで閉じる
      if (event.target === this.modal) {
        this.close();
        return;
      }

    });

  }

  async open(date, meal) {
    console.log('EntryModal: open',date,meal);

    this.reset();
    this.selectedWeek = document.querySelector(".calendar-table").getAttribute("data-week");
    this.currentCell = document.querySelector(`.day-cell[data-date="${date}"][data-meal="${meal}"]`);
    this.currentWeekDay = weekDays[new Date(date).getDay()];
    this.currentMeal = meal;
    this.updateDateDisplay(date, meal);

    // 当日データ表示
    const record = await dbAPI.getRecordFromCell(this.currentCell);
    console.log('record:', record);
    const memoStr = record?.memo ?? 'memo';
    if(record){
      if(record.image) this.updateWithOCRResult(record.energy, record.image);
      this.isManualInputFlg = record.isManual;
      this.ocrEnergyValue.textContent = record.energy?.toLocaleString() ?? '-';
      this.memoTextArea.value = memoStr;
    }

    // 大成功表示切り替え
    if(record?.extra){
      this.ocrEnergyValue.classList.add("extra-tasty");
      this.extraFlg = true;
    }

    // memo プレビュー
    this.memoPreviewText(memoStr);

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
    this.memoEditArea.classList.remove('active');
    this.memoTextArea.value = '';
    this.currentCell = null;
    this.currentWeekDay = null;
    this.currentMeal = null;
    this.ocrEnergyValue.classList.remove("extra-tasty");
    this.extraFlg = false;
  }

  updateDateDisplay(date, meal) {
    const dateObj = new Date(date);
    this.dateDisplay.textContent = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
    this.dayDisplay.textContent = `(${days[dateObj.getDay()]}) ${meal}`;
  }

  // OCR後の処理
  updateWithOCRResult(energy, imageData) {
    this.ocrEnergyValue.innerHTML = energy;
    this.manualEnergyInput.value = energy;
    this.imageData = imageData;

    // プレビュー表示 + 拡大アイコンを右上固定で追加
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';

    const img = document.createElement('img');
    img.className = 'preview-image';
    img.src = imageData;

    const expandIcon = document.createElement('img');
    expandIcon.src = 'img/icons/expand.svg';
    expandIcon.className = 'expand-icon';
    expandIcon.alt = '拡大';

    wrapper.appendChild(img);
    wrapper.appendChild(expandIcon);

    this.imagePreview.innerHTML = '';
    this.imagePreview.appendChild(wrapper);
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

    // 保存データから上書き
    let record = await dbAPI.getRecordFromCell(this.currentCell);
    if(!record){
      record = {};
    }
    record.image = this.imageData ?? null;
    record.added = new Date().getTime();
    record.memo = this.memoTextArea.value.trim();
    record.energy = energy;
    record.extra = this.extraFlg;
    record.isManual = this.isManualInputFlg;
    console.log('save before record:', record);

    try {
      // セルの更新
      await calendarRender.updateCellContent(this.currentCell, record);

      // データベースの更新
      await dbAPI.updateWeeklyRecord(this.currentCell, record);

      // エネルギー合計の再計算
      await recalcEnergyTotals();

      this.close();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存中にエラーが発生しました。');
    }
  }

  // memo プレビュー更新
  memoPreviewText(memoStr){
    if(!memoStr) return;
    const memoPreviewText = memoStr.slice(0, 50).replace(/\n/g, '<br>');
    this.modalMemoPreviewText.innerHTML = memoPreviewText;
  }

  /**
   * 画像を指定サイズに圧縮してBase64データに変換する関数
   * @param {File} file - アップロードされた画像ファイル
   * @param {number} maxWidth - 最大幅 (デフォルト300)
   * @param {number} maxHeight - 最大高さ (デフォルト300)
   * @returns {Promise<string>} 圧縮後のBase64データ
   */
  async compressImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
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
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
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

  // リサイズしないでBase64化
  async fileToBase64(file) {
    // 画像の元サイズを取得
    const originalSize = await new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = function (e) {
        img.onload = function () {
          resolve({ width: img.width, height: img.height });
        }
        img.onerror = reject;
        img.src = e.target.result;
      }
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return await this.compressImage(file, originalSize.width, originalSize.height, 1);
  }

  // 当日のメモを表示
  async setMemoTextForDay(selectedWeek, date, meal) {
    await dbAPI.getRecordFromCell(this.currentCell).then(record => {
      this.memoTextArea.value = record?.memo ?? '';
      console.log('record.memo:', record?.memo);
    })
  }

}

// グローバルなインスタンスを作成
window.entryModal = new EntryModal();