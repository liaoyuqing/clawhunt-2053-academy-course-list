import type { CourseStatus } from '../types/domain.ts';

/**
 * 5 种课程状态的定义与展示元数据。
 *
 * 订单正文只写「5 种课程状态」，未列全取值；本单按订单列出的操作语义闭合出 5 个状态：
 * 草稿(draft) → 待审核(pending_review) → 已发布(published) ⇄ 已下架(offline) → 已归档(archived)。
 * 依据：订单要求「下架」「重新上架」「删除(仅 draft 与 archived)」，说明存在「已发布/已下架」两个在线态；
 * 与同模块课程编辑页（draft / pending_review / published）的状态集合一致，只多出「已下架」。
 */
export const COURSE_STATUSES: CourseStatus[] = [
  'draft',
  'pending_review',
  'published',
  'offline',
  'archived',
];

export interface StatusMeta {
  label: string;
  /** TDesign Tag 主题色，用于「状态（彩色标签）」列 */
  theme: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** 状态流转说明，README 状态机小节引用 */
  transitions: string;
}

export const STATUS_META: Record<CourseStatus, StatusMeta> = {
  draft: { label: '草稿', theme: 'default', transitions: '新建默认态；提交审核 → 待审核' },
  pending_review: { label: '待审核', theme: 'warning', transitions: '审核通过 → 已发布；退回 → 草稿' },
  published: { label: '已发布', theme: 'success', transitions: '下架 → 已下架；归档 → 已归档' },
  offline: { label: '已下架', theme: 'danger', transitions: '重新上架 → 已发布；归档 → 已归档' },
  archived: { label: '已归档', theme: 'primary', transitions: '终态；仅可删除（软删除）' },
};

export function isCourseStatus(value: string): value is CourseStatus {
  return (COURSE_STATUSES as string[]).includes(value);
}

/** 状态在筛选栏里的展示顺序 */
export function statusLabel(status: CourseStatus): string {
  return STATUS_META[status].label;
}
