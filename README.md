# 工作台学院 · 课程列表页 /academy/courses

会员空间平台工作台「学院」模块的课程列表页：筛选栏（状态多选 / 类别 / 可见范围 / 关键词）、13 列表格、按状态与权限变化的操作按钮、分页与列排序、唯一批量操作（批量归档）。React 18 + TypeScript + TDesign React，接口全部走本地 mock，无需后端即可运行与验收。

所有数据均为虚构演示数据，不包含任何真实个人信息或企业信息；交付物中不出现客户名称。

## 快速开始

```bash
npm install          # 安装依赖（React 18 / TDesign 1.18 / Vite 7 / Vitest 3 / Playwright 1.65）
npm run dev          # 开发服务器 http://127.0.0.1:5201/academy/courses
npm run typecheck    # tsc --noEmit（strict）
npm test             # vitest run（7 个文件 62 个用例）
npm run build        # vite build → dist/
npm run serve        # 用 dist/ 起静态服务器（截图与录屏脚本依赖它）
npm run matrix       # 从代码导出按钮矩阵，打印并写入 docs/checks/action-matrix.md
npm run screens      # Playwright 截图 → docs/screens/（需先 npm run serve）
npm run video        # Playwright 录屏 → docs/recording/（需先 npm run serve）
```

环境变量（只从环境变量读，不写死在代码里）：

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `VITE_MOCK_ACCOUNT_ID` | 初始登录账号（`u_iam_admin` / `u_iam_operator` / `u_iam_reviewer`） | `u_iam_admin` |
| `BASE_URL` | 截图/录屏脚本的目标地址 | `http://127.0.0.1:5201` |

## 页面结构

```
src/
  pages/academy/course-list/
    CourseListPage.tsx        页面主体：筛选栏 + 表格 + 分页 + 确认弹窗
    useCurrentUser.ts         当前登录账号（S2-IAM 桩，权限来源）
    AccountSwitcher.tsx       演示用账号切换器
  components/
    FilterBar.tsx             筛选栏（状态多选 / 类别 / 可见范围 / 关键词 / 重置）
    StatusTag.tsx             状态彩色标签
    ActionButtons.tsx         操作列（只渲染 actionMatrix 返回的按钮）
    BulkBar.tsx               批量操作条（只有批量归档）
  domain/
    actions.ts                按钮矩阵纯函数（actionMatrix / baseActions / canApprove）★唯一真源
    query.ts                  URL 查询参数 ⇄ 筛选条件 的序列化/反序列化
    status.ts                 5 种状态的定义、中文标签、TDesign 主题色、状态流转
    catalog.ts                类别 / 可见范围 / 权益方式字典
  mocks/
    courses.ts                36 条虚构课程（5 种状态全覆盖）
    iam.ts                    3 个虚构账号与权限集合
  api/courseApi.ts            接口层（USE_MOCK = true），列表查询 + 7 类写操作
  types/domain.ts             领域类型（含统一字段口径与「分」为单位的金额）
tests/                        7 个测试文件 62 个用例
scripts/
  export-action-matrix.mjs    从 actions.ts 导出矩阵 → 本 README 的矩阵区块
  capture-screens.mjs         Playwright 截图（23 张）
  record-demo.mjs             Playwright 录屏（2 段 webm）
  serve-dist.mjs              静态服务器
docs/
  screens/                    截图 + manifest.json（sha256）+ index.txt（AC → 文件 → 说明）
  recording/                  录屏 webm + manifest.json（sha256 / 时长 / 分辨率）
  checks/                     tsc.log / vitest.log / build.log / no-external-refs.log / action-matrix.md
```

## 5 种课程状态（取值与来源）

订单原文只写「5 种课程状态」，未列出取值。本单的取值由订单列出的操作语义闭合而来，并在 `src/domain/status.ts` 中唯一声明：

