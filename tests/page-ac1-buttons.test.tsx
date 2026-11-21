import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderAt, waitForList, actionsOf } from './helpers.tsx';
import { MOCK_COURSES } from '../src/mocks/courses.ts';
import { actionMatrix } from '../src/domain/actions.ts';
import type { CourseStatus } from '../src/types/domain.ts';

/**
 * AC1：5 种课程状态下的操作按钮组合。
 *
 * 断言方式不是「把期望值再抄一遍」，而是把页面 DOM 里每行的 data-actions
 * 与 actionMatrix() 的返回值逐行比对 —— 页面若走了别的分支，这里立刻变红。
 */
const ONE_PER_STATUS: Record<CourseStatus, string> = {
  draft: 'crs_1001',
  pending_review: 'crs_1008',
  published: 'crs_1016',
  offline: 'crs_1025',
  archived: 'crs_1031',
};

function courseNoOf(id: string): string {
  const found = MOCK_COURSES.find((course) => course.id === id);
  if (!found) throw new Error('mock 缺少课程 ' + id);
  return found.course_no;
}

describe('AC1 页面渲染的按钮组合与按钮矩阵一致', () => {
  it('每行渲染的按钮集合与 actionMatrix 完全相等（管理员：有 publish 权限）', async () => {
    // pageSize=50 让 36 条 mock 一屏全部渲染，便于逐行核对
    renderAt('/academy/courses?pageSize=50');
    await waitForList();

    // 管理员不是任何课程的行级提交人（提交人字段指向运营/审核/管理员本人）
    for (const course of MOCK_COURSES) {
      const expected = actionMatrix(course.status, {
        hasPublishPermission: true,
        isSubmitter: course.submitter_id === 'u_iam_admin',
      });
      await waitFor(() => {
        expect(actionsOf(course.course_no)).toEqual(expected);
      });
    }
  });

  it('5 种状态各自至少有一行，且状态标签渲染出对应中文', async () => {
    renderAt('/academy/courses?pageSize=50');
    await waitForList();
    const labels: Array<[CourseStatus, string]> = [
      ['draft', '草稿'],
      ['pending_review', '待审核'],
      ['published', '已发布'],
      ['offline', '已下架'],
      ['archived', '已归档'],
    ];
    for (const [status, label] of labels) {
      const tags = document.querySelectorAll('[data-testid="status-tag-' + status + '"]');
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0].textContent).toBe(label);
    }
  });

  it('草稿与已归档才有删除按钮；已发布有下架无删除', async () => {
    renderAt('/academy/courses?pageSize=50');
    await waitForList();
    const draftNo = courseNoOf(ONE_PER_STATUS.draft);
    const pendingNo = courseNoOf(ONE_PER_STATUS.pending_review);
    const publishedNo = courseNoOf(ONE_PER_STATUS.published);
    const offlineNo = courseNoOf(ONE_PER_STATUS.offline);
    const archivedNo = courseNoOf(ONE_PER_STATUS.archived);

    const has = (courseNo: string, action: string) =>
      document.querySelector('[data-testid="action-' + action + '-' + courseNo + '"]') !== null;

    expect(has(draftNo, 'delete')).toBe(true);
    expect(has(archivedNo, 'delete')).toBe(true);
    expect(has(pendingNo, 'delete')).toBe(false);
    expect(has(publishedNo, 'delete')).toBe(false);
    expect(has(offlineNo, 'delete')).toBe(false);

    expect(has(publishedNo, 'offline')).toBe(true);
    expect(has(offlineNo, 'online')).toBe(true);
    expect(has(publishedNo, 'online')).toBe(false);
    expect(has(offlineNo, 'offline')).toBe(false);
  });

  it('不渲染的按钮在 DOM 里完全不存在（不是 disabled）', async () => {
    renderAt('/academy/courses?status=published');
    await waitForList();
    const publishedNo = courseNoOf(ONE_PER_STATUS.published);
    // 已发布行不应出现「审批」「提交审核」「重新上架」
    for (const action of ['approve', 'submit_review', 'online']) {
      expect(document.querySelector('[data-testid="action-' + action + '-' + publishedNo + '"]')).toBeNull();
      expect(screen.queryByRole('button', { name: '审批' })).toBeNull();
    }
  });

  it('批量操作只有「批量归档」一个按钮（无批量删除/批量上下架）', async () => {
    renderAt('/academy/courses');
    await waitForList();
    // 未选择行时不出现批量条
    expect(screen.queryByTestId('bulk-bar')).toBeNull();
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
    for (const forbidden of ['批量删除', '批量上架', '批量下架']) {
      expect(buttons).not.toContain(forbidden);
    }
  });
});
