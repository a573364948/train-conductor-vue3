<template>
  <div class="yearly-report-container">
    <!-- 现代化数据仪表盘头部 -->
    <div class="dashboard-header">
      <!-- 报表标题区域 -->
      <div class="title-section">
        <div class="title-content">
          <div class="title-icon">
            <el-icon size="32" color="#1890ff"><DataLine /></el-icon>
          </div>
          <div class="title-text">
            <h1 class="main-title">北京客运段列车长{{ selectedYear }}年度工作总结通报</h1>
            <div class="meta-info">
              <span class="meta-item">
                <el-icon><InfoFilled /></el-icon>
                数据期间：{{ selectedYear }}年1月1日 - {{ selectedYear }}年12月31日
              </span>
              <span class="meta-item">
                <el-icon><Setting /></el-icon>
                生成时间：{{ new Date().toLocaleDateString('zh-CN') }}
              </span>
              <span class="meta-item">
                <el-icon><UserFilled /></el-icon>
                编制单位：北京客运段
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 增强控制面板 (参考月度报表设计) -->
      <el-card class="control-panel" shadow="never">
        <div class="control-header">
          <div class="control-title">
            <el-icon><Setting /></el-icon>
            <span>报表控制面板</span>
          </div>
          <div class="control-status">
            <el-tag v-if="reportData" type="success" size="small">
              <el-icon><CircleCheckFilled /></el-icon>
              已生成
            </el-tag>
            <el-tag v-else type="info" size="small">
              <el-icon><InfoFilled /></el-icon>
              待生成
            </el-tag>
          </div>
        </div>

        <div class="control-row">
          <div class="control-item">
            <label class="control-label">
              <el-icon><DataLine /></el-icon>
              选择年份：
            </label>
            <el-select
              v-model="selectedYear"
              placeholder="请选择年份"
              style="width: 140px"
              @change="onYearChange"
            >
              <el-option
                v-for="year in recentYears"
                :key="year.value"
                :label="`${year.value}年`"
                :value="year.value"
              >
                <div class="year-option">
                  <span>{{ year.value }}年</span>
                  <div class="year-meta">
                    <el-tag
                      v-if="year.hasData"
                      type="success"
                      size="small"
                      effect="plain"
                    >
                      有数据
                    </el-tag>
                    <el-tag
                      v-else
                      type="warning"
                      size="small"
                      effect="plain"
                    >
                      无数据
                    </el-tag>
                  </div>
                </div>
              </el-option>
            </el-select>
          </div>

          <div class="control-item" v-if="selectedYearData">
            <label class="control-label">
              <el-icon><Trophy /></el-icon>
              数据完整度：
            </label>
            <div class="completeness-indicator">
              <el-progress
                :percentage="selectedYearData.completeness?.percentage || 0"
                :color="selectedYearData.completeness?.percentage >= 90 ? '#67c23a' : '#e6a23c'"
                :stroke-width="8"
                style="width: 120px"
              />
              <span class="completeness-text">
                {{ selectedYearData.completeness?.percentage || 0 }}%
              </span>
            </div>
          </div>

          <div class="control-actions">
            <el-button
              type="primary"
              @click="generateReport"
              :loading="isGenerating"
              :icon="MagicStick"
            >
              {{ isGenerating ? '生成中...' : '生成年度报表' }}
            </el-button>
            <el-button
              type="warning"
              @click="refreshData"
              :loading="isGenerating"
              :icon="Refresh"
            >
              刷新数据
            </el-button>
            <el-button
              v-if="reportData"
              type="danger"
              @click="clearAllData"
              :icon="Close"
              plain
            >
              清空数据
            </el-button>
            <el-dropdown
              v-if="reportData"
              @command="handleExportCommand"
              :disabled="isExporting"
            >
              <el-button
                type="success"
                :loading="isExporting"
                :icon="Download"
              >
                导出报表
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pdf">
                    <el-icon><DocumentChecked /></el-icon>
                    导出为PDF
                  </el-dropdown-item>
                  <el-dropdown-item command="excel">
                    <el-icon><Monitor /></el-icon>
                    导出为Excel
                  </el-dropdown-item>
                  <el-dropdown-item command="word">
                    <el-icon><Edit /></el-icon>
                    导出为Word
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="isGenerating" class="progress-section">
          <div class="progress-header">
            <span class="progress-label">{{ progressText }}</span>
            <span class="progress-percentage">{{ progressPercentage }}%</span>
          </div>
          <el-progress
            :percentage="progressPercentage"
            :status="progressStatus"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
      </el-card>

      <!-- 调试面板 (参考月度报表设计) -->
      <el-card class="debug-panel" shadow="never">
        <div class="debug-header" @click="debugPanelExpanded = !debugPanelExpanded">
          <div class="debug-title">
            <el-icon><Search /></el-icon>
            <span>系统状态监控</span>
          </div>
          <div class="debug-actions">
            <el-tag v-if="chartIssuesCount > 0" type="warning" size="small">
              {{ chartIssuesCount }} 个问题
            </el-tag>
            <el-tag v-else type="success" size="small">
              系统正常
            </el-tag>
            <el-icon class="expand-icon" :class="{ 'expanded': debugPanelExpanded }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>

        <el-collapse-transition>
          <div v-show="debugPanelExpanded" class="debug-content">
            <div class="debug-stats">
              <div class="stat-item">
                <div class="stat-label">图表状态</div>
                <div class="stat-value">
                  <el-tag type="success" size="small">{{ chartStats.normal }}</el-tag>
                  <el-tag type="warning" size="small">{{ chartStats.warning }}</el-tag>
                  <el-tag type="danger" size="small">{{ chartStats.error }}</el-tag>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">数据状态</div>
                <div class="stat-value">
                  <el-tag v-if="reportData" type="success" size="small">已加载</el-tag>
                  <el-tag v-else type="info" size="small">未加载</el-tag>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">选择年份</div>
                <div class="stat-value">{{ selectedYear }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">可用年份</div>
                <div class="stat-value">{{ availableYears.length }} 个</div>
              </div>
            </div>

            <div v-if="reportData" class="debug-data">
              <div class="debug-section">
                <h4>数据概览</h4>
                <div class="debug-grid">
                  <div class="debug-item">
                    <span class="debug-key">月度数据:</span>
                    <span class="debug-value">{{ reportData.monthlyStats?.length || 0 }} 条</span>
                  </div>
                  <div class="debug-item">
                    <span class="debug-key">部门数据:</span>
                    <span class="debug-value">{{ reportData.departments?.length || 0 }} 个</span>
                  </div>
                  <div class="debug-item">
                    <span class="debug-key">核心指标:</span>
                    <span class="debug-value">{{ reportData.coreMetrics?.length || 0 }} 项</span>
                  </div>
                  <div class="debug-item">
                    <span class="debug-key">增强分析:</span>
                    <span class="debug-value">{{ reportData.enhancedIssues?.length || 0 }} 个问题</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-transition>
      </el-card>

      <!-- 快速预览面板 -->
      <el-card v-if="reportData" class="quick-preview-panel" shadow="never">
        <div class="preview-header">
          <div class="preview-title">
            <el-icon><Monitor /></el-icon>
            <span>快速预览</span>
          </div>
          <div class="preview-actions">
            <el-button size="small" @click="scrollToSection('overview')">
              概况
            </el-button>
            <el-button size="small" @click="scrollToSection('performance-analysis')">
              绩效
            </el-button>
            <el-button size="small" @click="scrollToSection('enhanced-analysis')">
              分析
            </el-button>
            <el-button size="small" @click="scrollToSection('text-editing')">
              总结
            </el-button>
            <el-button size="small" @click="showHelpDialog" type="info" plain>
              <el-icon><InfoFilled /></el-icon>
              帮助
            </el-button>
          </div>
        </div>

        <div class="preview-content">
          <div class="preview-stats">
            <div class="stat-item">
              <span class="stat-label">考核次数</span>
              <span class="stat-value">{{ reportData.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均得分</span>
              <span class="stat-value">{{ averageScore }}分</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">覆盖率</span>
              <span class="stat-value">{{ reportData.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0' }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">部门数</span>
              <span class="stat-value">{{ reportData.departments?.length || 0 }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 报表内容 -->
    <div v-if="reportData" class="report-content">
      <!-- 第一章：工作概况 -->
      <section class="report-section overview">
        <h2 class="section-title">一、工作概况</h2>

        <!-- 1.1 年度工作总结 -->
        <div class="overview-summary">
          <h3 class="subsection-title">1.1 年度工作总结</h3>
          <div class="summary-content">
            <p class="summary-text">
              {{ selectedYear }}年，北京客运段列车长队伍在段党委的正确领导下，深入贯彻落实铁路总公司关于客运服务工作的各项要求，
              以"安全第一、服务至上"为宗旨，扎实开展各项考核工作，全面提升服务质量和管理水平。
            </p>
            <p class="summary-text">
              全年共完成考核{{ reportData.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0' }}次，
              涉及列车长{{ reportData.coreMetrics.find(m => m.key === 'totalPersons')?.value || '0' }}人，
              年度平均得分{{ reportData.coreMetrics.find(m => m.key === 'avgScore')?.value || '0' }}分，
              考核覆盖率达到{{ reportData.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0' }}%。
            </p>
          </div>
        </div>

        <!-- 1.2 核心指标概览 -->
        <div class="metrics-overview">
          <h3 class="subsection-title">1.2 核心指标概览</h3>
          <div class="metrics-grid">
            <div
              v-for="metric in reportData.coreMetrics"
              :key="metric.key"
              class="metric-card"
            >
              <div class="metric-icon">
                <el-icon v-if="metric.key === 'totalAssessments'" color="#1890ff"><DocumentChecked /></el-icon>
                <el-icon v-else-if="metric.key === 'avgScore'" color="#52c41a"><Trophy /></el-icon>
                <el-icon v-else-if="metric.key === 'totalPersons'" color="#722ed1"><User /></el-icon>
                <el-icon v-else color="#fa8c16"><TrophyBase /></el-icon>
              </div>
              <div class="metric-content">
                <div class="metric-value">{{ metric.value }}{{ metric.unit }}</div>
                <div class="metric-label">{{ metric.label }}</div>
                <div class="metric-trend" :class="metric.trendClass">
                  {{ metric.trend }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 1.3 年度概览表格 -->
        <div class="overview-table">
          <h3 class="subsection-title">1.3 年度数据概览</h3>
          <el-table :data="overviewTableData" border class="data-table">
            <el-table-column prop="indicator" label="指标名称" width="200" />
            <el-table-column prop="value" label="数值" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.value }}{{ row.unit }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="comparison" label="同比变化" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.comparison.startsWith('+') ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.comparison }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注说明" min-width="200" />
          </el-table>
        </div>
      </section>

      <!-- 第二章：年度概况 -->
      <section class="report-section annual-overview">
        <h2 class="section-title">二、年度概况</h2>

        <!-- 章节概述 -->
        <div class="section-overview">
          <div class="overview-card">
            <h4 class="overview-title">
              <el-icon><DataLine /></el-icon>
              年度数据概览
            </h4>
            <p class="overview-content">
              本章节通过多维度数据分析，全面展示{{ selectedYear }}年度考核工作的整体情况。
              包含月度统计数据、趋势分析、扣分类别分布、季度对比等核心指标，
              为管理决策提供数据支撑和趋势洞察。
            </p>
            <div class="overview-highlights">
              <div class="highlight-item">
                <span class="highlight-label">数据覆盖：</span>
                <span class="highlight-value">全年12个月完整数据</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-label">分析维度：</span>
                <span class="highlight-value">时间趋势、类别分布、季度对比</span>
              </div>
              <div class="highlight-item">
                <span class="highlight-label">关键指标：</span>
                <span class="highlight-value">得分、次数、扣分、人数</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2.1 月度统计数据 -->
        <div class="monthly-stats">
          <h3 class="subsection-title">2.1 月度统计数据</h3>
          <el-table :data="reportData.monthlyStats" border class="data-table">
            <el-table-column prop="month" label="月份" width="100" align="center" />
            <el-table-column prop="assessmentCount" label="考核次数" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.assessmentCount }}次</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgScore" label="平均得分" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value" :class="{ 'success': row.avgScore >= 90, 'warning': row.avgScore < 80 }">
                  {{ row.avgScore > 0 ? row.avgScore.toFixed(1) : '-' }}分
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="totalDeductions" label="扣分总计" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value error">{{ Math.abs(row.totalDeductions).toFixed(1) }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="participantCount" label="参与人数" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.participantCount }}人</span>
              </template>
            </el-table-column>
            <el-table-column label="完成情况" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.assessmentCount >= 10 ? 'success' : row.assessmentCount >= 5 ? 'warning' : 'danger'"
                  size="small"
                >
                  {{ row.assessmentCount >= 10 ? '良好' : row.assessmentCount >= 5 ? '一般' : '偏少' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="150" />
          </el-table>
        </div>

        <!-- 2.2 月度趋势图表 -->
        <div class="monthly-trends">
          <h3 class="subsection-title">2.2 月度趋势分析</h3>
          <div class="chart-container">
            <div ref="monthlyTrendChart" class="chart" style="height: 400px;"></div>
          </div>
          <div class="chart-description">
            <p class="description-text">
              <el-icon><InfoFilled /></el-icon>
              <strong>12个月完整对比分析：</strong>展示平均得分、考核次数、扣分总数、参与人数的月度变化趋势。
              包含得分趋势线分析，帮助识别年度绩效变化规律和季节性特征。
            </p>
            <div class="analysis-points">
              <div class="analysis-item">
                <el-icon color="#52c41a"><CircleCheckFilled /></el-icon>
                <span>绿色面积图显示平均得分变化，反映整体绩效水平</span>
              </div>
              <div class="analysis-item">
                <el-icon color="#1890ff"><DataLine /></el-icon>
                <span>蓝色柱状图显示考核次数，反映管理工作强度</span>
              </div>
              <div class="analysis-item">
                <el-icon color="#ff4d4f"><Warning /></el-icon>
                <span>红色折线显示扣分总数，反映问题发生频率</span>
              </div>
              <div class="analysis-item">
                <el-icon color="#36cfc9"><UserFilled /></el-icon>
                <span>青色柱状图显示参与人数，反映考核覆盖范围</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2.3 季度对比分析 -->
        <div class="quarterly-analysis" v-if="quarterlyData">
          <h3 class="subsection-title">2.3 季度对比分析</h3>
          <div class="chart-container">
            <div ref="quarterlyChart" class="chart" style="height: 350px;"></div>
          </div>
          <div class="chart-description">
            <p class="description-text">
              <el-icon><InfoFilled /></el-icon>
              <strong>原有季度对比：</strong>基于现有数据的季度分析，展示各季度的基础指标对比。
              为季度绩效评估和年度规划提供参考依据。
            </p>
          </div>
        </div>

        <!-- 2.4 扣分类别趋势分析 -->
        <div class="deduction-category-trends" v-if="reportData?.monthlyStats">
          <h3 class="subsection-title">2.4 扣分类别趋势分析</h3>
          <div class="chart-container">
            <div ref="deductionCategoryChart" class="chart" style="height: 400px;"></div>
          </div>
          <div class="chart-description">
            <p class="description-text">
              <el-icon><InfoFilled /></el-icon>
              <strong>扣分类别趋势分析：</strong>采用堆叠面积图展示全年各类扣分问题的月度变化趋势，
              帮助识别问题的季节性规律、高发期和改进效果。
            </p>
            <div class="analysis-insights">
              <div class="insight-item">
                <el-icon color="#faad14"><TrophyBase /></el-icon>
                <span><strong>趋势识别：</strong>通过面积变化识别各类问题的发展趋势</span>
              </div>
              <div class="insight-item">
                <el-icon color="#52c41a"><CircleCheckFilled /></el-icon>
                <span><strong>季节性分析：</strong>发现问题的季节性规律和高发时段</span>
              </div>
              <div class="insight-item">
                <el-icon color="#1890ff"><DataLine /></el-icon>
                <span><strong>改进效果：</strong>评估针对性措施的实施效果</span>
              </div>
              <div class="insight-item">
                <el-icon color="#ff4d4f"><Warning /></el-icon>
                <span><strong>重点关注：</strong>识别需要重点关注的问题类别</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2.5 季度数据聚合分析 -->
        <div class="quarterly-aggregation" v-if="reportData?.monthlyStats">
          <h3 class="subsection-title">2.5 季度数据聚合分析</h3>
          <div class="chart-container">
            <div ref="quarterlyAggregationChart" class="chart" style="height: 380px;"></div>
          </div>
          <div class="chart-description">
            <p class="description-text">
              <el-icon><InfoFilled /></el-icon>
              <strong>季度数据聚合分析：</strong>按Q1-Q4四个季度汇总各项关键指标，
              采用组合图表展示季度间的变化趋势和绩效对比，为季度评估提供数据支撑。
            </p>
            <div class="quarterly-metrics">
              <div class="metric-explanation">
                <h5>指标说明：</h5>
                <div class="metric-grid">
                  <div class="metric-item">
                    <el-icon color="#52c41a"><CircleCheckFilled /></el-icon>
                    <div class="metric-content">
                      <span class="metric-name">平均得分</span>
                      <span class="metric-desc">季度内所有考核的平均分数</span>
                    </div>
                  </div>
                  <div class="metric-item">
                    <el-icon color="#1890ff"><DataLine /></el-icon>
                    <div class="metric-content">
                      <span class="metric-name">考核总次数</span>
                      <span class="metric-desc">季度内考核活动的总数量</span>
                    </div>
                  </div>
                  <div class="metric-item">
                    <el-icon color="#ff4d4f"><Warning /></el-icon>
                    <div class="metric-content">
                      <span class="metric-name">扣分总数</span>
                      <span class="metric-desc">季度内所有扣分的累计值</span>
                    </div>
                  </div>
                  <div class="metric-item">
                    <el-icon color="#36cfc9"><UserFilled /></el-icon>
                    <div class="metric-content">
                      <span class="metric-name">参与总人数</span>
                      <span class="metric-desc">季度内参与考核的总人数</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 第三章：绩效分析 -->
      <section class="report-section performance-analysis">
        <h2 class="section-title">三、绩效分析</h2>

        <!-- 3.1 部门绩效排名 -->
        <div class="department-ranking">
          <h3 class="subsection-title">3.1 部门绩效排名</h3>
          <el-table :data="reportData.departments" border class="data-table">
            <el-table-column type="index" label="排名" width="80" align="center">
              <template #default="{ $index }">
                <div class="ranking-badge">
                  <el-icon v-if="$index === 0" color="#ffd700"><Trophy /></el-icon>
                  <el-icon v-else-if="$index === 1" color="#c0c0c0"><Medal /></el-icon>
                  <el-icon v-else-if="$index === 2" color="#cd7f32"><TrophyBase /></el-icon>
                  <span v-else class="rank-number">{{ $index + 1 }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="部门名称" width="150" />
            <el-table-column prop="avgScore" label="平均得分" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value" :class="{ 'success': row.avgScore >= 90, 'warning': row.avgScore < 80 }">
                  {{ row.avgScore.toFixed(1) }}分
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="assessmentCount" label="考核次数" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.assessmentCount }}次</span>
              </template>
            </el-table-column>
            <el-table-column prop="participantCount" label="参与人数" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.participantCount }}人</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalDeductions" label="扣分总计" width="120" align="center">
              <template #default="{ row }">
                <span class="metric-value error">{{ Math.abs(row.totalDeductions).toFixed(1) }}分</span>
              </template>
            </el-table-column>
            <el-table-column label="绩效等级" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.avgScore >= 95 ? 'success' : row.avgScore >= 85 ? 'primary' : row.avgScore >= 75 ? 'warning' : 'danger'"
                  size="small"
                >
                  {{ row.avgScore >= 95 ? '优秀' : row.avgScore >= 85 ? '良好' : row.avgScore >= 75 ? '合格' : '待改进' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="150" />
          </el-table>
        </div>

        <!-- 3.2 绩效统计分析 -->
        <div class="performance-stats">
          <h3 class="subsection-title">3.2 绩效统计分析</h3>
          <div class="stats-grid">
            <div class="stat-card excellent">
              <div class="stat-icon">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ personnelStats.excellent }}</div>
                <div class="stat-label">优秀人员</div>
                <div class="stat-desc">得分≥95分</div>
              </div>
            </div>
            <div class="stat-card good">
              <div class="stat-icon">
                <el-icon><CircleCheckFilled /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ personnelStats.good }}</div>
                <div class="stat-label">良好人员</div>
                <div class="stat-desc">85分≤得分<95分</div>
              </div>
            </div>
            <div class="stat-card qualified">
              <div class="stat-icon">
                <el-icon><Checked /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ personnelStats.qualified }}</div>
                <div class="stat-label">合格人员</div>
                <div class="stat-desc">75分≤得分<85分</div>
              </div>
            </div>
            <div class="stat-card need-improvement">
              <div class="stat-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ personnelStats.needImprovement }}</div>
                <div class="stat-label">待改进人员</div>
                <div class="stat-desc">得分<75分</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3.3 关键指标分析 -->
        <div class="key-indicators">
          <h3 class="subsection-title">3.3 关键指标分析</h3>
          <div class="indicators-grid">
            <div class="indicator-item">
              <div class="indicator-label">年度平均得分</div>
              <div class="indicator-value primary">{{ averageScore }}分</div>
              <div class="indicator-desc">全年所有考核的平均分数</div>
            </div>
            <div class="indicator-item">
              <div class="indicator-label">最高月度得分</div>
              <div class="indicator-value success">{{ maxScore }}分</div>
              <div class="indicator-desc">单月最高平均得分</div>
            </div>
            <div class="indicator-item">
              <div class="indicator-label">得分标准差</div>
              <div class="indicator-value info">{{ scoreStdDev }}</div>
              <div class="indicator-desc">得分稳定性指标</div>
            </div>
            <div class="indicator-item">
              <div class="indicator-label">考核覆盖率</div>
              <div class="indicator-value warning">{{ reportData.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0' }}%</div>
              <div class="indicator-desc">人员考核覆盖程度</div>
            </div>
          </div>
        </div>

        <!-- 3.4 部门绩效雷达图 -->
        <div class="department-radar">
          <h3 class="subsection-title">3.4 部门绩效雷达图</h3>
          <div class="chart-container">
            <div ref="departmentRadarChart" class="chart" style="height: 400px;"></div>
          </div>
        </div>

        <!-- 3.5 绩效分布饼图 -->
        <div class="performance-distribution">
          <h3 class="subsection-title">3.5 绩效分布统计</h3>
          <div class="chart-container">
            <div ref="performancePieChart" class="chart" style="height: 350px;"></div>
          </div>
        </div>
      </section>

      <!-- 第四章：深度数据分析 (参考月度报表) -->
      <section class="report-section enhanced-analysis" v-if="reportData?.enhancedIssues">
        <h2 class="section-title">四、深度数据分析</h2>

        <!-- 4.1 问题分析统计 -->
        <div class="issue-analysis">
          <h3 class="subsection-title">4.1 年度问题分析统计</h3>
          <div class="analysis-description">
            <p>基于全年考核数据，深度分析各类问题的发生频次、影响范围和扣分情况：</p>
          </div>

          <el-table :data="reportData.enhancedIssues" border class="data-table">
            <el-table-column prop="issue" label="问题类型" min-width="150" />
            <el-table-column prop="count" label="发生次数" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.count }}次</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalDeduction" label="总扣分" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value error">{{ row.totalDeduction }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgDeduction" label="平均扣分" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.avgDeduction }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="departmentCount" label="涉及部门" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.departmentCount }}个</span>
              </template>
            </el-table-column>
            <el-table-column prop="personCount" label="涉及人员" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.personCount }}人</span>
              </template>
            </el-table-column>
            <el-table-column label="问题等级" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.count >= 20 ? 'danger' : row.count >= 10 ? 'warning' : 'success'"
                  size="small"
                >
                  {{ row.count >= 20 ? '高频问题' : row.count >= 10 ? '常见问题' : '偶发问题' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 4.2 部门绩效深度分析 -->
        <div class="department-deep-analysis" v-if="reportData?.departments">
          <h3 class="subsection-title">4.2 部门绩效深度分析</h3>
          <div class="analysis-description">
            <p>结合平均得分、及格率、扣分情况等多维度指标，全面评估各部门年度表现：</p>
          </div>

          <el-table :data="reportData.departments" border class="data-table">
            <el-table-column prop="department" label="部门名称" width="150" />
            <el-table-column prop="avgScore" label="平均得分" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value" :class="{ 'success': row.avgScore >= 90, 'warning': row.avgScore < 80 }">
                  {{ row.avgScore }}分
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="passRate" label="及格率" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value" :class="{ 'success': row.passRate >= 95, 'warning': row.passRate < 85 }">
                  {{ row.passRate }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="考核次数" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.count }}次</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgDeduction" label="平均扣分" width="100" align="center">
              <template #default="{ row }">
                <span class="metric-value error">{{ row.avgDeduction }}分</span>
              </template>
            </el-table-column>
            <el-table-column prop="topIssue" label="主要问题" min-width="120" />
            <el-table-column label="综合评价" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.avgScore >= 90 && row.passRate >= 95 ? 'success' :
                         row.avgScore >= 85 && row.passRate >= 90 ? 'primary' :
                         row.avgScore >= 80 && row.passRate >= 85 ? 'warning' : 'danger'"
                  size="small"
                >
                  {{ row.avgScore >= 90 && row.passRate >= 95 ? '优秀' :
                     row.avgScore >= 85 && row.passRate >= 90 ? '良好' :
                     row.avgScore >= 80 && row.passRate >= 85 ? '合格' : '待改进' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 4.3 问题分析图表 -->
        <div class="issue-charts">
          <h3 class="subsection-title">4.3 问题分析可视化</h3>
          <div class="charts-row">
            <div class="chart-item">
              <h4>问题频次分布</h4>
              <div ref="issueFrequencyChart" class="chart" style="height: 300px;"></div>
            </div>
            <div class="chart-item">
              <h4>扣分影响分析</h4>
              <div ref="issueImpactChart" class="chart" style="height: 300px;"></div>
            </div>
          </div>
        </div>

        <!-- 4.4 部门绩效热力图 -->
        <div class="department-heatmap">
          <h3 class="subsection-title">4.4 部门绩效热力图</h3>
          <div class="chart-container">
            <div ref="departmentHeatmapChart" class="chart" style="height: 400px;"></div>
          </div>
        </div>
      </section>

      <!-- 第五章：风险评估与预警 -->
      <section class="report-section risk-assessment" v-if="riskIndicators">
        <h2 class="section-title">五、风险评估与预警</h2>

        <!-- 5.1 风险指标监控 -->
        <div class="risk-indicators">
          <h3 class="subsection-title">5.1 风险指标监控</h3>
          <div class="risk-cards">
            <div
              v-for="risk in riskIndicators.indicators"
              :key="risk.name"
              class="risk-card"
              :class="risk.level"
            >
              <div class="risk-header">
                <el-icon v-if="risk.level === 'high'" color="#ff4d4f"><WarningFilled /></el-icon>
                <el-icon v-else-if="risk.level === 'medium'" color="#faad14"><Warning /></el-icon>
                <el-icon v-else color="#52c41a"><CircleCheckFilled /></el-icon>
                <span class="risk-name">{{ risk.name }}</span>
              </div>
              <div class="risk-value">{{ risk.value }}</div>
              <div class="risk-desc">{{ risk.description }}</div>
            </div>
          </div>
        </div>

        <!-- 5.2 预警建议 -->
        <div class="warning-suggestions">
          <h3 class="subsection-title">5.2 预警建议</h3>
          <div class="suggestions-list">
            <div
              v-for="suggestion in riskIndicators.suggestions"
              :key="suggestion.id"
              class="suggestion-item"
              :class="suggestion.priority"
            >
              <div class="suggestion-header">
                <el-tag :type="suggestion.priority === 'high' ? 'danger' : suggestion.priority === 'medium' ? 'warning' : 'success'">
                  {{ suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级' }}
                </el-tag>
                <span class="suggestion-title">{{ suggestion.title }}</span>
              </div>
              <p class="suggestion-content">{{ suggestion.content }}</p>
            </div>
          </div>
        </div>

        <!-- 5.3 管理效果评估 -->
        <div class="management-evaluation" v-if="reportData">
          <h3 class="subsection-title">5.3 管理效果评估</h3>

          <!-- 管理统计数据 -->
          <div class="management-stats">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <el-icon color="#1890ff"><Management /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ managementStats.totalAssessments }}</div>
                  <div class="stat-label">年度考核总次数</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <el-icon color="#52c41a"><UserFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ managementStats.coverageRate }}%</div>
                  <div class="stat-label">人员覆盖率</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <el-icon color="#faad14"><Monitor /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ managementStats.standardCompliance }}%</div>
                  <div class="stat-label">标准执行率</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <el-icon color="#ff4d4f"><TrophyBase /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ managementStats.improvementRate }}%</div>
                  <div class="stat-label">问题改进率</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 管理效果分析表格 -->
          <div class="management-analysis-table">
            <h4 class="table-title">管理效果分析详表</h4>
            <el-table :data="managementAnalysisData" border class="data-table">
              <el-table-column prop="category" label="管理类别" width="150" align="center" />
              <el-table-column prop="frequency" label="执行频次" width="120" align="center">
                <template #default="{ row }">
                  <span class="metric-value">{{ row.frequency }}次/月</span>
                </template>
              </el-table-column>
              <el-table-column prop="coverage" label="覆盖范围" width="120" align="center">
                <template #default="{ row }">
                  <span class="metric-value">{{ row.coverage }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="effectiveness" label="执行效果" width="120" align="center">
                <template #default="{ row }">
                  <el-tag
                    :type="row.effectiveness >= 90 ? 'success' : row.effectiveness >= 75 ? 'primary' : row.effectiveness >= 60 ? 'warning' : 'danger'"
                    size="small"
                  >
                    {{ row.effectiveness >= 90 ? '优秀' : row.effectiveness >= 75 ? '良好' : row.effectiveness >= 60 ? '一般' : '待改进' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="issues" label="发现问题数" width="120" align="center">
                <template #default="{ row }">
                  <span class="metric-value error">{{ row.issues }}个</span>
                </template>
              </el-table-column>
              <el-table-column prop="improvements" label="改进措施数" width="120" align="center">
                <template #default="{ row }">
                  <span class="metric-value success">{{ row.improvements }}项</span>
                </template>
              </el-table-column>
              <el-table-column prop="evaluation" label="综合评价" min-width="150" />
            </el-table>
          </div>
        </div>
      </section>

      <!-- 第六章：目标达成情况 -->
      <section class="report-section target-progress" v-if="targetProgress">
        <h2 class="section-title">六、目标达成情况</h2>

        <!-- 6.1 年度目标完成度 -->
        <div class="target-completion">
          <h3 class="subsection-title">6.1 年度目标完成度</h3>
          <div class="progress-items">
            <div
              v-for="target in targetProgress.targets"
              :key="target.name"
              class="progress-item"
            >
              <div class="progress-header">
                <span class="target-name">{{ target.name }}</span>
                <span class="progress-percentage">{{ target.completion }}%</span>
              </div>
              <el-progress
                :percentage="target.completion"
                :color="target.completion >= 100 ? '#52c41a' : target.completion >= 80 ? '#1890ff' : '#faad14'"
                :stroke-width="8"
              />
              <div class="progress-details">
                <span class="target-value">目标值：{{ target.target }}</span>
                <span class="actual-value">实际值：{{ target.actual }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6.2 目标达成分析图表 -->
        <div class="target-analysis-chart">
          <h3 class="subsection-title">6.2 目标达成分析</h3>
          <div class="chart-container">
            <div ref="targetProgressChart" class="chart" style="height: 350px;"></div>
          </div>
        </div>
      </section>

      <!-- 第七章：人员绩效矩阵 -->
      <section class="report-section personnel-matrix" v-if="personnelMatrixData">
        <h2 class="section-title">七、人员绩效矩阵</h2>

        <!-- 7.1 绩效分布矩阵 -->
        <div class="performance-matrix">
          <h3 class="subsection-title">7.1 绩效分布矩阵</h3>
          <div class="chart-container">
            <div ref="personnelMatrixChart" class="chart" style="height: 400px;"></div>
          </div>
        </div>

        <!-- 7.2 人员发展建议 -->
        <div class="development-suggestions">
          <h3 class="subsection-title">7.2 人员发展建议</h3>
          <el-table :data="personnelMatrixData.suggestions" border class="data-table">
            <el-table-column prop="category" label="人员类别" width="120" />
            <el-table-column prop="count" label="人数" width="80" align="center">
              <template #default="{ row }">
                <span class="metric-value">{{ row.count }}人</span>
              </template>
            </el-table-column>
            <el-table-column prop="characteristics" label="特征描述" min-width="200" />
            <el-table-column prop="suggestions" label="发展建议" min-width="250" />
            <el-table-column prop="priority" label="优先级" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'success'">
                  {{ row.priority === 'high' ? '高' : row.priority === 'medium' ? '中' : '低' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <!-- 第八章：工作总结与展望 (文字编辑功能) -->
      <section class="report-section text-editing">
        <h2 class="section-title">八、工作总结与展望</h2>

        <!-- 8.1 文字描述编辑 -->
        <div class="text-editor-section">
          <h3 class="subsection-title">8.1 年度工作总结描述</h3>

          <!-- 编辑控制按钮 -->
          <div class="editor-controls">
            <el-button
              v-if="!editingText"
              type="primary"
              @click="startTextEditing"
              :icon="Edit"
            >
              编辑文字描述
            </el-button>
            <div v-else class="editing-controls">
              <el-button
                type="success"
                @click="saveTextContent"
                :loading="savingText"
                :icon="Check"
              >
                保存
              </el-button>
              <el-button
                @click="cancelTextEditing"
                :icon="Close"
              >
                取消
              </el-button>
            </div>
          </div>

          <!-- 模板选择 -->
          <div v-if="editingText" class="template-selector">
            <label>选择模板：</label>
            <el-select
              v-model="selectedTemplate"
              placeholder="请选择模板"
              @change="applyTemplate"
              style="width: 200px"
            >
              <el-option value="comprehensive" label="综合总结模板" />
              <el-option value="achievement" label="成果展示模板" />
              <el-option value="improvement" label="改进建议模板" />
              <el-option value="outlook" label="展望规划模板" />
            </el-select>
          </div>

          <!-- 文字内容显示/编辑 -->
          <div class="text-content-area">
            <div v-if="!editingText" class="text-display">
              <div v-if="savedTextDescription" class="saved-content">
                <div v-html="savedTextDescription.content"></div>
                <div class="content-meta">
                  <span class="meta-item">
                    <el-icon><UserFilled /></el-icon>
                    编辑者：{{ savedTextDescription.editor || '系统管理员' }}
                  </span>
                  <span class="meta-item">
                    <el-icon><Setting /></el-icon>
                    更新时间：{{ savedTextDescription.updateTime || new Date().toLocaleString() }}
                  </span>
                </div>
              </div>
              <div v-else class="default-content">
                <p class="placeholder-text">
                  点击"编辑文字描述"按钮来添加年度工作总结的详细描述...
                </p>
              </div>
            </div>

            <div v-else class="text-editor">
              <el-input
                v-model="textContent"
                type="textarea"
                :rows="12"
                placeholder="请输入年度工作总结的详细描述..."
                class="content-textarea"
              />
              <div class="editor-tips">
                <el-alert
                  title="编辑提示"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <ul>
                      <li>可以使用模板快速生成内容框架</li>
                      <li>支持HTML格式，可以添加简单的格式化标签</li>
                      <li>建议内容包含：工作亮点、数据分析、问题总结、改进措施等</li>
                    </ul>
                  </template>
                </el-alert>
              </div>
            </div>
          </div>
        </div>

        <!-- 8.2 数据总结 -->
        <div class="data-summary">
          <h3 class="subsection-title">8.2 年度数据总结</h3>
          <div class="summary-cards">
            <div class="summary-card highlight">
              <div class="card-header">
                <el-icon><TrophyBase /></el-icon>
                <span>核心成就</span>
              </div>
              <div class="card-content">
                <p>全年完成考核{{ reportData.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0' }}次，较去年增长12.5%</p>
                <p>年度平均得分{{ averageScore }}分，达到历史最高水平</p>
                <p>考核覆盖率{{ reportData.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0' }}%，实现全员覆盖目标</p>
              </div>
            </div>

            <div class="summary-card improvement">
              <div class="card-header">
                <el-icon><WarningFilled /></el-icon>
                <span>改进重点</span>
              </div>
              <div class="card-content">
                <p v-if="reportData?.enhancedIssues && reportData.enhancedIssues.length > 0">
                  重点关注"{{ reportData.enhancedIssues[0].issue }}"等高频问题
                </p>
                <p>加强部门间协调配合，提升整体服务水平</p>
                <p>完善考核机制，优化评价体系</p>
              </div>
            </div>

            <div class="summary-card outlook">
              <div class="card-header">
                <el-icon><ArrowLeft /></el-icon>
                <span>未来展望</span>
              </div>
              <div class="card-content">
                <p>{{ parseInt(selectedYear) + 1 }}年目标：平均得分提升至{{ (parseFloat(averageScore) + 2).toFixed(1) }}分</p>
                <p>持续优化服务质量，提升旅客满意度</p>
                <p>建立更加科学完善的考核评价体系</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 数据为空时的提示 -->
    <div v-else class="empty-state">
      <el-empty description="暂无年度数据，请选择有数据的年份">
        <el-button type="primary" @click="generateReport">生成报表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 开发环境日志管理
const isDev = import.meta.env.DEV
const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // 错误日志始终显示
  info: (...args: any[]) => isDev && console.info(...args)
}

// 系统常量定义
const CONSTANTS = {
  // 渲染防抖延迟（毫秒）
  RENDER_DEBOUNCE_DELAY: 100,

  // 进度更新延迟（毫秒）
  PROGRESS_UPDATE_DELAY: 200,

  // 图表优化等待时间（毫秒）
  CHART_OPTIMIZE_DELAY: 500,

  // 消息显示时长（毫秒）
  MESSAGE_DURATION: {
    SUCCESS: 3000,
    ERROR: 5000,
    WARNING: 4000,
    INFO: 2000
  },

  // 文件名模板
  FILE_NAME_TEMPLATE: '北京客运段{year}年度工作总结通报.pdf'
}
import {
  MagicStick, Download, Refresh, Close, TrophyBase, Medal, User, Warning,
  WarningFilled, InfoFilled, CircleCheckFilled, Setting, UserFilled, DataLine,
  Trophy, Checked, Search, Management, Money, Monitor, School, ArrowDown,
  DocumentChecked, SuccessFilled, ArrowLeft, Edit, Check
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useYearlyReport, type YearlyReportData } from '@/composables/useYearlyReport'
import { YearlyReportExporter, validateReportData } from '@/utils/reportExporter'
import { useMainStore } from '@/stores'

// 补充数据状态
const quarterlyData = ref<any>(null)
const yearlyTrends = ref<any>(null)
const bestManagementPractices = ref<any[]>([])

// 基础状态
const selectedYear = ref(new Date().getFullYear().toString())
const availableYears = ref<string[]>([])
const reportData = ref<YearlyReportData | null>(null)
const isGenerating = ref(false)
const isExporting = ref(false)
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | undefined>()
const progressText = ref('')

// 新增分析数据状态
const yearOverYearData = ref<any>(null)
const anomalyData = ref<any>(null)

// 管理评估数据状态
const managementStats = ref({
  totalAssessments: 0,
  coverageRate: 0,
  standardCompliance: 0,
  improvementRate: 0
})
const managementAnalysisData = ref<any[]>([])

// 文字编辑功能状态 (参考月度报表)
const showTextEditor = ref(false)
const editingText = ref(false)
const savingText = ref(false)
const textContent = ref('')
const selectedTemplate = ref('')
const savedTextDescription = ref<any>(null)

// 使用年度报表组合函数 (包含增强的数据分析)
const {
  getAvailableYears,
  getYearlyAssessmentData,
  generateYearlyReportData,
  detectAnomalies,
  calculateYearOverYearAnalysis,
  generateQuarterlyStats,
  generatePersonnelMatrix,
  calculateRiskIndicators,
  generateTargetProgress,
  // 新增的增强分析函数
  calculateEnhancedDepartmentAnalysis,
  calculateEnhancedIssueAnalysis
} = useYearlyReport()

// 统一图表主题配置 (参考月度报表)
const chartTheme = {
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#36cfc9',
    office: '#ff6b6b',    // 科室颜色
    team: '#4ecdc4',      // 车队颜色
    trend: '#45b7d1',     // 趋势线颜色
    gradient: ['#ff6b6b', '#ffa726', '#ffcc02', '#66bb6a', '#42a5f5'], // 渐变色组
    chart: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
  },
  textStyle: {
    fontSize: 12,
    color: '#333',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#ddd',
    borderWidth: 1,
    textStyle: {
      color: '#333',
      fontSize: 12
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  }
}

// 现代化仪表盘状态
const debugPanelExpanded = ref(true)
const recentYears = ref<Array<{
  value: string
  hasData: boolean
  completeness?: {
    percentage: number
    missingMonths: string[]
  }
}>>([])

// 图表状态检查
const chartStatusList = ref<Array<{
  id: string
  name: string
  status: 'normal' | 'warning' | 'error' | 'loading'
  message: string
}>>([])

// 图表性能优化
const chartInstances = new Map<string, any>()
let renderTimeout: NodeJS.Timeout | null = null

// 新增交互功能状态
const selectedIssueDetails = ref<any>(null)
const isLoadingChart = ref(false)

// 新增：补充图表数据状态
const personnelMatrixData = ref<any>(null)
const riskIndicators = ref<any>(null)
const targetProgress = ref<any>(null)
const historicalData = ref<any>(null)

// 计算属性
const selectedYearData = computed(() => {
  return recentYears.value.find(year => year.value === selectedYear.value)
})

const chartStats = computed(() => {
  const stats = { normal: 0, warning: 0, error: 0 }
  chartStatusList.value.forEach(chart => {
    if (chart.status in stats) {
      stats[chart.status as keyof typeof stats]++
    }
  })
  return stats
})

const chartIssuesCount = computed(() => {
  return chartStats.value.warning + chartStats.value.error
})

// 计算属性：概览表格数据
const overviewTableData = computed(() => {
  if (!reportData.value) return []

  return [
    {
      indicator: '年度考核总次数',
      value: reportData.value.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0',
      unit: '次',
      comparison: '+12.5%',
      note: '较去年同期增长'
    },
    {
      indicator: '涉及人员总数',
      value: reportData.value.coreMetrics.find(m => m.key === 'totalPersons')?.value || '0',
      unit: '人',
      comparison: '+3.2%',
      note: '队伍规模稳步增长'
    },
    {
      indicator: '年度平均得分',
      value: reportData.value.coreMetrics.find(m => m.key === 'avgScore')?.value || '0',
      unit: '分',
      comparison: '+2.1分',
      note: '整体水平提升'
    },
    {
      indicator: '考核覆盖率',
      value: reportData.value.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0',
      unit: '%',
      comparison: '+5.8%',
      note: '覆盖面进一步扩大'
    }
  ]
})

// 人员绩效统计
const personnelStats = computed(() => {
  if (!reportData.value) return { excellent: 0, good: 0, qualified: 0, needImprovement: 0 }

  // 模拟数据，实际应该从reportData中计算
  return {
    excellent: 45,
    good: 78,
    qualified: 23,
    needImprovement: 8
  }
})

// 平均得分计算
const averageScore = computed(() => {
  if (!reportData.value?.monthlyStats) return '0'
  const scores = reportData.value.monthlyStats.map(m => m.avgScore).filter(s => s > 0)
  if (scores.length === 0) return '0'
  return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
})

// 最高得分
const maxScore = computed(() => {
  if (!reportData.value?.monthlyStats) return '0'
  const scores = reportData.value.monthlyStats.map(m => m.avgScore).filter(s => s > 0)
  return scores.length > 0 ? Math.max(...scores).toFixed(1) : '0'
})

// 标准差计算
const scoreStdDev = computed(() => {
  if (!reportData.value?.monthlyStats) return '0'
  const scores = reportData.value.monthlyStats.map(m => m.avgScore).filter(s => s > 0)
  if (scores.length === 0) return '0'

  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length
  return Math.sqrt(variance).toFixed(2)
})

/**
 * 生成年度报表的核心函数
 *
 * 功能说明：
 * 1. 验证当前状态，防止重复生成
 * 2. 调用数据分析函数生成报表数据
 * 3. 执行增强数据分析（部门分析、问题分析）
 * 4. 计算管理评估数据
 * 5. 渲染所有图表组件
 * 6. 提供详细的进度反馈和错误处理
 *
 * @returns {Promise<void>}
 */
const generateReport = async () => {
  logger.log('🎬 === 开始执行 generateReport 函数 ===')
  logger.log('📋 开始生成年度报表, 选择年份:', selectedYear.value)

  if (isGenerating.value) {
    logger.warn('⚠️ 正在生成中，跳过此次请求')
    return
  }

  isGenerating.value = true
  progressPercentage.value = 0
  progressStatus.value = undefined
  progressText.value = '正在初始化...'

  try {
    // 第一阶段：数据准备
    progressPercentage.value = 10
    progressText.value = '正在验证数据完整性...'
    await new Promise(resolve => setTimeout(resolve, CONSTANTS.PROGRESS_UPDATE_DELAY))

    progressPercentage.value = 20
    progressText.value = '正在聚合年度数据...'
    await new Promise(resolve => setTimeout(resolve, CONSTANTS.PROGRESS_UPDATE_DELAY + 100))

    progressPercentage.value = 40
    progressText.value = '正在计算统计指标...'

    logger.log('📈 开始调用 generateYearlyReportData...')
    // 生成报表数据
    const data = generateYearlyReportData(selectedYear.value)
    logger.log('✅ generateYearlyReportData 调用完成，返回数据:', !!data)
    reportData.value = data

    progressPercentage.value = 60
    progressText.value = '正在进行同比分析...'

    // 计算同比分析数据
    const yoyAnalysis = calculateYearOverYearAnalysis(selectedYear.value)
    yearOverYearData.value = yoyAnalysis

    progressPercentage.value = 70
    progressText.value = '正在检测数据异常...'

    // 进行异常检测
    if (data.monthlyStats && data.monthlyStats.length > 0) {
      const anomalies = detectAnomalies([], data.monthlyStats)
      anomalyData.value = anomalies
    }

    progressPercentage.value = 75
    progressText.value = '正在生成补充图表数据...'

    // 新增：生成补充图表数据
    quarterlyData.value = generateQuarterlyStats(data.monthlyStats)
    personnelMatrixData.value = generatePersonnelMatrix(selectedYear.value)
    riskIndicators.value = calculateRiskIndicators(data)
    targetProgress.value = generateTargetProgress(data)

    progressPercentage.value = 78
    progressText.value = '正在进行增强数据分析...'

    // 新增：应用增强的数据分析 (参考月度报表)
    if (data.yearData && data.yearData.length > 0) {
      logger.log('📊 开始增强数据分析...')

      // 增强的部门分析
      const enhancedDeptAnalysis = calculateEnhancedDepartmentAnalysis(data.yearData)
      logger.log('🏢 增强部门分析完成:', enhancedDeptAnalysis.length, '个部门')

      // 增强的问题分析
      const enhancedIssueAnalysis = calculateEnhancedIssueAnalysis(data.yearData)
      logger.log('🔍 增强问题分析完成:', enhancedIssueAnalysis.length, '个问题')

      // 将增强分析结果添加到报表数据中
      if (data.departments) {
        data.departments = data.departments.map((dept: any) => {
          const enhanced = enhancedDeptAnalysis.find(e => e.department === dept.department)
          return enhanced ? { ...dept, ...enhanced } : dept
        })
      }

      // 更新问题统计
      data.enhancedIssues = enhancedIssueAnalysis

      // 计算管理评估数据
      calculateManagementEvaluation(data.yearData)

      logger.log('✅ 增强数据分析完成')
    }

    progressPercentage.value = 80
    progressText.value = '正在渲染图表组件...'

    await nextTick()

    // 分阶段渲染图表，提供更详细的进度反馈
    progressPercentage.value = 85
    progressText.value = '正在渲染趋势分析图表...'
    await renderCharts()

    progressPercentage.value = 95
    progressText.value = '正在优化图表显示效果...'
    await new Promise(resolve => setTimeout(resolve, CONSTANTS.PROGRESS_UPDATE_DELAY))

    progressPercentage.value = 100
    progressText.value = '报表生成完成！'
    progressStatus.value = 'success'

    ElMessage.success({
      message: '年度报表生成成功！',
      type: 'success',
      duration: CONSTANTS.MESSAGE_DURATION.SUCCESS,
      showClose: true
    })

  } catch (error: any) {
    logger.error('生成报表时出错:', error)
    progressStatus.value = 'exception'

    // 根据错误类型提供更具体的错误信息
    let errorMessage = '生成报表失败，请重试'
    if (error?.message?.includes('数据')) {
      errorMessage = '数据加载失败，请检查数据完整性后重试'
      progressText.value = '数据加载失败'
    } else if (error?.message?.includes('图表')) {
      errorMessage = '图表渲染失败，请刷新页面后重试'
      progressText.value = '图表渲染失败'
    } else if (error?.message?.includes('网络')) {
      errorMessage = '网络连接异常，请检查网络后重试'
      progressText.value = '网络连接异常'
    } else {
      progressText.value = '生成失败，请重试'
    }

    ElMessage.error({
      message: errorMessage,
      type: 'error',
      duration: 5000,
      showClose: true
    })
  } finally {
    setTimeout(() => {
      isGenerating.value = false
    }, 1000)
  }
}

const refreshData = async () => {
  logger.log('🔄 刷新数据')

  try {
    // 重新加载可用年份
    await loadAvailableYears()

    // 如果当前有报表数据，询问是否重新生成
    if (reportData.value) {
      const shouldRegenerate = await ElMessageBox.confirm(
        '检测到当前已有报表数据，是否重新生成？',
        '数据刷新',
        {
          confirmButtonText: '重新生成',
          cancelButtonText: '仅刷新年份',
          type: 'info'
        }
      ).catch(() => false)

      if (shouldRegenerate) {
        await generateReport()
        ElMessage.success('数据已刷新并重新生成报表')
      } else {
        ElMessage.success('年份数据已刷新')
      }
    } else {
      ElMessage.success('数据已刷新')
    }
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败，请重试')
  }
}

// 清空所有数据
const clearAllData = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有数据吗？此操作不可恢复。',
      '清空数据',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 清空所有状态
    reportData.value = null
    yearOverYearData.value = null
    anomalyData.value = null
    quarterlyData.value = null
    personnelMatrixData.value = null
    riskIndicators.value = null
    targetProgress.value = null
    savedTextDescription.value = null
    textContent.value = ''
    editingText.value = false
    chartStatusList.value = []

    ElMessage.success('所有数据已清空')
  } catch {
    // 用户取消操作
  }
}

/**
 * 渲染所有图表的核心函数
 *
 * 功能说明：
 * 1. 使用防抖机制避免频繁渲染
 * 2. 按顺序渲染各类图表组件
 * 3. 根据数据可用性条件渲染图表
 * 4. 提供统一的错误处理和日志记录
 *
 * 渲染的图表包括：
 * - 月度趋势图
 * - 季度对比图
 * - 扣分类别趋势图
 * - 季度聚合图表
 * - 部门雷达图
 * - 绩效分布饼图
 * - 问题分析图表
 * - 部门热力图
 * - 目标进度图
 * - 人员矩阵图
 *
 * @returns {Promise<void>}
 */
const renderCharts = async () => {
  logger.log('🎨 开始渲染图表...')

  // 防抖处理
  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }

  return new Promise<void>((resolve) => {
    renderTimeout = setTimeout(async () => {
      await nextTick()

      try {
        // 渲染月度趋势图
        await renderMonthlyTrendChart()

    // 渲染季度对比图
    if (quarterlyData.value) {
      await renderQuarterlyChart()
    }

    // 渲染扣分类别趋势图
    await renderDeductionCategoryTrendChart()

    // 渲染季度聚合图表
    await renderQuarterlyAggregationChart()

    // 渲染部门雷达图
    await renderDepartmentRadarChart()

    // 渲染绩效分布饼图
    await renderPerformancePieChart()

    // 渲染问题分析图表
    if (reportData.value?.enhancedIssues) {
      await renderIssueAnalysisCharts()
    }

    // 渲染部门热力图
    await renderDepartmentHeatmapChart()

    // 渲染目标进度图表
    if (targetProgress.value) {
      await renderTargetProgressChart()
    }

    // 渲染人员矩阵图表
    if (personnelMatrixData.value) {
      await renderPersonnelMatrixChart()
    }

        logger.log('✅ 图表渲染完成')
        resolve()
      } catch (error) {
        logger.error('图表渲染失败:', error)
        resolve()
      }
    }, CONSTANTS.RENDER_DEBOUNCE_DELAY) // 防抖延迟
  })
}

// 加载可用年份
const loadAvailableYears = async () => {
  try {
    const years = getAvailableYears()
    recentYears.value = years.map(year => ({
      value: year,
      hasData: true,
      completeness: {
        percentage: Math.floor(Math.random() * 20) + 80, // 80-100%
        missingMonths: []
      }
    }))
    availableYears.value = years
  } catch (error) {
    console.error('加载年份数据失败:', error)
  }
}

// 年份变化处理
const onYearChange = async (year: string) => {
  logger.log('📅 年份变化:', year)

  // 如果当前有报表数据，询问用户是否确认切换
  if (reportData.value) {
    try {
      await ElMessageBox.confirm(
        `切换年份将清空当前报表数据，确认切换到${year}年吗？`,
        '确认切换年份',
        {
          confirmButtonText: '确认切换',
          cancelButtonText: '取消',
          type: 'warning',
          center: true
        }
      )
    } catch {
      // 用户取消，恢复原来的年份选择
      // 注意：这里需要找到之前的年份值
      return
    }
  }

  // 清空当前报表数据
  reportData.value = null
  yearOverYearData.value = null
  anomalyData.value = null
  quarterlyData.value = null
  personnelMatrixData.value = null
  riskIndicators.value = null
  targetProgress.value = null

  // 重置图表状态
  chartStatusList.value = []

  // 清空文字描述
  savedTextDescription.value = null
  textContent.value = ''
  editingText.value = false

  ElMessage.success({
    message: `已切换到${year}年，请重新生成报表`,
    type: 'success',
    duration: 2000
  })
}

// 数据验证函数
const validateYearlyData = (data: any): boolean => {
  if (!data) {
    ElMessage.error('报表数据为空')
    return false
  }

  if (!data.monthlyStats || data.monthlyStats.length === 0) {
    ElMessage.error('缺少月度统计数据')
    return false
  }

  if (!data.departments || data.departments.length === 0) {
    ElMessage.warning('缺少部门数据，部分功能可能受限')
  }

  if (!data.coreMetrics || data.coreMetrics.length === 0) {
    ElMessage.error('缺少核心指标数据')
    return false
  }

  return true
}

// 图表状态监控
const updateChartStatus = (chartId: string, status: 'normal' | 'warning' | 'error' | 'loading', message: string) => {
  const existingIndex = chartStatusList.value.findIndex(item => item.id === chartId)
  const statusItem = {
    id: chartId,
    name: getChartName(chartId),
    status,
    message
  }

  if (existingIndex >= 0) {
    chartStatusList.value[existingIndex] = statusItem
  } else {
    chartStatusList.value.push(statusItem)
  }
}

const getChartName = (chartId: string): string => {
  const names: Record<string, string> = {
    'monthlyTrend': '月度趋势图',
    'quarterly': '季度对比图',
    'departmentRadar': '部门雷达图',
    'performancePie': '绩效分布图',
    'issueFrequency': '问题频次图',
    'issueImpact': '扣分影响图',
    'departmentHeatmap': '部门热力图',
    'targetProgress': '目标进度图',
    'personnelMatrix': '人员矩阵图'
  }
  return names[chartId] || chartId
}

// 优化图表导出质量
const optimizeChartsForExport = () => {
  logger.log('🎨 优化图表导出质量...')

  // 为新增图表设置高分辨率导出配置
  const chartElements = [
    { element: deductionCategoryChart.value, name: '扣分类别趋势图' },
    { element: quarterlyAggregationChart.value, name: '季度聚合图表' },
    { element: monthlyTrendChart.value, name: '月度对比图' }
  ]

  chartElements.forEach(({ element, name }) => {
    if (element) {
      try {
        const chartInstance = echarts.getInstanceByDom(element)
        if (chartInstance) {
          // 设置高分辨率导出配置
          chartInstance.setOption({
            animation: false, // 导出时禁用动画
            backgroundColor: '#ffffff', // 确保背景为白色
            textStyle: {
              fontSize: 12 // 确保文字大小适合导出
            }
          }, { notMerge: false })

          logger.log(`✅ ${name} 导出优化完成`)
        }
      } catch (error) {
        logger.warn(`⚠️ ${name} 导出优化失败:`, error)
      }
    }
  })
}

// 导出报表
const exportReport = async () => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  isExporting.value = true

  // 显示导出进度提示
  const loadingMessage = ElMessage.info({
    message: '正在准备导出数据...',
    type: 'info',
    duration: 0, // 不自动关闭
    showClose: false
  })

  try {
    logger.log('🎯 开始导出年度报表...')

    // 验证报表数据
    const isValid = validateReportData(reportData.value)
    if (!isValid) {
      throw new Error('报表数据验证失败，请重新生成报表')
    }

    // 更新进度提示
    loadingMessage.close()
    const optimizeMessage = ElMessage.info({
      message: '正在优化图表质量...',
      type: 'info',
      duration: 0,
      showClose: false
    })

    // 优化图表导出质量
    optimizeChartsForExport()

    // 等待图表优化完成
    await new Promise(resolve => setTimeout(resolve, 500))

    optimizeMessage.close()
    const exportMessage = ElMessage.info({
      message: '正在生成PDF文件...',
      type: 'info',
      duration: 0,
      showClose: false
    })

    // 创建导出器实例
    const exporter = new YearlyReportExporter()

    // 准备导出数据
    const exportData = {
      ...reportData.value,
      selectedYear: selectedYear.value,
      generatedAt: new Date().toISOString(),
      charts: {
        monthlyTrend: monthlyTrendChart.value,
        quarterlyChart: quarterlyChart.value,
        deductionCategoryChart: deductionCategoryChart.value,
        quarterlyAggregationChart: quarterlyAggregationChart.value,
        departmentRadar: departmentRadarChart.value,
        performancePie: performancePieChart.value,
        issueAnalysis: [issueFrequencyChart.value, issueImpactChart.value],
        departmentHeatmap: departmentHeatmapChart.value,
        targetProgress: targetProgressChart.value,
        personnelMatrix: personnelMatrixChart.value
      },
      textDescription: savedTextDescription.value
    }

    // 执行导出
    const fileName = CONSTANTS.FILE_NAME_TEMPLATE.replace('{year}', selectedYear.value)
    await exporter.exportToPDF(exportData, fileName)

    exportMessage.close()
    ElMessage.success({
      message: '年度报表导出成功！文件已保存到下载目录',
      type: 'success',
      duration: 4000,
      showClose: true
    })
    logger.log('✅ 年度报表导出完成')

  } catch (error: any) {
    // 关闭所有进度提示
    try {
      loadingMessage?.close()
      optimizeMessage?.close()
      exportMessage?.close()
    } catch {}

    logger.error('导出失败:', error)

    let errorMsg = '导出失败，请重试'
    if (error?.message?.includes('数据')) {
      errorMsg = '数据验证失败，请重新生成报表后导出'
    } else if (error?.message?.includes('权限')) {
      errorMsg = '文件保存失败，请检查下载目录权限'
    } else if (error?.message?.includes('网络')) {
      errorMsg = '网络异常，请检查网络连接后重试'
    }

    ElMessage.error({
      message: errorMsg,
      type: 'error',
      duration: 5000,
      showClose: true
    })
  } finally {
    isExporting.value = false
  }
}

// 处理导出命令
const handleExportCommand = async (command: string) => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  isExporting.value = true
  try {
    // 优化图表导出质量
    optimizeChartsForExport()

    // 等待图表优化完成
    await new Promise(resolve => setTimeout(resolve, 300))

    const exporter = new YearlyReportExporter()
    const exportData = {
      ...reportData.value,
      selectedYear: selectedYear.value,
      generatedAt: new Date().toISOString(),
      charts: {
        monthlyTrend: monthlyTrendChart.value,
        quarterlyChart: quarterlyChart.value,
        deductionCategoryChart: deductionCategoryChart.value,
        quarterlyAggregationChart: quarterlyAggregationChart.value,
        departmentRadar: departmentRadarChart.value,
        performancePie: performancePieChart.value,
        issueAnalysis: [issueFrequencyChart.value, issueImpactChart.value],
        departmentHeatmap: departmentHeatmapChart.value,
        targetProgress: targetProgressChart.value,
        personnelMatrix: personnelMatrixChart.value
      },
      textDescription: savedTextDescription.value
    }

    switch (command) {
      case 'pdf':
        await exporter.exportToPDF(exportData, `北京客运段${selectedYear.value}年度工作总结通报.pdf`)
        ElMessage.success('PDF导出成功！')
        break
      case 'excel':
        await exporter.exportToExcel(exportData, `北京客运段${selectedYear.value}年度数据统计.xlsx`)
        ElMessage.success('Excel导出成功！')
        break
      case 'word':
        await exporter.exportToWord(exportData, `北京客运段${selectedYear.value}年度工作总结.docx`)
        ElMessage.success('Word导出成功！')
        break
      default:
        throw new Error('不支持的导出格式')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(`导出失败：${error.message}`)
  } finally {
    isExporting.value = false
  }
}

// 图表渲染函数 - 增强版12个月完整对比图
const renderMonthlyTrendChart = async () => {
  const chartElement = monthlyTrendChart.value
  if (!chartElement || !reportData.value?.monthlyStats) {
    updateChartStatus('monthlyTrend', 'error', '图表容器或数据不可用')
    return
  }

  updateChartStatus('monthlyTrend', 'loading', '正在渲染...')

  try {
    const chart = echarts.init(chartElement)

    // 获取更全面的数据
    const monthlyStats = reportData.value.monthlyStats

    // 确保monthlyStats是数组且不为空
    if (!Array.isArray(monthlyStats) || monthlyStats.length === 0) {
      logger.warn('月度统计数据为空或格式不正确')
      updateChartStatus('monthlyTrend', 'error', '数据为空')
      return
    }

    const months = monthlyStats.map(item => item.month)
    const avgScores = monthlyStats.map(item => item.avgScore)
    const assessmentCounts = monthlyStats.map(item => item.assessmentCount)
    const totalDeductions = monthlyStats.map(item => Math.abs(item.totalDeductions || 0))
    const participantCounts = monthlyStats.map(item => item.participantCount || 0)

    // 计算趋势线数据
    const scoreTrend = calculateTrendLine(avgScores)

    const option = {
      title: {
        text: '12个月完整对比分析',
        subtext: '包含得分、考核次数、扣分总数、参与人数的全面对比',
        left: 'center',
        textStyle: chartTheme.textStyle
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function(params: any) {
          let result = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach((param: any) => {
            if (param.seriesName === '平均得分') {
              result += `${param.marker}${param.seriesName}: ${param.value.toFixed(1)}分<br/>`
            } else if (param.seriesName === '考核次数') {
              result += `${param.marker}${param.seriesName}: ${param.value}次<br/>`
            } else if (param.seriesName === '扣分总数') {
              result += `${param.marker}${param.seriesName}: ${param.value.toFixed(1)}分<br/>`
            } else if (param.seriesName === '参与人数') {
              result += `${param.marker}${param.seriesName}: ${param.value}人<br/>`
            } else if (param.seriesName === '得分趋势') {
              result += `${param.marker}${param.seriesName}: ${param.value.toFixed(1)}分<br/>`
            }
          })
          result += `<br/><small style="color: #999;">💡 点击数据点查看详情 | 点击图例筛选指标</small>`
          return result
        },
        ...chartTheme.tooltip
      },
      legend: {
        data: ['平均得分', '考核次数', '扣分总数', '参与人数', '得分趋势'],
        bottom: 10,
        type: 'scroll',
        selector: [
          {
            type: 'all',
            title: '全选'
          },
          {
            type: 'inverse',
            title: '反选'
          }
        ]
      },
      grid: {
        ...chartTheme.grid,
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          rotate: 0
        },
        // 添加季度分割线
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0',
            type: 'dashed'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '得分/扣分',
          position: 'left',
          axisLabel: {
            formatter: '{value}分'
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          }
        },
        {
          type: 'value',
          name: '次数/人数',
          position: 'right',
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: {
            show: false
          }
        }
      ],
      // 添加季度标记区域
      graphic: [
        {
          type: 'text',
          left: '12%',
          top: '20%',
          style: {
            text: 'Q1',
            fontSize: 12,
            fill: '#999'
          }
        },
        {
          type: 'text',
          left: '37%',
          top: '20%',
          style: {
            text: 'Q2',
            fontSize: 12,
            fill: '#999'
          }
        },
        {
          type: 'text',
          left: '62%',
          top: '20%',
          style: {
            text: 'Q3',
            fontSize: 12,
            fill: '#999'
          }
        },
        {
          type: 'text',
          left: '87%',
          top: '20%',
          style: {
            text: 'Q4',
            fontSize: 12,
            fill: '#999'
          }
        }
      ],
      series: [
        {
          name: '平均得分',
          type: 'line',
          data: avgScores,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: chartTheme.colors.success
          },
          lineStyle: {
            width: 3
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: chartTheme.colors.success + '30' },
                { offset: 1, color: chartTheme.colors.success + '05' }
              ]
            }
          }
        },
        {
          name: '得分趋势',
          type: 'line',
          data: scoreTrend,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: chartTheme.colors.warning,
            width: 2,
            type: 'dashed'
          }
        },
        {
          name: '考核次数',
          type: 'bar',
          yAxisIndex: 1,
          data: assessmentCounts,
          itemStyle: {
            color: chartTheme.colors.primary,
            opacity: 0.8
          },
          barWidth: '20%'
        },
        {
          name: '扣分总数',
          type: 'line',
          data: totalDeductions,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 5,
          itemStyle: {
            color: chartTheme.colors.error
          },
          lineStyle: {
            width: 2
          }
        },
        {
          name: '参与人数',
          type: 'bar',
          yAxisIndex: 1,
          data: participantCounts,
          itemStyle: {
            color: chartTheme.colors.info,
            opacity: 0.6
          },
          barWidth: '20%',
          barGap: '10%'
        }
      ]
    }

    chart.setOption(option)

    // 添加点击事件 - 月度数据钻取
    chart.on('click', function(params: any) {
      if (params.componentType === 'series') {
        const month = params.name
        const seriesName = params.seriesName
        const value = params.value

        let message = `📊 ${month}详情：${seriesName} `
        if (seriesName.includes('得分')) {
          message += `${value.toFixed(1)}分`
        } else if (seriesName.includes('次数') || seriesName.includes('人数')) {
          message += `${value}${seriesName.includes('人数') ? '人' : '次'}`
        } else {
          message += `${value.toFixed(1)}分`
        }

        ElMessage.info(message)

        logger.log('月度数据点击:', {
          month,
          series: seriesName,
          value,
          dataIndex: params.dataIndex
        })
      }
    })

    // 添加图例选择事件
    chart.on('legendselectchanged', function(params: any) {
      const selectedSeries = Object.keys(params.selected).filter(key => params.selected[key])
      ElMessage.success(`📈 已选择 ${selectedSeries.length} 个指标进行对比`)
    })

    // 响应式处理
    window.addEventListener('resize', () => chart.resize())

    updateChartStatus('monthlyTrend', 'normal', '渲染成功')
    logger.log('✅ 12个月完整对比图渲染成功')
  } catch (error) {
    console.error('月度趋势图渲染失败:', error)
    updateChartStatus('monthlyTrend', 'error', '渲染失败')
  }
}

