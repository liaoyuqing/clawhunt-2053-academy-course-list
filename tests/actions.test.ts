import { describe, expect, it } from 'vitest';
import {
  ACTION_ORDER,
  actionMatrix,
  actionPresence,
  baseActions,
  canApprove,
  isArchivable,
} from '../src/domain/actions.ts';
import { COURSE_STATUSES } from '../src/domain/status.ts';
import type { CourseStatus } from '../src/types/domain.ts';

const ANON = { hasPublishPermission: false, isSubmitter: false };
const REVIEWER = { hasPublishPermission: true, isSubmitter: false };
const SUBMITTER = { hasPublishPermission: true, isSubmitter: true };

describe('按钮矩阵：5 种状态的按钮组合', () => {
  // 与 README「按钮矩阵」小节逐字对应；README 由 scripts/export-action-matrix.mjs 从同一函数导出，
  // 这里断言的是「导出脚本会打印出来的值」，因此三者（代码/README/截图）必然同源。
  // 无 publish 权限视角：待审核行没有「审批」按钮
  const expectedAnon: Record<CourseStatus, string[]> = {
    draft: ['edit', 'duplicate', 'submit_review', 'delete'],
    pending_review: ['duplicate'],
    published: ['duplicate', 'offline', 'archive'],
    offline: ['edit', 'duplicate', 'online', 'archive'],
    archived: ['duplicate', 'delete'],
  };
  // 有 publish 权限且非提交人视角：待审核行多出「审批」
  const expectedReviewer: Record<CourseStatus, string[]> = {
    ...expectedAnon,
    pending_review: ['duplicate', 'approve'],
  };

  it('状态枚举恰好 5 个，顺序与筛选栏一致', () => {
    expect(COURSE_STATUSES).toEqual(['draft', 'pending_review', 'published', 'offline', 'archived']);
  });

  it('无 publish 权限时 5 个状态的基础按钮与预期一致', () => {
    for (const status of COURSE_STATUSES) {
      expect(actionMatrix(status, ANON)).toEqual(expectedAnon[status]);
    }
  });

  it('有 publish 权限时仅待审核多出「审批」一个按钮', () => {
    for (const status of COURSE_STATUSES) {
      const base = actionMatrix(status, ANON);
      const withPerm = actionMatrix(status, REVIEWER);
      expect(withPerm).toEqual(expectedReviewer[status]);
      if (status === 'pending_review') {
        expect(withPerm).not.toEqual(base);
      } else {
        expect(withPerm).toEqual(base);
      }
    }
  });

  it('删除只出现在 draft 与 archived（订单原文限定）', () => {
    for (const status of COURSE_STATUSES) {
      const hasDelete = actionMatrix(status, REVIEWER).includes('delete');
      expect(hasDelete).toBe(status === 'draft' || status === 'archived');
    }
  });

  it('审批：待审核 + 有 publish 权限 + 非提交人，三个条件缺一不可', () => {
    expect(canApprove('pending_review', REVIEWER)).toBe(true);
    expect(canApprove('pending_review', ANON)).toBe(false);
    expect(canApprove('pending_review', SUBMITTER)).toBe(false);
    for (const status of COURSE_STATUSES.filter((s) => s !== 'pending_review')) {
      expect(canApprove(status, REVIEWER)).toBe(false);
    }
  });

  it('提交人视角：待审核行没有任何审批按钮，且其余按钮不受影响', () => {
    const asSubmitter = actionMatrix('pending_review', SUBMITTER);
    expect(asSubmitter).not.toContain('approve');
    expect(asSubmitter).toEqual(['duplicate']);
  });

  it('下架与重新上架只在各自状态出现，且永不同时出现', () => {
    for (const status of COURSE_STATUSES) {
      const list = actionMatrix(status, REVIEWER);
      expect(list.includes('offline')).toBe(status === 'published');
      expect(list.includes('online')).toBe(status === 'offline');
      expect(list.includes('offline') && list.includes('online')).toBe(false);
    }
  });

  it('actionPresence 与 actionMatrix 等价（README 表格用的就是这个形状）', () => {
    for (const status of COURSE_STATUSES) {
      const presence = actionPresence(status, REVIEWER);
      expect(Object.keys(presence)).toEqual(ACTION_ORDER);
      const visible = ACTION_ORDER.filter((action) => presence[action]);
      expect(visible).toEqual(actionMatrix(status, REVIEWER));
    }
  });

  it('矩阵失败模式（反向验证）：改动一个状态后断言必须变红', () => {
    // 若 baseActions 把 archived 的 delete 去掉，上面的用例会失败；
    // 这里用「构造一份错误期望」反向证明断言确实在检查值，而不是恒真。
    const wrong: Record<CourseStatus, string[]> = {
      ...expectedAnon,
      archived: ['duplicate'],
    };
    expect(actionMatrix('archived', ANON)).not.toEqual(wrong.archived);
    expect(baseActions('archived')).toEqual(['duplicate', 'delete']);
  });

  it('仅 published 与 offline 可归档（批量归档据此跳过其余状态）', () => {
    for (const status of COURSE_STATUSES) {
      expect(isArchivable(status)).toBe(status === 'published' || status === 'offline');
    }
  });

  it('返回顺序固定遵循 ACTION_ORDER，不随状态变化漂移', () => {
    const orderIndex = (action: string) => ACTION_ORDER.indexOf(action as never);
    for (const status of COURSE_STATUSES) {
      const list = actionMatrix(status, REVIEWER);
      const sorted = [...list].sort((a, b) => orderIndex(a) - orderIndex(b));
      expect(list).toEqual(sorted);
    }
  });
});
