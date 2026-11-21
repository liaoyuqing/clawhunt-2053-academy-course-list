import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, waitForList } from './helpers.tsx';
import { MOCK_COURSES } from '../src/mocks/courses.ts';
import { mockStatusCounts } from '../src/mocks/courses.ts';
import { readApiLog } from '../src/api/courseApi.ts';
import { COURSE_STATUSES } from '../src/domain/status.ts';
import { CATEGORY_LABEL, CATEGORY_VALUES, VISIBILITY_LABEL, VISIBILITY_VALUES } from '../src/domain/catalog.ts';

/**
 * 列表页的其余能力：分页、列排序、下架二次确认（含受影响报名数）、
 * 批量归档（唯一批量操作）、软删除、mock 数据规模。
 */
describe('列表页行为：分页与排序', () => {
  it('默认第 1 页 10 条，总数与 mock 非删除记录数一致', async () => {
    renderAt('/academy/courses');
    await waitForList();
    const alive = MOCK_COURSES.filter((course) => course.deleted_at === null);
    expect(alive.length).toBeGreaterThanOrEqual(30);
    expect(screen.getByTestId('total-count').textContent).toBe('共 ' + alive.length + ' 门课程');
    const rows = document.querySelectorAll('[data-testid^="course-no-"]');
    expect(rows.length).toBe(Math.min(10, alive.length));
  });

  it('pageSize=20 时一页渲染 20 行，且 URL 保留 pageSize', async () => {
    renderAt('/academy/courses?pageSize=20');
    await waitForList();
    expect(document.querySelectorAll('[data-testid^="course-no-"]').length).toBe(20);
    expect(screen.getByTestId('url-mirror').getAttribute('data-url')).toContain('pageSize=20');
  });

  it('第 2 页的行与第 1 页不重复', async () => {
    renderAt('/academy/courses?page=1&pageSize=10');
    await waitForList();
    const page1 = Array.from(document.querySelectorAll('[data-testid^="course-no-"]')).map(
      (n) => n.textContent ?? '',
    );
    document.body.innerHTML = '';
    renderAt('/academy/courses?page=2&pageSize=10');
    await waitForList();
    const page2 = Array.from(document.querySelectorAll('[data-testid^="course-no-"]')).map(
      (n) => n.textContent ?? '',
    );
    expect(page1.length).toBe(10);
    expect(page2.length).toBe(10);
    for (const no of page2) expect(page1).not.toContain(no);
  });

  it('页码越界收敛到最后一页（手改 ?page=999 不出现空白页）', async () => {
    renderAt('/academy/courses?page=999&pageSize=10');
    await waitForList();
    expect(document.querySelectorAll('[data-testid^="course-no-"]').length).toBeGreaterThan(0);
  });

  it('sort 参数生效：累计报名数升序时首行报名数最小', async () => {
    renderAt('/academy/courses?sort=enroll_count:asc&pageSize=50');
    await waitForList();
    const counts = Array.from(document.querySelectorAll('[data-testid^="enroll-"]')).map((node) =>
      Number(node.getAttribute('data-enroll')),
    );
    const sorted = [...counts].sort((a, b) => a - b);
    expect(counts).toEqual(sorted);
  });

  it('点「累计报名数」列的升序图标会把 sort 写进 URL', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses?pageSize=10');
    await waitForList();
    // TDesign 的排序热区是表头内的 .t-table-sort-asc / .t-table-sort-desc 图标，不是整个 th
    const header = document.querySelector('th[data-colkey="enroll_count"]') as HTMLElement;
    expect(header).not.toBeNull();
    await user.click(header.querySelector('.t-table-sort-asc') as HTMLElement);
    await waitFor(() => {
      expect(screen.getByTestId('url-mirror').getAttribute('data-url')).toContain('sort=enroll_count:asc');
    });
    // 再点降序图标：URL 跟随
    await user.click(header.querySelector('.t-table-sort-desc') as HTMLElement);
    await waitFor(() => {
      expect(screen.getByTestId('url-mirror').getAttribute('data-url')).toContain('sort=enroll_count:desc');
    });
  });
});

