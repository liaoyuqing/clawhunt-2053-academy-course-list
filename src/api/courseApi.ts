import type { CourseListQuery, CourseListResult, CourseRecord, CourseStatus } from '../types/domain.ts';
import { MOCK_COURSES } from '../mocks/courses.ts';

/**
 * 接口层（订单要求「接口先用 mock」）。
 *
 * 对接点（真实后端接上时把 USE_MOCK 改成 false，替换下列函数体即可，签名保持不变）：
 *   GET    /api/academy/courses            列表查询（分页、排序、筛选）
 *   POST   /api/academy/courses/{id}/duplicate
 *   POST   /api/academy/courses/{id}/submit-review
 *   POST   /api/academy/courses/{id}/approve
 *   POST   /api/academy/courses/{id}/offline        body 需回传受影响报名数确认
 *   POST   /api/academy/courses/{id}/online
 *   POST   /api/academy/courses/{id}/archive
 *   DELETE /api/academy/courses/{id}               软删除，写 deleted_at
 *   POST   /api/academy/courses/bulk-archive       body { ids: string[] }
 *
 * 权限由 S2-IAM 在服务端二次校验；本单前端只负责「无权限不渲染按钮」。
 */

export const USE_MOCK = true;

const DB_KEY = 'academy.course.list.db.v1';
const LOG_KEY = 'academy.course.list.api.v1';
const DEFAULT_LATENCY_MS = 30;

let latencyMs = DEFAULT_LATENCY_MS;

/** 测试里由 tests/setup.ts 归零，避免断言依赖机器速度 */
export function setMockLatency(ms: number): void {
  latencyMs = Math.max(0, Math.floor(ms));
}

export function getMockLatency(): number {
  return latencyMs;
}

export interface ApiLogEntry {
  at: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  status: number;
  body: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readDb(): CourseRecord[] | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CourseRecord[];
    return null;
  } catch {
    // mock 库被外部改坏时回落种子数据，避免页面白屏
    return null;
  }
}

function writeDb(rows: CourseRecord[]): void {
  if (!hasStorage()) return;
  localStorage.setItem(DB_KEY, JSON.stringify(rows));
}

function appendLog(entry: ApiLogEntry): void {
  if (!hasStorage()) return;
  const raw = localStorage.getItem(LOG_KEY);
  const list: ApiLogEntry[] = raw ? (JSON.parse(raw) as ApiLogEntry[]) : [];
  list.push(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-30)));
}

export function readApiLog(): ApiLogEntry[] {
  if (!hasStorage()) return [];
  const raw = localStorage.getItem(LOG_KEY);
  return raw ? (JSON.parse(raw) as ApiLogEntry[]) : [];
}

export function clearApiLog(): void {
  if (hasStorage()) localStorage.removeItem(LOG_KEY);
}

/** 重置为种子数据（截图/录屏脚本每次运行前调用，保证可重复） */
export function resetMockDb(): void {
  if (hasStorage()) {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(LOG_KEY);
  }
}

function db(): CourseRecord[] {
  const stored = readDb();
  if (stored) return stored;
  const seed = MOCK_COURSES.map((course) => ({ ...course }));
  writeDb(seed);
  return seed;
}

function save(rows: CourseRecord[]): void {
  writeDb(rows);
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ---------------- 查询 ---------------- */

function matchKeyword(course: CourseRecord, keyword: string): boolean {
  if (!keyword) return true;
  const q = keyword.toLowerCase();
  // 订单要求：关键词匹配标题或课程编号
  return course.title.toLowerCase().includes(q) || course.course_no.toLowerCase().includes(q);
}

function sortValue(course: CourseRecord, field: CourseListQuery['sort']['field']): number | string {
  switch (field) {
    case 'updated_at':
      return course.updated_at;
    case 'next_session_at':
      // 从未排期的课程排在最后（空值统一用极小时间，配合降序即沉底）
      return course.next_session_at ?? '0000-00-00T00:00:00+08:00';
    case 'session_count':
      return course.session_count;
    case 'enroll_count':
      return course.enroll_count;
    case 'rating_avg':
      return course.rating_avg;
    default:
      return course.updated_at;
  }
}

/** 纯函数版筛选+排序+分页，页面与测试共用（不经过 localStorage） */
export function selectCourses(source: CourseRecord[], query: CourseListQuery): CourseListResult {
  const filtered = source.filter((course) => {
    if (course.deleted_at !== null) return false; // 软删除的行不出现在列表
    if (query.status.length > 0 && !query.status.includes(course.status)) return false;
    if (query.category && course.category !== query.category) return false;
    if (query.visibility && course.visibility !== query.visibility) return false;
    return matchKeyword(course, query.q);
  });

  const factor = query.sort.direction === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    const va = sortValue(a, query.sort.field);
    const vb = sortValue(b, query.sort.field);
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va === vb) return a.course_no.localeCompare(b.course_no);
      return (va - vb) * factor;
    }
    const sa = String(va);
    const sb = String(vb);
    if (sa === sb) return a.course_no.localeCompare(b.course_no);
    return sa < sb ? -1 * factor : 1 * factor;
  });

  const total = sorted.length;
  // 页码越界时收敛到最后一页：手改 URL 的 ?page=99 不应出现空白页
  const maxPage = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, maxPage);
  const start = (page - 1) * query.pageSize;
  return {
    items: sorted.slice(start, start + query.pageSize),
    total,
    page,
    pageSize: query.pageSize,
  };
}

