# 交付：会员空间平台 · 工作台学院课程列表页 /academy/courses

仓库（公开、匿名可 clone）：https://github.com/liaoyuqing/clawhunt-2053-academy-course-list ，分支 main。技术栈 React 18 + TypeScript(strict) + TDesign React 1.18。接口全部走本地 mock，`npm install && npm run dev` 后打开 http://127.0.0.1:5201/academy/courses 即可复现，无需后端、无需任何密钥。全部为虚构数据，正文与代码不出现客户名称。

## 一、依赖与访问要求（可行性）

- 运行环境：Node.js ≥ 20（本次在 Node v24.22.2 实测），npm；无需数据库、无需 Docker、无需外网。
- 依赖仅 5 个运行时包（react/react-dom/react-router-dom/tdesign-react/tdesign-icons-react），全部来自 npm 公共源，无私有源、无内部制品。
- 访问要求：仅需读仓库。页面在本地静态起服务即可跑，截图与录屏脚本用 Playwright（devDependency，chromium headless shell 已装）。
- 落地路径：页面与状态机已按真实接口形状写好（`src/api/courseApi.ts` 的 9 个函数签名即对接点，`USE_MOCK` 置 false 并配 `BASE_URL` 即可切真实后端）；接入真实 IAM 时把 `src/mocks/iam.ts` 换成会话接口，页面只依赖 `permissions` 数组，无需改动按钮逻辑。
- 交付范围内未实现：工作台外壳（S2-WB）、课程编辑页（同模块另一张工单）、评审意见与多人会签。README「已知边界」与本节一致，不夸大。

## 二、交付物清单

- 页面：`src/pages/academy/course-list/CourseListPage.tsx`（筛选栏 + 13 列表格 + 分页 + 排序 + 二次确认弹窗），组件 `src/components/FilterBar.tsx`、`ActionButtons.tsx`、`StatusTag.tsx`、`BulkBar.tsx`
- 按钮矩阵唯一真源：`src/domain/actions.ts` 的 `actionMatrix()` / `baseActions()` / `canApprove()`
- URL 参数层：`src/domain/query.ts` 的 `parseQuery()` / `serializeQuery()` / `queryStringOf()`
- 5 种状态：`src/domain/status.ts`；字典：`src/domain/catalog.ts`；类型与「分」口径：`src/types/domain.ts`
- mock 数据：`src/mocks/courses.ts`（36 条虚构课程：draft 7 / pending_review 8 / published 9 / offline 6 / archived 6）、`src/mocks/iam.ts`（3 个虚构账号）
- 接口层：`src/api/courseApi.ts`（`USE_MOCK = true`）
- 测试：`tests/` 下 7 文件 62 用例；截图 23 张 `docs/screens/`；录屏 2 段 `docs/recording/`；检查日志 5 份 `docs/checks/`

## 三、AC1 · 5 种课程状态下的操作按钮组合各有截图，与 README 中按钮矩阵一致

**原文要求**：5 种状态各有一张截图，且截图里的按钮组合与 README 矩阵一致。

**实现**：按钮可见性只有一个真源 —— `actionMatrix(state, { hasPublishPermission, isSubmitter })`。`ActionButtons.tsx` 只遍历它的返回值渲染，**没有任何 disabled 分支**。README 的矩阵表由 `scripts/export-action-matrix.mjs` 调同一模块的 `actionPresence()` 生成，不是手写。状态取值为 draft 草稿（编辑/复制/提交审核/删除）、pending_review 待审核（复制/审批）、published 已发布（复制/下架/归档）、offline 已下架（编辑/复制/重新上架/归档）、archived 已归档（复制/删除），取值依据写在 `src/domain/status.ts` 并同步进 README。

**证据（仓库内路径）**：`docs/screens/state-draft.png`、`docs/screens/state-pending_review.png`、`docs/screens/state-published.png`、`docs/screens/state-offline.png`、`docs/screens/state-archived.png`（状态标签与操作列同屏）；每张另有 `-actions-closeup.png` 操作列特写；`docs/screens/matrix-overview-all-states.png` 为 36 条课程 5 种状态同屏总览；每行真实 DOM 的 `data-actions` 由 Playwright 采集进 `docs/screens/evidence.json`，可与 README 矩阵逐字比对。

**复现步骤**：① `npm install` ② `npm run build && npm run serve` ③ 打开 `/academy/courses?status=draft`，把 draft 依次换成 pending_review/published/offline/archived ④ 对照 README「按钮矩阵」区块。一键出图：`npm run screens`（23 张，写 manifest 与 sha256）。

