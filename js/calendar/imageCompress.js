/**
 * 画像を指定サイズに圧縮してBase64データに変換する関数
 * @param {File} file - アップロードされた画像ファイル
 * @param {number} maxWidth - 最大幅 (デフォルト300)
 * @param {number} maxHeight - 最大高さ (デフォルト300)
 * @returns {Promise<string>} 圧縮後のBase64データ
 */
function compressImage(file, maxWidth = 300, maxHeight = 300) {
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

// 利用例：ファイルアップロード後にcompressImage()を実行しBase64データを取得し、OCR処理と合わせる
// ※OCR処理はTesseract.jsを使用
// document.getElementById("hiddenFileInput").addEventListener("change", async (event) => {
//   const file = event.target.files[0];
//   if (!file) return;
//
//   try {
//     // 例: まずOCRを実行してエナジーを取得
//     const { data: { text } } = await Tesseract.recognize(file, "eng", { logger: (m) => console.log(m) });
//
//     // 数字取得の例 (正規表現で数字だけ抽出)
//     const energyMatch = text.match(/\d+/);
//     const energy = energyMatch ? parseInt(energyMatch[0], 10) : 0;
//     console.log("OCRエナジー:", energy);
//
//     // 続いて画像を圧縮してBase64に変換
//     const compressedDataUrl = await compressImage(file);
//     // console.log("圧縮後Base64画像:", compressedDataUrl);
//
//
//   } catch (error) {
//     console.error("処理エラー:", error);
//   }
//
//   // 次回のアップロードのためにファイル入力をリセット
//   event.target.value = "";
// });

// グローバルにエクスポートする場合
window.compressImage = compressImage;
