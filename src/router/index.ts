import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '概览仪表板', icon: 'DataAnalysis' }
      },
      {
        path: 'upload',
        name: 'Upload',
        component: () => import('@/views/upload/index.vue'),
        meta: { title: '月度奖励数据上传', icon: 'Upload' }
      },
      {
        path: 'assessment-management',
        name: 'AssessmentManagement',
        component: () => import('@/views/assessment-management/index.vue'),
        meta: { title: '考核记录管理', icon: 'Document' }
      },
      // 重定向原考核数据上传页面到考核记录管理页面
      {
        path: 'assessment/upload',
        redirect: '/assessment-management'
      },
      // 重定向原项点匹配页面到新的项点管理页面
      {
        path: 'assessment/item-match',
        redirect: '/assessment/item-management'
      },
      {
        path: 'assessment/records',
        name: 'AssessmentRecords',
        component: () => import('@/views/assessment/records/index.vue'),
        meta: { title: '考核记录', icon: 'Document' }
      },
      {
        path: 'assessment/item-management',
        name: 'AssessmentItemManagement',
        component: () => import('@/views/assessment/item-management/index.vue'),
        meta: { title: '项点管理', icon: 'Management' }
      },
      {
        path: 'assessment/issue-tracking',
        name: 'IssueTracking',
        component: () => import('@/views/assessment/issue-tracking/index.vue'),
        meta: { title: '问题追踪', icon: 'Warning' }
      },
      {
        path: 'assessment/reward-analysis',
        name: 'RewardAnalysis',
        component: () => import('@/views/assessment/reward-analysis/index.vue'),
        meta: { title: '奖励分析', icon: 'Money' }
      },
      {
        path: 'assessment/reports',
        name: 'AssessmentReports',
        component: () => import('@/views/assessment/reports/index.vue'),
        meta: { title: '考核报表', icon: 'Document' }
      },
      {
        path: 'assessment/monthly-report',
        name: 'MonthlyReport',
        component: () => import('@/views/assessment/reports/MonthlyReport.vue'),
        meta: { title: '月度报表', icon: 'Calendar' }
      },
      {
        path: 'assessment/yearly-report',
        name: 'YearlyReport',
        component: () => import('@/views/assessment/YearlyReport.vue'),
        meta: { title: '年度报表', icon: 'Document' }
      },
      {
        path: 'personnel',
        name: 'Personnel',
        component: () => import('@/layouts/RouterView.vue'),
        meta: { title: '人员管理', icon: 'User' },
        redirect: '/personnel/archive',
        children: [
          {
            path: 'archive',
            name: 'PersonnelArchive',
            component: () => import('@/views/personnel/archive/index.vue'),
            meta: {
              title: '人员档案',
              icon: 'UserFilled'
            }
          },
          {
            path: 'applications',
            name: 'PersonnelApplications',
            component: () => import('@/views/personnel/applications/index.vue'),
            meta: {
              title: '申请审批',
              icon: 'DocumentChecked'
            }
          },
          {
            path: 'changes',
            name: 'PersonnelChanges',
            component: () => import('@/views/personnel/changes/index.vue'),
            meta: {
              title: '异动记录',
              icon: 'Notebook'
            }
          },
          {
            path: 'import',
            name: 'PersonnelImport',
            component: () => import('@/views/personnel/import/index.vue'),
            meta: {
              title: '数据导入',
              icon: 'Upload'
            }
          },
          {
            path: 'export',
            name: 'PersonnelExport',
            component: () => import('@/views/personnel/export/index.vue'),
            meta: {
              title: '原子系统导出',
              icon: 'Download'
            }
          }
        ]
      },
      {
        path: 'score-overview',
        name: 'ScoreOverview',
        component: () => import('@/views/assessment/ScoreOverview.vue'),
        meta: { title: '评分总览', icon: 'DataLine' }
      },
      {
        path: 'score-analysis',
        name: 'ScoreAnalysis',
        component: () => import('@/views/assessment/ScoreAnalysis.vue'),
        meta: { title: '详细分析', icon: 'Histogram' }
      },
      {
        path: 'trend-analysis',
        name: 'TrendAnalysis',
        component: () => import('@/views/assessment/TrendAnalysis.vue'),
        meta: { title: '趋势分析', icon: 'TrendCharts' }
      },
      {
        path: 'segment-overall-analysis',
        name: 'SegmentOverallAnalysis',
        component: () => import('@/views/assessment/SegmentOverallAnalysis.vue'),
        meta: { title: '全段整体分析', icon: 'DataBoard' }
      },
      {
        path: 'management-intensity-analysis',
        name: 'ManagementIntensityAnalysis',
        component: () => import('@/views/assessment/ManagementIntensityAnalysis.vue'),
        meta: { title: '管理力度分析', icon: 'Management' }
      },
      {
        path: 'comprehensive-monthly-report',
        name: 'ComprehensiveMonthlyReport',
        component: () => import('@/views/assessment/ComprehensiveMonthlyReport.vue'),
        meta: { title: '月度综合报表', icon: 'Document' }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/index.vue'),
        meta: { title: '奖励统计', icon: 'PieChart' }
      },
      {
        path: 'attendance-status',
        name: 'AttendanceStatus',
        component: () => import('@/views/personnel/AttendanceStatus.vue'),
        meta: { title: '在岗统计', icon: 'Calendar' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' }
      }
    ]
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 列车长考核管理系统`
  }
  next()
})

export default router 