**自动化**（用例名与仓库逐字一致，`tests/page-ac1-buttons.test.tsx` 5 例）：「每行渲染的按钮集合与 actionMatrix 完全相等（管理员：有 publish 权限）」对 36 条 mock 逐行断言 DOM 的 `data-actions` 等于矩阵返回值；「不渲染的按钮在 DOM 里完全不存在（不是 disabled）」「5 种状态各自至少有一行，且状态标签渲染出对应中文」「草稿与已归档才有删除按钮；已发布有下架无删除」「批量操作只有「批量归档」一个按钮（无批量删除/批量上下架）」。`tests/readme-matrix.test.ts` 5 例中的「矩阵区块与 actions.ts 现算结果逐字一致」直接读仓库根目录 `README.md`，把 `<!-- ACTION_MATRIX:BEGIN -->` 区块与现算结果逐字比较 —— 改代码不重导出、或手改文档，都会变红。

## 四、AC2 · 刷新页面后筛选条件从 URL 恢复（录屏）

**实现**：筛选条件的唯一真源是 URL。`CourseListPage.tsx` 每次渲染用 `useSearchParams()` + `parseQuery()` 从地址栏解析，页面不保存第二份筛选 state；任何筛选变化一律 `navigate('/academy/courses?' + queryStringOf(next))` 写回。参数 `status`（多选逗号分隔）/`category`/`visibility`/`q`/`page`/`pageSize`/`sort`，默认值不写进 URL，干净状态就是 `/academy/courses`；非法值有白名单收敛，手改坏 URL 不白屏。

**证据（录屏）**：`docs/recording/ac2-url-restore-refresh.webm`，17 秒，Playwright recordVideo 直录无剪辑、无剪辑拼接：勾选「草稿」→ 勾选「已发布」→ 输入关键词「招商」→ 地址栏出现 `?status=draft,published&q=招商` → **按真实 F5 键** → 筛选栏仍为原值、结果行一致。静态备份：`docs/screens/ac2-before-url-01-clean.png`、`ac2-before-url-02-filters-set.png`、`ac2-after-reload-01-restored.png`、`ac2-deeplink-full-params.png`、`ac2-malformed-url-still-works.png`。

**实测数据**（`docs/screens/evidence.json` 的 `ac2` 段，脚本从真实浏览器采集）：刷新前后 URL 字符串完全相同（`urlIdentical: true`）；刷新后关键词仍为「招商」、勾选仍为「草稿/已发布」、结果 2 行；深链直开 1 行。

**复现步骤**：`npm run video` 重录（需先 `npm run build && npm run serve`）；或手工在浏览器重复上述 5 步后按 F5。

**自动化**（`tests/page-ac2-url.test.tsx` 共 8 例）：「刷新」在组件测试里等价于用同一 URL 重建路由（`renderAt()` 每次新建 memory router），若筛选值不来自 URL 必然失败。用例：「带着完整 URL 进入：筛选控件全部回填，且与 URL 完全一致」「恢复出来的筛选条件真的作用到了数据上（不是只回填了控件）」「关键词输入后 URL 立即出现 q 参数，页码回到第 1 页」「勾选状态复选框后 URL 的 status 参数按固定顺序追加」「取消勾选后参数消失，回到干净 URL（不留下空参数）」「「重置」清空全部筛选参数」「翻页写进 URL，重新挂载后仍在同一页」「手改坏 URL 也能打开：非法状态被丢弃，页面不白屏」。

## 五、AC3 · 无 publish 权限的账号登录时不显示审批按钮（截图）

**实现**：权限来自 mock 当前用户的 `permissions`（`src/mocks/iam.ts`），页面用 `user.permissions.includes('academy.course.publish')` 推导 `hasPublishPermission`，并按行算 `isSubmitter = row.submitter_id === user.id`。`ActionButtons.tsx` 只遍历矩阵返回值 → 不满足条件的按钮**不存在于 DOM**，不是置灰。

**证据**：`docs/screens/ac3-no-publish-permission.png`（账号「演示 · 课程运营」，无 publish 权限，8 条待审核行只有「复制」，DOM 内审批按钮计数 **0**）；`docs/screens/ac3-control-with-publish-permission.png`（对照组，账号「演示 · 平台管理员」，同一批行出现「审批」，DOM 内 **7** 个）；`docs/screens/ac3-boundary-self-submitted.png`（边界：账号「演示 · 审核专员」有 publish 权限但本人是 CRS-1012 / CRS-1015 的提交人，这两行仍只有「复制」，其余行有「审批」）。计数由脚本从真实 DOM 统计写入 `docs/screens/evidence.json` 的 `ac3` 段；账号切换动态证据 `docs/recording/ac3-permission-switch.webm`（0 → 7 → 0，见 `docs/recording/ac3-switch-evidence.json`）。