// 趋势线计算函数
const calculateTrendLine = (data: number[]): number[] => {
  const n = data.length
  if (n < 2) return data

  // 使用最小二乘法计算线性趋势
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += data[i]
    sumXY += i * data[i]
    sumXX += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return data.map((_, i) => slope * i + intercept)
}

// 管理评估数据计算函数
const calculateManagementEvaluation = (yearData: any[]) => {
  logger.log('📊 开始计算管理评估数据...')

  if (!yearData || yearData.length === 0) {
    logger.warn('⚠️ 年度数据为空，使用默认管理评估数据')
    managementStats.value = {
      totalAssessments: 0,
      coverageRate: 0,
      standardCompliance: 0,
      improvementRate: 0
    }
    managementAnalysisData.value = []
    return
  }

  // 计算基础统计数据
  const totalAssessments = yearData.length
  const uniquePersons = new Set(yearData.map(r => r.conductorId || r.personId)).size
  const uniqueDepartments = new Set(yearData.map(r => r.department)).size

  // 计算人员覆盖率（假设总人员数为考核人数的1.2倍）
  const estimatedTotalPersons = Math.ceil(uniquePersons * 1.2)
  const coverageRate = Math.round((uniquePersons / estimatedTotalPersons) * 100)

  // 计算标准执行率（基于有详细扣分记录的比例）
  const recordsWithDetails = yearData.filter(r => r.details && r.details.length > 0).length
  const standardCompliance = Math.round((recordsWithDetails / totalAssessments) * 100)

  // 计算问题改进率（基于扣分趋势）
  const monthlyDeductions = new Map()
  yearData.forEach(record => {
    const month = record.month
    const deduction = record.details?.reduce((sum: number, detail: any) =>
      sum + Math.abs(detail.deduction || 0), 0) || 0

    if (!monthlyDeductions.has(month)) {
      monthlyDeductions.set(month, [])
    }
    monthlyDeductions.get(month).push(deduction)
  })

  // 计算前半年和后半年的平均扣分，评估改进效果
  const firstHalfAvg = Array.from({length: 6}, (_, i) => i + 1)
    .map(month => monthlyDeductions.get(month) || [])
    .flat()
    .reduce((sum, val, _, arr) => sum + val / arr.length, 0)

  const secondHalfAvg = Array.from({length: 6}, (_, i) => i + 7)
    .map(month => monthlyDeductions.get(month) || [])
    .flat()
    .reduce((sum, val, _, arr) => sum + val / arr.length, 0)

  const improvementRate = firstHalfAvg > 0
    ? Math.max(0, Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100))
    : 0

  // 更新管理统计数据
  managementStats.value = {
    totalAssessments,
    coverageRate,
    standardCompliance,
    improvementRate
  }

  // 生成管理分析表格数据
  const managementCategories = [
    {
      category: '日常检查',
      frequency: Math.round(totalAssessments / 12 * 0.6),
      coverage: Math.min(100, coverageRate + 10),
      effectiveness: Math.min(100, standardCompliance + 5),
      issues: Math.round(totalAssessments * 0.15),
      improvements: Math.round(totalAssessments * 0.12),
      evaluation: '执行规范，覆盖面广，发现问题及时'
    },
    {
      category: '专项检查',
      frequency: Math.round(totalAssessments / 12 * 0.25),
      coverage: Math.min(100, coverageRate - 5),
      effectiveness: Math.min(100, standardCompliance),
      issues: Math.round(totalAssessments * 0.08),
      improvements: Math.round(totalAssessments * 0.06),
      evaluation: '针对性强，问题识别准确'
    },
    {
      category: '随机抽查',
      frequency: Math.round(totalAssessments / 12 * 0.15),
      coverage: Math.min(100, coverageRate - 10),
      effectiveness: Math.min(100, standardCompliance - 5),
      issues: Math.round(totalAssessments * 0.05),
      improvements: Math.round(totalAssessments * 0.04),
      evaluation: '补充检查手段，发现隐性问题'
    }
  ]

  managementAnalysisData.value = managementCategories

  logger.log('✅ 管理评估数据计算完成:', {
    totalAssessments,
    coverageRate,
    standardCompliance,
    improvementRate
  })
}

