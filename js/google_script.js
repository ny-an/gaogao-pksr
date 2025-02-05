<!-- 大成功クリックイベントを送信するスクリプト -->
  document.getElementById("energyIcon").addEventListener('click', function(){
  gtag('event', 'click', {
    'event_category': 'button',
    'event_label': 'energyIconClick',
    'value': 1
  });
});

// エナジー生成イベントを送信するスクリプト
function sendEnergy(energy){
  gtag('event', 'create', {
    'event_category': 'Energy',
    'event_label': 'EnergyCalculate',
    'value': energy
  });
}