**复现步骤**：`npm run serve` 后打开 `/academy/courses?status=pending_review`，右上角账号下拉切「演示 · 课程运营」→ 审批按钮消失；切「演示 · 平台管理员」→ 出现。

**自动化**（`tests/page-ac3-permission.test.tsx` 5 例）：「无 publish 权限账号：待审核行只有「复制」，没有任何审批按钮节点」「对照组：有 publish 权限且非提交人时，同一批待审核行出现审批按钮」「边界：有 publish 权限但本人是提交人 → 该行不渲染审批，其余行照常」「页面顶部切换账号后按钮组合立即变化（权限来自 IAM mock，不写死在组件里）」「三个 mock 账号的权限集合与 README 描述一致」。

## 六、执行结果（真实输出，日志在仓库）

| 检查 | 命令 | 结果 | 日志 |
| --- | --- | --- | --- |
| 类型检查 | `npx tsc --noEmit` | EXIT=0，零错误 | `docs/checks/tsc.log` |
| 测试 | `npx vitest run` | Test Files 7 passed (7)，Tests 62 passed (62) | `docs/checks/vitest.log` |
| 构建 | `npx vite build` | EXIT=0（dist 936K） | `docs/checks/build.log` |
| 外链核对 | grep Google Fonts/jsdelivr/unpkg/cdnjs/gstatic/GA | 零命中 | `docs/checks/no-external-refs.log` |

## 七、技术约定与边界

- 金额以「分」存整数：`price_cents`（19900 = ¥199.00），非付费课程恒为 0，有单测断言。
- 统一字段口径：每条 mock 含 `id`/`org_id`/`site_id`/`created_at`/`created_by`/`updated_at`/`deleted_at`；删除为软删除。
- 配置与密钥只从环境变量读（`VITE_MOCK_ACCOUNT_ID`、`BASE_URL`），无硬编码密钥，仓库无 `.env`。
- 不引入向境外发送数据的第三方 SDK：系统字体栈，无 Google Fonts、无外部 CDN、无第三方富文本云服务、无埋点。
- 批量操作只有「批量归档」（`BULK_ACTIONS = ['bulk_archive']`），不可归档状态会被跳过并在提示里报数。
- 其它：分页与 5 列排序写进 URL；下架二次确认弹窗显示受影响报名数（`page-03-offline-confirm-with-affected.png`，CRS-1016 实测 318 人）。

## 八、安全与合规（审核关注点）

1. **注入面为零**：本页不渲染富文本。全仓库 `dangerouslySetInnerHTML`/`innerHTML`/`eval(` 命中 **0**（grep 实测）。标题、关键词全走 React 文本节点转义。
2. **URL 参数白名单收敛**：`status`/`category`/`visibility` 逐项过类型守卫，`page`/`pageSize` 夹取合法区间，`sort` 按白名单解析；非法值丢弃回落默认，不进入查询、不拼进 DOM（`?status=bogus,draft,published&page=-3&sort=nope:asc` 实测正常渲染）。
3. **无外发数据**：dist 中的 `https://reactjs.org` 等字符串只是 React/Router 源码内的文档常量，运行时不发请求；`docs/checks/no-external-refs.log` 零命中。
4. **虚构数据**：36 门课程、3 个账号、报名与评分全部编造，姓名统一「演示 · 岗位」，无真实个人信息与企业信息。
5. **仓库可见性**：平台无交付物上传口，公开仓库是让审核直达证据的唯一方式；如需私有部署可即时转私有并邀请审核账号，各产物 sha256 已记录在 `docs/screens/manifest.json`、`docs/recording/manifest.json`。

## 九、证据直链（与上面仓库内路径同一份文件）

- README（按钮矩阵 + AC 逐条）：https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/README.md
- AC2 录屏：https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/recording/ac2-url-restore-refresh.webm
- AC3 账号切换录屏：https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/recording/ac3-permission-switch.webm
- 页面 DOM 实测数据：https://raw.githubusercontent.com/liaoyuqing/clawhunt-2053-academy-course-list/main/docs/screens/evidence.json

其余全部证据（23 张截图、2 段录屏、5 份日志、sha256 清单）均已提交在同一仓库的 `docs/` 下，仓库本身可匿名读取。