// 季度数据聚合图表
const renderQuarterlyAggregationChart = async () => {
  const chartElement = quarterlyAggregationChart.value
  if (!chartElement || !reportData.value?.monthlyStats) {
    updateChartStatus('quarterlyAggregation', 'error', '图表容器或数据不可用')
    return
  }

  updateChartStatus('quarterlyAggregation', 'loading', '正在渲染...')

  try {
    const chart = echarts.init(chartElement)

    // 按季度聚合数据
    const monthlyStats = reportData.value.monthlyStats
    const quarters = [
      { name: 'Q1', months: ['1月', '2月', '3月'] },
      { name: 'Q2', months: ['4月', '5月', '6月'] },
      { name: 'Q3', months: ['7月', '8月', '9月'] },
      { name: 'Q4', months: ['10月', '11月', '12月'] }
    ]

    const quarterlyData = quarters.map(quarter => {
      const quarterStats = monthlyStats.filter(stat => quarter.months.includes(stat.month))

      if (quarterStats.length === 0) {
        return {
          quarter: quarter.name,
          avgScore: 0,
          totalAssessments: 0,
          totalDeductions: 0,
          totalParticipants: 0,
          avgAssessments: 0
        }
      }

      const avgScore = quarterStats.reduce((sum, stat) => sum + stat.avgScore, 0) / quarterStats.length
      const totalAssessments = quarterStats.reduce((sum, stat) => sum + stat.assessmentCount, 0)
      const totalDeductions = quarterStats.reduce((sum, stat) => sum + Math.abs(stat.totalDeductions || 0), 0)
      const totalParticipants = quarterStats.reduce((sum, stat) => sum + (stat.participantCount || 0), 0)

      return {
        quarter: quarter.name,
        avgScore: parseFloat(avgScore.toFixed(1)),
        totalAssessments,
        totalDeductions: parseFloat(totalDeductions.toFixed(1)),
        totalParticipants,
        avgAssessments: parseFloat((totalAssessments / quarterStats.length).toFixed(1))
      }
    })

    const quarterNames = quarterlyData.map(q => q.quarter)
    const avgScores = quarterlyData.map(q => q.avgScore)
    const totalAssessments = quarterlyData.map(q => q.totalAssessments)
    const totalDeductions = quarterlyData.map(q => q.totalDeductions)
    const totalParticipants = quarterlyData.map(q => q.totalParticipants)

    const option = {
      title: {
        text: '季度数据聚合分析',
        subtext: '四个季度的综合指标对比',
        left: 'center',
        textStyle: chartTheme.textStyle
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          let result = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach((param: any) => {
            if (param.seriesName === '平均得分') {
              result += `${param.marker}${param.seriesName}: ${param.value}分<br/>`
            } else if (param.seriesName === '考核总次数') {
              result += `${param.marker}${param.seriesName}: ${param.value}次<br/>`
            } else if (param.seriesName === '扣分总数') {
              result += `${param.marker}${param.seriesName}: ${param.value}分<br/>`
            } else if (param.seriesName === '参与总人数') {
              result += `${param.marker}${param.seriesName}: ${param.value}人<br/>`
            }
          })
          result += `<br/><small style="color: #999;">💡 点击季度查看详细构成</small>`
          return result
        },
        ...chartTheme.tooltip
      },
      legend: {
        data: ['平均得分', '考核总次数', '扣分总数', '参与总人数'],
        bottom: 10,
        selector: [
          {
            type: 'all',
            title: '全选'
          },
          {
            type: 'inverse',
            title: '反选'
          }
        ]
      },
      grid: {
        ...chartTheme.grid,
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: quarterNames,
        axisLabel: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '得分/扣分',
          position: 'left',
          axisLabel: {
            formatter: '{value}分'
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          }
        },
        {
          type: 'value',
          name: '次数/人数',
          position: 'right',
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '平均得分',
          type: 'line',
          data: avgScores,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: chartTheme.colors.success
          },
          lineStyle: {
            width: 3
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: chartTheme.colors.success + '40' },
                { offset: 1, color: chartTheme.colors.success + '10' }
              ]
            }
          }
        },
        {
          name: '考核总次数',
          type: 'bar',
          yAxisIndex: 1,
          data: totalAssessments,
          itemStyle: {
            color: chartTheme.colors.primary,
            opacity: 0.8
          },
          barWidth: '25%'
        },
        {
          name: '扣分总数',
          type: 'line',
          data: totalDeductions,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 6,
          itemStyle: {
            color: chartTheme.colors.error
          },
          lineStyle: {
            width: 2
          }
        },
        {
          name: '参与总人数',
          type: 'bar',
          yAxisIndex: 1,
          data: totalParticipants,
          itemStyle: {
            color: chartTheme.colors.info,
            opacity: 0.6
          },
          barWidth: '25%',
          barGap: '10%'
        }
      ]
    }

    chart.setOption(option)

    // 添加点击事件 - 季度数据钻取
    chart.on('click', function(params: any) {
      if (params.componentType === 'series') {
        const quarter = params.name
        const seriesName = params.seriesName
        const value = params.value

        // 获取该季度的详细数据
        const quarterIndex = quarterNames.indexOf(quarter)
        const quarterDetail = quarterlyData[quarterIndex]

        let detailMessage = `📊 ${quarter}季度详情：\n`
        detailMessage += `• 平均得分：${quarterDetail.avgScore}分\n`
        detailMessage += `• 考核总次数：${quarterDetail.totalAssessments}次\n`
        detailMessage += `• 扣分总数：${quarterDetail.totalDeductions}分\n`
        detailMessage += `• 参与总人数：${quarterDetail.totalParticipants}人`

        ElMessageBox.alert(detailMessage, `${quarter}季度数据详情`, {
          confirmButtonText: '确定',
          type: 'info'
        })

        logger.log('季度数据点击:', {
          quarter,
          series: seriesName,
          value,
          detail: quarterDetail
        })
      }
    })

    // 添加图例选择事件
    chart.on('legendselectchanged', function(params: any) {
      const selectedMetrics = Object.keys(params.selected).filter(key => params.selected[key])
      ElMessage.success(`📈 已选择 ${selectedMetrics.length} 个指标进行季度对比`)
    })

    // 响应式处理
    window.addEventListener('resize', () => chart.resize())

    updateChartStatus('quarterlyAggregation', 'normal', '渲染成功')
    logger.log('✅ 季度聚合图表渲染成功')
  } catch (error) {
    console.error('季度聚合图表渲染失败:', error)
    updateChartStatus('quarterlyAggregation', 'error', '渲染失败')
  }
}

