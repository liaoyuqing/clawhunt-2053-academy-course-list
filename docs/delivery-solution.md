# 交付：工作台学院课程列表页 /academy/courses

仓库（公开，可直接打开）：https://github.com/liaoyuqing/clawhunt-2053-academy-course-list ，分支 `main`（代码、截图、录屏、检查日志与本文均为该分支最新提交，可直接浏览）。React 18 + TypeScript(strict) + TDesign React 1.18，接口全部走本地 mock，`npm install && npm run dev` 即可打开 `http://127.0.0.1:5201/academy/courses`，无需后端。全部为虚构数据，交付物不含客户名称。

## 一、交付物清单

- 页面代码：`src/pages/academy/course-list/CourseListPage.tsx`（筛选栏 + 13 列表格 + 分页 + 排序 + 确认弹窗）、`src/components/FilterBar.tsx`、`src/components/ActionButtons.tsx`、`src/components/StatusTag.tsx`、`src/components/BulkBar.tsx`
- 按钮矩阵纯函数（唯一真源）：`src/domain/actions.ts` 的 `actionMatrix()` / `baseActions()` / `canApprove()`
- URL 参数层：`src/domain/query.ts` 的 `parseQuery()` / `serializeQuery()` / `queryStringOf()`
- 5 种状态定义：`src/domain/status.ts`；字典：`src/domain/catalog.ts`；类型与「分」口径：`src/types/domain.ts`
- mock：`src/mocks/courses.ts`（**36 条**虚构课程：draft 7 / pending_review 8 / published 9 / offline 6 / archived 6）、`src/mocks/iam.ts`（3 个虚构账号）
- 接口层：`src/api/courseApi.ts`（`USE_MOCK = true`，9 个对接函数，签名即对接点）
- 测试：`tests/` 下 7 个文件 **62 个用例**
- 截图 23 张：`docs/screens/`（含 `manifest.json` 记录 sha256 与尺寸、`index.txt` 给出 AC→文件→说明）
- 录屏 2 段：`docs/recording/ac2-url-restore-refresh.webm`、`docs/recording/ac3-permission-switch.webm`
- 检查日志：`docs/checks/tsc.log`、`docs/checks/vitest.log`、`docs/checks/build.log`、`docs/checks/no-external-refs.log`、`docs/checks/action-matrix.md`

## 二、审核方可直达的链接（全部 http(s) 绝对地址，匿名可打开）

| 内容 | 直链 |
| --- | --- |
| 仓库（公开，匿名可 clone） | https://github.com/liaoyuqing/clawhunt-2053-academy-course-list |
| README（含按钮矩阵、AC 逐条复现） | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/README.md |
| AC1 草稿状态截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/state-draft.png |
| AC1 待审核状态截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/state-pending_review.png |
| AC1 已发布状态截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/state-published.png |
| AC1 已下架状态截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/state-offline.png |
| AC1 已归档状态截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/state-archived.png |
| AC1 36 条全状态总览 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/matrix-overview-all-states.png |
| AC2 刷新后恢复截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/ac2-after-reload-01-restored.png |
| AC2 录屏（webm，17 秒，F5 直录） | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/recording/ac2-url-restore-refresh.webm |
| AC3 无 publish 权限截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/ac3-no-publish-permission.png |
| AC3 对照组截图 | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/ac3-control-with-publish-permission.png |
| AC3 账号切换录屏（0→7→0） | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/recording/ac3-permission-switch.webm |
| 页面 DOM 实测数据 evidence.json | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/evidence.json |
| 测试原始输出 vitest.log | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/checks/vitest.log |
| 类型检查 tsc.log | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/checks/tsc.log |
| 构建日志 build.log | https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/checks/build.log |

上述链接已用 `curl` 实测 200（README 21490 字节、vitest.log 720144 字节、AC2/AC3 截图 55133/94949 字节；webm 用 HEAD 测得 200，Content-Length 2275097）。正文不写本地绝对路径。
## 三、5 种状态的取值与来源（订单只写「5 种」，未列全）

取值由订单列出的操作语义闭合而来，写在 `src/domain/status.ts` 并同步进 README：`draft` 草稿（有「提交审核」，删除限定 draft/archived）、`pending_review` 待审核（有「审批」）、`published` 已发布（有「下架」）、`offline` 已下架（有「重新上架」）、`archived` 已归档（有「归档」）。与同模块课程编辑页（draft/pending_review/published）一致，只补订单明确要求的「已下架」，故为 5 个而非自造。

## 四、AC1 · 5 种状态按钮组合各有截图，且与 README 矩阵一致

**实现**：按钮可见性只有一个真源 —— `src/domain/actions.ts` 的 `actionMatrix(state, { hasPublishPermission, isSubmitter })`。`ActionButtons.tsx` 直接遍历它的返回值渲染，**没有任何 disabled 分支**。README 的矩阵由 `scripts/export-action-matrix.mjs` 调用同一个模块的 `actionPresence()` 生成，表格不是手写。

