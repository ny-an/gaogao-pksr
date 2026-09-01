const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const analyticsSource = fs.readFileSync(path.join(projectRoot, 'js/koiki-puzzle-analytics.js'), 'utf8');
const v2PageSource = fs.readFileSync(path.join(projectRoot, 'koiki-puzzle-v2.html'), 'utf8');
const v2Source = fs.readFileSync(path.join(projectRoot, 'js/koiki-puzzle-v2.js'), 'utf8');
const survivalSource = fs.readFileSync(path.join(projectRoot, 'koiki-puzzle.html'), 'utf8');

function runAnalytics({ protocol = 'https:', hostname = 'ny-an.github.io', gtag } = {}) {
  const appendedScripts = [];
  const createdScripts = [];
  const documentElement = { dataset: {} };
  const document = {
    documentElement,
    head: { append: script => appendedScripts.push(script) },
    querySelector: () => null,
    createElement: tagName => {
      const listeners = {};
      const element = {
        tagName,
        async: false,
        src: '',
        dataset: {},
        listeners,
        addEventListener: (name, listener) => { listeners[name] = listener; }
      };
      createdScripts.push(element);
      return element;
    }
  };
  const context = {
    document,
    location: { protocol, hostname },
    console
  };
  context.window = context;
  if (gtag) context.gtag = gtag;
  vm.runInNewContext(analyticsSource, context);
  return { context, appendedScripts, createdScripts };
}

function eventCalls(context) {
  return Array.from(context.dataLayer || [], call => Array.from(call))
    .filter(call => call[0] === 'event');
}

test('V2とサバイバルが同じGA4共通処理を読み込む', () => {
  assert.match(v2PageSource, /<script src="js\/koiki-puzzle-analytics\.js\?v=20260901-2"><\/script>/);
  assert.match(survivalSource, /<script src="js\/koiki-puzzle-analytics\.js\?v=20260901-2"><\/script>/);
  assert.match(analyticsSource, /G-Q5BGCQDCV6/);
});

test('GA4は本番GitHub Pagesだけで初期化する', () => {
  const production = runAnalytics();
  assert.equal(production.context.KoikiPuzzleAnalytics.enabled, true);
  assert.equal(production.context.document.documentElement.dataset.puzzleAnalytics, 'enabled');
  assert.equal(production.appendedScripts.length, 1);
  assert.equal(production.appendedScripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-Q5BGCQDCV6');
  assert.equal(production.context.document.documentElement.dataset.puzzleGa4, 'loading');
  production.appendedScripts[0].listeners.load();
  assert.equal(production.context.document.documentElement.dataset.puzzleGa4, 'loaded');
  const initializationCalls = Array.from(production.context.dataLayer, call => Array.from(call).slice(0, 2));
  assert.deepEqual(initializationCalls, [['js', initializationCalls[0][1]], ['config', 'G-Q5BGCQDCV6']]);

  for (const location of [
    { protocol: 'file:', hostname: '' },
    { protocol: 'http:', hostname: '127.0.0.1' },
    { protocol: 'https:', hostname: 'example.test' }
  ]) {
    const calls = [];
    const local = runAnalytics({ ...location, gtag: (...args) => calls.push(args) });
    assert.equal(local.context.KoikiPuzzleAnalytics.enabled, false);
    assert.equal(local.context.document.documentElement.dataset.puzzleAnalytics, 'disabled');
    assert.equal(local.appendedScripts.length, 0);
    local.context.KoikiPuzzleAnalytics.startPlay({ game_version: 'v2', game_mode: 'normal', category: 'curry' });
    assert.deepEqual(calls, []);
  }
});

test('開始・再開・料理・終了・シェアを固定パラメータで送る', () => {
  const { context } = runAnalytics();
  const analytics = context.KoikiPuzzleAnalytics;
  assert.equal(analytics.startPlay({ game_version: 'v2', game_mode: 'normal', category: 'salad' }), true);
  assert.equal(context.document.documentElement.dataset.puzzleAnalyticsEvent, 'puzzle_play_start');
  assert.equal(analytics.startPlay({ game_version: 'v2', game_mode: 'normal', category: 'salad' }), false);
  assert.equal(analytics.completeMeal({
    game_version: 'v2', game_mode: 'normal', category: 'salad', dish_number: 2,
    recipe_level: 4, cooking_energy: 3210, total_energy: 6543,
    success_type: 'extra_tasty', email: 'send-never@example.com', board: 'secret'
  }), true);
  assert.equal(analytics.endPlay({
    game_version: 'v2', game_mode: 'normal', category: 'salad', end_reason: 'moves_zero',
    dishes_completed: 2, total_energy: 6543, max_cooking_energy: 3210, max_chain: 3, recipe_level: 4
  }), true);
  assert.equal(analytics.endPlay({ game_version: 'v2', game_mode: 'normal', category: 'salad', end_reason: 'moves_zero' }), false);
  assert.equal(analytics.resumePlay({
    game_version: 'v2', game_mode: 'normal', category: 'salad', dish_number: 3,
    moves_remaining: 7, total_energy: 6543
  }), true);
  assert.equal(analytics.share('v2'), true);

  const calls = eventCalls(context);
  assert.deepEqual(calls.map(call => call[1]), [
    'puzzle_play_start',
    'puzzle_meal_complete',
    'puzzle_play_end',
    'puzzle_resume',
    'share'
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][2])), {
    game_version: 'v2',
    game_mode: 'normal',
    category: 'salad',
    dish_number: 2,
    recipe_level: 4,
    cooking_energy: 3210,
    total_energy: 6543,
    success_type: 'extra_tasty'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[4][2])), {
    method: 'x',
    content_type: 'puzzle_result',
    item_id: 'v2'
  });
});

