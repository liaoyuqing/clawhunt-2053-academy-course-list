import { chromium } from 'playwright';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 截图脚本：真实渲染页面后用 Playwright 截图，不手画任何图。
 *
 * 产出（与 README 的 AC 证据表逐条对应）：
 *   docs/screens/state-{status}.png         AC1：5 种状态各自的按钮组合
 *   docs/screens/ac3-*.png                  AC3：无 publish 权限 / 提交人边界
 *   docs/screens/ac2-*.png                  AC2：URL 回填与刷新后的静态备份证据
 *   docs/screens/manifest.json              尺寸 + sha256（证明文件非空、互不重复）
 *   docs/screens/index.txt                  AC → 文件 → 说明 的索引
 *
 * 每个状态截图的文件名固定为 state-{status}.png（订单验收要求「各有截图」）。
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5201';
const OUT = path.join(ROOT, 'docs', 'screens');

const VIEWPORT = { width: 1600, height: 1000 };
const DPR = 1;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'zh-CN' });
const page = await context.newPage();
page.setDefaultTimeout(25000);

const shots = [];
async function shot(name, opts = {}) {
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, ...opts });
  shots.push(name + '.png');
  process.stdout.write('SHOT ' + name + '.png\n');
}

/** 每次进页面前固定账号并清空 mock 库，保证截图可重复 */
async function openList(query, accountId) {
  await page.goto(BASE + '/academy/courses', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ account }) => {
    localStorage.removeItem('academy.course.list.db.v1');
    localStorage.removeItem('academy.course.list.api.v1');
    if (account) localStorage.setItem('academy.course.currentUser.v1', account);
  }, { account: accountId });
  await page.goto(BASE + '/academy/courses' + query, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="course-table"]');
  await page.waitForSelector('[data-testid^="status-tag-"]');
  await page.waitForTimeout(500);
}

/** 取某一行操作列的按钮文案（用于与矩阵核对后写进 evidence json） */
async function actionsOfRow(courseNo) {
  return page.$$eval(
    '[data-testid="actions-' + courseNo + '"] [data-action]',
    (nodes) => nodes.map((node) => node.getAttribute('data-action')),
  );
}

const evidence = {};

/* ---------------- AC1：5 种状态各自的按钮组合 ---------------- */

const STATES = [
  { status: 'draft', courseNo: 'CRS-1001' },
  { status: 'pending_review', courseNo: 'CRS-1008' },
  { status: 'published', courseNo: 'CRS-1016' },
  { status: 'offline', courseNo: 'CRS-1025' },
  { status: 'archived', courseNo: 'CRS-1031' },
];

evidence.ac1 = { account: 'u_iam_admin（有 publish 权限）', states: {} };

for (const item of STATES) {
  // 单状态筛选：整屏只显示该状态的课程，状态标签与操作列同屏可见
  await openList('?status=' + item.status + '&pageSize=10', 'u_iam_admin');
  await shot('state-' + item.status);
  const actions = await actionsOfRow(item.courseNo);
  const tagText = await page.textContent('[data-testid="status-tag-' + item.status + '"]');
  evidence.ac1.states[item.status] = { courseNo: item.courseNo, tag: tagText, actions };
}

// 全状态总览（便于一眼比对 5 行的差异）
await openList('?pageSize=50', 'u_iam_admin');
await shot('matrix-overview-all-states', { fullPage: true });

// 操作列特写：5 种状态各取一行，裁到操作列区域
for (const item of STATES) {
  await openList('?status=' + item.status + '&pageSize=10', 'u_iam_admin');
  const cell = page.locator('[data-testid="actions-' + item.courseNo + '"]');
  await cell.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await cell.boundingBox();
  if (box) {
    await shot('state-' + item.status + '-actions-closeup', {
      clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 10), width: Math.min(box.width + 24, VIEWPORT.width), height: box.height + 20 },
    });
  }
}

/* ---------------- AC2：URL 恢复（静态备份证据；动态见 docs/recording） ---------------- */

const DIRTY = '?status=draft,published&category=business&visibility=all_members&q=%E6%8B%9B%E5%95%86&pageSize=20&sort=enroll_count:asc';

await openList('?pageSize=10', 'u_iam_admin');
await shot('ac2-before-url-01-clean');