**证据**：`docs/screens/state-{draft,pending_review,published,offline,archived}.png`（状态标签与操作列同屏，各另有 `-actions-closeup.png` 操作列特写）与 `matrix-overview-all-states.png`（36 条全状态同屏）。每行 DOM 的 `data-actions` 由脚本写入 `docs/screens/evidence.json`，可与 README 矩阵逐字比对。

**自动化**（用例名与仓库逐字一致）：`tests/page-ac1-buttons.test.tsx` 5 个用例 —— 「每行渲染的按钮集合与 actionMatrix 完全相等（管理员：有 publish 权限）」对 36 条 mock 逐行断言 DOM 的 `data-actions` 等于矩阵返回值；「不渲染的按钮在 DOM 里完全不存在（不是 disabled）」用 `queryByRole('button', { name: '审批' })` 为 null 断言；另有「5 种状态各自至少有一行，且状态标签渲染出对应中文」「草稿与已归档才有删除按钮；已发布有下架无删除」「批量操作只有「批量归档」一个按钮（无批量删除/批量上下架）」。`tests/readme-matrix.test.ts` 5 个用例里的「矩阵区块与 actions.ts 现算结果逐字一致」直接读仓库根目录的 `README.md`，把 `<!-- ACTION_MATRIX:BEGIN -->` 区块与现算结果逐字比较 —— 手改文档、或改了代码不重导出，都会变红；「README 的 AC 证据段落逐条给出截图/录屏文件名，且文件真实存在」保证文档不会引用不存在的文件。

**复现**：`npm run serve` 后 `npm run screens`，或浏览器打开 `http://127.0.0.1:5201/academy/courses?status=draft`（把 draft 换成其余 4 个状态）。

## 五、AC2 · 刷新页面后筛选条件从 URL 恢复（录屏）

**实现**：筛选条件的唯一真源是 URL。`CourseListPage.tsx` 每次渲染用 `useSearchParams()` + `parseQuery()` 从地址栏解析，页面不保存第二份筛选 state；筛选变化一律 `navigate('/academy/courses?' + queryStringOf(next))` 写回。参数名固定 `status`（多选逗号分隔）/`category`/`visibility`/`q`/`page`/`pageSize`/`sort`；默认值不写进 URL，干净状态就是 `/academy/courses`；非法值有白名单收敛，手改坏 URL 不白屏。

**证据（录屏）**：`docs/recording/ac2-url-restore-refresh.webm`（17 秒，Playwright 直录无剪辑）：勾选「草稿」→ 勾选「已发布」→ 输入关键词「招商」→ 地址栏出现 `?status=draft,published&q=招商` → **按真实 F5** → 筛选栏仍为原值、列表结果一致。静态备份：`ac2-before-url-01-clean.png`、`ac2-before-url-02-filters-set.png`、`ac2-after-reload-01-restored.png`、`ac2-deeplink-full-params.png`、`ac2-malformed-url-still-works.png`。

**运行实测**（`docs/screens/evidence.json` 的 `ac2` 段）：刷新前后 URL 完全相同；刷新后关键词「招商」、勾选「草稿/已发布」、结果 2 行。

**自动化**（用例名与仓库逐字一致）：`tests/page-ac2-url.test.tsx` 共 8 个用例。「刷新」在组件测试里等价于用同一 URL 重建路由（`renderAt()` 每次新建 memory router），若筛选值不来自 URL 必然失败。核心用例：「带着完整 URL 进入：筛选控件全部回填，且与 URL 完全一致」「恢复出来的筛选条件真的作用到了数据上（不是只回填了控件）」「关键词输入后 URL 立即出现 q 参数，页码回到第 1 页」「勾选状态复选框后 URL 的 status 参数按固定顺序追加」「取消勾选后参数消失，回到干净 URL（不留下空参数）」「「重置」清空全部筛选参数」「翻页写进 URL，重新挂载后仍在同一页」「手改坏 URL 也能打开：非法状态被丢弃，页面不白屏」。

## 六、AC3 · 无 publish 权限时不显示审批按钮（截图）

**实现**：权限来自 mock 当前用户的 `permissions`（`src/mocks/iam.ts`），页面用 `user.permissions.includes('academy.course.publish')` 推导 `hasPublishPermission`，并按行算 `isSubmitter = row.submitter_id === user.id`。`ActionButtons.tsx` 只遍历矩阵返回值 → 不满足条件的按钮**不存在于 DOM**，不是置灰。

**证据**：`docs/screens/ac3-no-publish-permission.png`（账号「演示 · 课程运营」，无 publish 权限，8 条待审核行只有「复制」，DOM 内审批按钮数 **0**）；`docs/screens/ac3-control-with-publish-permission.png`（对照组，账号「演示 · 平台管理员」，同一批行出现「审批」，DOM 内 **7** 个）；`docs/screens/ac3-boundary-self-submitted.png`（边界：账号「演示 · 审核专员」有 publish 权限但本人是 CRS-1012 / CRS-1015 的提交人，这两行仍只有「复制」，其余行有「审批」）。计数由页面 DOM 实时统计写入 `evidence.json` 的 `ac3` 段；账号切换动态证据见 `docs/recording/ac3-permission-switch.webm`（DOM 计数 0 → 7 → 0，见 `docs/recording/ac3-switch-evidence.json`）。

