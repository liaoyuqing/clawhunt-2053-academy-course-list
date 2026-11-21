import { Select } from 'tdesign-react';
import { ACCOUNTS } from '../../../mocks/iam.ts';

/**
 * 账号切换器（仅演示用，真实系统由 S2-IAM 登录态决定）。
 * 三个虚构账号分别覆盖：有 publish 权限、无 publish 权限、有 publish 权限但本人是提交人。
 */
export function AccountSwitcher({
  currentId,
  onChange,
}: {
  currentId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="account-switcher" data-testid="account-switcher">
      <Select
        value={currentId}
        data-testid="account-select"
        onChange={(value) => onChange(String(value))}
        options={ACCOUNTS.map((account) => ({
          label: account.name + (account.permissions.includes('academy.course.publish') ? '（有 publish 权限）' : '（无 publish 权限）'),
          value: account.id,
        }))}
      />
    </div>
  );
}
