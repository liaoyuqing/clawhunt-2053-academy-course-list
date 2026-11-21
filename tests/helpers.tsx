import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../src/routes.tsx';
import { resetMockDb } from '../src/api/courseApi.ts';

/**
 * 用内存路由渲染真实路由表，保留 useSearchParams 的真实行为。
 * path 里带查询串即为「刷新后带着 URL 参数进入」的场景（AC2 的核心断言方式）。
 */
export function renderAt(path: string) {
  resetMockDb();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

/** 等到列表首屏渲染完成（表格出现且 loading 结束） */
export async function waitForList(): Promise<void> {
  await screen.findByTestId('course-table');
  await waitFor(() => {
    expect(screen.getByTestId('total-count')).toBeInTheDocument();
  });
  // 让 fetch 后的状态更新（setResult / setLoading）落定
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** 某一行的操作列 data-actions（按钮矩阵的 DOM 取证） */
export function actionsOf(courseNo: string): string[] {
  const cell = document.querySelector('[data-testid="actions-' + courseNo + '"]');
  if (!cell) return [];
  const raw = cell.getAttribute('data-actions') ?? '';
  return raw.length > 0 ? raw.split(',') : [];
}

/** 筛选栏回填值取证：状态多选 + 关键词输入框 */
export function filterSnapshot(): { statuses: string[]; keyword: string; url: string } {
  const boxes = Array.from(
    document.querySelectorAll('[data-testid="filter-status"] input[type="checkbox"]'),
  ) as HTMLInputElement[];
  const checked = boxes
    .filter((box) => box.checked)
    .map((box) => (box.closest('label')?.textContent ?? '').trim());
  const keywordInput = document.querySelector(
    '[data-testid="filter-keyword"] input',
  ) as HTMLInputElement | null;
  const mirror = document.querySelector('[data-testid="url-mirror"]');
  return {
    statuses: checked,
    keyword: keywordInput?.value ?? '',
    url: mirror?.getAttribute('data-url') ?? '',
  };
}
