import { chromium } from 'playwright';
import { mkdir, writeFile, rename, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 录屏脚本（AC2 要求「录屏」）。
 *
 * 用 Playwright 的 recordVideo 真实录制浏览器操作，不做任何剪辑或补帧：
 *   1) 勾选两个状态 + 输入关键词 → 地址栏出现参数；
 *   2) 按 F5 刷新 → 筛选栏仍是原值、列表结果一致；
 *   3) 另录一段「无 publish 权限 vs 有权限」的账号切换对照（AC3 的动态证据）。
 *
 * 产物：docs/recording/ac2-url-restore-refresh.webm
 *       docs/recording/ac3-permission-switch.webm
 *       docs/recording/manifest.json（含 sha256、时长、分辨率）
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5201';
const OUT = path.join(ROOT, 'docs', 'recording');
const VIEWPORT = { width: 1440, height: 900 };

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const clips = [];

async function record(name, run) {
  const tmp = path.join(OUT, '_tmp-' + name);
  await mkdir(tmp, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    recordVideo: { dir: tmp, size: VIEWPORT },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const started = Date.now();
  try {
    await run(page);
  } finally {
    await context.close();
  }
  // Playwright 用随机名保存 webm，这里统一改名成可读文件名
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(tmp)).filter((file) => file.endsWith('.webm'));
  if (files.length !== 1) throw new Error(name + ': 期望 1 个 webm，实际 ' + files.length);
  const target = path.join(OUT, name + '.webm');
  await rename(path.join(tmp, files[0]), target);
  const info = await stat(target);
  const buf = await readFile(target);
  const crypto = await import('node:crypto');
  clips.push({
    name: name + '.webm',
    bytes: info.size,
    durationSeconds: Math.round((Date.now() - started) / 1000),
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  });
  process.stdout.write('RECORDED ' + name + '.webm (' + info.size + ' bytes)\n');
}

async function prepare(page, accountId) {
  await page.goto(BASE + '/academy/courses', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ account }) => {
    localStorage.removeItem('academy.course.list.db.v1');
    localStorage.removeItem('academy.course.list.api.v1');
    if (account) localStorage.setItem('academy.course.currentUser.v1', account);
  }, { account: accountId });
  await page.goto(BASE + '/academy/courses', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="course-table"]');
  await page.waitForTimeout(1200);
}

/** AC2：筛选 → 地址栏变化 → F5 刷新 → 筛选与结果都还在 */
await record('ac2-url-restore-refresh', async (page) => {
  await prepare(page, 'u_iam_admin');
  await page.waitForTimeout(1000);

  // 1) 勾选「草稿」
  await page.locator('[data-testid="filter-status"] input[value="draft"]').evaluate((n) => n.closest('label').click());
  await page.waitForTimeout(1200);
  // 2) 勾选「已发布」
  await page.locator('[data-testid="filter-status"] input[value="published"]').evaluate((n) => n.closest('label').click());
  await page.waitForTimeout(1200);
  // 3) 输入关键词「招商」
  await page.locator('[data-testid="filter-keyword"] input').click();
  await page.locator('[data-testid="filter-keyword"] input').type('招商', { delay: 180 });
  await page.waitForTimeout(1500);

  // 鼠标停在地址栏位置（页面顶部 URL 取证条）以便镜头记录当前参数
  await page.locator('[data-testid="url-mirror"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  // 4) F5 刷新（真实键盘事件，不是 page.reload，录屏里能看到浏览器刷新）
  await page.keyboard.press('F5');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="course-table"]');
  await page.waitForTimeout(2000);

  // 5) 镜头扫过筛选栏与结果区，证明「刷新后原样恢复」
  await page.locator('[data-testid="filter-bar"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.locator('[data-testid="course-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await page.locator('[data-testid="url-mirror"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
});

/** AC3：无 publish 权限账号 → 无审批按钮；切成有权限账号 → 出现审批按钮 */
await record('ac3-permission-switch', async (page) => {
  await prepare(page, 'u_iam_operator');
  await page.goto(BASE + '/academy/courses?status=pending_review&pageSize=20', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="course-table"]');
  await page.waitForTimeout(2000);

  const approveCountOperator = await page.locator('[data-action="approve"]').count();
  await page.locator('[data-testid="url-mirror"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="course-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // 切到「平台管理员」（有 publish 权限）
  await page.locator('[data-testid="account-switcher"] .t-input').click();
  await page.waitForTimeout(900);
  await page.locator('.t-select-option', { hasText: '平台管理员' }).click();
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="course-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const approveCountAdmin = await page.locator('[data-action="approve"]').count();

  // 再切回无权限账号，证明按钮随之消失
  await page.locator('[data-testid="account-switcher"] .t-input').click();
  await page.waitForTimeout(900);
  await page.locator('.t-select-option', { hasText: '课程运营' }).click();
  await page.waitForTimeout(2000);
  const approveCountBack = await page.locator('[data-action="approve"]').count();
  await page.waitForTimeout(1200);

  await writeFile(
    path.join(OUT, 'ac3-switch-evidence.json'),
    JSON.stringify(
      { approveCountOperator, approveCountAdmin, approveCountBack, note: '审批按钮数由页面 DOM 实时统计' },
      null,
      2,
    ),
    'utf8',
  );
});

await browser.close();
await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      base: BASE,
      viewport: VIEWPORT,
      note: 'Playwright recordVideo 直录，无剪辑；配套逐帧截图见 docs/screens。',
      clips,
    },
    null,
    2,
  ),
  'utf8',
);
process.stdout.write('ALL RECORDINGS DONE\n');
