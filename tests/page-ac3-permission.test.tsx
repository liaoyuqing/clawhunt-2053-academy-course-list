import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, waitForList, actionsOf } from './helpers.tsx';
import { ACCOUNTS } from '../src/mocks/iam.ts';
import { actionMatrix } from '../src/domain/actions.ts';
import { MOCK_COURSES } from '../src/mocks/courses.ts';

/**
 * AC3：无 publish 权限的账号登录时不显示审批按钮。
 *
 * 三个断言层次：
 *   1. DOM 里根本没有这个按钮节点（queryByRole 为 null），证明是「不渲染」而不是「置灰」；
 *   2. 同一行课程在「有权限账号」下确实存在审批按钮（对照组，证明差异来自权限而非页面坏了）；
 *   3. 边界：有 publish 权限但本人是提交人时同样不渲染（订单原文「且不是提交人」）。
 */
function rowActionsOf(courseNo: string): string[] {
  return actionsOf(courseNo);
}

async function switchAccount(name: string): Promise<void> {
  const user = userEvent.setup();
  const select = document.querySelector('[data-testid="account-switcher"]') as HTMLElement;
  expect(select).not.toBeNull();
  // TDesign Select 的选项面板挂在 body 上，选项文本带「（有 publish 权限）」后缀，
  // 因此用包含匹配而不是全等匹配。
  if (!select.querySelector('.t-select-input--popup-visible')) {
    await user.click(select.querySelector('.t-input') as HTMLElement);
  }
  await waitFor(() => {
    expect(document.querySelectorAll('.t-select-option').length).toBeGreaterThan(0);
  });
  const option = Array.from(document.querySelectorAll('.t-select-option')).find((node) =>
    (node.textContent ?? '').includes(name),
  ) as HTMLElement | undefined;
  expect(option).toBeDefined();
  await user.click(option as HTMLElement);
  await waitFor(() => {
    expect(screen.getByTestId('current-user').textContent).toBe(name);
  });
}

describe('AC3 无 publish 权限时不渲染审批按钮', () => {
  it('无 publish 权限账号：待审核行只有「复制」，没有任何审批按钮节点', async () => {
    // 通过环境变量指定初始账号的前提是模块加载前设置；这里直接写 localStorage 更稳
    localStorage.setItem('academy.course.currentUser.v1', 'u_iam_operator');
    renderAt('/academy/courses?status=pending_review&pageSize=20');
    await waitForList();

    expect(screen.getByTestId('current-user').textContent).toBe('演示 · 课程运营');
    expect(screen.getByTestId('current-user-perms').textContent).toBe('无 course.publish 权限');

    const pending = MOCK_COURSES.filter((course) => course.status === 'pending_review');
    expect(pending.length).toBeGreaterThan(0);
    for (const course of pending) {
      expect(rowActionsOf(course.course_no)).toEqual(['duplicate']);
    }
    // 整页不存在任何名为「审批」的按钮（不只是这一行）
    expect(screen.queryByRole('button', { name: '审批' })).toBeNull();
    expect(document.querySelector('[data-action="approve"]')).toBeNull();
  });

  it('对照组：有 publish 权限且非提交人时，同一批待审核行出现审批按钮', async () => {
    localStorage.setItem('academy.course.currentUser.v1', 'u_iam_admin');
    renderAt('/academy/courses?status=pending_review&pageSize=20');
    await waitForList();

    expect(screen.getByTestId('current-user-perms').textContent).toBe('具备 course.publish 权限');
    const pending = MOCK_COURSES.filter((course) => course.status === 'pending_review');
    const notMine = pending.filter((course) => course.submitter_id !== 'u_iam_admin');
    expect(notMine.length).toBeGreaterThan(0);
    for (const course of notMine) {
      expect(rowActionsOf(course.course_no)).toContain('approve');
    }
    // 管理员自己提交的待审核课程也不显示审批
    const mine = pending.filter((course) => course.submitter_id === 'u_iam_admin');
    for (const course of mine) {
      expect(rowActionsOf(course.course_no)).not.toContain('approve');
    }
  });

  it('边界：有 publish 权限但本人是提交人 → 该行不渲染审批，其余行照常', async () => {
    localStorage.setItem('academy.course.currentUser.v1', 'u_iam_reviewer');
    renderAt('/academy/courses?status=pending_review&pageSize=20');
    await waitForList();

    const pending = MOCK_COURSES.filter((course) => course.status === 'pending_review');
    const mine = pending.filter((course) => course.submitter_id === 'u_iam_reviewer');
    const others = pending.filter((course) => course.submitter_id !== 'u_iam_reviewer');
    expect(mine.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);

    for (const course of mine) {
      expect(rowActionsOf(course.course_no)).toEqual(['duplicate']);
      expect(
        document.querySelector('[data-testid="action-approve-' + course.course_no + '"]'),
      ).toBeNull();
    }
    for (const course of others) {
      expect(rowActionsOf(course.course_no)).toContain('approve');
    }
  });

  it('页面顶部切换账号后按钮组合立即变化（权限来自 IAM mock，不写死在组件里）', async () => {
    localStorage.setItem('academy.course.currentUser.v1', 'u_iam_operator');
    renderAt('/academy/courses?status=pending_review&pageSize=20');
    await waitForList();

    const sample = MOCK_COURSES.find((course) => course.status === 'pending_review');
    expect(sample).toBeDefined();
    const courseNo = (sample as { course_no: string }).course_no;
    expect(rowActionsOf(courseNo)).toEqual(['duplicate']);

    await switchAccount('演示 · 平台管理员');
    await waitFor(() => {
      expect(document.querySelector('[data-testid="action-approve-' + courseNo + '"]')).not.toBeNull();
    });

    await switchAccount('演示 · 课程运营');
    await waitFor(() => {
      expect(document.querySelector('[data-testid="action-approve-' + courseNo + '"]')).toBeNull();
    });
  });

  it('三个 mock 账号的权限集合与 README 描述一致', () => {
    const admin = ACCOUNTS.find((a) => a.id === 'u_iam_admin');
    const operator = ACCOUNTS.find((a) => a.id === 'u_iam_operator');
    const reviewer = ACCOUNTS.find((a) => a.id === 'u_iam_reviewer');
    expect(admin?.permissions).toContain('academy.course.publish');
    expect(operator?.permissions).not.toContain('academy.course.publish');
    expect(reviewer?.permissions).toContain('academy.course.publish');
    // 矩阵层面：无权限时任何状态的按钮集合都不含 approve
    for (const course of MOCK_COURSES) {
      expect(actionMatrix(course.status, { hasPublishPermission: false, isSubmitter: false })).not.toContain('approve');
    }
  });
});