| 状态 | 中文标签 | 标签颜色 | 来源依据 |
| --- | --- | --- | --- |
| `draft` | 草稿 | 默认灰 | 订单要求「提交审核」，必有一个可提交的起始态；删除限定「仅 draft 与 archived」 |
| `pending_review` | 待审核 | 橙色警告 | 订单要求「审批」按钮，必有一个待审批态 |
| `published` | 已发布 | 绿色成功 | 订单要求「下架」，必有一个在线态 |
| `offline` | 已下架 | 红色危险 | 订单要求「重新上架」，必有一个停架态 |
| `archived` | 已归档 | 蓝色主要 | 订单要求「归档」，且删除限定「仅 draft 与 archived」 |

同模块的课程编辑页（相邻工单）使用 draft / pending_review / published 三个状态；本页与其保持一致并补上订单明确要求的「已下架」，因此是 5 个。上述推导过程与依据同时写进了 `src/domain/status.ts` 的注释，代码与文档同源。

## 按钮矩阵（AC1）

> 本表的**每一个单元格**都由 `scripts/export-action-matrix.mjs` 调用 `src/domain/actions.ts` 的 `actionPresence()` 生成，页面渲染调用的是同一个模块的 `actionMatrix()`。表格不是手写的，因此不可能与页面不一致。
> 重新生成：`npm run matrix`（同时写入 `docs/checks/action-matrix.md`）。

<!-- ACTION_MATRIX:BEGIN -->

主表视角：**有 publish 权限且非提交人**（能力最全）；其余两个权限视角见下方对照表。

| 状态 | 编辑 | 复制 | 提交审核 | 审批 | 下架 | 重新上架 | 归档 | 删除 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 草稿 `draft` | ✓ | ✓ | ✓ | — | — | — | — | ✓ |
| 待审核 `pending_review` | — | ✓ | — | ✓ | — | — | — | — |
| 已发布 `published` | — | ✓ | — | — | ✓ | — | ✓ | — |
| 已下架 `offline` | ✓ | ✓ | — | — | — | ✓ | ✓ | — |
| 已归档 `archived` | — | ✓ | — | — | — | — | — | ✓ |

### 权限视角对照（同一行课程在三个账号下的按钮）

| 状态 | 无 publish 权限 | 有 publish 权限且非提交人 | 有 publish 权限但本人是提交人 |
| --- | --- | --- | --- |
| 草稿 | 编辑、复制、提交审核、删除 | 编辑、复制、提交审核、删除 | 编辑、复制、提交审核、删除 |
| 待审核 | 复制 | 复制、审批 | 复制 |
| 已发布 | 复制、下架、归档 | 复制、下架、归档 | 复制、下架、归档 |
| 已下架 | 编辑、复制、重新上架、归档 | 编辑、复制、重新上架、归档 | 编辑、复制、重新上架、归档 |
| 已归档 | 复制、删除 | 复制、删除 | 复制、删除 |

### 按钮属性

| 按钮 | 危险色 | 二次确认 | 说明 |
| --- | --- | --- | --- |
| 编辑 | 否 | 否 | 进入 /academy/courses/:id/edit |
| 复制 | 否 | 否 | 复制为新的草稿，不改动原记录 |
| 提交审核 | 否 | 否 | 草稿 → 待审核 |
| 审批 | 否 | 否 | 待审核 → 已发布；需 publish 权限且非提交人 |
| 下架 | 是 | 是 | 二次确认并显示受影响报名数 |
| 重新上架 | 否 | 否 | 已下架 → 已发布 |
| 归档 | 否 | 是 | 进入只读终态 |
| 删除 | 是 | 是 | 软删除（写 deleted_at），仅草稿与已归档 |

### 各状态的基础按钮与流转