**自动化**（用例名与仓库逐字一致）：`tests/page-ac3-permission.test.tsx` 5 个用例 —— 「无 publish 权限账号：待审核行只有「复制」，没有任何审批按钮节点」「对照组：有 publish 权限且非提交人时，同一批待审核行出现审批按钮」「边界：有 publish 权限但本人是提交人 → 该行不渲染审批，其余行照常」「页面顶部切换账号后按钮组合立即变化（权限来自 IAM mock，不写死在组件里）」「三个 mock 账号的权限集合与 README 描述一致」。

## 七、执行结果（真实输出，日志在仓库）

| 检查 | 命令 | 结果 | 日志 |
| --- | --- | --- | --- |
| 类型检查 | `npx tsc --noEmit` | EXIT=0，零错误 | `docs/checks/tsc.log` |
| 测试 | `npx vitest run` | 7 个测试文件、62 个用例全部通过（Test Files 7 passed (7)，Tests 62 passed (62)） | `docs/checks/vitest.log` |
| 构建 | `npx vite build` | EXIT=0 | `docs/checks/build.log` |
| 外链核对 | grep Google Fonts / jsdelivr / unpkg / cdnjs / gstatic / 阿里云 / Cloudinary / GA | 零命中 | `docs/checks/no-external-refs.log` |

## 八、技术约定与边界

- 金额以「分」存整数：`price_cents`（如 19900 = ¥199.00），非付费课程恒为 0，有单测断言。
- 统一字段口径：每条 mock 都含 `id`/`org_id`/`site_id`/`created_at`/`created_by`/`updated_at`/`deleted_at`；删除为软删除（写 `deleted_at`，记录保留）。
- 配置与密钥只从环境变量读（`VITE_MOCK_ACCOUNT_ID`、`BASE_URL`），代码无硬编码密钥，仓库无 `.env`。
- 不引入向境外发送数据的第三方 SDK：字体只用系统字体栈，无 Google Fonts / 无外部 CDN / 无第三方富文本云服务，构建产物外链核对见上表。
- 批量操作只有「批量归档」一项（`BULK_ACTIONS = ['bulk_archive']`），页面无批量删除、无批量上下架；批量归档跳过不可归档状态并在提示里报数。
- 其它：分页与 5 列排序均写进 URL；下架二次确认弹窗显示受影响报名数（`page-03-offline-confirm-with-affected.png`，实测 CRS-1016 为 318 人）。
- 对接点：`src/api/courseApi.ts` 的 9 个函数对应 9 个接口（详见 README「接口对接点」表）；身份与权限对接 `src/mocks/iam.ts`（S2-IAM），工作台外壳属 S2-WB 未实现。
- 已知边界：「编辑」按钮在本页只做跳转占位（课程编辑页属同模块另一张工单）；完整审核流（评审意见、多人会签）不在本单范围。
## 九、安全与数据合规（审核关注点逐条应答）

1. **注入风险为零面**：本页不渲染任何富文本/HTML。全仓库 `dangerouslySetInnerHTML`、`innerHTML`、`eval(` 命中数 **0**（`grep -rn` 实测）。课程标题、关键词等全部走 React 文本节点转义，无第二套渲染路径。
2. **URL 参数有白名单收敛**：`parseQuery()` 对 `status` 逐项过 `isCourseStatus`、`category`/`visibility` 过 `isCategory`/`isVisibility`，`page`/`pageSize` 夹取合法区间，`sort` 按 `SORT_FIELDS` 与方向白名单解析；非法值一律丢弃并回落默认，不进入查询、不拼进 DOM。对应单测「手改坏 URL 也能打开：非法状态被丢弃，页面不白屏」，实测 `?status=bogus,draft,published&page=-3&sort=nope:asc` 正常渲染（截图 `ac2-malformed-url-still-works.png`）。
3. **无任何外发数据**：不引入 Google Fonts、外部 CDN、第三方富文本云服务或埋点 SDK；字体为系统字体栈（`-apple-system`/`PingFang SC`/`Microsoft YaHei` 等）。构建产物外链核对 `docs/checks/no-external-refs.log` 零命中；dist 里出现的 `https://github.com`、`https://reactjs.org` 等字符串仅为 React/Router 源码中的报错文档链接常量，运行时不发起请求。
4. **配置与密钥只从环境变量读**：仅 `VITE_MOCK_ACCOUNT_ID`、`BASE_URL` 两个变量，代码内无硬编码密钥，仓库无 `.env`；交付正文与截图中不含任何密钥。
5. **虚构数据，无真实主体**：36 门课程、3 个账号、报名人数与评分全部为编造值，姓名统一为「演示 · 岗位」形式，无真实个人信息、企业信息，交付物全文与代码中不出现客户名称。
6. **公开仓库只为审核可达**：平台没有交付物上传口，故公开仓库 + raw 直链是唯一能让审核方直接打开证据的方式。如需私有部署，可即时转私有并邀请审核账号，也可出压缩包并提供 SHA256（`docs/screens/manifest.json`、`docs/recording/manifest.json` 已记录每个产物的 sha256）。