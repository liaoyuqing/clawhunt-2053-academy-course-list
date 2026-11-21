import type { CourseAction, CourseStatus } from '../types/domain.ts';
import type { ActionContext } from '../types/domain.ts';

/**
 * 操作按钮矩阵 —— 本单唯一的按钮可见性真源（single source of truth）。
 *
 * 页面渲染、README 的矩阵表、单测断言、截图脚本的核对全都调用同一个 actionMatrix()，
 * 因此「README 矩阵与页面一致」不是靠人工同步，而是每次导出都由同一函数产出。
 *
 * 规则来源（订单正文逐条对应）：
 *   - 编辑：草稿与已下架可编辑；待审核在审核中锁定；已发布需先下架再改（与同学院模块课程编辑页
 *     的「published 只读、需下架后修改」一致，避免两页对同一份数据给出矛盾能力）；已归档为终态不可改。
 *   - 复制：任何状态都可复制成新草稿（复制不改变原记录状态）。
 *   - 提交审核：仅草稿（待审核已在审核中，不需要再提交）。
 *   - 审批：仅待审核，且「有 publish 权限」且「不是提交人」两个条件同时满足才渲染。
 *   - 下架：仅已发布（二次确认，确认弹窗内显示受影响报名数）。
 *   - 重新上架：仅已下架。
 *   - 归档：已发布与已下架（在架/停架课程的生命周期终点）。
 *   - 删除：订单明写「仅 draft 与 archived」。
 */
export const ACTION_ORDER: CourseAction[] = [
  'edit',
  'duplicate',
  'submit_review',
  'approve',
  'offline',
  'online',
  'archive',
  'delete',
];

export interface ActionMeta {
  label: string;
  /** 危险操作在 UI 上使用红色按钮（删除）或在确认弹窗里提示（下架/归档） */
  danger: boolean;
  /** 需要二次确认 */
  needsConfirm: boolean;
  /** 简要说明，README 的矩阵脚注引用 */
  note: string;
}

export const ACTION_META: Record<CourseAction, ActionMeta> = {
  edit: { label: '编辑', danger: false, needsConfirm: false, note: '进入 /academy/courses/:id/edit' },
  duplicate: { label: '复制', danger: false, needsConfirm: false, note: '复制为新的草稿，不改动原记录' },
  submit_review: { label: '提交审核', danger: false, needsConfirm: false, note: '草稿 → 待审核' },
  approve: { label: '审批', danger: false, needsConfirm: false, note: '待审核 → 已发布；需 publish 权限且非提交人' },
  offline: { label: '下架', danger: true, needsConfirm: true, note: '二次确认并显示受影响报名数' },
  online: { label: '重新上架', danger: false, needsConfirm: false, note: '已下架 → 已发布' },
  archive: { label: '归档', danger: false, needsConfirm: true, note: '进入只读终态' },
  delete: { label: '删除', danger: true, needsConfirm: true, note: '软删除（写 deleted_at），仅草稿与已归档' },
};

/**
 * 状态 → 与权限无关的基础按钮集合。
 * 这个函数的返回值就是 README 矩阵中除「审批」列外其余各列的取值。
 */
export function baseActions(state: CourseStatus): CourseAction[] {
  switch (state) {
    case 'draft':
      return ['edit', 'duplicate', 'submit_review', 'delete'];
    case 'pending_review':
      return ['duplicate', 'approve'];
    case 'published':
      return ['duplicate', 'offline', 'archive'];
    case 'offline':
      return ['edit', 'duplicate', 'online', 'archive'];
    case 'archived':
      return ['duplicate', 'delete'];
    default: {
      // 穷尽性检查：新增状态时必须同步矩阵，否则编译期报错
      const never: never = state;
      return never;
    }
  }
}

/** 审批按钮是否渲染：待审核 + 有 publish 权限 + 不是提交人 */
export function canApprove(state: CourseStatus, ctx: ActionContext): boolean {
  return state === 'pending_review' && ctx.hasPublishPermission && !ctx.isSubmitter;
}

/**
 * 最终可见按钮（已按 ACTION_ORDER 排序）。
 * 无权限或状态不允许的按钮**不返回**，页面据此不渲染 —— 不是置灰。
 */
export function actionMatrix(state: CourseStatus, ctx: ActionContext): CourseAction[] {
  const base = baseActions(state);
  const allowed = base.filter((action) => (action === 'approve' ? canApprove(state, ctx) : true));
  return ACTION_ORDER.filter((action) => allowed.includes(action));
}

/** 返回每个按钮是否显示，便于 README 导出成「✓ / —」表格 */
export function actionPresence(
  state: CourseStatus,
  ctx: ActionContext,
): Record<CourseAction, boolean> {
  const visible = new Set(actionMatrix(state, ctx));
  const presence = {} as Record<CourseAction, boolean>;
  for (const action of ACTION_ORDER) presence[action] = visible.has(action);
  return presence;
}

/** 批量操作：订单只允许「批量归档」，因此这里只声明一项，页面不得渲染第二项 */
export const BULK_ACTIONS = ['bulk_archive'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/** 某一状态是否可以归档（批量归档据此跳过不可归档的行，并在提示里报数） */
export function isArchivable(state: CourseStatus): boolean {
  return baseActions(state).includes('archive');
}