| 状态 | 基础按钮（与权限无关） | 状态流转 |
| --- | --- | --- |
| 草稿 `draft` | 编辑、复制、提交审核、删除 | 新建默认态；提交审核 → 待审核 |
| 待审核 `pending_review` | 复制、审批 | 审核通过 → 已发布；退回 → 草稿 |
| 已发布 `published` | 复制、下架、归档 | 下架 → 已下架；归档 → 已归档 |
| 已下架 `offline` | 编辑、复制、重新上架、归档 | 重新上架 → 已发布；归档 → 已归档 |
| 已归档 `archived` | 复制、删除 | 终态；仅可删除（软删除） |

批量操作固定只有一项：`bulk_archive`（订单原文：批量操作只提供批量归档）。

<!-- ACTION_MATRIX:END -->

矩阵的三个规则（与订单原文逐条对应）：

1. **审批**：`state === 'pending_review' && hasPublishPermission && !isSubmitter`，三个条件同时满足才**渲染**；不满足时按钮不存在于 DOM（不是 disabled）。
2. **删除**：仅 `draft` 与 `archived`（订单原文限定）。
3. **下架 / 重新上架**：分别只在 `published` / `offline` 出现，永不同时出现；下架入口点击后弹二次确认，弹窗内显示该课程的**受影响报名数**。

批量操作只有一项「批量归档」（`BULK_ACTIONS = ['bulk_archive']`），页面上不存在批量删除、批量上架、批量下架；批量归档会跳过不可归档的状态并在提示里报数。

## 验收标准逐条复现

### AC1 · 5 种课程状态下的操作按钮组合各有截图，与 README 中按钮矩阵一致

**实现**：按钮可见性只有一个真源 `src/domain/actions.ts` 的 `actionMatrix(state, { hasPublishPermission, isSubmitter })`。`ActionButtons.tsx` 直接遍历它的返回值渲染，没有任何 `disabled` 分支；README 的矩阵由同一模块导出。

**证据（截图，均位于 `docs/screens/`）**：

| 状态 | 整页截图（状态标签 + 操作列同屏） | 操作列特写 | DOM 实测按钮（`evidence.json`） |
| --- | --- | --- | --- |
| 草稿 draft | `state-draft.png` | `state-draft-actions-closeup.png` | edit, duplicate, submit_review, delete |
| 待审核 pending_review | `state-pending_review.png` | `state-pending_review-actions-closeup.png` | duplicate, approve |
| 已发布 published | `state-published.png` | `state-published-actions-closeup.png` | duplicate, offline, archive |
| 已下架 offline | `state-offline.png` | `state-offline-actions-closeup.png` | edit, duplicate, online, archive |
| 已归档 archived | `state-archived.png` | `state-archived-actions-closeup.png` | duplicate, delete |

另有 `matrix-overview-all-states.png`：36 门课程全状态同屏总览。截图脚本同时把每行的 `data-actions` 写进 `docs/screens/evidence.json`，可与上表逐字比对。

**自动化用例**：`tests/page-ac1-buttons.test.tsx`（5 例）

- `每行渲染的按钮集合与 actionMatrix 完全相等（管理员：有 publish 权限）`：对 36 条 mock 逐行断言 DOM 的 `data-actions` 等于 `actionMatrix()` 的返回值。
- `5 种状态各自至少有一行，且状态标签渲染出对应中文`。
- `草稿与已归档才有删除按钮；已发布有下架无删除`。
- `不渲染的按钮在 DOM 里完全不存在（不是 disabled）`：`queryByRole('button', { name: '审批' })` 为 null。
- `批量操作只有「批量归档」一个按钮（无批量删除/批量上下架）`。

`tests/actions.test.ts`（11 例）另有纯函数层的矩阵断言与反向验证（故意构造一份错误期望，证明断言不是恒真）。

`tests/readme-matrix.test.ts`（5 例）把「与 README 一致」变成可断言的事实：读出仓库里的 `README.md`，把它 `ACTION_MATRIX` 区块的内容与 `src/domain/actions.ts` 现算出来的矩阵**逐字比较**；同时断言 README 里引用的每一个截图/录屏/日志文件都真实存在（防止文档引用不存在的文件）。

