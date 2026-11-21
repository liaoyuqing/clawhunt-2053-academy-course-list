import type { RouteObject } from 'react-router-dom';
import CourseListPage from './pages/academy/course-list/CourseListPage.tsx';

/**
 * 路由表。列表页是本单唯一交付页面；/academy/courses 是订单指定路由，
 * / 做同样渲染以便本地直接打开根路径。
 */
export const routes: RouteObject[] = [
  { path: '/', element: <CourseListPage /> },
  { path: '/academy/courses', element: <CourseListPage /> },
];
