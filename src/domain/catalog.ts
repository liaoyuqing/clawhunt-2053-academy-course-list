import type { CourseBenefit, CourseCategory, CourseVisibility } from '../types/domain.ts';

/**
 * 字典桩（真实系统由 S2-TAX 字典中心下发；本单先用本地常量，对接点见 README）。
 * 全部为虚构枚举值，不含任何真实企业或个人信息。
 */
export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  business: '商务拓展',
  skill: '岗位技能',
  compliance: '合规安全',
  customer: '客户服务',
  digital: '数字化工具',
};

export const VISIBILITY_LABEL: Record<CourseVisibility, string> = {
  all_members: '全部会员',
  level_members: '等级会员',
  internal: '内部可见',
};

export const BENEFIT_LABEL: Record<CourseBenefit, string> = {
  free: '免费',
  member: '会员权益',
  paid: '单课付费',
};

export const CATEGORY_VALUES: CourseCategory[] = ['business', 'skill', 'compliance', 'customer', 'digital'];
export const VISIBILITY_VALUES: CourseVisibility[] = ['all_members', 'level_members', 'internal'];

export function isCategory(value: string): value is CourseCategory {
  return (CATEGORY_VALUES as string[]).includes(value);
}

export function isVisibility(value: string): value is CourseVisibility {
  return (VISIBILITY_VALUES as string[]).includes(value);
}
