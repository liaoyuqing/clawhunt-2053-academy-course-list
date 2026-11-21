/**
 * 领域类型。
 *
 * 字段口径按订单「统一技术约定」：业务表统一含
 * id(UUID)、org_id、site_id、created_at、created_by、updated_at、deleted_at(软删除)；
 * 金额一律以「分」存整数（这里的 price_cents、受影响的报名数都是整数，不做浮点换算）。
 */

/** 课程状态：订单正文只写「5 种」，取值由本单在 README 中定义并与按钮矩阵同源。 */
export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'offline' | 'archived';

/** 课程类别字典 */
export type CourseCategory = 'business' | 'skill' | 'compliance' | 'customer' | 'digital';

/** 可见范围字典 */
export type CourseVisibility = 'all_members' | 'level_members' | 'internal';

/** 权益方式字典 */
export type CourseBenefit = 'free' | 'member' | 'paid';

/** 操作按钮标识。渲染顺序即此处声明顺序，README 矩阵与页面共用同一份定义。 */
export type CourseAction =
  | 'edit'
  | 'duplicate'
  | 'submit_review'
  | 'approve'
  | 'offline'
  | 'online'
  | 'archive'
  | 'delete';

/** 判断按钮可见性所需的上下文（全部来自 mock 的当前登录用户，组件里不写死） */
export interface ActionContext {
  /** 当前账号是否具备 course.publish 权限 */
  hasPublishPermission: boolean;
  /** 当前账号是否为该课程的提交人（提交人不能审批自己提交的课程） */
  isSubmitter: boolean;
}

/** 课程记录（列表页只需要展示字段，这里保留统一字段口径） */
export interface CourseRecord {
  id: string;
  org_id: string;
  site_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  deleted_at: string | null;
  /** 课程编号，形如 CRS-1001，筛选栏关键词同时匹配编号与标题 */
  course_no: string;
  title: string;
  category: CourseCategory;
  visibility: CourseVisibility;
  benefit: CourseBenefit;
  /** 权益方式为 paid 时的单课价格，单位：分（整数） */
  price_cents: number;
  status: CourseStatus;
  /** 最近课期时间，ISO 字符串；draft 可能从未排期 */
  next_session_at: string | null;
  /** 课期数 */
  session_count: number;
  /** 累计报名数 */
  enroll_count: number;
  /** 均分，0 表示暂无评分 */
  rating_avg: number;
  /** 提交审核人（审批时用于「不是提交人」判断） */
  submitter_id: string | null;
}

/** 排序字段白名单 */
export type CourseSortField =
  | 'updated_at'
  | 'next_session_at'
  | 'session_count'
  | 'enroll_count'
  | 'rating_avg';

export type SortDirection = 'asc' | 'desc';

export interface CourseSort {
  field: CourseSortField;
  direction: SortDirection;
}

/** 列表查询条件（URL 与接口共用的唯一形态） */
export interface CourseListQuery {
  /** 多选状态；空数组表示不筛选 */
  status: CourseStatus[];
  category: CourseCategory | null;
  visibility: CourseVisibility | null;
  /** 关键词，匹配标题或课程编号 */
  q: string;
  page: number;
  pageSize: number;
  sort: CourseSort;
}

export interface CourseListResult {
  items: CourseRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/** 当前登录账号（来自 S2-IAM 的 mock 桩） */
export interface CurrentUser {
  id: string;
  name: string;
  /** 数据范围，仅用于展示与 README 的对接点说明 */
  data_scope: string;
  permissions: string[];
}
