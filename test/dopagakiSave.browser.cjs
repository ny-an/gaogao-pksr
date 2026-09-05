// Run against a local server in this checkout. Requires Playwright (no external requests).
// DOPAGAKI_TEST_URL=http://127.0.0.1:8769/dopagaki.html node test/dopagakiSave.browser.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.DOPAGAKI_TEST_URL || 'http://127.0.0.1:8769/dopagaki.html';
assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'local tests only');
const key = 'dopagaki-debug.run';
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
  await context.addInitScript(() => { window.requestAnimationFrame = () => 1; });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '?debug=1');
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), null, 'title must not save a new run');
  await page.locator('#startButton').click();
  assert(await page.evaluate((k) => __dopagaki.validateSave(JSON.parse(localStorage.getItem(k))), key), 'fresh snapshot valid');
  await page.evaluate(() => {
    __dopagaki.equip('あまいミツ'); __dopagaki.lock(0);
    __dopagaki.setInvuln(100); __dopagaki.setRecipeLv(40);
    __dopagaki.addKills('あまいミツ', 12);
    __dopagaki.spawnPickup('とくせんリンゴ', 160, 200);
    __dopagaki.step(1 / 60, 90);
    window.dispatchEvent(new Event('pagehide'));
  });
  const checkpoint = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  assert(checkpoint.run.pbullets.some((b) => b.pierce && Array.isArray(b.hit)), 'piercing hit Sets serialized');
  assert(await page.evaluate((k) => __dopagaki.validateSave(JSON.parse(localStorage.getItem(k))), key));
  await page.reload();
  assert.equal(await page.locator('#startButton').textContent(), 'つづきから');
  assert.equal((await page.evaluate(() => __dopagaki.state())).mode, 'title', 'reload must wait for player');
  const savedWhileWaiting = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), savedWhileWaiting, 'title must not overwrite saved state');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('#newRunButton').click();
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), savedWhileWaiting, 'cancel preserves save');
  await page.locator('#startButton').click();
  const restored = await page.evaluate(() => __dopagaki.snapshot());
  assert.deepEqual(restored.run, checkpoint.run, 'all run state restored exactly');
  assert.deepEqual(restored.progress, checkpoint.progress, 'no duplicate rewards/record changes');
  await page.evaluate(() => __dopagaki.step(1 / 60, 20));
  assert(await page.evaluate(() => __dopagaki.validateSave(__dopagaki.snapshot())), 'restored piercing bullets still work');

  for (const index of [2, 6]) {
    await page.evaluate((i) => {
      __dopagaki.startBoss(i); __dopagaki.setInvuln(100); __dopagaki.step(1 / 60, 500);
      __dopagaki.bomb(); __dopagaki.damageBoss(10); __dopagaki.save();
      window.dispatchEvent(new Event('pagehide'));
    }, index);
    const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
    assert(before.run.bossId !== null && before.run.enemies.length > 0, 'boss saved');
    assert(before.run.bombCooldown > 0, 'cooldown saved');
    await page.reload(); await page.locator('#startButton').click();
    assert.deepEqual((await page.evaluate(() => __dopagaki.snapshot())).run, before.run, 'boss, bullets, timers, side order preserved');
    if (index === 6) {
      await page.evaluate(() => __dopagaki.damageBoss(999999));
      const after = await page.evaluate(() => __dopagaki.snapshot());
      assert.equal(after.run.order.boss, 'おいしいシッポ', 'pumpkin reference identity preserves Sunday second boss');
      assert.equal(after.run.mealsRun, 20, 'pumpkin does not finish Sunday meal prematurely');
      await page.evaluate(() => { __dopagaki.setInvuln(100); __dopagaki.step(1 / 60, 310); __dopagaki.damageBoss(999999); window.dispatchEvent(new Event('pagehide')); });
      const weekBreak = await page.evaluate(() => __dopagaki.snapshot());
      assert.equal(weekBreak.run.week, 2); assert(weekBreak.run.interlude > 0);
      await page.reload(); await page.locator('#startButton').click();
      assert.deepEqual((await page.evaluate(() => __dopagaki.snapshot())).run, weekBreak.run, 'week interlude restored');
    }
  }
  await page.evaluate(() => { __dopagaki.start(); __dopagaki.setInvuln(0); __dopagaki.hit(); });
  assert.equal((await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)).ended, true, 'end retires save');
  await page.reload(); assert.equal(await page.locator('#startButton').textContent(), 'スタート！');
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), key);
  await page.reload(); assert.equal(await page.locator('#startButton').textContent(), 'スタート！');
  assert.match(await page.locator('#runSaveStatus').textContent(), /読み込めません/);
  await page.evaluate(({ k, checkpoint }) => { checkpoint.run.pbullets[0].hit = null; checkpoint.run.pbullets[0].pierce = true; localStorage.setItem(k, JSON.stringify(checkpoint)); }, { k: key, checkpoint });
  await page.reload(); assert.equal(await page.locator('#startButton').textContent(), 'スタート！', 'invalid partial snapshot rejected');

  await page.locator('#startButton').click(); await page.evaluate(() => __dopagaki.save());
  const second = await context.newPage(); await second.goto(url + '?debug=1');
  second.once('dialog', (d) => d.accept()); await second.locator('#newRunButton').click();
  await page.waitForFunction(() => document.getElementById('startTitle').textContent.includes('別のタブ'));
  const newest = await second.evaluate((k) => localStorage.getItem(k), key);
  await page.evaluate(() => __dopagaki.save());
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), newest, 'stale tab cannot overwrite current run');
  assert.equal(await page.evaluate(() => localStorage.getItem('dopagaki.run')), null, 'debug storage isolated');
  await second.close();

  const failed = await context.newPage();
  await failed.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await failed.goto(url + '?debug=1'); await failed.evaluate(() => __dopagaki.start());
  assert.equal((await failed.evaluate(() => __dopagaki.state())).mode, 'play', 'storage error does not stop gameplay');
  assert.match(await failed.locator('#runSaveStatus').textContent(), /保存できません/);
  await failed.close();

  const realtime = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await realtime.route('**/*', (r) => new URL(r.request().url()).origin === new URL(url).origin ? r.continue() : r.abort());
  const live = await realtime.newPage(); live.on('pageerror', (e) => errors.push(e.message));
  await live.goto(url); await live.locator('#startButton').click();
  const realKey = 'dopagaki.run';
  assert.equal(await live.evaluate(() => typeof window.__dopagaki), 'undefined', 'normal play does not expose debug');
  const firstSave = await live.evaluate((k) => JSON.parse(localStorage.getItem(k)).savedAt, realKey);
  await live.waitForFunction(({ k, previous }) => JSON.parse(localStorage.getItem(k)).savedAt > previous, { k: realKey, previous: firstSave });
  await live.reload();
  assert.equal(await live.locator('#startButton').textContent(), 'つづきから', 'realtime autosave reload');
  assert(await live.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile no horizontal overflow');
  await live.screenshot({ path: '/private/tmp/dopagaki-resume-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: full roundtrip, records, piercing Sets, coffee/pumpkin, Sunday second boss, week break, cooldown, pause/reload, cancel, end marker, corrupt saves, multi-tab, debug isolation, storage failure, timed autosave, mobile UI');
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
