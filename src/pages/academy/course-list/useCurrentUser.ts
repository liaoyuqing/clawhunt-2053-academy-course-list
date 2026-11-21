import { useCallback, useState } from 'react';
import type { CurrentUser } from '../../../types/domain.ts';
import {
  ACCOUNT_STORAGE_KEY,
  ACCOUNTS,
  findAccount,
  initialAccountId,
} from '../../../mocks/iam.ts';

/**
 * 当前登录账号（S2-IAM 桩）。
 *
 * 权限不在组件里写死：页面用 user.permissions 推导 ActionContext，
 * 顶部切换账号即可复现「有/无 publish 权限」两种按钮组合。
 * 真实系统里这个 hook 会换成 S2-WA 的工作台会话上下文。
 */
export function useCurrentUser(): {
  user: CurrentUser;
  setAccountId: (id: string) => void;
} {
  const [accountId, setAccountIdState] = useState<string>(() => initialAccountId());

  const setAccountId = useCallback((id: string) => {
    const account = findAccount(id);
    if (!account) return;
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACCOUNT_STORAGE_KEY, id);
    setAccountIdState(id);
  }, []);

  return { user: findAccount(accountId) ?? ACCOUNTS[0], setAccountId };
}
