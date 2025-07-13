// OcrReader.js

class OcrReader {

  /**
   * RGB → HSV 変換関数
   */
  rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;

    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // 無彩色
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60; // 0〜360°
    }

    return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
  }

  /**
   * 赤文字部分のみを抽出した画像Blobを返す
   * @param {File} file - 入力画像ファイル
   * @returns {Promise<Blob>} - 二値化画像のBlob（PNG）
   */
  async extractRedTextImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const reader = new FileReader();
      reader.onload = () => {
        image.src = reader.result;
      };
      reader.readAsDataURL(file);

      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const [h, s, v] = this.rgbToHsv(r, g, b);

          const isRed = (h < 40 || h >= 300 && h <= 360) && s >= 20 && v >= 30;

          if (isRed) {
            data[i] = data[i + 1] = data[i + 2] = 255; // 白
          } else {
            data[i] = data[i + 1] = data[i + 2] = 0;   // 黒
          }
        }

        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Blob化失敗"));
        }, "image/png");
      };

      image.onerror = err => {
        reject(new Error("画像読み込みエラー: " + err));
      };
    });
  }

  // OCR処理を行う
  async performOCR(file) {
    try {
      // 通常のOCR処理
      const {data: {text}} = await Tesseract.recognize(
        file,
        "eng",
        {logger: m => console.log(m)}
      );

      let filteredLines = this.processOcrText(text);

      // OCR失敗時は赤文字抽出処理を試みる
      if (filteredLines.length === 0) {
        console.error('try1. no energy lines');

        const redOnlyBlob = await this.extractRedTextImage(file);
        const {data: {text: redText}} = await Tesseract.recognize(
          URL.createObjectURL(redOnlyBlob),
          "eng",
          {logger: m => console.log(m)}
        );
        filteredLines = this.processOcrText(redText);
      }

      if (filteredLines.length > 0) {
        const num = parseInt(filteredLines[0].replace(/,/g, ''), 10);
        return num.toLocaleString('en-US');
      }

      throw new Error('エネルギー値を検出できませんでした');
    } catch (error) {
      throw error;
    }
  }

  // OCR結果の文字列から数字のみを取得
  processOcrText(text) {
    return text
      .split('\n')
      .map(line => line.trim()) // 空白を削除
      .filter(line => line.length > 0) // 空行を除外
      .filter(line => /^[0-9,\.]+$/.test(line)) // 数字、カンマ、ドットのみの行を抽出
      .map(line => {
        // カンマと小数点を含む数字を処理
        const cleanedNumber = line
          .replace(/,/g, '') // カンマを削除
          .replace(/\./g, '') // 小数点を削除
          .trim();
        return cleanedNumber;
      })
      .filter(num => parseInt(num, 10) >= 100); // 100以上の数値のみを抽出
  }
}