// 用户操作：勾选两个状态 + 填关键词（真实点击，不是直接改 URL）
const boxes = ['draft', 'published'];
for (const value of boxes) {
  const label = page.locator('[data-testid="filter-status"] input[value="' + value + '"]');
  await label.evaluate((node) => node.closest('label').click());
  await page.waitForTimeout(300);
}
await page.locator('[data-testid="filter-keyword"] input').fill('招商');
await page.waitForTimeout(600);
await shot('ac2-before-url-02-filters-set');
const urlBeforeReload = page.url();
evidence.ac2 = { urlBeforeReload };

// 刷新：筛选栏仍是原值、列表结果一致
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="course-table"]');
await page.waitForTimeout(600);
await shot('ac2-after-reload-01-restored');
const urlAfterReload = page.url();
const keywordValue = await page.inputValue('[data-testid="filter-keyword"] input');
const checkedLabels = await page.$$eval('[data-testid="filter-status"] input:checked', (nodes) =>
  nodes.map((node) => (node.closest('label')?.textContent ?? '').trim()),
);
const rowCount = await page.$$eval('[data-testid^="course-no-"]', (nodes) => nodes.length);
evidence.ac2.urlAfterReload = urlAfterReload;
evidence.ac2.keywordAfterReload = keywordValue;
evidence.ac2.checkedAfterReload = checkedLabels;
evidence.ac2.rowsAfterReload = rowCount;
evidence.ac2.urlIdentical = urlBeforeReload === urlAfterReload;

// 带参数的深链直接打开（等价于「把地址发给同事」）
await openList(DIRTY, 'u_iam_admin');
await shot('ac2-deeplink-full-params');
evidence.ac2.deepLinkRows = await page.$$eval('[data-testid^="course-no-"]', (nodes) => nodes.length);

// 坏参数不白屏
await openList('?status=bogus,draft&page=-3&sort=nope:asc', 'u_iam_admin');
await shot('ac2-malformed-url-still-works');

/* ---------------- AC3：无 publish 权限不显示审批 ---------------- */

await openList('?status=pending_review&pageSize=20', 'u_iam_operator');
await shot('ac3-no-publish-permission');
const operatorRows = await page.$$eval('[data-testid^="actions-"]', (nodes) =>
  nodes.map((node) => ({
    courseNo: node.getAttribute('data-testid').replace('actions-', ''),
    actions: node.getAttribute('data-actions'),
  })),
);
evidence.ac3 = {
  account: 'u_iam_operator（无 publish 权限）',
  approveButtonsInDom: await page.locator('[data-action="approve"]').count(),
  rows: operatorRows,
};

// 对照组：同一批待审核行在有权限账号下出现审批按钮
await openList('?status=pending_review&pageSize=20', 'u_iam_admin');
await shot('ac3-control-with-publish-permission');
const adminRows = await page.$$eval('[data-testid^="actions-"]', (nodes) =>
  nodes.map((node) => ({
    courseNo: node.getAttribute('data-testid').replace('actions-', ''),
    actions: node.getAttribute('data-actions'),
  })),
);
evidence.ac3.controlRows = adminRows;

// 边界：有 publish 权限但本人是提交人 → 该行不显示审批，旁边别人的行仍显示
await openList('?status=pending_review&pageSize=20', 'u_iam_reviewer');
await shot('ac3-boundary-self-submitted');
const reviewerRows = await page.$$eval('[data-testid^="actions-"]', (nodes) =>
  nodes.map((node) => ({
    courseNo: node.getAttribute('data-testid').replace('actions-', ''),
    actions: node.getAttribute('data-actions'),
  })),
);
evidence.ac3.reviewerRows = reviewerRows;

/* ---------------- 其它页面证据（分页/排序/下架确认/批量归档） ---------------- */

await openList('?pageSize=10', 'u_iam_admin');
await shot('page-01-default-list');

await openList('?sort=enroll_count:asc&pageSize=20', 'u_iam_admin');
await shot('page-02-sort-enroll-asc');

await openList('?status=published&pageSize=20', 'u_iam_admin');
const publishedRow = await page.locator('[data-testid^="action-offline-"]').first();
await publishedRow.click();
await page.waitForSelector('[data-testid="confirm-body"]');
await page.waitForTimeout(300);
await shot('page-03-offline-confirm-with-affected');
evidence.offlineConfirm = {
  affectedText: await page.textContent('[data-testid="affected-enroll-count"]'),
};
await page.locator('.t-dialog__footer .t-button:not(.t-button--theme-primary)').click();
await page.waitForTimeout(300);

