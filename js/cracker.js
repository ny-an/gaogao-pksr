// @see https://github.com/catdad/canvas-confetti

// 表示中の料理の食材カラーを取得
function getDishesTableFoodColors(){

  // 表示中の食材取得
  const foods = getViewingFoods();

  // 食材カラー表からカラーコードを取得
  const viewingFoodColors = [];
  for (const foodName in foods) {
    viewingFoodColors.push(foodColorMap[foodName]);
  }

  // カラー数が足りない場合は、既存カラーを増やす
  while (viewingFoodColors.length < 4) {
    viewingFoodColors.push(viewingFoodColors[viewingFoodColors.length % viewingFoodColors.length]);
  }

  return viewingFoodColors;
}

// 中央から
function startCentralFire() {
  const count = 200;
  const defaults = {
    origin: {y: 0.7}
  };

  // 食材に合わせたカラーを取得
  const colors = getDishesTableFoodColors();

  function fire(particleRatio, opts) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio),
      colors: colors
    }));
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

// 横から
function startSideFire(second=1){
  const end = Date.now() + ( second * 1000);

  // 食材に合わせたカラーを取得
  const colors = getDishesTableFoodColors();

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}