**复现方式**：`npm run serve` 后执行 `npm run screens`，或直接打开 `http://127.0.0.1:5201/academy/courses?status=draft`（把 `draft` 换成其余 4 个状态即可）。

### AC2 · 刷新页面后筛选条件从 URL 恢复（录屏）

**实现**：筛选条件的唯一真源是 URL。`CourseListPage.tsx` 每次渲染都用 `useSearchParams()` 解析 `parseQuery()`；筛选变化一律 `navigate('/academy/courses?' + queryStringOf(next))` 写回 URL，页面不保存第二份本地筛选状态。参数名固定为 `status`（多选逗号分隔）、`category`、`visibility`、`q`、`page`、`pageSize`、`sort`。默认值不写进 URL，因此干净状态就是 `/academy/courses`。

**证据（录屏）**：`docs/recording/ac2-url-restore-refresh.webm`

录制内容（真实键盘 F5，无剪辑）：勾选「草稿」→ 勾选「已发布」→ 输入关键词「招商」→ 地址栏出现 `?status=draft,published&q=招商` → 按 F5 → 筛选栏仍是原值、列表结果一致。

**证据（截图备份）**：`ac2-before-url-01-clean.png`、`ac2-before-url-02-filters-set.png`、`ac2-after-reload-01-restored.png`、`ac2-deeplink-full-params.png`、`ac2-malformed-url-still-works.png`。

**运行实测（`docs/screens/evidence.json` 的 `ac2` 段）**：刷新前后 URL 完全相同；刷新后关键词为「招商」、勾选为「草稿/已发布」、结果 2 行。

**自动化用例**：`tests/page-ac2-url.test.tsx`（8 例）。「刷新」在组件测试里等价于用同一 URL 重新创建路由（`renderAt()` 每次新建 memory router），因此若筛选值不来自 URL，断言必然失败。

- `带着完整 URL 进入：筛选控件全部回填，且与 URL 完全一致`
- `恢复出来的筛选条件真的作用到了数据上（不是只回填了控件）`
- `关键词输入后 URL 立即出现 q 参数，页码回到第 1 页`
- `勾选状态复选框后 URL 的 status 参数按固定顺序追加`
- `取消勾选后参数消失，回到干净 URL（不留下空参数）`
- `「重置」清空全部筛选参数`
- `翻页写进 URL，重新挂载后仍在同一页`
- `手改坏 URL 也能打开：非法状态被丢弃，页面不白屏`

`tests/query.test.ts`（11 例）覆盖序列化/反序列化的往返一致、非法值收敛、排序白名单。

**复现方式**：`npm run serve` 后执行 `npm run video`，产物即上述 webm；或手动打开 `http://127.0.0.1:5201/academy/courses`，勾选状态与填关键词后按 F5。

### AC3 · 无 publish 权限的账号登录时不显示审批按钮（截图）

**实现**：权限来自 mock 的当前用户 `user.permissions`（`src/mocks/iam.ts`），页面用 `user.permissions.includes('academy.course.publish')` 推导 `ActionContext.hasPublishPermission`，再逐行计算 `isSubmitter = row.submitter_id === user.id`。`ActionButtons.tsx` 只遍历 `actionMatrix()` 的返回值 → 不满足条件的按钮**不渲染**（DOM 中不存在），不是置灰。

**证据（截图，`docs/screens/`）**：

| 文件 | 账号 | 结果 |
| --- | --- | --- |
| `ac3-no-publish-permission.png` | 演示 · 课程运营（无 publish 权限） | 8 条待审核行只有「复制」，DOM 内审批按钮数 **0** |
| `ac3-control-with-publish-permission.png` | 演示 · 平台管理员（有 publish 权限且非提交人） | 同一批行出现「审批」，DOM 内审批按钮数 **7** |
| `ac3-boundary-self-submitted.png` | 演示 · 审核专员（有 publish 权限，但本人是 CRS-1012 / CRS-1015 的提交人） | 这两行仍只有「复制」，其余行有「审批」 |