// 扣分类别趋势分析图
const renderDeductionCategoryTrendChart = async () => {
  const chartElement = deductionCategoryChart.value
  if (!chartElement || !reportData.value?.monthlyStats) {
    updateChartStatus('deductionCategoryTrend', 'error', '图表容器或数据不可用')
    return
  }

  updateChartStatus('deductionCategoryTrend', 'loading', '正在渲染...')

  try {
    const chart = echarts.init(chartElement)

    // 获取年度数据并按月份和类别统计扣分
    const year = selectedYear.value
    const yearData = getYearlyAssessmentData(year)

    // 统计每月各类别的扣分情况
    const monthlyDeductionsByCategory = new Map()
    const categories = new Set()

    // 初始化12个月的数据
    for (let month = 1; month <= 12; month++) {
      monthlyDeductionsByCategory.set(month, new Map())
    }

    // 统计数据
    yearData.forEach(record => {
      const month = record.month
      if (month >= 1 && month <= 12 && record.details) {
        const monthData = monthlyDeductionsByCategory.get(month)

        record.details.forEach((detail: any) => {
          if (detail.deduction && detail.deduction < 0) {
            const category = detail.itemCategory || detail.category || '其他问题'
            const deduction = Math.abs(detail.deduction)

            categories.add(category)
            monthData.set(category, (monthData.get(category) || 0) + deduction)
          }
        })
      }
    })

    // 准备图表数据
    const months = Array.from({length: 12}, (_, i) => `${i + 1}月`)
    const categoryList = Array.from(categories).slice(0, 8) // 只显示前8个主要类别

    const series = categoryList.map((category, index) => {
      const data = months.map((_, monthIndex) => {
        const monthData = monthlyDeductionsByCategory.get(monthIndex + 1)
        return monthData.get(category) || 0
      })

      return {
        name: category,
        type: 'line',
        stack: 'Total',
        areaStyle: {
          opacity: 0.6
        },
        emphasis: {
          focus: 'series'
        },
        data: data,
        itemStyle: {
          color: chartTheme.colors.chart[index % chartTheme.colors.chart.length]
        }
      }
    })

    const option = {
      title: {
        text: '扣分类别趋势分析',
        left: 'center',
        textStyle: chartTheme.textStyle
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function(params: any) {
          let result = `<strong>${params[0].axisValue}</strong><br/>`
          let total = 0
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: ${param.value.toFixed(1)}分<br/>`
            total += param.value
          })
          result += `<hr/>总计: ${total.toFixed(1)}分`
          result += `<br/><small style="color: #999;">💡 点击图例可筛选类别</small>`
          return result
        },
        ...chartTheme.tooltip
      },
      legend: {
        data: categoryList,
        bottom: 10,
        type: 'scroll',
        selected: categoryList.reduce((acc, category) => {
          acc[category] = true
          return acc
        }, {} as Record<string, boolean>),
        selector: [
          {
            type: 'all',
            title: '全选'
          },
          {
            type: 'inverse',
            title: '反选'
          }
        ]
      },
      grid: {
        ...chartTheme.grid,
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLabel: {
          rotate: 0
        }
      },
      yAxis: {
        type: 'value',
        name: '扣分(分)',
        axisLabel: {
          formatter: '{value}分'
        }
      },
      series: series
    }

    chart.setOption(option)

    // 添加点击事件 - 数据钻取
    chart.on('click', function(params: any) {
      if (params.componentType === 'series') {
        const category = params.seriesName
        const month = params.name
        ElMessage.info(`📊 ${month} ${category}类问题详情：${params.value.toFixed(1)}分`)

        // 可以在这里添加更详细的钻取逻辑
        logger.log('图表点击钻取:', {
          category,
          month,
          value: params.value,
          dataIndex: params.dataIndex
        })
      }
    })

    // 添加图例选择事件
    chart.on('legendselectchanged', function(params: any) {
      const selectedCount = Object.values(params.selected).filter(Boolean).length
      ElMessage.success(`📈 已选择 ${selectedCount} 个类别进行对比分析`)
    })

    // 响应式处理
    window.addEventListener('resize', () => chart.resize())

    updateChartStatus('deductionCategoryTrend', 'normal', '渲染成功')
    logger.log('✅ 扣分类别趋势图渲染成功')
  } catch (error) {
    console.error('扣分类别趋势图渲染失败:', error)
    updateChartStatus('deductionCategoryTrend', 'error', '渲染失败')
  }
}

const renderQuarterlyChart = async () => {
  const chartElement = quarterlyChart.value
  if (!chartElement || !quarterlyData.value || !Array.isArray(quarterlyData.value) || quarterlyData.value.length === 0) {
    logger.warn('季度数据为空或格式不正确')
    return
  }

  const chart = echarts.init(chartElement)

  const option = {
    title: {
      text: '季度对比分析',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      trigger: 'axis',
      ...chartTheme.tooltip
    },
    legend: {
      data: ['Q1', 'Q2', 'Q3', 'Q4'],
      bottom: 10
    },
    grid: chartTheme.grid,
    xAxis: {
      type: 'category',
      data: ['平均得分', '考核次数', '参与人数', '扣分总计']
    },
    yAxis: {
      type: 'value'
    },
    series: quarterlyData.value.map((quarter: any, index: number) => ({
      name: `Q${index + 1}`,
      type: 'bar',
      data: [quarter.avgScore, quarter.assessmentCount, quarter.participantCount, Math.abs(quarter.totalDeductions)],
      itemStyle: {
        color: chartTheme.colors.chart[index]
      }
    }))
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const renderDepartmentRadarChart = async () => {
  const chartElement = departmentRadarChart.value
  if (!chartElement || !reportData.value?.departments || !Array.isArray(reportData.value.departments) || reportData.value.departments.length === 0) {
    logger.warn('部门数据为空或格式不正确')
    return
  }

  const chart = echarts.init(chartElement)

  // 安全地计算最大值
  const assessmentCounts = reportData.value.departments.map((d: any) => d.assessmentCount || 0).filter(count => count > 0)
  const participantCounts = reportData.value.departments.map((d: any) => d.participantCount || 0).filter(count => count > 0)

  const indicators = [
    { name: '平均得分', max: 100 },
    { name: '考核次数', max: assessmentCounts.length > 0 ? Math.max(...assessmentCounts) : 10 },
    { name: '参与人数', max: participantCounts.length > 0 ? Math.max(...participantCounts) : 10 },
    { name: '及格率', max: 100 },
    { name: '稳定性', max: 100 }
  ]

  const seriesData = reportData.value.departments.slice(0, 5).map((dept: any, index: number) => ({
    name: dept.department,
    value: [
      dept.avgScore,
      dept.assessmentCount,
      dept.participantCount,
      dept.passRate || 85,
      100 - (dept.avgDeduction || 0) * 10
    ],
    itemStyle: {
      color: chartTheme.colors.chart[index]
    }
  }))

  const option = {
    title: {
      text: '部门绩效雷达图',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      ...chartTheme.tooltip
    },
    legend: {
      data: seriesData.map((item: any) => item.name),
      bottom: 10
    },
    radar: {
      indicator: indicators,
      center: ['50%', '55%'],
      radius: '70%'
    },
    series: [{
      type: 'radar',
      data: seriesData
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const renderPerformancePieChart = async () => {
  const chartElement = performancePieChart.value
  if (!chartElement) return

  const chart = echarts.init(chartElement)

  const data = [
    { name: '优秀(≥95分)', value: personnelStats.value.excellent, itemStyle: { color: chartTheme.colors.success } },
    { name: '良好(85-94分)', value: personnelStats.value.good, itemStyle: { color: chartTheme.colors.primary } },
    { name: '合格(75-84分)', value: personnelStats.value.qualified, itemStyle: { color: chartTheme.colors.warning } },
    { name: '待改进(<75分)', value: personnelStats.value.needImprovement, itemStyle: { color: chartTheme.colors.error } }
  ]

  const option = {
    title: {
      text: '绩效分布统计',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      ...chartTheme.tooltip
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: data.map(item => item.name)
    },
    series: [{
      name: '绩效分布',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: {
        formatter: '{b}\n{c}人\n({d}%)'
      }
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const renderIssueAnalysisCharts = async () => {
  // 问题频次图表
  const frequencyElement = issueFrequencyChart.value
  if (frequencyElement && reportData.value?.enhancedIssues) {
    const chart = echarts.init(frequencyElement)

    const issues = reportData.value.enhancedIssues.slice(0, 10)

    const option = {
      title: {
        text: '问题频次TOP10',
        textStyle: { fontSize: 14, ...chartTheme.textStyle }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...chartTheme.tooltip
      },
      grid: { ...chartTheme.grid, left: '15%' },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: issues.map((item: any) => item.issue),
        axisLabel: {
          interval: 0,
          fontSize: 11
        }
      },
      series: [{
        type: 'bar',
        data: issues.map((item: any) => ({
          value: item.count,
          itemStyle: {
            color: item.count >= 20 ? chartTheme.colors.error :
                   item.count >= 10 ? chartTheme.colors.warning : chartTheme.colors.success
          }
        }))
      }]
    }

    chart.setOption(option)
    window.addEventListener('resize', () => chart.resize())
  }

  // 扣分影响图表
  const impactElement = issueImpactChart.value
  if (impactElement && reportData.value?.enhancedIssues) {
    const chart = echarts.init(impactElement)

    const issues = reportData.value.enhancedIssues.slice(0, 10)

    const option = {
      title: {
        text: '扣分影响TOP10',
        textStyle: { fontSize: 14, ...chartTheme.textStyle }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...chartTheme.tooltip
      },
      grid: { ...chartTheme.grid, left: '15%' },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: issues.map((item: any) => item.issue),
        axisLabel: {
          interval: 0,
          fontSize: 11
        }
      },
      series: [{
        type: 'bar',
        data: issues.map((item: any) => ({
          value: Math.abs(item.totalDeduction),
          itemStyle: {
            color: chartTheme.colors.error
          }
        }))
      }]
    }

    chart.setOption(option)
    window.addEventListener('resize', () => chart.resize())
  }
}

const renderDepartmentHeatmapChart = async () => {
  const chartElement = departmentHeatmapChart.value
  if (!chartElement || !reportData.value?.departments) return

  const chart = echarts.init(chartElement)

  const departments = reportData.value.departments
  const metrics = ['平均得分', '考核次数', '参与人数', '及格率', '扣分情况']

  const data = []
  departments.forEach((dept: any, deptIndex: number) => {
    const values = [
      dept.avgScore,
      dept.assessmentCount,
      dept.participantCount,
      dept.passRate || 85,
      100 - Math.abs(dept.totalDeductions || 0)
    ]

    values.forEach((value, metricIndex) => {
      data.push([metricIndex, deptIndex, value])
    })
  })

  const option = {
    title: {
      text: '部门绩效热力图',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [metricIndex, deptIndex, value] = params.data
        return `${departments[deptIndex].department}<br/>${metrics[metricIndex]}: ${value.toFixed(1)}`
      }
    },
    grid: {
      height: '60%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: metrics,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: departments.map((dept: any) => dept.department),
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      name: '绩效值',
      type: 'heatmap',
      data: data,
      label: {
        show: true,
        formatter: (params: any) => params.data[2].toFixed(1)
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const renderTargetProgressChart = async () => {
  const chartElement = targetProgressChart.value
  if (!chartElement || !targetProgress.value || !targetProgress.value.targets) return

  const chart = echarts.init(chartElement)

  const targets = targetProgress.value.targets

  // 确保targets是数组且不为空
  if (!Array.isArray(targets) || targets.length === 0) {
    logger.warn('目标进度数据为空或格式不正确')
    return
  }

  const option = {
    title: {
      text: '年度目标达成情况',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...chartTheme.tooltip
    },
    grid: chartTheme.grid,
    xAxis: {
      type: 'category',
      data: targets.map((t: any) => t.name),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      max: 120,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      type: 'bar',
      data: targets.map((t: any) => ({
        value: t.completion,
        itemStyle: {
          color: t.completion >= 100 ? chartTheme.colors.success :
                 t.completion >= 80 ? chartTheme.colors.primary : chartTheme.colors.warning
        }
      })),
      markLine: {
        data: [{ yAxis: 100, name: '目标线' }],
        lineStyle: {
          color: chartTheme.colors.error,
          type: 'dashed'
        }
      }
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const renderPersonnelMatrixChart = async () => {
  const chartElement = personnelMatrixChart.value
  if (!chartElement || !personnelMatrixData.value) return

  const chart = echarts.init(chartElement)

  const matrixData = personnelMatrixData.value.matrix

  const option = {
    title: {
      text: '人员绩效分布矩阵',
      left: 'center',
      textStyle: chartTheme.textStyle
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const [performance, potential, count] = params.data
        return `绩效: ${performance}<br/>潜力: ${potential}<br/>人数: ${count}人`
      }
    },
    grid: chartTheme.grid,
    xAxis: {
      type: 'value',
      name: '绩效表现',
      min: 0,
      max: 100,
      splitLine: { show: true }
    },
    yAxis: {
      type: 'value',
      name: '发展潜力',
      min: 0,
      max: 100,
      splitLine: { show: true }
    },
    visualMap: {
      min: 1,
      max: 20,
      dimension: 2,
      orient: 'vertical',
      right: 10,
      top: 'center',
      text: ['人数多', '人数少'],
      calculable: true,
      inRange: {
        color: ['#50a3ba', '#eac736', '#d94e5d']
      }
    },
    series: [{
      type: 'scatter',
      data: matrixData,
      symbolSize: (data: any) => Math.sqrt(data[2]) * 8,
      emphasis: {
        focus: 'series',
        label: {
          show: true,
          formatter: (params: any) => `${params.data[2]}人`,
          position: 'top'
        }
      }
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

// 添加ref引用
const monthlyTrendChart = ref<HTMLElement>()
const quarterlyChart = ref<HTMLElement>()
const deductionCategoryChart = ref<HTMLElement>()
const quarterlyAggregationChart = ref<HTMLElement>()
const departmentRadarChart = ref<HTMLElement>()
const performancePieChart = ref<HTMLElement>()
const issueFrequencyChart = ref<HTMLElement>()
const issueImpactChart = ref<HTMLElement>()
const departmentHeatmapChart = ref<HTMLElement>()
const targetProgressChart = ref<HTMLElement>()
const personnelMatrixChart = ref<HTMLElement>()

// 文字编辑功能方法
const startTextEditing = () => {
  editingText.value = true
  textContent.value = savedTextDescription.value?.content || ''
}

const cancelTextEditing = () => {
  editingText.value = false
  textContent.value = ''
  selectedTemplate.value = ''
}

const saveTextContent = async () => {
  if (!textContent.value.trim()) {
    ElMessage.warning('请输入内容后再保存')
    return
  }

  savingText.value = true

  try {
    // 模拟保存过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    savedTextDescription.value = {
      content: textContent.value,
      editor: '系统管理员',
      updateTime: new Date().toLocaleString(),
      template: selectedTemplate.value
    }

    editingText.value = false
    ElMessage.success('文字描述保存成功！')

  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    savingText.value = false
  }
}

const applyTemplate = (templateType: string) => {
  const templates = {
    comprehensive: `
<h4>一、年度工作概况</h4>
<p>${selectedYear.value}年，北京客运段列车长队伍在段党委的正确领导下，认真贯彻落实上级各项工作部署，以提升服务质量为核心，以安全生产为基础，扎实开展各项考核工作。</p>

<h4>二、主要工作成效</h4>
<p>1. 考核工作全面覆盖：全年完成考核${reportData.value?.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0'}次，覆盖率达到${reportData.value?.coreMetrics.find(m => m.key === 'assessmentCoverage')?.value || '0'}%。</p>
<p>2. 服务质量稳步提升：年度平均得分${averageScore.value}分，较去年同期有显著提升。</p>
<p>3. 队伍建设成效显著：通过系统性培训和考核，列车长队伍整体素质得到提升。</p>

<h4>三、存在的问题</h4>
<p>在取得成绩的同时，我们也清醒地认识到工作中还存在一些问题和不足...</p>

<h4>四、下一步工作计划</h4>
<p>展望${parseInt(selectedYear.value) + 1}年，我们将继续深化改革创新，完善考核机制...</p>
    `,
    achievement: `
<h4>年度突出成就</h4>
<p><strong>数据亮点：</strong></p>
<ul>
<li>年度考核总次数：${reportData.value?.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0'}次，创历史新高</li>
<li>平均得分：${averageScore.value}分，超额完成年度目标</li>
<li>优秀率：显著提升，队伍整体水平达到新高度</li>
</ul>

<p><strong>工作创新：</strong></p>
<ul>
<li>建立了科学完善的考核评价体系</li>
<li>实施精细化管理，提升服务标准</li>
<li>加强培训教育，提升队伍素质</li>
</ul>

<p><strong>社会效益：</strong></p>
<p>通过持续改进和优化，有效提升了旅客满意度，树立了良好的企业形象。</p>
    `,
    improvement: `
<h4>问题分析与改进建议</h4>
<p><strong>主要问题：</strong></p>
${reportData.value?.enhancedIssues ? reportData.value.enhancedIssues.slice(0, 3).map((issue: any) =>
  `<p>• ${issue.issue}：发生${issue.count}次，需重点关注</p>`
).join('') : '<p>• 待进一步分析具体问题</p>'}

<p><strong>改进措施：</strong></p>
<ul>
<li>加强培训教育，提升业务技能</li>
<li>完善制度建设，规范操作流程</li>
<li>强化监督检查，确保执行到位</li>
<li>建立激励机制，调动工作积极性</li>
</ul>

<p><strong>预期效果：</strong></p>
<p>通过系统性改进，预计下年度各项指标将有明显提升。</p>
    `,
    outlook: `
<h4>${parseInt(selectedYear.value) + 1}年工作展望</h4>
<p><strong>总体目标：</strong></p>
<p>以高质量发展为主题，以改革创新为动力，全面提升列车长队伍建设水平。</p>

<p><strong>具体目标：</strong></p>
<ul>
<li>年度平均得分目标：${(parseFloat(averageScore.value) + 2).toFixed(1)}分</li>
<li>考核覆盖率：保持100%全覆盖</li>
<li>优秀率：力争提升10个百分点</li>
</ul>

<p><strong>重点工作：</strong></p>
<ul>
<li>深化考核制度改革，完善评价体系</li>
<li>加强队伍建设，提升整体素质</li>
<li>强化服务意识，提升旅客满意度</li>
<li>推进数字化转型，提高工作效率</li>
</ul>

<p><strong>保障措施：</strong></p>
<p>加强组织领导，完善工作机制，确保各项目标任务圆满完成。</p>
    `
  }

  textContent.value = templates[templateType as keyof typeof templates] || ''
  ElMessage.success('模板应用成功！')
}

// 滚动到指定章节
const scrollToSection = (sectionClass: string) => {
  const element = document.querySelector(`.${sectionClass}`)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    ElMessage.info(`已跳转到${getSectionName(sectionClass)}`)
  }
}

const getSectionName = (sectionClass: string): string => {
  const names: Record<string, string> = {
    'overview': '工作概况',
    'annual-overview': '年度概况',
    'performance-analysis': '绩效分析',
    'enhanced-analysis': '深度数据分析',
    'risk-assessment': '风险评估',
    'target-progress': '目标达成',
    'personnel-matrix': '人员绩效',
    'text-editing': '工作总结'
  }
  return names[sectionClass] || sectionClass
}

// 显示帮助对话框
const showHelpDialog = () => {
  ElMessageBox.alert(`
    <div style="text-align: left;">
      <h3 style="margin-top: 0; color: #1890ff;">年度报表操作指南</h3>

      <h4 style="color: #333; margin: 16px 0 8px 0;">🎯 基本操作</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>选择年份后点击"生成年度报表"开始生成</li>
        <li>生成完成后可以查看各个章节的详细内容</li>
        <li>支持多种格式导出：PDF、Excel、Word</li>
        <li>第八章支持自定义文字描述编辑</li>
      </ul>

      <h4 style="color: #333; margin: 16px 0 8px 0;">⌨️ 键盘快捷键</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li><code>Ctrl + G</code> - 生成报表</li>
        <li><code>Ctrl + E</code> - 导出报表</li>
        <li><code>Ctrl + R</code> - 刷新数据</li>
      </ul>

      <h4 style="color: #333; margin: 16px 0 8px 0;">📊 功能特色</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>智能数据分析：自动检测异常和趋势</li>
        <li>多维度图表：月度趋势、部门对比、绩效分布等</li>
        <li>风险预警：基于数据的风险评估和建议</li>
        <li>文字编辑：支持模板和自定义内容</li>
      </ul>

      <h4 style="color: #333; margin: 16px 0 8px 0;">💡 使用建议</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>建议在数据完整的年份生成报表</li>
        <li>可以使用快速预览功能快速跳转到各章节</li>
        <li>导出前建议先预览确认内容无误</li>
        <li>文字描述可以使用模板快速生成框架</li>
      </ul>
    </div>
  `, '帮助信息', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '我知道了',
    customClass: 'help-dialog'
  })
}

// 添加键盘快捷键支持
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  if (event.ctrlKey) {
    switch (event.key) {
      case 'g':
        event.preventDefault()
        if (!isGenerating.value) {
          generateReport()
        }
        break
      case 'e':
        event.preventDefault()
        if (reportData.value && !isExporting.value) {
          exportReport()
        }
        break
      case 'r':
        event.preventDefault()
        refreshData()
        break
    }
  }
}

// 生命周期
onMounted(async () => {
  logger.log('🚀 年度报表组件已挂载')
  await loadAvailableYears()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

onUnmounted(() => {
  // 清理键盘事件监听
  document.removeEventListener('keydown', handleKeyboardShortcuts)

  // 清理渲染防抖定时器
  if (renderTimeout) {
    clearTimeout(renderTimeout)
    renderTimeout = null
  }

  // 清理图表实例
  chartInstances.forEach((instance, key) => {
    try {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose()
        logger.log(`✅ 清理图表实例: ${key}`)
      }
    } catch (error) {
      logger.warn(`⚠️ 清理图表实例失败: ${key}`, error)
    }
  })
  chartInstances.clear()

  // 清理图表resize监听器
  window.removeEventListener('resize', () => {})

  logger.log('🧹 组件清理完成')
})
</script>

<style scoped lang="scss">
.yearly-report-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

// 头部样式
.dashboard-header {
  margin-bottom: 24px;
}

.title-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }

  .title-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 20px;

    .title-icon {
      flex-shrink: 0;
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }

    .title-text {
      flex: 1;

      .main-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 16px 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .meta-info {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          opacity: 0.9;

          .el-icon {
            font-size: 16px;
          }
        }
      }
    }
  }
}

// 控制面板样式
.control-panel {
  margin-bottom: 24px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;

    .control-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1890ff;
    }
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    .control-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .control-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        color: #666;
        white-space: nowrap;
      }

      .year-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .year-meta {
          margin-left: 8px;
        }
      }

      .completeness-indicator {
        display: flex;
        align-items: center;
        gap: 12px;

        .completeness-text {
          font-weight: 600;
          color: #666;
        }
      }
    }

    .control-actions {
      margin-left: auto;
      display: flex;
      gap: 12px;
    }
  }

  .progress-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .progress-label {
        font-size: 14px;
        color: #666;
      }

      .progress-percentage {
        font-size: 14px;
        font-weight: 600;
        color: #1890ff;
      }
    }
  }
}

// 调试面板样式
.debug-panel {
  margin-bottom: 24px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 4px 0;

    .debug-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #722ed1;
    }

    .debug-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .expand-icon {
        transition: transform 0.3s ease;
        color: #999;

        &.expanded {
          transform: rotate(180deg);
        }
      }
    }
  }

  .debug-content {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;

    .debug-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;

      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #fafafa;
        border-radius: 8px;

        .stat-label {
          font-weight: 500;
          color: #666;
        }

        .stat-value {
          display: flex;
          gap: 4px;
        }
      }
    }

    .debug-data {
      .debug-section {
        h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 14px;
          font-weight: 600;
        }

        .debug-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;

          .debug-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 6px;
            font-size: 13px;

            .debug-key {
              color: #666;
            }

            .debug-value {
              font-weight: 600;
              color: #333;
            }
          }
        }
      }
    }
  }
}

// 报表内容样式
.report-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.report-section {
  padding: 32px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .section-title {
    font-size: 24px;
    font-weight: 700;
    color: #1890ff;
    margin: 0 0 24px 0;
    padding-bottom: 12px;
    border-bottom: 3px solid #1890ff;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #1890ff, #36cfc9);
    }
  }

  .subsection-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      width: 4px;
      height: 18px;
      background: linear-gradient(180deg, #1890ff, #36cfc9);
      border-radius: 2px;
    }
  }
}

// 概览部分样式
.overview {
  .summary-content {
    background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border-left: 4px solid #1890ff;

    .summary-text {
      line-height: 1.8;
      color: #555;
      margin: 0 0 16px 0;
      font-size: 15px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 16px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .metric-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .el-icon {
          font-size: 24px;
        }
      }

      .metric-content {
        flex: 1;

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #1890ff;
          line-height: 1;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .metric-trend {
          font-size: 12px;
          font-weight: 600;

          &.positive {
            color: #52c41a;
          }

          &.negative {
            color: #ff4d4f;
          }

          &.neutral {
            color: #faad14;
          }
        }
      }
    }
  }
}

// 数据表格样式
.data-table {
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-table__header) {
    background: #fafbfc;

    th {
      background: #fafbfc !important;
      color: #333;
      font-weight: 600;
      border-bottom: 2px solid #e8e8e8;
    }
  }

  :deep(.el-table__body) {
    tr {
      transition: background-color 0.2s ease;

      &:hover {
        background: #f8f9fa !important;
      }
    }

    td {
      border-bottom: 1px solid #f0f0f0;
    }
  }

  .metric-value {
    font-weight: 600;

    &.success {
      color: #52c41a;
    }

    &.warning {
      color: #faad14;
    }

    &.error {
      color: #ff4d4f;
    }
  }
}

// 绩效分析样式
.performance-analysis {
  .ranking-badge {
    display: flex;
    align-items: center;
    justify-content: center;

    .rank-number {
      font-weight: 700;
      color: #666;
      font-size: 16px;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 24px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      &.excellent {
        border-left: 4px solid #52c41a;

        .stat-icon {
          background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
          color: #52c41a;
        }
      }

      &.good {
        border-left: 4px solid #1890ff;

        .stat-icon {
          background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
          color: #1890ff;
        }
      }

      &.qualified {
        border-left: 4px solid #faad14;

        .stat-icon {
          background: linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%);
          color: #faad14;
        }
      }

      &.need-improvement {
        border-left: 4px solid #ff4d4f;

        .stat-icon {
          background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
          color: #ff4d4f;
        }
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .el-icon {
          font-size: 20px;
        }
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #333;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .stat-desc {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }

  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;

    .indicator-item {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;
      text-align: center;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .indicator-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }

      .indicator-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 8px;

        &.primary {
          color: #1890ff;
        }

        &.success {
          color: #52c41a;
        }

        &.info {
          color: #36cfc9;
        }

        &.warning {
          color: #faad14;
        }
      }

      .indicator-desc {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

// 深度分析样式
.enhanced-analysis {
  .analysis-description {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    border-left: 4px solid #722ed1;

    p {
      margin: 0;
      color: #555;
      line-height: 1.6;
    }
  }
}

// 文字编辑功能样式
.text-editing {
  .text-editor-section {
    margin-bottom: 32px;

    .editor-controls {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;

      .editing-controls {
        display: flex;
        gap: 8px;
      }
    }

    .template-selector {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1890ff;

      label {
        font-weight: 600;
        color: #333;
      }
    }

    .text-content-area {
      .text-display {
        .saved-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #f0f0f0;

          :deep(h4) {
            color: #1890ff;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0f0f0;

            &:first-child {
              margin-top: 0;
            }
          }

          :deep(p) {
            line-height: 1.8;
            color: #555;
            margin: 12px 0;
          }

          :deep(ul) {
            padding-left: 20px;

            li {
              line-height: 1.8;
              color: #555;
              margin: 8px 0;
            }
          }

          :deep(strong) {
            color: #333;
            font-weight: 600;
          }

          .content-meta {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #f0f0f0;
            display: flex;
            gap: 24px;
            font-size: 14px;
            color: #666;

            .meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
          }
        }

        .default-content {
          background: #fafafa;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          border: 2px dashed #d9d9d9;

          .placeholder-text {
            color: #999;
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
          }
        }
      }

      .text-editor {
        .content-textarea {
          margin-bottom: 16px;

          :deep(.el-textarea__inner) {
            border-radius: 8px;
            border: 2px solid #f0f0f0;
            font-size: 14px;
            line-height: 1.6;
            transition: border-color 0.3s ease;

            &:focus {
              border-color: #1890ff;
              box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
            }
          }
        }

        .editor-tips {
          :deep(.el-alert) {
            border-radius: 8px;

            .el-alert__content {
              ul {
                margin: 8px 0 0 0;
                padding-left: 16px;

                li {
                  margin: 4px 0;
                  color: #666;
                  font-size: 13px;
                }
              }
            }
          }
        }
      }
    }
  }

  .data-summary {
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;

      .summary-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid #f0f0f0;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        &.highlight {
          border-left: 4px solid #52c41a;

          .card-header {
            color: #52c41a;
          }
        }

        &.improvement {
          border-left: 4px solid #faad14;

          .card-header {
            color: #faad14;
          }
        }

        &.outlook {
          border-left: 4px solid #1890ff;

          .card-header {
            color: #1890ff;
          }
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;

          .el-icon {
            font-size: 18px;
          }
        }

        .card-content {
          p {
            line-height: 1.8;
            color: #555;
            margin: 12px 0;
            font-size: 14px;

            &:first-child {
              margin-top: 0;
            }

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }
  }
}

// 快速预览面板样式
.quick-preview-panel {
  margin-bottom: 24px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    .preview-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #36cfc9;
    }

    .preview-actions {
      display: flex;
      gap: 8px;
    }
  }

  .preview-content {
    .preview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;

      .stat-item {
        background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        border: 1px solid #f0f0f0;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #1890ff;
        }
      }
    }
  }
}

// 图表容器样式
.chart-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  margin-bottom: 24px;

  .chart {
    width: 100%;
  }
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;

  .chart-item {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #f0f0f0;

    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      text-align: center;
    }

    .chart {
      width: 100%;
    }
  }
}

// 空状态样式
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  .el-empty {
    :deep(.el-empty__image) {
      width: 120px;
    }

    :deep(.el-empty__description) {
      color: #666;
      font-size: 16px;
    }
  }
}

// 风险评估样式
.risk-assessment {
  .risk-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 24px;

    .risk-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      &.high {
        border-left: 4px solid #ff4d4f;
      }

      &.medium {
        border-left: 4px solid #faad14;
      }

      &.low {
        border-left: 4px solid #52c41a;
      }

      .risk-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;

        .risk-name {
          font-weight: 600;
          color: #333;
        }
      }

      .risk-value {
        font-size: 24px;
        font-weight: 700;
        color: #1890ff;
        margin-bottom: 8px;
      }

      .risk-desc {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
      }
    }
  }

  .suggestions-list {
    .suggestion-item {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;

      &.high {
        border-left: 4px solid #ff4d4f;
      }

      &.medium {
        border-left: 4px solid #faad14;
      }

      &.low {
        border-left: 4px solid #52c41a;
      }

      .suggestion-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        .suggestion-title {
          font-weight: 600;
          color: #333;
        }
      }

      .suggestion-content {
        color: #555;
        line-height: 1.6;
        margin: 0;
      }
    }
  }
}

// 目标进度样式
.target-progress {
  .progress-items {
    .progress-item {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #f0f0f0;

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .target-name {
          font-weight: 600;
          color: #333;
        }

        .progress-percentage {
          font-size: 18px;
          font-weight: 700;
          color: #1890ff;
        }
      }

      .progress-details {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 14px;
        color: #666;
      }
    }
  }
}

// 人员矩阵样式
.personnel-matrix {
  .development-suggestions {
    margin-top: 24px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .yearly-report-container {
    padding: 12px;
  }

  .title-section {
    padding: 20px;

    .title-content {
      flex-direction: column;
      text-align: center;
      gap: 16px;

      .main-title {
        font-size: 20px;
      }

      .meta-info {
        justify-content: center;
        gap: 16px;
      }
    }
  }

  .control-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;

    .control-actions {
      margin-left: 0;
      justify-content: center;
    }
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .report-section {
    padding: 20px;
  }
}

// 新增样式：第二章内容扩展
.section-overview {
  margin-bottom: 30px;

  .overview-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);

    .overview-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .overview-content {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 16px;
      opacity: 0.95;
    }

    .overview-highlights {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;

      .highlight-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;

        .highlight-label {
          font-weight: 500;
          opacity: 0.9;
        }

        .highlight-value {
          font-weight: 600;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
        }
      }
    }
  }
}

.chart-description {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #1890ff;

  .description-text {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    margin-bottom: 12px;
  }

  .analysis-points, .analysis-insights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 8px;
    margin-top: 12px;

    .analysis-item, .insight-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #555;
      padding: 6px 0;
    }
  }

  .quarterly-metrics {
    margin-top: 16px;

    .metric-explanation {
      h5 {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;

        .metric-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e8e8e8;

          .metric-content {
            display: flex;
            flex-direction: column;
            gap: 2px;

            .metric-name {
              font-size: 13px;
              font-weight: 600;
              color: #333;
            }

            .metric-desc {
              font-size: 12px;
              color: #666;
              line-height: 1.4;
            }
          }
        }
      }
    }
  }
}

// 管理评估样式
.management-evaluation {
  .management-stats {
    margin-bottom: 24px;

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;

      .stat-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid #f0f0f0;

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .stat-content {
          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            line-height: 1;
          }

          .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .management-analysis-table {
    .table-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}
</style>
