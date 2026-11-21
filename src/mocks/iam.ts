import type { CurrentUser } from '../types/domain.ts';

/**
 * 当前登录账号的 mock 桩（真实系统由 S2-IAM 下发身份、角色与数据范围，对接点见 README）。
 *
 * AC3 的关键：页面**不写死权限**，所有按钮可见性都由这里注入的 permissions 推导；
 * 换账号 = 换 permissions，同一行课程的按钮组合随之变化。
 *
 * 账号全部为虚构演示账号，姓名用「演示 · 角色」，不含任何真实个人信息。
 */
export const ACCOUNTS: CurrentUser[] = [
  {
    id: 'u_iam_admin',
    name: '演示 · 平台管理员',
    data_scope: 'org',
    // 具备 publish 权限：能看到审批按钮，但自己提交的课程同样不显示审批
    permissions: ['academy.course.read', 'academy.course.write', 'academy.course.publish', 'academy.course.archive'],
  },
  {
    id: 'u_iam_operator',
    name: '演示 · 课程运营',
    data_scope: 'org',
    // 无 publish 权限：任何课程都不渲染审批按钮（AC3 截图账号）
    permissions: ['academy.course.read', 'academy.course.write'],
  },
  {
    id: 'u_iam_reviewer',
    name: '演示 · 审核专员',
    data_scope: 'org',
    // 有 publish 权限，同时自己是两条待审核课程的提交人：
    // 那两条不显示审批，其余可见 —— 用于证明「不是提交人」这个条件真的生效
    permissions: ['academy.course.read', 'academy.course.write', 'academy.course.publish'],
  },
];

export const DEFAULT_ACCOUNT_ID = 'u_iam_admin';

/** 账号选择持久化用的键；页面顶部有账号切换器，便于评审自行复现 AC3 */
export const ACCOUNT_STORAGE_KEY = 'academy.course.currentUser.v1';

export function findAccount(id: string | null | undefined): CurrentUser | undefined {
  if (!id) return undefined;
  return ACCOUNTS.find((account) => account.id === id);
}

/** 环境变量可指定初始账号（配置只从环境变量读，不写死在组件里） */
export function initialAccountId(): string {
  const fromEnv = import.meta.env.VITE_MOCK_ACCOUNT_ID as string | undefined;
  if (fromEnv && findAccount(fromEnv)) return fromEnv;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (stored && findAccount(stored)) return stored;
  }
  return DEFAULT_ACCOUNT_ID;
}

export function hasPermission(user: CurrentUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

export const PERMISSION_PUBLISH = 'academy.course.publish';
