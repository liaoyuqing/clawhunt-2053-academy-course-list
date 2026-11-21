import { Tag } from 'tdesign-react';
import type { CourseStatus } from '../types/domain.ts';
import { STATUS_META } from '../domain/status.ts';

/** 状态（彩色标签）列：颜色映射与按钮矩阵共用 STATUS_META，避免两处漂移 */
export function StatusTag({ status }: { status: CourseStatus }) {
  const meta = STATUS_META[status];
  return (
    <Tag
      theme={meta.theme}
      variant="light"
      data-testid={'status-tag-' + status}
      data-status={status}
    >
      {meta.label}
    </Tag>
  );
}
