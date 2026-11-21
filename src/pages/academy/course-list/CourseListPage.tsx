import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, MessagePlugin, Table, Pagination, Loading } from 'tdesign-react';
import type { PrimaryTableCol, TableSort } from 'tdesign-react/es/table';
import type {
  CourseAction,
  CourseListQuery,
  CourseListResult,
  CourseRecord,
} from '../../../types/domain.ts';
import { isArchivable, ACTION_META } from '../../../domain/actions.ts';
import {
  buildListUrl,
  fromTableSort,
  parseQuery,
  queryStringOf,
  sameQuery,
  toTableSort,
  PAGE_SIZE_OPTIONS,
} from '../../../domain/query.ts';
import { CATEGORY_LABEL, VISIBILITY_LABEL, BENEFIT_LABEL } from '../../../domain/catalog.ts';
import {
  affectedEnrollments,
  archiveCourse,
  bulkArchive,
  deleteCourse,
  duplicateCourse,
  fetchCourses,
  offlineCourse,
  onlineCourse,
  approveCourse,
  submitForReview,
} from '../../../api/courseApi.ts';
import { FilterBar } from '../../../components/FilterBar.tsx';
import { BulkBar } from '../../../components/BulkBar.tsx';
import { StatusTag } from '../../../components/StatusTag.tsx';
import { ActionButtons } from '../../../components/ActionButtons.tsx';
import { useCurrentUser } from './useCurrentUser.ts';
import { AccountSwitcher } from './AccountSwitcher.tsx';
import { PERMISSION_PUBLISH } from '../../../mocks/iam.ts';

interface ConfirmState {
  action: CourseAction;
  course: CourseRecord;
}

/**
 * 工作台学院 · 课程列表页 /academy/courses
 *
 * 三条验收的落点：
 *  AC1 操作按钮组合：渲染统一走 domain/actions.ts 的 actionMatrix()，README 矩阵由同一函数导出。
 *  AC2 URL 恢复：筛选条件唯一真源是 URL，useSearchParams ↔ query 双向同步（见 domain/query.ts）。
 *  AC3 无权限不渲染审批：权限来自 mock 的当前用户，按钮用条件渲染而非 disabled。
 */
