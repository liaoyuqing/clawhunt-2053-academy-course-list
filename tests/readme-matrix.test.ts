import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildMatrixDocument,
  buildMatrixTable,
  extractMatrixBlock,
  normalizeBlock,
} from '../src/domain/matrixDocument.ts';
import { COURSE_STATUSES, STATUS_META } from '../src/domain/status.ts';
import { ACTION_META, ACTION_ORDER } from '../src/domain/actions.ts';

/**
 * AC1 的「与 README 中按钮矩阵一致」在这里被直接断言：
 * 读出仓库里的 README.md，把它 ACTION_MATRIX 区块的内容与 actions.ts 现算出来的矩阵逐字比较。
 * 如果谁手改了 README 的表格（或改了矩阵却没重新导出），这个用例立刻变红。
 */
const readmePath = path.resolve(process.cwd(), 'README.md');

describe('README 的按钮矩阵与代码同源（AC1 的「一致」）', () => {
  it('README.md 存在，且包含矩阵标记区块', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const block = extractMatrixBlock(readme);
    expect(block).not.toBeNull();
    expect((block ?? '').length).toBeGreaterThan(100);
  });

  it('矩阵区块与 actions.ts 现算结果逐字一致', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const block = extractMatrixBlock(readme) ?? '';
    expect(normalizeBlock(block)).toBe(normalizeBlock(buildMatrixDocument()));
  });

  it('矩阵表覆盖全部 5 种状态 × 全部 8 个按钮', () => {
    const table = buildMatrixTable();
    for (const state of COURSE_STATUSES) {
      expect(table).toContain('| ' + STATUS_META[state].label + ' `' + state + '` |');
    }
    for (const action of ACTION_ORDER) {
      expect(table).toContain(ACTION_META[action].label);
    }
    // 8 列 + 状态列
    const header = table.split('\n')[0];
    expect(header.split('|').filter((cell) => cell.trim().length > 0).length).toBe(ACTION_ORDER.length + 1);
  });

  it('README 明确写出 5 种状态各自的取值与来源（订单未列全，必须有依据）', () => {
    const readme = readFileSync(readmePath, 'utf8');
    expect(readme).toContain('5 种课程状态');
    for (const state of COURSE_STATUSES) {
      expect(readme).toContain('`' + state + '`');
    }
    expect(readme).toContain('订单原文只写「5 种课程状态」');
  });

  it('README 的 AC 证据段落逐条给出截图/录屏文件名，且文件真实存在', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const referenced = [
      'state-draft.png',
      'state-pending_review.png',
      'state-published.png',
      'state-offline.png',
      'state-archived.png',
      'ac3-no-publish-permission.png',
      'ac3-control-with-publish-permission.png',
      'ac3-boundary-self-submitted.png',
      'ac2-after-reload-01-restored.png',
      'ac2-url-restore-refresh.webm',
      'ac3-permission-switch.webm',
      'docs/checks/tsc.log',
      'docs/checks/vitest.log',
    ];
    for (const name of referenced) {
      expect(readme).toContain(name);
      const file = name.startsWith('state-') || name.startsWith('ac2-') || name.startsWith('ac3-')
        ? path.resolve(process.cwd(), 'docs', name.endsWith('.webm') ? 'recording' : 'screens', name)
        : path.resolve(process.cwd(), name);
      expect(() => readFileSync(file), 'README 引用了不存在的文件：' + name).not.toThrow();
    }
  });
});
