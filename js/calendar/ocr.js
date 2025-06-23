// ocr.js

/**
 * RGB → HSV 変換関数
 */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;

  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // 無彩色
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
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
async function extractRedTextImage(file) {
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
        const [h, s, v] = rgbToHsv(r, g, b);

        const isRed = ((h >= 0 && h <= 10) || (h >= 350 && h <= 360)) && s >= 50 && v >= 50;

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