export default function CourseListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // URL 是筛选条件的唯一真源：每次渲染都从 searchParams 解析，不额外维护一份本地筛选状态。
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const [result, setResult] = useState<CourseListResult>({ items: [], total: 0, page: 1, pageSize: query.pageSize });
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const { user, setAccountId } = useCurrentUser();

  // 权限 → ActionContext。hasPublishPermission 来自 IAM mock，isSubmitter 按行计算。
  const baseContext = useMemo(
    () => ({ hasPublishPermission: user.permissions.includes(PERMISSION_PUBLISH) }),
    [user],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchCourses(query);
    setResult(data);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCourses(query).then((data) => {
      if (cancelled) return;
      setResult(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  /** 任何筛选变化 → 写回 URL（page 归 1，除非显式改页码） */
  const patchQuery = useCallback(
    (patch: Partial<CourseListQuery>) => {
      const next: CourseListQuery = { ...query, ...patch };
      if (!('page' in patch)) next.page = 1;
      if (sameQuery(next, query)) return;
      // 用 navigate(字符串) 而不是 setSearchParams：后者内部会走 URLSearchParams 序列化，
      // 把逗号编码成 %2C、冒号编码成 %3A，地址栏变成 status=draft%2Cpublished 这种不可读形态。
      // 直接导航到一个已构造好的字符串可以保留字面量逗号，录屏里一眼就能读出多选状态。
      navigate('/academy/courses?' + queryStringOf(next));
    },
    [navigate, query],
  );

  const resetQuery = useCallback(() => {
    navigate('/academy/courses');
  }, [navigate]);

  const onSortChange = useCallback(
    (sort: TableSort) => {
      const next = fromTableSort(sort as never, query.sort);
      patchQuery({ sort: next });
    },
    [patchQuery, query.sort],
  );

  const runAction = useCallback(
    (action: CourseAction, course: CourseRecord) => {
      switch (action) {
        case 'delete':
        case 'offline':
        case 'archive':
          // 删除 / 下架 / 归档都需要二次确认（下架还要显示受影响报名数）
          setConfirm({ action, course });
          return;
        case 'duplicate':
          void duplicateCourse(course.id).then(() => {
            void MessagePlugin.success('已复制为新的草稿');
            void reload();
          });
          return;
        case 'submit_review':
          void submitForReview(course.id, user.id).then(() => {
            void MessagePlugin.success('已提交审核');
            void reload();
          });
          return;
        case 'approve':
          void approveCourse(course.id).then(() => {
            void MessagePlugin.success('审批通过，课程已发布');
            void reload();
          });
          return;
        case 'online':
          void onlineCourse(course.id).then(() => {
            void MessagePlugin.success('已重新上架');
            void reload();
          });
          return;
        case 'edit':
          // 列表页内不跳转编辑器（编辑器属于同模块另一张工单），只做跳转占位
          void MessagePlugin.info('打开课程编辑页：/academy/courses/' + course.id + '/edit');
          return;
        default:
          return;
      }
    },
    [reload, user.id],
  );

  const confirmDialog = useCallback(async () => {
    if (!confirm) return;
    const { action, course } = confirm;
    if (action === 'offline') {
      await offlineCourse(course.id);
      await MessagePlugin.success('已下架，受影响报名 ' + affectedEnrollments(course) + ' 人已进入通知队列');
    } else if (action === 'archive') {
      await archiveCourse(course.id);
      await MessagePlugin.success('已归档');
    } else if (action === 'delete') {
      await deleteCourse(course.id);
      await MessagePlugin.success('已删除（软删除，记录保留）');
    }
    setConfirm(null);
    await reload();
  }, [confirm, reload]);

  const onBulkArchive = useCallback(async () => {
    const ids = selectedKeys.map(String);
    const outcome = await bulkArchive(ids);
    await MessagePlugin.success(
      '批量归档完成：成功 ' + outcome.archived.length + ' 门，跳过 ' + outcome.skipped.length + ' 门',
    );
    setSelectedKeys([]);
    await reload();
  }, [selectedKeys, reload]);

  const archivableCount = useMemo(
    () => result.items.filter((course) => selectedKeys.includes(course.id) && isArchivable(course.status)).length,
    [result.items, selectedKeys],
  );

  const columns = useMemo<PrimaryTableCol<CourseRecord>[]>(
    () => [
      {
        colKey: 'row-select',
        type: 'multiple',
        width: 48,
        // 已归档/草稿等不可归档的行仍可选择（页面对不可归档行做跳过并报数）
        checkProps: () => ({ title: '选择该课程' }),
      },
      {
        title: '课程编号',
        colKey: 'course_no',
        width: 120,
        cell: ({ row }) => (
          <span className="course-no" data-testid={'course-no-' + row.course_no}>
            {row.course_no}
          </span>
        ),
      },
      {
        title: '标题',
        colKey: 'title',
        width: 260,
        ellipsis: true,
        cell: ({ row }) => (
          <span className="course-title" title={row.title} data-testid={'course-title-' + row.course_no}>
            {row.title}
          </span>
        ),
      },
      {
        title: '类别',
        colKey: 'category',
        width: 96,
        cell: ({ row }) => <span>{CATEGORY_LABEL[row.category]}</span>,
      },
      {
        title: '可见范围',
        colKey: 'visibility',
        width: 100,
        cell: ({ row }) => <span>{VISIBILITY_LABEL[row.visibility]}</span>,
      },
      {
        title: '权益方式',
        colKey: 'benefit',
        width: 104,
        cell: ({ row }) => (
          <span>
            {BENEFIT_LABEL[row.benefit]}
            {row.benefit === 'paid' ? <em className="course-price"> ¥{(row.price_cents / 100).toFixed(2)}</em> : null}
          </span>
        ),
      },
      {
        title: '状态',
        colKey: 'status',
        width: 96,
        cell: ({ row }) => <StatusTag status={row.status} />,
      },
      {
        title: '最近课期时间',
        colKey: 'next_session_at',
        width: 160,
        sorter: true,
        sortType: 'all',
        cell: ({ row }) => (
          <span data-testid={'next-session-' + row.course_no}>
            {row.next_session_at ? formatDateTime(row.next_session_at) : '—'}
          </span>
        ),
      },
      {
        title: '课期数',
        colKey: 'session_count',
        width: 88,
        sorter: true,
        sortType: 'all',
        cell: ({ row }) => <span>{row.session_count}</span>,
      },
      {
        title: '累计报名数',
        colKey: 'enroll_count',
        width: 108,
        sorter: true,
        sortType: 'all',
        cell: ({ row }) => (
          <span data-testid={'enroll-' + row.course_no} data-enroll={row.enroll_count}>
            {row.enroll_count}
          </span>
        ),
      },
      {
        title: '均分',
        colKey: 'rating_avg',
        width: 80,
        sorter: true,
        sortType: 'all',
        cell: ({ row }) => <span>{row.rating_avg > 0 ? row.rating_avg.toFixed(1) : '—'}</span>,
      },
      {
        title: '更新时间',
        colKey: 'updated_at',
        width: 160,
        sorter: true,
        sortType: 'all',
        cell: ({ row }) => <span>{formatDateTime(row.updated_at)}</span>,
      },
      {
        title: '操作',
        colKey: 'actions',
        width: 300,
        fixed: 'right',
        cell: ({ row }) => (
          <ActionButtons
            course={row}
            context={{ ...baseContext, isSubmitter: row.submitter_id === user.id }}
            onAction={runAction}
          />
        ),
      },
    ],
    [baseContext, user.id, runAction],
  );

  const confirmTitle = confirm ? ACTION_META[confirm.action].label + '确认' : '';

  return (
    <div className="list-page" data-testid="course-list-page">
      <header className="list-page__head">
        <div>
          <h1>工作台学院 · 课程列表</h1>
          <p>
            当前账号：
            <b data-testid="current-user">{user.name}</b>{' '}
            <span className="muted" data-testid="current-user-perms">
              {user.permissions.includes(PERMISSION_PUBLISH) ? '具备 course.publish 权限' : '无 course.publish 权限'}
            </span>
          </p>
        </div>
        <AccountSwitcher
          currentId={user.id}
          onChange={(id) => {
            setAccountId(id);
            setSelectedKeys([]);
          }}
        />
      </header>

      <FilterBar query={query} onChangeQuery={patchQuery} onReset={resetQuery} />

      <BulkBar
        selectedCount={selectedKeys.length}
        archivableCount={archivableCount}
        onBulkArchive={() => {
          void onBulkArchive();
        }}
        onClear={() => setSelectedKeys([])}
      />

      <div className="list-page__url" data-testid="url-mirror" data-url={buildListUrl(query)}>
        当前筛选已写入地址栏：
        <code>{buildListUrl(query)}</code>
      </div>

      {/*
        外层 div 承担 data-testid：TDesign 的 Table 不透传 data-* 到根节点，
        测试与截图脚本需要一个稳定的定位点，因此包一层语义容器。
      */}
      <div className="list-page__table" data-testid="course-table" data-total={result.total}>
        <Loading loading={loading}>
          <Table
            rowKey="id"
            columns={columns}
            data={result.items}
            selectedRowKeys={selectedKeys}
            onSelectChange={(keys) => setSelectedKeys(keys)}
            sort={toTableSort(query.sort)}
            onSortChange={onSortChange}
            hover
            stripe
            tableLayout="fixed"
          />
        </Loading>
      </div>

      <div className="list-page__pager">
        <span className="list-page__total" data-testid="total-count">
          共 {result.total} 门课程
        </span>
        <Pagination
          current={query.page}
          pageSize={query.pageSize}
          total={result.total}
          // 总数由左侧「共 N 门课程」展示，Pagination 自带的「共 N 条数据」会重复
          totalContent={null}
          showPageSize
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onChange={(info) => {
            patchQuery({ page: info.current ?? 1, pageSize: info.pageSize ?? query.pageSize });
          }}
          data-testid="course-pagination"
        />
      </div>

      <Dialog
        visible={confirm !== null}
        header={confirmTitle}
        data-testid="confirm-dialog"
        confirmBtn={ACTION_META[confirm?.action ?? 'archive'].label}
        onConfirm={() => {
          void confirmDialog();
        }}
        onClose={() => setConfirm(null)}
        onCancel={() => setConfirm(null)}
        destroyOnClose
      >
        {confirm ? (
          <div data-testid="confirm-body">
            {confirm.action === 'offline' ? (
              <>
                <p>
                  下架后将立即对会员端不可见，已报名的学员会收到变更通知。
                </p>
                <p className="confirm-emphasis">
                  受影响报名数：
                  <b data-testid="affected-enroll-count">{affectedEnrollments(confirm.course)}</b> 人
                </p>
              </>
            ) : null}
            {confirm.action === 'archive' ? (
              <p>归档后课程进入只读终态，不再出现在发布/下架流程中。</p>
            ) : null}
            {confirm.action === 'delete' ? (
              <p>删除为软删除：记录保留并写入 deleted_at，列表不再展示。</p>
            ) : null}
            <p className="muted">课程：{confirm.course.course_no} · {confirm.course.title}</p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function formatDateTime(iso: string): string {
  // 固定按东八区展示（服务端存 UTC，前端统一展示口径）
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return parts.replace(',', '');
}
