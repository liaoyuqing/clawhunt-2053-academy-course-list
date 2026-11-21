import { Input, Select, Button } from 'tdesign-react';
import Checkbox from 'tdesign-react/es/checkbox';
import type {
  CourseCategory,
  CourseListQuery,
  CourseVisibility,
  CourseStatus,
} from '../types/domain.ts';
import { COURSE_STATUSES, STATUS_META } from '../domain/status.ts';
import {
  CATEGORY_LABEL,
  CATEGORY_VALUES,
  VISIBILITY_LABEL,
  VISIBILITY_VALUES,
} from '../domain/catalog.ts';

/**
 * 筛选栏：状态（多选）、类别、可见范围、关键词（标题或课程编号）。
 *
 * 这不是「自己的状态」，而是受控组件：值全部来自 URL 解析出的 query，
 * 任何变化都通过 onChangeQuery 写回 URL。因此刷新/前进后退都能完整恢复。
 */
export function FilterBar({
  query,
  onChangeQuery,
  onReset,
}: {
  query: CourseListQuery;
  onChangeQuery: (patch: Partial<CourseListQuery>) => void;
  onReset: () => void;
}) {
  const statusOptions = COURSE_STATUSES.map((status) => ({
    label: STATUS_META[status].label,
    value: status,
  }));

  return (
    <section className="filter-bar" data-testid="filter-bar">
      <div className="filter-bar__row">
        <span className="filter-bar__label" id="filter-status-label">
          状态
        </span>
        {/* 外层容器承担 data-testid（TDesign 的 Group 不透传 data-*），供测试与截图脚本定位 */}
        <div className="filter-bar__status" data-testid="filter-status">
          <Checkbox.Group
            value={query.status}
            options={statusOptions}
            onChange={(value) => onChangeQuery({ status: value as CourseStatus[] })}
          />
        </div>
      </div>

      <div className="filter-bar__row">
        <span className="filter-bar__label">类别</span>
        <Select
          className="filter-bar__select"
          data-testid="filter-category"
          clearable
          placeholder="全部类别"
          value={query.category ?? undefined}
          options={CATEGORY_VALUES.map((value) => ({ label: CATEGORY_LABEL[value], value }))}
          onChange={(value) => onChangeQuery({ category: (value as CourseCategory) ?? null })}
        />

        <span className="filter-bar__label">可见范围</span>
        <Select
          className="filter-bar__select"
          data-testid="filter-visibility"
          clearable
          placeholder="全部范围"
          value={query.visibility ?? undefined}
          options={VISIBILITY_VALUES.map((value) => ({ label: VISIBILITY_LABEL[value], value }))}
          onChange={(value) => onChangeQuery({ visibility: (value as CourseVisibility) ?? null })}
        />

        <span className="filter-bar__label">关键词</span>
        <Input
          className="filter-bar__keyword"
          data-testid="filter-keyword"
          clearable
          placeholder="匹配标题或课程编号，如 CRS-1016"
          value={query.q}
          onChange={(value) => onChangeQuery({ q: value })}
        />

        <Button variant="outline" data-testid="filter-reset" onClick={onReset}>
          重置
        </Button>
      </div>
    </section>
  );
}