test('未定義値を省略し数値を整数として送る', () => {
  const { context } = runAnalytics();
  context.KoikiPuzzleAnalytics.trackPuzzleEvent('puzzle_resume', {
    game_version: 'v2',
    game_mode: 'ex',
    category: '',
    dish_number: '4.4',
    moves_remaining: undefined,
    total_energy: 123.7,
    localStorage: 'never-send'
  });
  const parameters = eventCalls(context)[0][2];
  assert.deepEqual(JSON.parse(JSON.stringify(parameters)), {
    game_version: 'v2',
    game_mode: 'ex',
    dish_number: 4,
    total_energy: 124
  });
});

test('gtagが失敗しても計測関数は例外を投げない', () => {
  const broken = runAnalytics({ gtag: () => { throw new Error('blocked'); } });
  assert.equal(broken.context.KoikiPuzzleAnalytics.enabled, false);
  assert.doesNotThrow(() => broken.context.KoikiPuzzleAnalytics.startPlay({
    game_version: 'survival', game_mode: 'survival', category: 'all'
  }));
  assert.equal(broken.context.KoikiPuzzleAnalytics.startPlay({
    game_version: 'survival', game_mode: 'survival', category: 'all'
  }), false);
});

test('V2は明示操作だけを開始・再開・モード変更終了として接続する', () => {
  assert.match(v2Source, /if \(!forceNew && restoreGame\(mode\)\) \{\s*trackResume\(\);/);
  assert.match(v2Source, /resetState\(mode\);\s*trackPlayStart\(\);/);
  assert.match(v2Source, /trackMealComplete\(energy\.totalEnergy, successType\);/);
  assert.match(v2Source, /endGame\('mode_change'\);/);
  assert.match(v2Source, /xShareButton\.addEventListener\('click', \(\) => sendAnalytics\('share', 'v2'\)\)/);
  const cancelSwitch = v2Source.slice(v2Source.indexOf('function cancelModeSwitch()'), v2Source.indexOf('function confirmModeSwitch()'));
  assert.doesNotMatch(cancelSwitch, /trackPlayEnd|endGame/);
});

test('サバイバルは新規開始・料理・終了・シェアを計測し自動復元を再開扱いしない', () => {
  assert.match(survivalSource, /trackPlayStart\(\);\s*renderAll\(\);/);
  assert.match(survivalSource, /trackMealComplete\(cookingEnergy, isExtraTasty\);/);
  assert.match(survivalSource, /function endGame\(endReason = ''\) \{\s*if \(!started \|\| ended\) return;\s*trackPlayEnd\(endReason\);/);
  assert.match(survivalSource, /xShareButton\.addEventListener\('click', \(\) => sendAnalytics\('share', 'survival'\)\)/);
  assert.doesNotMatch(survivalSource, /resumePlay/);
  assert.match(survivalSource, /自動復元はプレイヤーが「つづきから」を選んでいないため、再開イベントを送らない/);
});