export async function fetchCourses(query: CourseListQuery): Promise<CourseListResult> {
  await sleep(latencyMs);
  const result = selectCourses(db(), query);
  appendLog({ at: nowIso(), method: 'GET', path: '/api/academy/courses', status: 200, body: query });
  return result;
}

/** 下架前取「受影响报名数」：订单要求二次确认里显示这个数字 */
export function affectedEnrollments(course: CourseRecord): number {
  return course.enroll_count;
}

/* ---------------- 写操作 ---------------- */

export interface MutationResult {
  ok: boolean;
  course: CourseRecord;
  /** 归档/下架后需要提示的受影响报名数（仅 offline 有值） */
  affected?: number;
}

function findIndex(rows: CourseRecord[], id: string): number {
  return rows.findIndex((course) => course.id === id);
}

async function mutate(
  id: string,
  path: string,
  apply: (course: CourseRecord, rows: CourseRecord[]) => CourseRecord,
  method: 'POST' | 'DELETE' = 'POST',
): Promise<MutationResult> {
  await sleep(latencyMs);
  const rows = db();
  const index = findIndex(rows, id);
  if (index < 0) {
    appendLog({ at: nowIso(), method, path, status: 404, body: { id } });
    throw new Error('课程不存在：' + id);
  }
  const before = rows[index];
  const after = apply({ ...before }, rows);
  rows[index] = after;
  save(rows);
  appendLog({ at: nowIso(), method, path, status: 200, body: { id, before: before.status, after: after.status } });
  return { ok: true, course: after };
}

export function duplicateCourse(id: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/duplicate', (course, rows) => {
    // 复制产生新记录（新 id、新编号），原记录状态不变
    const seq = rows.length + 1;
    const copy: CourseRecord = {
      ...course,
      id: 'crs_copy_' + Date.now().toString(36) + '_' + seq,
      course_no: 'CRS-' + (2000 + seq),
      title: course.title + '（副本）',
      status: 'draft',
      submitter_id: null,
      enroll_count: 0,
      rating_avg: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
    };
    rows.push(copy);
    return course;
  });
}

export function submitForReview(id: string, submitterId: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/submit-review', (course) => ({
    ...course,
    status: 'pending_review',
    submitter_id: submitterId,
    updated_at: nowIso(),
  }));
}

export function approveCourse(id: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/approve', (course) => ({
    ...course,
    status: 'published',
    updated_at: nowIso(),
  }));
}

export function offlineCourse(id: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/offline', (course) => {
    const affected = affectedEnrollments(course);
    return { ...course, status: 'offline', updated_at: nowIso(), affected };
  }).then((result) => ({
    ...result,
    affected: affectedEnrollments(result.course),
  }));
}

export function onlineCourse(id: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/online', (course) => ({
    ...course,
    status: 'published',
    updated_at: nowIso(),
  }));
}

export function archiveCourse(id: string): Promise<MutationResult> {
  return mutate(id, '/api/academy/courses/' + id + '/archive', (course) => ({
    ...course,
    status: 'archived',
    updated_at: nowIso(),
  }));
}

export function deleteCourse(id: string): Promise<MutationResult> {
  // 软删除：保留记录，写 deleted_at
  return mutate(
    id,
    '/api/academy/courses/' + id,
    (course) => ({ ...course, deleted_at: nowIso(), updated_at: nowIso() }),
    'DELETE',
  );
}

export interface BulkArchiveResult {
  archived: string[];
  skipped: Array<{ id: string; status: CourseStatus }>;
}

/** 批量操作只有归档（订单明写：不要批量删除、不要批量上下架） */
export async function bulkArchive(ids: string[]): Promise<BulkArchiveResult> {
  await sleep(latencyMs);
  const rows = db();
  const archived: string[] = [];
  const skipped: Array<{ id: string; status: CourseStatus }> = [];
  for (const id of ids) {
    const index = findIndex(rows, id);
    if (index < 0) continue;
    const course = rows[index];
    // 只有已发布/已下架可归档；其余状态跳过并在提示里报数
    if (course.status === 'published' || course.status === 'offline') {
      rows[index] = { ...course, status: 'archived', updated_at: nowIso() };
      archived.push(id);
    } else {
      skipped.push({ id, status: course.status });
    }
  }
  save(rows);
  appendLog({
    at: nowIso(),
    method: 'POST',
    path: '/api/academy/courses/bulk-archive',
    status: 200,
    body: { ids, archived: archived.length, skipped: skipped.length },
  });
  return { archived, skipped };
}

/** 状态分布（README 的 mock 数据小节与截图脚本自检用） */
export function statusCountsOf(rows: CourseRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.deleted_at !== null) continue;
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