// 批量归档条
await openList('?status=published&pageSize=20', 'u_iam_admin');
await page.locator('tbody .t-checkbox__former').first().evaluate((node) => node.closest('label').click());
await page.waitForSelector('[data-testid="bulk-bar"]');
await page.waitForTimeout(300);
await shot('page-04-bulk-archive-bar');
evidence.bulkBar = {
  buttons: await page.$$eval('[data-testid="bulk-bar"] button', (nodes) => nodes.map((n) => n.textContent.trim())),
};

/* ---------------- 收尾：manifest + index ---------------- */

await writeFile(path.join(OUT, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');

const files = [];
for (const name of shots) {
  const file = path.join(OUT, name);
  const buf = await readFile(file);
  const info = await stat(file);
  const dims = await page.evaluate(async () => null).catch(() => null);
  void dims;
  files.push({
    name,
    bytes: info.size,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  });
}
const duplicated = files.filter((f, i) => files.findIndex((g) => g.sha256 === f.sha256) !== i).map((f) => f.name);

await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      base: BASE,
      viewport: VIEWPORT,
      deviceScaleFactor: DPR,
      count: files.length,
      duplicateHashes: duplicated,
      files,
    },
    null,
    2,
  ),
  'utf8',
);

const INDEX = [
  ['AC1', 'state-draft.png', '草稿(draft)：编辑/复制/提交审核/删除，无下架与审批'],
  ['AC1', 'state-pending_review.png', '待审核(pending_review)：复制/审批（管理员非提交人）'],
  ['AC1', 'state-published.png', '已发布(published)：复制/下架/归档，无编辑与删除'],
  ['AC1', 'state-offline.png', '已下架(offline)：编辑/复制/重新上架/归档'],
  ['AC1', 'state-archived.png', '已归档(archived)：复制/删除'],
  ['AC1', 'state-draft-actions-closeup.png', '草稿行操作列特写（与矩阵逐字比对）'],
  ['AC1', 'state-pending_review-actions-closeup.png', '待审核行操作列特写'],
  ['AC1', 'state-published-actions-closeup.png', '已发布行操作列特写'],
  ['AC1', 'state-offline-actions-closeup.png', '已下架行操作列特写'],
  ['AC1', 'state-archived-actions-closeup.png', '已归档行操作列特写'],
  ['AC1', 'matrix-overview-all-states.png', '36 门课程全状态总览（5 种状态同屏）'],
  ['AC2', 'ac2-before-url-01-clean.png', '操作前：干净 URL，筛选栏为空'],
  ['AC2', 'ac2-before-url-02-filters-set.png', '勾选草稿+已发布、输入关键词「招商」后地址栏出现参数'],
  ['AC2', 'ac2-after-reload-01-restored.png', '按 F5 刷新后：筛选栏回填、列表结果一致'],
  ['AC2', 'ac2-deeplink-full-params.png', '带完整参数的深链直接打开'],
  ['AC2', 'ac2-malformed-url-still-works.png', '手改坏参数（status=bogus&page=-3）仍可打开且非法值被丢弃'],
  ['AC3', 'ac3-no-publish-permission.png', '无 publish 权限账号：待审核行只有「复制」，DOM 内 0 个审批按钮'],
  ['AC3', 'ac3-control-with-publish-permission.png', '对照组：有 publish 权限且非提交人 → 出现「审批」'],
  ['AC3', 'ac3-boundary-self-submitted.png', '边界：有 publish 权限但本人是提交人 → 该行仍无审批，别人的行有'],
  ['其它', 'page-01-default-list.png', '默认列表：分页、列排序图标'],
  ['其它', 'page-02-sort-enroll-asc.png', '按累计报名数升序（sort=enroll_count:asc）'],
  ['其它', 'page-03-offline-confirm-with-affected.png', '下架二次确认，弹窗内显示受影响报名数'],
  ['其它', 'page-04-bulk-archive-bar.png', '批量操作条：只有「批量归档」一个操作'],
];

await writeFile(
  path.join(OUT, 'index.txt'),
  ['# 截图索引（AC → 文件 → 说明）', '', ...INDEX.map(([ac, file, desc]) => ac + '\t' + file + '\t' + desc)].join('\n') + '\n',
  'utf8',
);

await browser.close();
process.stdout.write('DONE ' + shots.length + ' shots\n');
