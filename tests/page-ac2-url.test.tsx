import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, waitForList, filterSnapshot } from './helpers.tsx';
import { selectCourses } from '../src/api/courseApi.ts';
import { MOCK_COURSES } from '../src/mocks/courses.ts';
import { parseQuery } from '../src/domain/query.ts';

/**
 * AC2：筛选条件写入 URL，刷新（带同一 URL 重新挂载）后完整恢复。
 *
 * 「刷新」在组件测试里的等价物是：用同一个 URL 重新创建路由（renderAt 会新建 router），
 * 此时筛选控件的值只能来自 URL —— 若页面把筛选值存在组件 state 里，这里必然读不到。
 */
const DIRTY_URL =
  '/academy/courses?status=draft,published&category=business&visibility=all_members&q=%E6%8B%9B%E5%95%86&pageSize=20&sort=enroll_count:asc';

describe('AC2 筛选条件从 URL 恢复', () => {
  it('带着完整 URL 进入：筛选控件全部回填，且与 URL 完全一致', async () => {
    renderAt(DIRTY_URL);
    await waitForList();

    const snapshot = filterSnapshot();
    // 状态多选：draft 与 published 两个复选框被勾选
    expect(snapshot.statuses).toEqual(['草稿', '已发布']);
    // 关键词输入框回填「招商」
    expect(snapshot.keyword).toBe('招商');
    // URL 镜像条与实际地址一致（页面没有偷偷改掉参数）
    expect(snapshot.url).toBe(
      '/academy/courses?status=draft,published&category=business&visibility=all_members&q=%E6%8B%9B%E5%95%86&pageSize=20&sort=enroll_count:asc',
    );
  });

  it('恢复出来的筛选条件真的作用到了数据上（不是只回填了控件）', async () => {
    renderAt(DIRTY_URL);
    await waitForList();
    const expected = selectCourses(MOCK_COURSES, parseQuery(DIRTY_URL.split('?')[1]));
    expect(expected.total).toBeGreaterThan(0);
    expect(Number(screen.getByTestId('course-table').getAttribute('data-total'))).toBe(expected.total);
    // 结果行必须都属于 draft/published，且类别为商务拓展
    for (const course of expected.items) {
      expect(['draft', 'published']).toContain(course.status);
      expect(course.category).toBe('business');
    }
  });

  it('关键词输入后 URL 立即出现 q 参数，页码回到第 1 页', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses?page=2&status=published');
    await waitForList();
    const input = document.querySelector('[data-testid="filter-keyword"] input') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'CRS-1016');
    await waitFor(() => {
      const url = filterSnapshot().url;
      expect(url).toContain('q=CRS-1016');
      expect(url).not.toContain('page=2');
    });
  });

  it('勾选状态复选框后 URL 的 status 参数按固定顺序追加', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses');
    await waitForList();
    // 点 label 而非裸 input：TDesign 的可点击热区在 label 上，裸 input 是视觉隐藏的原生控件
    const publishedBox = document.querySelector(
      '[data-testid="filter-status"] input[value="published"]',
    ) as HTMLInputElement;
    await user.click(publishedBox.closest('label') as HTMLElement);
    await waitFor(() => {
      expect(filterSnapshot().url).toBe('/academy/courses?status=published');
    });
  });

  it('取消勾选后参数消失，回到干净 URL（不留下空参数）', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses?status=published');
    await waitForList();
    const publishedBox = document.querySelector(
      '[data-testid="filter-status"] input[value="published"]',
    ) as HTMLInputElement;
    await user.click(publishedBox.closest('label') as HTMLElement);
    await waitFor(() => {
      expect(filterSnapshot().url).toBe('/academy/courses');
    });
  });

  it('「重置」清空全部筛选参数', async () => {
    const user = userEvent.setup();
    renderAt(DIRTY_URL);
    await waitForList();
    await user.click(screen.getByTestId('filter-reset'));
    await waitFor(() => {
      expect(filterSnapshot().url).toBe('/academy/courses');
    });
    expect(filterSnapshot().statuses).toEqual([]);
    expect(filterSnapshot().keyword).toBe('');
  });

  it('翻页写进 URL，重新挂载后仍在同一页', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses?pageSize=10');
    await waitForList();
    const page2 = document.querySelector('.t-pagination__number') as HTMLElement | null;
    expect(page2).not.toBeNull();
    // 直接点第 2 页按钮（TDesign 用 li.t-pagination__number 承载页码）
    const items = Array.from(document.querySelectorAll('.t-pagination__number'));
    const target = items.find((node) => node.textContent?.trim() === '2') as HTMLElement | undefined;
    expect(target).toBeDefined();
    await user.click(target as HTMLElement);
    await waitFor(() => {
      expect(filterSnapshot().url).toBe('/academy/courses?page=2');
    });
  });

  it('手改坏 URL 也能打开：非法状态被丢弃，页面不白屏', async () => {
    renderAt('/academy/courses?status=bogus,draft&page=-3&sort=nope:asc');
    await waitForList();
    expect(filterSnapshot().statuses).toEqual(['草稿']);
    expect(filterSnapshot().url).toBe('/academy/courses?status=draft');
  });
});
