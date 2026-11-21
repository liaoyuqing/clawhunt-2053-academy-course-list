#!/usr/bin/env node
/**
 * 按钮矩阵导出脚本 —— 保证 «README 里的表格» 与 «页面实际渲染逻辑» 同源。
 *
 * 页面渲染调用 src/domain/actions.ts 的 actionMatrix()；
 * 本脚本调用的 src/domain/matrixDocument.ts 也是同一个函数，
 * 因此 README 的表格不可能与代码漂移（AC1 的「一致」变成机械保证，而不是人工同步）。
 *
 * 用法：node scripts/export-action-matrix.mjs [--write]
 *   --write  把生成的矩阵写回 README.md 的 <!-- ACTION_MATRIX:BEGIN --> ... <!-- ACTION_MATRIX:END --> 区块
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildMatrixDocument, MATRIX_BEGIN, MATRIX_END } = await import('../src/domain/matrixDocument.ts');

const generated = buildMatrixDocument();
const readmePath = path.join(ROOT, 'README.md');
let updated = false;

try {
  const readme = await readFile(readmePath, 'utf8');
  const begin = readme.indexOf(MATRIX_BEGIN);
  const end = readme.indexOf(MATRIX_END);
  if (begin >= 0 && end > begin) {
    const next = readme.slice(0, begin + MATRIX_BEGIN.length) + '\n\n' + generated + '\n' + readme.slice(end);
    if (next !== readme && process.argv.includes('--write')) {
      await writeFile(readmePath, next, 'utf8');
      updated = true;
    }
  }
} catch {
  // README 还没写时脚本仍可用（只打印）
}

await mkdir(path.join(ROOT, 'docs', 'checks'), { recursive: true });
await writeFile(
  path.join(ROOT, 'docs', 'checks', 'action-matrix.md'),
  '# 按钮矩阵（由 scripts/export-action-matrix.mjs 从 src/domain/actions.ts 导出）\n\n' + generated + '\n',
  'utf8',
);

process.stdout.write(generated + '\n');
process.stdout.write(updated ? 'README.md 矩阵区块已更新\n' : 'README.md 未变（或缺少标记区块）\n');
