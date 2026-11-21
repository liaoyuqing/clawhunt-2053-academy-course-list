import type { CourseAction } from '../types/domain.ts';
import type { ActionContext } from '../types/domain.ts';
import {
  ACTION_META,
  ACTION_ORDER,
  BULK_ACTIONS,
  actionMatrix,
  actionPresence,
  baseActions,
} from './actions.ts';
import { COURSE_STATUSES, STATUS_META } from './status.ts';

/**
 * 按钮矩阵的 Markdown 生成器。
 *
 * 为什么单独抽出来：README 的矩阵表、docs/checks/action-matrix.md、
 * 以及「README 与代码一致」的单测，三者必须来自同一份格式化逻辑。
 * 页面渲染走 actions.ts 的 actionMatrix()；这里也走同一个函数，
 * 因此「文档写了什么」与「页面渲染什么」之间不存在人工同步环节。
 */
const VIEWS: Array<{ key: string; label: string; ctx: ActionContext }> = [
  { key: 'anon', label: '无 publish 权限', ctx: { hasPublishPermission: false, isSubmitter: false } },
  {
    key: 'reviewer',
    label: '有 publish 权限且非提交人',
    ctx: { hasPublishPermission: true, isSubmitter: false },
  },
  {
    key: 'submitter',
    label: '有 publish 权限但本人是提交人',
    ctx: { hasPublishPermission: true, isSubmitter: true },
  },
];

function cell(value: boolean): string {
  return value ? '✓' : '—';
}

export function buildMatrixTable(): string {
  const labels = ACTION_ORDER.map((action: CourseAction) => ACTION_META[action].label);
  const lines: string[] = [];
  lines.push('| 状态 | ' + labels.join(' | ') + ' |');
  lines.push('| --- | ' + labels.map(() => '---').join(' | ') + ' |');
  for (const state of COURSE_STATUSES) {
    const presence = actionPresence(state, VIEWS[1].ctx);
    lines.push(
      '| ' +
        STATUS_META[state].label +
        ' `' +
        state +
        '` | ' +
        ACTION_ORDER.map((action) => cell(presence[action])).join(' | ') +
        ' |',
    );
  }
  return lines.join('\n');
}

export function buildPermissionTable(): string {
  const lines: string[] = [];
  lines.push('| 状态 | ' + VIEWS.map((view) => view.label).join(' | ') + ' |');
  lines.push('| --- | ' + VIEWS.map(() => '---').join(' | ') + ' |');
  for (const state of COURSE_STATUSES) {
    lines.push(
      '| ' +
        STATUS_META[state].label +
        ' | ' +
        VIEWS.map(
          (view) => actionMatrix(state, view.ctx).map((action) => ACTION_META[action].label).join('、') || '（无）',
        ).join(' | ') +
        ' |',
    );
  }
  return lines.join('\n');
}

export function buildActionTable(): string {
  const lines: string[] = [];
  lines.push('| 按钮 | 危险色 | 二次确认 | 说明 |');
  lines.push('| --- | --- | --- | --- |');
  for (const action of ACTION_ORDER) {
    const meta = ACTION_META[action];
    lines.push(
      '| ' +
        meta.label +
        ' | ' +
        (meta.danger ? '是' : '否') +
        ' | ' +
        (meta.needsConfirm ? '是' : '否') +
        ' | ' +
        meta.note +
        ' |',
    );
  }
  return lines.join('\n');
}

export function buildBaseTable(): string {
  const lines: string[] = [];
  lines.push('| 状态 | 基础按钮（与权限无关） | 状态流转 |');
  lines.push('| --- | --- | --- |');
  for (const state of COURSE_STATUSES) {
    const labels = baseActions(state).map((action) => ACTION_META[action].label).join('、');
    lines.push(
      '| ' +
        STATUS_META[state].label +
        ' `' +
        state +
        '` | ' +
        labels +
        ' | ' +
        STATUS_META[state].transitions +
        ' |',
    );
  }
  return lines.join('\n');
}

/** 完整矩阵区块（README 的 ACTION_MATRIX:BEGIN/END 之间就是这段内容） */
export function buildMatrixDocument(): string {
  return [
    '主表视角：**有 publish 权限且非提交人**（能力最全）；其余两个权限视角见下方对照表。',
    '',
    buildMatrixTable(),
    '',
    '### 权限视角对照（同一行课程在三个账号下的按钮）',
    '',
    buildPermissionTable(),
    '',
    '### 按钮属性',
    '',
    buildActionTable(),
    '',
    '### 各状态的基础按钮与流转',
    '',
    buildBaseTable(),
    '',
    '批量操作固定只有一项：`' + BULK_ACTIONS.join('`, `') + '`（订单原文：批量操作只提供批量归档）。',
    '',
  ].join('\n');
}

export const MATRIX_BEGIN = '<!-- ACTION_MATRIX:BEGIN -->';
export const MATRIX_END = '<!-- ACTION_MATRIX:END -->';

/** 从 README 文本中取出矩阵区块内容（不含标记行）；找不到返回 null */
export function extractMatrixBlock(readme: string): string | null {
  const begin = readme.indexOf(MATRIX_BEGIN);
  const end = readme.indexOf(MATRIX_END);
  if (begin < 0 || end <= begin) return null;
  return readme.slice(begin + MATRIX_BEGIN.length, end);
}

/** 归一化空白后比较，避免尾部空行差异造成误报 */
export function normalizeBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}
