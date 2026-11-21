import { Button } from 'tdesign-react';
import type { CourseAction, CourseRecord } from '../types/domain.ts';
import type { ActionContext } from '../types/domain.ts';
import { ACTION_META, actionMatrix } from '../domain/actions.ts';

/**
 * 操作列。
 *
 * 只渲染 actionMatrix(state, ctx) 返回的按钮 —— 无权限/状态不允许的按钮**不存在于 DOM**，
 * 而不是 disabled。AC3 的「不显示审批按钮」与「有权限但自己是提交人时同样不显示」都由这一条保证。
 */
export function ActionButtons({
  course,
  context,
  onAction,
}: {
  course: CourseRecord;
  context: ActionContext;
  onAction: (action: CourseAction, course: CourseRecord) => void;
}) {
  const actions = actionMatrix(course.status, context);
  return (
    <div className="action-cell" data-testid={'actions-' + course.course_no} data-actions={actions.join(',')}>
      {actions.map((action) => {
        const meta = ACTION_META[action];
        const testId = 'action-' + action + '-' + course.course_no;
        if (meta.danger) {
          // 删除与下架使用危险色；真正的二次确认由页面统一弹窗（下架需展示受影响报名数）
          return (
            <Button
              key={action}
              theme="danger"
              variant="text"
              size="small"
              data-testid={testId}
              data-action={action}
              onClick={() => onAction(action, course)}
            >
              {meta.label}
            </Button>
          );
        }
        return (
          <Button
            key={action}
            theme="primary"
            variant="text"
            size="small"
            data-testid={testId}
            data-action={action}
            onClick={() => onAction(action, course)}
          >
            {meta.label}
          </Button>
        );
      })}
    </div>
  );
}