审批按钮数量由页面 DOM 实时统计并写入 `docs/screens/evidence.json` 的 `ac3` 段；账号切换对照另录一段 `docs/recording/ac3-permission-switch.webm`，其中 DOM 计数依次为 0 → 7 → 0（见 `docs/recording/ac3-switch-evidence.json`）。

**自动化用例**：`tests/page-ac3-permission.test.tsx`（5 例）

- `无 publish 权限账号：待审核行只有「复制」，没有任何审批按钮节点`
- `对照组：有 publish 权限且非提交人时，同一批待审核行出现审批按钮`
- `边界：有 publish 权限但本人是提交人 → 该行不渲染审批，其余行照常`
- `页面顶部切换账号后按钮组合立即变化（权限来自 IAM mock，不写死在组件里）`
- `三个 mock 账号的权限集合与 README 描述一致`

**复现方式**：打开列表页，右上角账号切换器选「演示 · 课程运营（无 publish 权限）」，访问 `?status=pending_review`，操作列没有任何「审批」。

## 其它已实现的行为

| 能力 | 实现位置 | 说明 |
| --- | --- | --- |
| 分页 | `CourseListPage.tsx` + `domain/query.ts` | 页码与每页条数都写进 URL；页码越界收敛到最后一页 |
| 列排序 | 同上 | 最近课期时间 / 课期数 / 累计报名数 / 均分 / 更新时间五列可排序，排序值写进 `sort=字段:方向` |
| 下架二次确认 | `CourseListPage.tsx` 的 `Dialog` | 弹窗内显示该课程的受影响报名数（截图 `page-03-offline-confirm-with-affected.png`） |
| 批量归档 | `BulkBar.tsx` + `api/courseApi.ts` 的 `bulkArchive()` | 唯一批量操作；跳过不可归档状态并报数 |
| 软删除 | `api/courseApi.ts` 的 `deleteCourse()` | 写 `deleted_at`，记录保留，列表不再展示 |
| 状态彩色标签 | `components/StatusTag.tsx` | 颜色映射与按钮矩阵共用 `STATUS_META` |

## mock 数据

- `src/mocks/courses.ts`：**36 条**虚构课程，5 种状态分布为 draft 7 / pending_review 8 / published 9 / offline 6 / archived 6（`mockStatusCounts()` 可自证）。
- 每条记录都含统一字段口径：`id`(UUID 形态的字符串)、`org_id`、`site_id`、`created_at`、`created_by`、`updated_at`、`deleted_at`（软删除）。
- 金额一律以「分」存整数：`price_cents`（如 19900 = ¥199.00，页面按 `(price_cents / 100).toFixed(2)` 展示）；非付费课程恒为 0。
- 课程编号 `CRS-10xx`、机构/站点 id、账号名全部为虚构值，不含任何真实个人信息或企业信息。
- mock 库落在 `localStorage`（键 `academy.course.list.db.v1`），因此「下架 → 刷新 → 状态已变」可被真实复现；`resetMockDb()` 可恢复种子数据。

## 接口对接点（依赖 S2-IAM / S2-WB，可先 mock）

`src/api/courseApi.ts` 中 `USE_MOCK = true`，不发任何网络请求。接真实后端时把该常量改为 `false` 并替换函数体，签名保持不变：

