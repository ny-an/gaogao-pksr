(function() {
  if (typeof getFoodImagePath !== 'function') {
    window.getFoodImagePath = food => (
      `img/foods/svg/${foodImageMap[food] || 'default.svg'}.svg`
    );
  }
})();
