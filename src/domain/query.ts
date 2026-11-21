import type {
  CourseCategory,
  CourseListQuery,
  CourseSort,
  CourseSortField,
  CourseStatus,
  CourseVisibility,
  SortDirection,
} from '../types/domain.ts';
import { COURSE_STATUSES, isCourseStatus } from './status.ts';
import { isCategory, isVisibility } from './catalog.ts';

/**
 * 列表查询条件 ⇄ URL 查询参数 的唯一转换层。
 *
 * AC2「刷新页面后筛选条件从 URL 恢复」的可靠性完全落在这个模块上：
 *   - serializeQuery 把筛选条件写成固定参数名（status/category/visibility/q/page/pageSize/sort）；
 *   - parseQuery 是它的逆运算，并对非法值做白名单校验与范围收敛（URL 可被手改）。
 * 页面只调用这两个函数，不自己拼字符串，避免「写入的参数名」与「读取的参数名」漂移。
 */
export const QUERY_PARAM_KEYS = [
  'status',
  'category',
  'visibility',
  'q',
  'page',
  'pageSize',
  'sort',
] as const;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const SORT_FIELDS: CourseSortField[] = [
  'updated_at',
  'next_session_at',
  'session_count',
  'enroll_count',
  'rating_avg',
];

export const DEFAULT_SORT: CourseSort = { field: 'updated_at', direction: 'desc' };

export const DEFAULT_QUERY: CourseListQuery = {
  status: [],
  category: null,
  visibility: null,
  q: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: DEFAULT_SORT,
};

function isSortField(value: string): value is CourseSortField {
  return (SORT_FIELDS as string[]).includes(value);
}

/** `updated_at:desc` → { field, direction }；非法输入回落默认排序 */
export function parseSort(raw: string | null): CourseSort {
  if (!raw) return DEFAULT_SORT;
  const [field, direction] = raw.split(':');
  if (!field || !isSortField(field)) return DEFAULT_SORT;
  const dir: SortDirection = direction === 'asc' ? 'asc' : 'desc';
  return { field, direction: dir };
}

export function formatSort(sort: CourseSort): string {
  return sort.field + ':' + sort.direction;
}

/** 多选状态：逗号分隔，去掉重复与非法值，按 COURSE_STATUSES 固定顺序输出（保证 URL 稳定可比对） */
export function parseStatuses(raw: string | null): CourseStatus[] {
  if (!raw) return [];
  const parts = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && isCourseStatus(item));
  const set = new Set(parts as CourseStatus[]);
  return COURSE_STATUSES.filter((status) => set.has(status));
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const int = Math.floor(value);
  return int >= 1 ? int : fallback;
}

function parsePageSize(raw: string | null): number {
  const value = parsePositiveInt(raw, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PAGE_SIZE;
}

/**
 * URL → 查询条件。任何缺失/非法参数都回落默认值，绝不抛错
 * （刷新时带上一次被手改坏的 URL 也不能白屏）。
 */
export function parseQuery(search: string | URLSearchParams): CourseListQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const category = params.get('category');
  const visibility = params.get('visibility');
  return {
    status: parseStatuses(params.get('status')),
    category: category && isCategory(category) ? (category as CourseCategory) : null,
    visibility: visibility && isVisibility(visibility) ? (visibility as CourseVisibility) : null,
    q: (params.get('q') ?? '').trim(),
    page: parsePositiveInt(params.get('page'), 1),
    pageSize: parsePageSize(params.get('pageSize')),
    sort: parseSort(params.get('sort')),
  };
}

/**
 * 查询条件 → URL 查询参数。
 * 只写「非默认值」，这样干净的列表页 URL 就是 /academy/courses，
 * 有任何筛选时才出现参数，录制 AC2 时地址栏变化一目了然。
 */
export function serializeQuery(query: CourseListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.status.length > 0) {
    // 归一到 COURSE_STATUSES 的固定顺序：调用方传进来的数组顺序不影响 URL，
    // 因此 sameQuery() 能对「乱序但等价」的两份条件判等，避免重复写历史记录。
    const set = new Set(query.status);
    const ordered = COURSE_STATUSES.filter((status) => set.has(status));
    params.set('status', ordered.join(','));
  }
  if (query.category) params.set('category', query.category);
  if (query.visibility) params.set('visibility', query.visibility);
  if (query.q.trim().length > 0) params.set('q', query.q.trim());
  if (query.page !== 1) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize));
  if (formatSort(query.sort) !== formatSort(DEFAULT_SORT)) params.set('sort', formatSort(query.sort));
  return params;
}

/**
 * 查询串文本形态：与 serializeQuery 等价，但把逗号保留为字面量，
 * 这样地址栏里是 `?status=draft,published` 而不是 `?status=draft%2Cpublished` ——
 * 录屏与截图里能直接读出多选状态，评审不必解码。
 * 逗号在 query 中是合法字符，服务端与 URLSearchParams 都能正确解析回来。
 */
export function queryStringOf(query: CourseListQuery): string {
  return serializeQuery(query)
    .toString()
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':');
}

/** 便于页面与测试展示的完整 URL（路径 + 查询串） */
export function buildListUrl(query: CourseListQuery): string {
  const params = queryStringOf(query);
  return params ? '/academy/courses?' + params : '/academy/courses';
}

/** 判断两个查询条件是否等价（用于避免重复写入 URL 造成历史记录堆积） */
export function sameQuery(a: CourseListQuery, b: CourseListQuery): boolean {
  return serializeQuery(a).toString() === serializeQuery(b).toString();
}

/** TDesign Table 的 sort 值 ⇄ 内部 CourseSort */
export function toTableSort(sort: CourseSort): { sortBy: string; descending: boolean } {
  return { sortBy: sort.field, descending: sort.direction === 'desc' };
}

export function fromTableSort(
  sort: { sortBy?: string; descending?: boolean } | Array<{ sortBy?: string; descending?: boolean }> | undefined,
  fallback: CourseSort,
): CourseSort {
  if (!sort) return fallback;
  const single = Array.isArray(sort) ? sort[0] : sort;
  if (!single || !single.sortBy || !isSortField(single.sortBy)) return fallback;
  return { field: single.sortBy, direction: single.descending ? 'desc' : 'asc' };
}