describe('列表页行为：下架二次确认显示受影响报名数', () => {
  it('点「下架」先弹确认框，框内数字等于该课程累计报名数', async () => {
    const user = userEvent.setup();
    const published = MOCK_COURSES.find((course) => course.status === 'published' && course.enroll_count > 0);
    expect(published).toBeDefined();
    renderAt('/academy/courses?status=published&pageSize=20');
    await waitForList();

    await user.click(
      document.querySelector(
        '[data-testid="action-offline-' + (published as { course_no: string }).course_no + '"]',
      ) as HTMLElement,
    );

    const dialog = await screen.findByTestId('confirm-body');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('affected-enroll-count').textContent).toBe(
      String((published as { enroll_count: number }).enroll_count),
    );
    // 确认前不应发生写操作
    expect(readApiLog().filter((entry) => entry.method === 'POST').length).toBe(0);
  });

  it('确认后课程变为已下架，并记录一次 offline 接口调用', async () => {
    const user = userEvent.setup();
    const published = MOCK_COURSES.find((course) => course.status === 'published');
    const courseNo = (published as { course_no: string }).course_no;
    renderAt('/academy/courses?status=published&pageSize=20');
    await waitForList();

    await user.click(document.querySelector('[data-testid="action-offline-' + courseNo + '"]') as HTMLElement);
    await screen.findByTestId('confirm-body');
    const confirmBtn = document.querySelector('.t-dialog__footer .t-button--theme-primary') as HTMLElement;
    await user.click(confirmBtn);

    await waitFor(() => {
      const log = readApiLog();
      expect(log.some((entry) => entry.path.includes('/offline'))).toBe(true);
    });
    // 已下架的课程不再出现在 published 筛选结果里
    await waitFor(() => {
      expect(document.querySelector('[data-testid="course-no-' + courseNo + '"]')).toBeNull();
    });
  });

  it('取消确认框不产生任何写操作', async () => {
    const user = userEvent.setup();
    const published = MOCK_COURSES.find((course) => course.status === 'published');
    renderAt('/academy/courses?status=published&pageSize=20');
    await waitForList();
    await user.click(
      document.querySelector(
        '[data-testid="action-offline-' + (published as { course_no: string }).course_no + '"]',
      ) as HTMLElement,
    );
    await screen.findByTestId('confirm-body');
    const cancelBtn = document.querySelector('.t-dialog__footer .t-button:not(.t-button--theme-primary)') as HTMLElement;
    await user.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-body')).toBeNull();
    });
    expect(readApiLog().filter((entry) => entry.method === 'POST').length).toBe(0);
  });
});

describe('列表页行为：批量归档是唯一批量操作', () => {
  it('选中可归档行后批量条出现，只有一个操作按钮', async () => {
    const user = userEvent.setup();
    renderAt('/academy/courses?status=published&pageSize=20');
    await waitForList();

    const firstRowCheckbox = document.querySelector('tbody .t-checkbox__former') as HTMLInputElement;
    expect(firstRowCheckbox).not.toBeNull();
    await user.click(firstRowCheckbox.closest('label') as HTMLElement);

    const bar = await screen.findByTestId('bulk-bar');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
      '批量归档',
      '取消选择',
    ]);
  });

  it('批量归档只对 published/offline 生效，跳过的行会计数', async () => {
    const user = userEvent.setup();
    // 全状态视图：勾两行（一行已发布、一行草稿）
    renderAt('/academy/courses?pageSize=50');
    await waitForList();

    const published = MOCK_COURSES.find((course) => course.status === 'published');
    const draft = MOCK_COURSES.find((course) => course.status === 'draft');
    const rowCheckbox = (courseNo: string): HTMLElement => {
      const cell = document.querySelector('[data-testid="course-no-' + courseNo + '"]');
      const row = cell?.closest('tr');
      return row?.querySelector('.t-checkbox__former') as HTMLElement;
    };
    await user.click((rowCheckbox((published as { course_no: string }).course_no)).closest('label') as HTMLElement);
    await user.click((rowCheckbox((draft as { course_no: string }).course_no)).closest('label') as HTMLElement);

    const bar = await screen.findByTestId('bulk-bar');
    expect(within(bar).getByTestId('bulk-selected-count').textContent).toBe('2');

    await user.click(within(bar).getByTestId('bulk-archive'));
    await waitFor(() => {
      const log = readApiLog();
      const entry = log.find((item) => item.path.includes('bulk-archive'));
      expect(entry).toBeDefined();
      const body = entry?.body as { archived: number; skipped: number };
      expect(body.archived).toBe(1);
      expect(body.skipped).toBe(1);
    });
  });
});

