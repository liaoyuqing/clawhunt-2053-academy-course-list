import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUERY,
  buildListUrl,
  formatSort,
  fromTableSort,
  parseQuery,
  parseSort,
  parseStatuses,
  sameQuery,
  serializeQuery,
  toTableSort,
} from '../src/domain/query.ts';

describe('URL 查询参数 ⇄ 筛选条件（AC2 的地基）', () => {
  it('空查询串解析为默认条件', () => {
    expect(parseQuery('')).toEqual(DEFAULT_QUERY);
  });

  it('多选状态按固定顺序输出，与 URL 里的书写顺序无关', () => {
    const a = parseStatuses('published,draft');
    const b = parseStatuses('draft,published');
    expect(a).toEqual(['draft', 'published']);
    expect(b).toEqual(a);
    expect(serializeQuery({ ...DEFAULT_QUERY, status: a }).get('status')).toBe('draft,published');
  });

  it('非法状态值被过滤，不污染筛选条件', () => {
    expect(parseStatuses('draft,NOT_A_STATUS,published,')).toEqual(['draft', 'published']);
  });

  it('关键词原样往返（含中文与空格裁剪）', () => {
    const query = { ...DEFAULT_QUERY, q: ' 招商 ' };
    expect(parseQuery('?q=' + encodeURIComponent(' 招商 ')).q).toBe('招商');
    expect(serializeQuery(query).get('q')).toBe('招商');
  });

  it('页码与分页大小：越界值回落默认', () => {
    expect(parseQuery('?page=3&pageSize=20').page).toBe(3);
    expect(parseQuery('?page=3&pageSize=20').pageSize).toBe(20);
    expect(parseQuery('?page=0').page).toBe(1);
    expect(parseQuery('?page=-5').page).toBe(1);
    expect(parseQuery('?page=abc').page).toBe(1);
    expect(parseQuery('?pageSize=999').pageSize).toBe(10);
  });

  it('排序：字段白名单 + 方向只有 asc/desc', () => {
    expect(parseSort('enroll_count:asc')).toEqual({ field: 'enroll_count', direction: 'asc' });
    expect(parseSort('enroll_count:bogus')).toEqual({ field: 'enroll_count', direction: 'desc' });
    expect(parseSort('not_a_field:asc')).toEqual(DEFAULT_QUERY.sort);
    expect(formatSort({ field: 'rating_avg', direction: 'asc' })).toBe('rating_avg:asc');
  });

  it('默认值不写进 URL：干净的列表页就是 /academy/courses', () => {
    expect(buildListUrl(DEFAULT_QUERY)).toBe('/academy/courses');
  });

  it('完整的筛选组合往返后完全等价（这是刷新能恢复的根本原因）', () => {
    const url = buildListUrl({
      status: ['draft', 'published'],
      category: 'business',
      visibility: 'all_members',
      q: '招商',
      page: 2,
      pageSize: 20,
      sort: { field: 'enroll_count', direction: 'asc' },
    });
    const search = url.split('?')[1] ?? '';
    const parsed = parseQuery('?' + search);
    expect(parsed.status).toEqual(['draft', 'published']);
    expect(parsed.category).toBe('business');
    expect(parsed.visibility).toBe('all_members');
    expect(parsed.q).toBe('招商');
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(20);
    expect(parsed.sort).toEqual({ field: 'enroll_count', direction: 'asc' });
    // 序列化幂等：再写一次得到同一串
    expect(serializeQuery(parsed).toString()).toBe(serializeQuery(parseQuery('?' + search)).toString());
  });

  it('sameQuery 用序列化结果比较，忽略非规范化输入', () => {
    expect(sameQuery({ ...DEFAULT_QUERY, status: ['published', 'draft'] }, { ...DEFAULT_QUERY, status: ['draft', 'published'] })).toBe(true);
    expect(sameQuery({ ...DEFAULT_QUERY, q: 'a' }, { ...DEFAULT_QUERY, q: 'b' })).toBe(false);
  });

  it('TDesign Table 排序值双向转换', () => {
    expect(toTableSort({ field: 'enroll_count', direction: 'desc' })).toEqual({ sortBy: 'enroll_count', descending: true });
    expect(fromTableSort({ sortBy: 'enroll_count', descending: false }, DEFAULT_QUERY.sort)).toEqual({
      field: 'enroll_count',
      direction: 'asc',
    });
    expect(fromTableSort(undefined, DEFAULT_QUERY.sort)).toEqual(DEFAULT_QUERY.sort);
    expect(fromTableSort({ sortBy: 'bogus' }, DEFAULT_QUERY.sort)).toEqual(DEFAULT_QUERY.sort);
  });

  it('畸形 URL 不抛错（手改地址栏也能打开页面）', () => {
    expect(() => parseQuery('?status=&category=&visibility=&page=&sort=:')).not.toThrow();
    const parsed = parseQuery('?status=&category=&visibility=&page=&sort=:');
    expect(parsed.category).toBeNull();
    expect(parsed.visibility).toBeNull();
  });
});