| 前端函数 | 建议接口 | 说明 |
| --- | --- | --- |
| `fetchCourses(query)` | `GET /api/academy/courses` | 查询参数与 URL 参数同名（status / category / visibility / q / page / pageSize / sort） |
| `duplicateCourse(id)` | `POST /api/academy/courses/{id}/duplicate` | 复制为新草稿 |
| `submitForReview(id, submitterId)` | `POST /api/academy/courses/{id}/submit-review` | 提交人写 `submitter_id`，供审批时的「非提交人」判断 |
| `approveCourse(id)` | `POST /api/academy/courses/{id}/approve` | 服务端需二次校验 publish 权限 |
| `offlineCourse(id)` | `POST /api/academy/courses/{id}/offline` | 需回传受影响报名数供确认弹窗展示 |
| `onlineCourse(id)` | `POST /api/academy/courses/{id}/online` | 重新上架 |
| `archiveCourse(id)` | `POST /api/academy/courses/{id}/archive` | 归档 |
| `deleteCourse(id)` | `DELETE /api/academy/courses/{id}` | 软删除，写 `deleted_at` |
| `bulkArchive(ids)` | `POST /api/academy/courses/bulk-archive` | body `{ ids: string[] }`，返回 archived / skipped |

身份与权限对接点：`src/mocks/iam.ts` 的 `ACCOUNTS` 替换为 S2-IAM 的会话接口（返回 `permissions` 与数据范围）；页面只读 `user.permissions` 与 `user.id`，不关心权限从哪来。工作台外壳（菜单、面包屑、登录态）属于 S2-WB，本页不实现。

## 技术约定遵守情况

- React 18 + TypeScript（strict）+ TDesign React 1.18：`package.json` 与 `src/components/*` 使用 TDesign 的 Table / Select / Input / Checkbox / Tag / Dialog / Button / Pagination / Loading。
- 金额以「分」存整数：见 `src/types/domain.ts` 的 `price_cents` 与上文说明。
- 配置与密钥只从环境变量读：`VITE_MOCK_ACCOUNT_ID`、`BASE_URL`；代码中无硬编码密钥、无 `.env` 提交。
- 不引入向境外发送数据的第三方 SDK：字体只用系统字体栈（`src/styles/app.css` 的 `font-family`），无 Google Fonts、无外部 CDN、无第三方富文本云服务；构建产物外部引用核对见 `docs/checks/no-external-refs.log`。
- 只用虚构数据、交付物不出现客户名称：mock 数据、账号名、截图、README 均只有「演示」前缀的虚构实体。
- 依赖其他工单的接口用 mock 并在 README 写明对接点：见上一节。
- 至少 30 条虚构课程：36 条。
- 批量操作只提供批量归档：`BULK_ACTIONS` 只有一项，页面无其它批量入口。
- 无权限的按钮不渲染（不是置灰）：`ActionButtons.tsx` 只遍历矩阵返回值，无 `disabled` 分支（AC3 用例以 `queryByRole` 为 null 断言）。

## 检查结果（原始输出）

| 检查 | 命令 | 结果 | 日志 |
| --- | --- | --- | --- |
| 类型检查 | `npx tsc --noEmit` | EXIT=0，零错误 | `docs/checks/tsc.log` |
| 单元/组件测试 | `npx vitest run` | 7 个测试文件、62 个用例全部通过 | `docs/checks/vitest.log` |
| 生产构建 | `npx vite build` | EXIT=0，构建成功 | `docs/checks/build.log` |
| 外部引用核对 | `grep -rn 'fonts.googleapis\|cdn.jsdelivr\|...' src index.html dist` | 零命中 | `docs/checks/no-external-refs.log` |
| 按钮矩阵导出 | `node scripts/export-action-matrix.mjs` | 与本 README 矩阵区块一致 | `docs/checks/action-matrix.md` |

截图与录屏的清单、sha256、尺寸见 `docs/screens/manifest.json` 与 `docs/recording/manifest.json`；截图到 AC 的映射见 `docs/screens/index.txt`。

## 已知边界

- 「编辑」按钮在本页只做跳转占位（课程编辑页属于同模块的另一张工单），点击后提示目标路由 `/academy/courses/{id}/edit`。
- 审批通过 / 退回的完整审核流（评审意见、多人会签）不在本单范围，本页只实现「审批」按钮的出现条件与状态流转。
- mock 的写操作用 `localStorage` 持久化，仅用于本地演示与验收复现，不连接任何后端。