describe('列表页行为：软删除', () => {
  it('删除后行从列表消失，但 mock 库里记录仍在（deleted_at 有值）', async () => {
    const user = userEvent.setup();
    const draft = MOCK_COURSES.find((course) => course.status === 'draft');
    const courseNo = (draft as { course_no: string }).course_no;
    renderAt('/academy/courses?status=draft&pageSize=20');
    await waitForList();

    await user.click(document.querySelector('[data-testid="action-delete-' + courseNo + '"]') as HTMLElement);
    await screen.findByTestId('confirm-body');
    expect(screen.getByTestId('confirm-body').textContent).toContain('软删除');
    await user.click(document.querySelector('.t-dialog__footer .t-button--theme-primary') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="course-no-' + courseNo + '"]')).toBeNull();
    });
    const raw = localStorage.getItem('academy.course.list.db.v1') ?? '[]';
    const rows = JSON.parse(raw) as Array<{ course_no: string; deleted_at: string | null }>;
    const row = rows.find((item) => item.course_no === courseNo);
    expect(row).toBeDefined();
    expect(row?.deleted_at).not.toBeNull();
  });
});

describe('mock 数据与字典', () => {
  it('至少 30 条虚构课程，且 5 种状态都有数据', () => {
    expect(MOCK_COURSES.length).toBeGreaterThanOrEqual(30);
    const counts = mockStatusCounts();
    for (const status of COURSE_STATUSES) {
      expect(counts[status] ?? 0).toBeGreaterThan(0);
    }
  });

  it('金额字段一律是整数的「分」', () => {
    for (const course of MOCK_COURSES) {
      expect(Number.isInteger(course.price_cents)).toBe(true);
      expect(course.price_cents).toBeGreaterThanOrEqual(0);
      // 非付费课程的金额必须为 0，避免「免费课却带价格」的脏数据
      if (course.benefit !== 'paid') expect(course.price_cents).toBe(0);
    }
  });

  it('课程编号唯一、id 唯一', () => {
    expect(new Set(MOCK_COURSES.map((course) => course.course_no)).size).toBe(MOCK_COURSES.length);
    expect(new Set(MOCK_COURSES.map((course) => course.id)).size).toBe(MOCK_COURSES.length);
  });

  it('每条记录都带统一字段口径（org_id/site_id/created_*/updated_at/deleted_at）', () => {
    for (const course of MOCK_COURSES) {
      expect(course.org_id.length).toBeGreaterThan(0);
      expect(course.site_id.length).toBeGreaterThan(0);
      expect(course.created_at.length).toBeGreaterThan(0);
      expect(course.created_by.length).toBeGreaterThan(0);
      expect(course.updated_at.length).toBeGreaterThan(0);
      expect(course).toHaveProperty('deleted_at');
    }
  });

  it('字典覆盖 mock 数据里出现的全部类别与可见范围', () => {
    for (const course of MOCK_COURSES) {
      expect(CATEGORY_VALUES).toContain(course.category);
      expect(VISIBILITY_VALUES).toContain(course.visibility);
      expect(CATEGORY_LABEL[course.category].length).toBeGreaterThan(0);
      expect(VISIBILITY_LABEL[course.visibility].length).toBeGreaterThan(0);
    }
  });
});
