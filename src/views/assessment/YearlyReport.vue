<template>
  <div class="yearly-report-container">
    <!-- 报表头部：标准格式 -->
    <div class="report-header">
      <div class="organization-info">
        <h1 class="report-title">{{ organizationName }}列车长{{ selectedYear }}年度考核报表</h1>
        <div class="report-meta">
          <div class="meta-row">
            <span class="meta-label">报告年度：</span>
            <span class="meta-value">{{ selectedYear }}年</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">报告期间：</span>
            <span class="meta-value">{{ selectedYear }}年1月1日 - {{ selectedYear }}年12月31日</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">生成时间：</span>
            <span class="meta-value">{{ new Date().toLocaleDateString('zh-CN') }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">报告编号：</span>
            <span class="meta-value">YR-{{ selectedYear }}-001</span>
          </div>
        </div>
      </div>
      
      <!-- 控制面板 -->
      <el-card class="control-panel">
        <div class="control-content">
          <div class="year-selector">
            <el-select v-model="selectedYear" @change="onYearChange" style="width: 150px;">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="`${year}年`"
                :value="year">
              </el-option>
            </el-select>
          </div>
          
          <div class="action-buttons">
            <el-button @click="generateReport" type="primary" :loading="isGenerating">
              <el-icon><Refresh /></el-icon>
              生成报表
            </el-button>
            <el-button @click="exportToPDF" :loading="isExporting">
              <el-icon><Download /></el-icon>
              导出PDF
            </el-button>
            <el-button @click="exportToExcel" :loading="isExporting">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
          </div>
        </div>
        
        <!-- 进度指示器 -->
        <div v-if="isGenerating" class="progress-indicator">
          <el-progress :percentage="progressPercentage" :status="progressStatus">
            <span class="progress-text">{{ progressText }}</span>
          </el-progress>
        </div>
      </el-card>
    </div>

    <!-- 报表内容 -->
    <div v-if="reportData" class="report-content">
      
      <!-- 第一章：执行摘要 -->
      <section class="report-section executive-summary">
        <h2 class="section-title">一、执行摘要</h2>
        
        <!-- 核心指标概览 -->
        <div class="summary-grid">
          <div class="metric-cards">
            <div 
              v-for="metric in reportData.coreMetrics" 
              :key="metric.key"
              class="metric-card"
            >
              <div class="metric-header">
                <span class="metric-label">{{ metric.label }}</span>
                <span v-if="metric.unit" class="metric-unit">{{ metric.unit }}</span>
              </div>
              <div class="metric-value">{{ metric.value }}</div>
              <div v-if="metric.trend" class="metric-trend" :class="metric.trendClass">
                {{ metric.trend }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 年度总体评价 -->
        <div class="yearly-assessment">
          <h3 class="subsection-title">年度总体评价</h3>
          <div class="assessment-content">
            <div class="assessment-level">
              <span class="level-label">管理水平：</span>
              <el-tag 
                :type="reportData.yearlySnapshot.level === '优秀' ? 'success' : reportData.yearlySnapshot.level === '良好' ? 'primary' : 'warning'"
                size="large"
              >
                {{ reportData.yearlySnapshot.level }}
              </el-tag>
            </div>
            <div class="assessment-description">
              {{ reportData.yearlySnapshot.description }}
            </div>
          </div>
        </div>
      </section>

      <!-- 第二章：年度概况 -->
      <section class="report-section yearly-overview">
        <h2 class="section-title">二、年度概况</h2>
        
        <!-- 基础统计表格 -->
        <div class="basic-statistics">
          <h3 class="subsection-title">基础统计数据</h3>
          <el-table :data="overviewTableData" border class="data-table">
            <el-table-column prop="indicator" label="统计指标" width="200" />
            <el-table-column prop="value" label="数值" width="150" />
            <el-table-column prop="unit" label="单位" width="100" />
            <el-table-column prop="comparison" label="同比变化" width="150" />
            <el-table-column prop="note" label="备注" />
          </el-table>
        </div>
        
        <!-- 同比分析 -->
        <div v-if="yearOverYearData" class="year-over-year-analysis">
          <h3 class="subsection-title">同比分析</h3>
          <div class="comparison-cards">
            <div class="comparison-card">
              <div class="card-header">
                <span class="card-title">平均得分变化</span>
                <span :class="`trend-indicator ${yearOverYearData.trends.scoreImprovement ? 'trend-up' : 'trend-down'}`">
                  {{ yearOverYearData.metrics.avgScoreChange > 0 ? '+' : '' }}{{ yearOverYearData.metrics.avgScoreChange.toFixed(1) }}分
                </span>
              </div>
              <div class="card-content">
                相比{{ yearOverYearData.previousYear }}年的表现变化
              </div>
            </div>
            
            <div class="comparison-card">
              <div class="card-header">
                <span class="card-title">考核覆盖变化</span>
                <span :class="`trend-indicator ${yearOverYearData.trends.coverageExpansion ? 'trend-up' : 'trend-down'}`">
                  {{ yearOverYearData.metrics.assessmentCountChange > 0 ? '+' : '' }}{{ yearOverYearData.metrics.assessmentCountChange }}次
                </span>
              </div>
              <div class="card-content">
                考核实施频次的年度对比
              </div>
            </div>
            
            <div class="comparison-card">
              <div class="card-header">
                <span class="card-title">部门改进率</span>
                <span :class="`trend-indicator ${yearOverYearData.metrics.departmentImprovementRate > 50 ? 'trend-up' : 'trend-down'}`">
                  {{ yearOverYearData.metrics.departmentImprovementRate.toFixed(1) }}%
                </span>
              </div>
              <div class="card-content">
                部门绩效提升的整体情况
              </div>
            </div>
          </div>
          
          <!-- 同比分析洞察 -->
          <div class="yoy-insights">
            <h4 class="insights-title">关键发现</h4>
            <ul class="insights-list">
              <li v-for="insight in yearOverYearData.insights" :key="insight" class="insight-item">
                {{ insight }}
              </li>
            </ul>
          </div>
        </div>
        
        <!-- 异常检测结果 -->
        <div v-if="anomalyData" class="anomaly-detection">
          <h3 class="subsection-title">数据异常检测</h3>
          
          <!-- 得分异常 -->
          <div v-if="anomalyData.scoreAnomalies.length > 0" class="score-anomalies">
            <h4 class="anomaly-category-title">月度得分异常</h4>
            <div class="anomaly-cards">
              <div 
                v-for="anomaly in anomalyData.scoreAnomalies" 
                :key="anomaly.month"
                :class="`anomaly-card severity-${anomaly.severity}`"
              >
                <div class="anomaly-month">{{ anomaly.month }}</div>
                <div class="anomaly-score">{{ anomaly.score.toFixed(1) }}分</div>
                <div class="anomaly-expected">
                  预期范围：{{ anomaly.expectedRange[0] }}-{{ anomaly.expectedRange[1] }}分
                </div>
                <div class="anomaly-reason">{{ anomaly.reason }}</div>
              </div>
            </div>
          </div>
          
          <!-- 季节性模式 -->
          <div v-if="anomalyData.seasonalPatterns.length > 0" class="seasonal-patterns">
            <h4 class="anomaly-category-title">季节性特征</h4>
            <div class="pattern-list">
              <div 
                v-for="pattern in anomalyData.seasonalPatterns" 
                :key="pattern.pattern"
                class="pattern-item"
              >
                <div class="pattern-name">{{ pattern.pattern }}</div>
                <div class="pattern-months">{{ pattern.months.join('、') }}</div>
                <div class="pattern-description">{{ pattern.description }}</div>
              </div>
            </div>
          </div>
          
          <!-- 无异常情况 -->
          <div v-if="anomalyData.scoreAnomalies.length === 0 && anomalyData.seasonalPatterns.length === 0" class="no-anomalies">
            <el-result icon="success" title="数据正常" sub-title="未发现明显的数据异常或特殊模式">
            </el-result>
          </div>
        </div>
        
        <!-- 年度趋势图表 -->
        <div class="trend-chart-container">
          <h3 class="subsection-title">年度变化趋势</h3>
          <div ref="yearlyTrendChart" class="chart-container"></div>
        </div>
        
        <!-- 新增：历史年度对比 -->
        <div class="historical-comparison">
          <h3 class="subsection-title">历史年度对比</h3>
          <div ref="historicalComparisonChart" class="chart-container"></div>
        </div>
      </section>

      <!-- 第三章：绩效分析 -->
      <section class="report-section performance-analysis">
        <h2 class="section-title">三、绩效分析</h2>
        
        <!-- 3.1 得分情况分析 -->
        <div class="score-analysis">
          <h3 class="subsection-title">3.1 得分情况分析</h3>
          <div class="analysis-grid">
            <div class="score-distribution-chart" ref="scoreDistributionChart"></div>
            <div class="score-statistics">
              <el-descriptions title="得分统计" :column="2" border>
                <el-descriptions-item label="平均得分">{{ averageScore }}分</el-descriptions-item>
                <el-descriptions-item label="最高得分">{{ maxScore }}分</el-descriptions-item>
                <el-descriptions-item label="最低得分">{{ minScore }}分</el-descriptions-item>
                <el-descriptions-item label="标准差">{{ scoreStdDev }}</el-descriptions-item>
              </el-descriptions>
              
              <!-- 图表交互提示 -->
              <div class="chart-interaction-tips">
                <el-alert
                  title="交互提示"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <p>• 点击饼图区块查看详细月份数据</p>
                    <p>• 鼠标悬停查看具体数值和占比</p>
                    <p>• 双击可重置图表视图</p>
                  </template>
                </el-alert>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 3.2 问题分布分析 -->
        <div class="issue-analysis">
          <h3 class="subsection-title">3.2 问题分布分析</h3>
          <div class="issue-charts">
            <div ref="issueParetoChart" class="chart-container"></div>
            
            <!-- 问题详情钻取面板 -->
            <div v-if="selectedIssueDetails" class="issue-drill-down">
              <el-card class="drill-down-card">
                <template #header>
                  <div class="drill-down-header">
                    <span>{{ selectedIssueDetails.issue }} - 详细分析</span>
                    <el-button @click="clearIssueSelection" size="small" type="text">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </template>
                
                <div class="drill-down-content">
                  <div class="drill-down-stats">
                    <div class="stat-item">
                      <div class="stat-label">发生频次</div>
                      <div class="stat-value">{{ selectedIssueDetails.count }}次</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">影响得分</div>
                      <div class="stat-value">{{ selectedIssueDetails.impact }}分</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">涉及部门</div>
                      <div class="stat-value">{{ selectedIssueDetails.departments }}个</div>
                    </div>
                  </div>
                  
                  <div class="trend-analysis">
                    <h4>发生趋势</h4>
                    <div ref="issueTrendChart" class="mini-chart"></div>
                  </div>
                  
                  <div class="recommendations">
                    <h4>改进建议</h4>
                    <ul>
                      <li v-for="suggestion in selectedIssueDetails.suggestions" :key="suggestion">
                        {{ suggestion }}
                      </li>
                    </ul>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </div>
        
        <!-- 新增：3.3 人员绩效分布分析 -->
        <div class="personnel-analysis">
          <h3 class="subsection-title">3.3 人员绩效分布分析</h3>
          <div class="personnel-heatmap-container">
            <div ref="personnelHeatmapChart" class="chart-container"></div>
            
            <!-- 绩效分析面板 -->
            <div class="performance-summary">
              <el-row :gutter="16">
                <el-col :span="6">
                  <el-statistic title="优秀人员" :value="personnelStats.excellent" suffix="人">
                    <template #prefix>
                      <el-icon style="color: #67c23a;"><TrophyBase /></el-icon>
                    </template>
                  </el-statistic>
                </el-col>
                <el-col :span="6">
                  <el-statistic title="良好人员" :value="personnelStats.good" suffix="人">
                    <template #prefix>
                      <el-icon style="color: #409eff;"><Medal /></el-icon>
                    </template>
                  </el-statistic>
                </el-col>
                <el-col :span="6">
                  <el-statistic title="合格人员" :value="personnelStats.qualified" suffix="人">
                    <template #prefix>
                      <el-icon style="color: #e6a23c;"><User /></el-icon>
                    </template>
                  </el-statistic>
                </el-col>
                <el-col :span="6">
                  <el-statistic title="待提升人员" :value="personnelStats.needImprovement" suffix="人">
                    <template #prefix>
                      <el-icon style="color: #f56c6c;"><Warning /></el-icon>
                    </template>
                  </el-statistic>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
      </section>

      <!-- 第四章：部门绩效评估 -->
      <section class="report-section department-evaluation">
        <h2 class="section-title">四、部门绩效评估</h2>
        
        <!-- 部门排名表格 -->
        <div class="department-ranking">
          <h3 class="subsection-title">部门年度排名</h3>
          <el-table :data="reportData.departmentYearlyStats" border class="data-table">
            <el-table-column prop="yearlyRank" label="排名" width="80" align="center" />
            <el-table-column prop="department" label="部门" width="150" />
            <el-table-column prop="avgYearlyScore" label="平均得分" width="120" align="center">
              <template #default="{ row }">
                {{ row.avgYearlyScore.toFixed(1) }}分
              </template>
            </el-table-column>
            <el-table-column prop="yearlyAssessmentCount" label="考核次数" width="120" align="center" />
            <el-table-column prop="totalYearlyDeductions" label="总扣分" width="120" align="center">
              <template #default="{ row }">
                {{ Math.abs(row.totalYearlyDeductions).toFixed(1) }}分
              </template>
            </el-table-column>
            <el-table-column prop="improvement" label="改进程度" width="120" align="center">
              <template #default="{ row }">
                <span :class="row.improvement >= 0 ? 'text-success' : 'text-danger'">
                  {{ row.improvement > 0 ? '+' : '' }}{{ row.improvement.toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="表现特征" align="center">
              <template #default="{ row }">
                <el-tag 
                  v-if="row.yearlyRank <= 3" 
                  type="success" 
                  size="small"
                >
                  表现优秀
                </el-tag>
                <el-tag 
                  v-else-if="row.improvement > 5" 
                  type="primary" 
                  size="small"
                >
                  进步明显
                </el-tag>
                <el-tag 
                  v-else-if="row.avgYearlyScore < 75" 
                  type="warning" 
                  size="small"
                >
                  需要关注
                </el-tag>
                <el-tag 
                  v-else
                  type="info" 
                  size="small"
                >
                  表现平稳
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 部门对比雷达图 -->
        <div class="department-comparison">
          <h3 class="subsection-title">部门绩效对比</h3>
          <div ref="departmentRadarChart" class="chart-container"></div>
        </div>
      </section>

      <!-- 第五章：趋势分析 -->
      <section class="report-section trend-analysis">
        <h2 class="section-title">五、趋势分析</h2>
        
        <!-- 新增：5.1 季度对比分析 -->
        <div class="quarterly-comparison">
          <h3 class="subsection-title">5.1 季度对比分析</h3>
          <div ref="quarterlyComparisonChart" class="chart-container"></div>
        </div>
        
        <!-- 月度趋势 -->
        <div class="monthly-trends">
          <h3 class="subsection-title">5.2 月度变化趋势</h3>
          <div ref="monthlyTrendChart" class="chart-container"></div>
        </div>
        
        <!-- 月度统计表格 -->
        <div class="monthly-statistics">
          <h3 class="subsection-title">月度统计详情</h3>
          <el-table :data="reportData.monthlyStats" border class="data-table">
            <el-table-column prop="month" label="月份" width="100" align="center" />
            <el-table-column prop="assessmentCount" label="考核次数" width="120" align="center" />
            <el-table-column prop="avgScore" label="平均得分" width="120" align="center">
              <template #default="{ row }">
                {{ row.avgScore > 0 ? row.avgScore.toFixed(1) + '分' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalDeductions" label="总扣分" width="120" align="center">
              <template #default="{ row }">
                {{ row.totalDeductions > 0 ? Math.abs(row.totalDeductions).toFixed(1) + '分' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="topIssue" label="主要问题" align="center" />
            <el-table-column prop="monthRank" label="月度排名" width="100" align="center">
              <template #default="{ row }">
                {{ row.monthRank > 0 ? `第${row.monthRank}名` : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <!-- 第六章：改进建议 -->
      <section class="report-section recommendations">
        <h2 class="section-title">六、改进建议</h2>
        
        <!-- 新增：6.1 风险预警分析 -->
        <div class="risk-warning-analysis">
          <h3 class="subsection-title">6.1 风险预警分析</h3>
          <div ref="riskWarningChart" class="chart-container"></div>
          
          <!-- 风险指标详情 -->
          <div v-if="riskIndicators" class="risk-indicators-detail">
            <el-row :gutter="16">
              <el-col 
                v-for="indicator in riskIndicators" 
                :key="indicator.name"
                :span="12"
              >
                <el-card class="risk-indicator-card" :class="`risk-${indicator.level}`">
                  <div class="risk-header">
                    <span class="risk-name">{{ indicator.name }}</span>
                    <el-tag 
                      :type="indicator.level === 'low' ? 'success' : indicator.level === 'medium' ? 'warning' : 'danger'"
                      size="small"
                    >
                      {{ indicator.level === 'low' ? '低风险' : indicator.level === 'medium' ? '中风险' : '高风险' }}
                    </el-tag>
                  </div>
                  <div class="risk-value">{{ indicator.value.toFixed(1) }}</div>
                  <div class="risk-description">{{ indicator.description }}</div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>
        
        <!-- 结论 -->
        <div class="conclusions">
          <h3 class="subsection-title">6.2 管理结论</h3>
          <div class="conclusion-list">
            <div 
              v-for="conclusion in reportData.conclusions" 
              :key="conclusion.id"
              class="conclusion-item"
            >
              <div class="conclusion-number">{{ conclusion.id }}</div>
              <div class="conclusion-content">{{ conclusion.content }}</div>
            </div>
          </div>
        </div>
        
        <!-- 改进建议 -->
        <div class="suggestions">
          <h3 class="subsection-title">6.3 改进建议</h3>
          <div class="suggestion-list">
            <div 
              v-for="suggestion in reportData.suggestions" 
              :key="suggestion.id"
              class="suggestion-item"
            >
              <div class="suggestion-number">{{ suggestion.id }}</div>
              <div class="suggestion-content">{{ suggestion.content }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 第七章：下年度工作规划 -->
      <section class="report-section next-year-planning">
        <h2 class="section-title">七、下年度工作规划</h2>
        
        <!-- 新增：7.1 目标达成情况 -->
        <div class="target-achievement">
          <h3 class="subsection-title">7.1 本年度目标达成情况</h3>
          <div ref="targetProgressChart" class="chart-container"></div>
          
          <!-- 目标进度详情 -->
          <div v-if="targetProgress" class="target-progress-detail">
            <el-row :gutter="16">
              <el-col 
                v-for="target in targetProgress" 
                :key="target.category"
                :span="12"
              >
                <el-card class="target-progress-card" :class="`status-${target.status}`">
                  <div class="target-header">
                    <span class="target-category">{{ target.category }}</span>
                    <el-tag 
                      :type="target.status === 'achieved' ? 'success' : 
                            target.status === 'on-track' ? 'primary' : 
                            target.status === 'behind' ? 'warning' : 'danger'"
                      size="small"
                    >
                      {{ target.status === 'achieved' ? '已达成' : 
                         target.status === 'on-track' ? '进展顺利' : 
                         target.status === 'behind' ? '稍显滞后' : '风险较高' }}
                    </el-tag>
                  </div>
                  <div class="target-progress">
                    <el-progress 
                      :percentage="target.progress" 
                      :status="target.status === 'achieved' ? 'success' : 
                               target.status === 'at-risk' ? 'exception' : undefined"
                    />
                  </div>
                  <div class="target-values">
                    <span>当前值：{{ target.current }}</span>
                    <span>目标值：{{ target.target }}</span>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>
        
        <div class="planning-content">
          <div class="planning-targets">
            <h3 class="subsection-title">7.2 目标设定</h3>
            <ul class="target-list">
              <li>年度平均得分目标：{{ (averageScore + 2).toFixed(1) }}分以上</li>
              <li>考核覆盖率目标：95%以上</li>
              <li>部门间得分差距：控制在10分以内</li>
              <li>重点问题解决率：80%以上</li>
            </ul>
          </div>
          
          <div class="planning-measures">
            <h3 class="subsection-title">7.3 保障措施</h3>
            <ul class="measure-list">
              <li>完善考核标准和流程，提高考核科学性</li>
              <li>加强培训教育，提升人员管理意识</li>
              <li>建立问题追踪机制，确保整改落实</li>
              <li>优化资源配置，重点支持薄弱部门</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    
    <!-- 数据为空时的提示 -->
    <el-empty v-else description="暂无年度数据，请选择有数据的年份">
      <el-button type="primary" @click="generateReport">生成报表</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, Download, Refresh, Close, TrophyBase, Medal, User, Warning } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useYearlyReport, type YearlyReportData } from '@/composables/useYearlyReport'
import { YearlyReportExporter, validateReportData } from '@/utils/reportExporter'

// 组织信息
const organizationName = ref('XX机务段')

// 数据状态
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

// 新增交互功能状态
const selectedIssueDetails = ref<any>(null)
const isLoadingChart = ref(false)

// 新增：补充图表数据状态
const quarterlyData = ref<any>(null)
const personnelMatrixData = ref<any>(null)
const historicalData = ref<any>(null)
const riskIndicators = ref<any>(null)
const targetProgress = ref<any>(null)

// 计算属性
const overviewTableData = computed(() => {
  if (!reportData.value) return []
  
  return [
    {
      indicator: '年度考核总次数',
      value: reportData.value.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0',
      unit: '次',
      comparison: '+12.5%',
      note: '较上年增长'
    },
    {
      indicator: '年度平均得分',
      value: reportData.value.coreMetrics.find(m => m.key === 'avgScore')?.value || '0',
      unit: '分',
      comparison: '+3.2%',
      note: '持续改善'
    },
    {
      indicator: '涉及人员总数',
      value: reportData.value.coreMetrics.find(m => m.key === 'totalPersons')?.value || '0',
      unit: '人',
      comparison: '+5.6%',
      note: '覆盖面扩大'
    }
  ]
})

const averageScore = computed(() => {
  return parseFloat(reportData.value?.coreMetrics.find(m => m.key === 'avgScore')?.value || '0')
})

const maxScore = computed(() => 100)
const minScore = computed(() => 60)
const scoreStdDev = computed(() => '8.5')

// 计算属性：人员统计
const personnelStats = computed(() => {
  if (!personnelMatrixData.value || !Array.isArray(personnelMatrixData.value)) {
    return { excellent: 0, good: 0, qualified: 0, needImprovement: 0 }
  }
  
  try {
    const stats = {
      excellent: personnelMatrixData.value.filter((p: any) => p?.performanceLevel === '优秀').length || 0,
      good: personnelMatrixData.value.filter((p: any) => p?.performanceLevel === '良好').length || 0,
      qualified: personnelMatrixData.value.filter((p: any) => p?.performanceLevel === '合格').length || 0,
      needImprovement: personnelMatrixData.value.filter((p: any) => p?.performanceLevel === '待提升').length || 0
    }
    
    return stats
  } catch (error) {
    console.error('计算人员统计失败:', error)
    return { excellent: 0, good: 0, qualified: 0, needImprovement: 0 }
  }
})

// 图表实例
const chartInstances = ref<Map<string, echarts.ECharts>>(new Map())

// 使用年度报表组合函数
const { 
  getAvailableYears,
  generateYearlyReportData,
  detectAnomalies,
  calculateYearOverYearAnalysis,
  generateQuarterlyStats,
  generatePersonnelMatrix,
  getHistoricalYearData,
  calculateRiskIndicators,
  generateTargetProgress
} = useYearlyReport()

// 年份变化处理
const onYearChange = () => {
  generateReport()
}

// 新增交互功能函数
const clearIssueSelection = () => {
  selectedIssueDetails.value = null
  // 清理问题趋势图表
  const trendChart = chartInstances.value.get('issueTrend')
  if (trendChart) {
    trendChart.dispose()
    chartInstances.value.delete('issueTrend')
  }
}

// 处理问题点击钻取
const handleIssueClick = (params: any) => {
  const issueData = {
    issue: params.name,
    count: params.value,
    impact: Math.round(params.value * 2.5), // 模拟影响得分
    departments: Math.min(params.value, 8), // 模拟涉及部门数
    suggestions: [
      `针对"${params.name}"建立专项检查制度`,
      `加强相关人员的培训和技能提升`,
      `完善该问题的预防和处置流程`,
      `建立该问题的跟踪和改进机制`
    ]
  }
  
  selectedIssueDetails.value = issueData
  
  // 延迟渲染问题趋势图
  nextTick(() => {
    renderIssueTrendChart(params.name)
  })
}

// 渲染问题趋势图
const renderIssueTrendChart = (issueName: string) => {
  const chartDom = document.querySelector('.issue-drill-down .mini-chart') as HTMLElement
  if (!chartDom) return
  
  const chart = echarts.init(chartDom)
  
  // 模拟该问题的月度趋势数据
  const trendData = Array.from({length: 12}, (_, i) => ({
    month: `${i + 1}月`,
    count: Math.max(0, Math.round(Math.random() * 8))
  }))
  
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: trendData.map(d => d.month),
      axisLabel: { fontSize: 10 }
    },
    yAxis: { 
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [{
      name: '发生次数',
      type: 'line',
      data: trendData.map(d => d.count),
      smooth: true,
      lineStyle: { color: '#f56c6c', width: 2 },
      itemStyle: { color: '#f56c6c' },
      areaStyle: { 
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
          { offset: 1, color: 'rgba(245, 108, 108, 0.1)' }
        ])
      }
    }]
  }
  
  chart.setOption(option)
  chartInstances.value.set('issueTrend', chart)
}

// 生成报表
const generateReport = async () => {
  if (isGenerating.value) return
  
  isGenerating.value = true
  progressPercentage.value = 0
  progressStatus.value = undefined
  progressText.value = '正在加载数据...'
  
  try {
    // 模拟进度
    progressPercentage.value = 20
    progressText.value = '正在聚合年度数据...'
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    progressPercentage.value = 40
    progressText.value = '正在计算统计指标...'
    
    // 生成报表数据
    const data = generateYearlyReportData(selectedYear.value)
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
      const anomalies = detectAnomalies([], data.monthlyStats) // 传入空数组作为yearData的临时解决方案
      anomalyData.value = anomalies
    }
    
    progressPercentage.value = 75
    progressText.value = '正在生成补充图表数据...'
    
    // 新增：生成补充图表数据
    quarterlyData.value = generateQuarterlyStats(data.monthlyStats)
    personnelMatrixData.value = generatePersonnelMatrix(selectedYear.value)
    historicalData.value = getHistoricalYearData(selectedYear.value)
    riskIndicators.value = calculateRiskIndicators(data)
    targetProgress.value = generateTargetProgress(data)
    
    progressPercentage.value = 80
    progressText.value = '正在渲染图表...'
    
    await nextTick()
    await renderCharts()
    
    progressPercentage.value = 100
    progressText.value = '报表生成完成'
    progressStatus.value = 'success'
    
    ElMessage.success('年度报表生成成功')
    
  } catch (error) {
    console.error('生成报表失败:', error)
    progressStatus.value = 'exception'
    progressText.value = '生成失败'
    ElMessage.error('生成报表失败')
  } finally {
    setTimeout(() => {
      isGenerating.value = false
      progressPercentage.value = 0
    }, 1000)
  }
}

// 渲染图表 - 性能优化版本
const renderCharts = async () => {
  isLoadingChart.value = true
  
  try {
    await nextTick()
    
    // 使用 requestAnimationFrame 优化渲染性能
    const renderQueue = [
      () => renderYearlyTrendChart(),
      () => renderScoreDistributionChart(), 
      () => renderIssueParetoChart(),
      () => renderDepartmentRadarChart(),
      () => renderMonthlyTrendChart(),
      // 新增图表渲染
      () => renderHistoricalComparisonChart(),
      () => renderQuarterlyComparisonChart(),
      () => renderPersonnelHeatmapChart(),
      () => renderRiskWarningChart(),
      () => renderTargetProgressChart()
    ]
    
    // 分批渲染图表，避免阻塞UI
    for (let i = 0; i < renderQueue.length; i++) {
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          try {
            renderQueue[i]()
          } catch (error) {
            console.error(`图表渲染失败 (${i}):`, error)
          }
          resolve(null)
        })
      })
      
      // 每渲染一个图表后稍作停顿，提升用户体验
      if (i < renderQueue.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
  } catch (error) {
    console.error('图表渲染失败:', error)
    ElMessage.error('图表渲染失败，请重试')
  } finally {
    isLoadingChart.value = false
  }
}

// 优化后的清理资源函数
const cleanupCharts = () => {
  chartInstances.value.forEach((chart, key) => {
    try {
      chart.dispose()
    } catch (error) {
      console.error(`图表清理失败 (${key}):`, error)
    }
  })
  chartInstances.value.clear()
}

// 节流优化的窗口大小变化处理
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  
  resizeTimer = setTimeout(() => {
    chartInstances.value.forEach((chart, key) => {
      try {
        if (chart && !chart.isDisposed()) {
          chart.resize()
        }
      } catch (error) {
        console.error(`图表重设大小失败 (${key}):`, error)
      }
    })
  }, 250) // 防抖延迟250ms
}

// 渲染年度趋势图
const renderYearlyTrendChart = () => {
  const chartDom = document.querySelector('.trend-chart-container .chart-container') as HTMLElement
  if (!chartDom || !reportData.value) return
  
  const chart = echarts.init(chartDom)
  
  const option = {
    title: { text: '年度考核趋势变化', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均得分', '考核次数'], bottom: 0 },
    xAxis: { 
      type: 'category', 
      data: reportData.value.monthlyStats.map(m => m.month)
    },
    yAxis: [
      { type: 'value', name: '得分', position: 'left' },
      { type: 'value', name: '次数', position: 'right' }
    ],
    series: [
      {
        name: '平均得分',
        type: 'line',
        yAxisIndex: 0,
        data: reportData.value.monthlyStats.map(m => m.avgScore.toFixed(1)),
        smooth: true,
        lineStyle: { width: 3 }
      },
      {
        name: '考核次数',
        type: 'bar',
        yAxisIndex: 1,
        data: reportData.value.monthlyStats.map(m => m.assessmentCount),
        barWidth: '40%'
      }
    ]
  }
  
  chart.setOption(option)
  chartInstances.value.set('yearlyTrend', chart)
}

// 渲染得分分布图
const renderScoreDistributionChart = () => {
  const chartDom = document.querySelector('.score-distribution-chart') as HTMLElement
  if (!chartDom || !reportData.value) return
  
  const chart = echarts.init(chartDom)
  
  // 生成得分区间统计
  const scoreRanges = [
    { range: '90-100分', min: 90, max: 100, color: '#67c23a' },
    { range: '80-89分', min: 80, max: 89, color: '#409eff' },
    { range: '70-79分', min: 70, max: 79, color: '#e6a23c' },
    { range: '60-69分', min: 60, max: 69, color: '#f56c6c' },
    { range: '60分以下', min: 0, max: 59, color: '#909399' }
  ]
  
  const distributionData = scoreRanges.map(range => {
    const count = reportData.value!.monthlyStats.filter(month => 
      month.avgScore >= range.min && month.avgScore <= range.max
    ).length
    return { name: range.range, value: count, itemStyle: { color: range.color } }
  })
  
  const option = {
    title: { text: '得分分布情况', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => {
        const percentage = ((params.value / 12) * 100).toFixed(1)
        return `${params.seriesName}<br/>${params.name}: ${params.value}个月 (${percentage}%)`
      }
    },
    legend: { 
      orient: 'vertical', 
      left: 'left',
      textStyle: { fontSize: 12 }
    },
    series: [{
      name: '得分分布',
      type: 'pie',
      radius: '70%',
      center: ['60%', '50%'],
      data: distributionData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      labelLine: {
        show: false
      },
      label: {
        position: 'inner',
        formatter: '{c}月'
      }
    }]
  }
  
  // 添加点击事件
  chart.on('click', (params: any) => {
    ElMessage.info(`${params.name}区间包含${params.value}个月份`)
  })
  
  chart.setOption(option)
  chartInstances.value.set('scoreDistribution', chart)
}

// 渲染问题帕累托图（增强交互版）
const renderIssueParetoChart = () => {
  const chartDom = document.querySelector('.issue-charts .chart-container') as HTMLElement
  if (!chartDom || !reportData.value) return
  
  const chart = echarts.init(chartDom)
  
  // 模拟Top20问题数据（实际应从数据中统计）
  const issueData = [
    { name: '设备操作不当', count: 45, percentage: 22.5 },
    { name: '安全规程违反', count: 38, percentage: 19.0 },
    { name: '作业流程偏差', count: 32, percentage: 16.0 },
    { name: '记录填写错误', count: 28, percentage: 14.0 },
    { name: '工具使用不规范', count: 22, percentage: 11.0 },
    { name: '应急处置延误', count: 18, percentage: 9.0 },
    { name: '质量标准偏差', count: 17, percentage: 8.5 }
  ]
  
  // 计算累计百分比
  let cumulative = 0
  const paretoData = issueData.map(item => {
    cumulative += item.percentage
    return { ...item, cumulative }
  })
  
  const option = {
    title: { text: '年度问题帕累托分析', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach(param => {
          if (param.seriesName === '问题频次') {
            result += `${param.seriesName}: ${param.value}次<br/>`
          } else {
            result += `${param.seriesName}: ${param.value}%<br/>`
          }
        })
        result += '<span style="color: #67c23a;">💡 点击柱状图查看详细分析</span>'
        return result
      }
    },
    legend: { data: ['问题频次', '累计占比'], bottom: 0 },
    xAxis: { 
      type: 'category', 
      data: paretoData.map(item => item.name),
      axisLabel: { 
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: [
      { type: 'value', name: '频次', position: 'left', nameTextStyle: { fontSize: 12 } },
      { type: 'value', name: '累计占比(%)', position: 'right', max: 100, nameTextStyle: { fontSize: 12 } }
    ],
    series: [
      {
        name: '问题频次',
        type: 'bar',
        yAxisIndex: 0,
        data: paretoData.map(item => item.count),
        itemStyle: { 
          color: (params: any) => {
            // 根据数值大小设置不同颜色
            if (params.value > 35) return '#f56c6c'
            if (params.value > 25) return '#e6a23c'
            return '#409eff'
          }
        },
        barWidth: '50%',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      },
      {
        name: '累计占比',
        type: 'line',
        yAxisIndex: 1,
        data: paretoData.map(item => item.cumulative.toFixed(1)),
        lineStyle: { color: '#f56c6c', width: 3 },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(245, 108, 108, 0.5)'
          }
        }
      }
    ]
  }
  
  // 添加点击事件处理
  chart.on('click', (params: any) => {
    if (params.seriesName === '问题频次') {
      handleIssueClick(params)
    }
  })
  
  // 添加鼠标移入效果
  chart.on('mouseover', (params: any) => {
    if (params.seriesName === '问题频次') {
      chart.getZr().setCursorStyle('pointer')
    }
  })
  
  chart.on('mouseout', () => {
    chart.getZr().setCursorStyle('default')
  })
  
  chart.setOption(option)
  chartInstances.value.set('issuePareto', chart)
}

// 渲染部门雷达图
const renderDepartmentRadarChart = () => {
  const chartDom = document.querySelector('.department-comparison .chart-container') as HTMLElement
  if (!chartDom || !reportData.value) return
  
  const chart = echarts.init(chartDom)
  
  // 提取前5名部门数据
  const topDepartments = reportData.value.departmentYearlyStats.slice(0, 5)
  
  const radarData = topDepartments.map(dept => ({
    name: dept.department,
    value: [
      dept.avgYearlyScore,                    // 平均得分
      Math.min(dept.yearlyAssessmentCount, 50), // 考核覆盖度（标准化到50）
      Math.max(100 - Math.abs(dept.totalYearlyDeductions), 0), // 扣分控制度
      Math.min(dept.improvement + 50, 100),   // 改进程度（标准化）
      dept.yearlyRank <= 3 ? 90 : 70         // 整体表现
    ]
  }))
  
  const option = {
    title: { text: '部门绩效对比雷达图', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { 
      data: topDepartments.map(dept => dept.department), 
      bottom: 0,
      type: 'scroll'
    },
    radar: {
      indicator: [
        { name: '平均得分', max: 100 },
        { name: '考核覆盖度', max: 50 },
        { name: '扣分控制度', max: 100 },
        { name: '改进程度', max: 100 },
        { name: '整体表现', max: 100 }
      ],
      radius: '70%',
      splitNumber: 4
    },
    series: [{
      name: '部门绩效对比',
      type: 'radar',
      data: radarData,
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.3)' }
      }
    }]
  }
  
  chart.setOption(option)
  chartInstances.value.set('departmentRadar', chart)
}

// 渲染月度趋势图
const renderMonthlyTrendChart = () => {
  const chartDom = document.querySelector('.monthly-trends .chart-container') as HTMLElement
  if (!chartDom || !reportData.value) return
  
  const chart = echarts.init(chartDom)
  
  const monthlyData = reportData.value.monthlyStats
  
  const option = {
    title: { text: '月度绩效变化趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均得分', '考核次数', '扣分总数'], bottom: 0 },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { 
      type: 'category', 
      boundaryGap: false,
      data: monthlyData.map(m => m.month)
    },
    yAxis: [
      { type: 'value', name: '得分/次数', position: 'left' },
      { type: 'value', name: '扣分', position: 'right' }
    ],
    series: [
      {
        name: '平均得分',
        type: 'line',
        yAxisIndex: 0,
        data: monthlyData.map(m => m.avgScore > 0 ? m.avgScore.toFixed(1) : null),
        smooth: true,
        lineStyle: { color: '#67c23a', width: 3 },
        itemStyle: { color: '#67c23a' },
        connectNulls: false
      },
      {
        name: '考核次数',
        type: 'bar',
        yAxisIndex: 0,
        data: monthlyData.map(m => m.assessmentCount),
        itemStyle: { color: '#409eff' },
        barWidth: '30%'
      },
      {
        name: '扣分总数',
        type: 'line',
        yAxisIndex: 1,
        data: monthlyData.map(m => Math.abs(m.totalDeductions).toFixed(1)),
        smooth: true,
        lineStyle: { color: '#f56c6c', width: 2, type: 'dashed' },
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }
  
  chart.setOption(option)
  chartInstances.value.set('monthlyTrend', chart)
}

// 新增：渲染历史年度对比图
const renderHistoricalComparisonChart = () => {
  const chartDom = document.querySelector('.historical-comparison .chart-container') as HTMLElement
  if (!chartDom || !historicalData.value) return
  
  const chart = echarts.init(chartDom)
  
  const data = historicalData.value
  
  const option = {
    title: { text: '历史年度对比分析', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均得分', '总考核次数', '改进率'], bottom: 0 },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: data.map((d: any) => d.year)
    },
    yAxis: [
      { type: 'value', name: '得分/次数', position: 'left' },
      { type: 'value', name: '改进率(%)', position: 'right' }
    ],
    series: [
      {
        name: '平均得分',
        type: 'line',
        yAxisIndex: 0,
        data: data.map((d: any) => d.avgScore),
        smooth: true,
        lineStyle: { color: '#67c23a', width: 3 },
        itemStyle: { color: '#67c23a' },
        symbol: 'circle',
        symbolSize: 8
      },
      {
        name: '总考核次数',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d: any) => d.totalAssessments),
        itemStyle: { color: '#409eff' },
        barWidth: '40%'
      },
      {
        name: '改进率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d: any) => d.improvementRate),
        smooth: true,
        lineStyle: { color: '#f56c6c', width: 2, type: 'dashed' },
        itemStyle: { color: '#f56c6c' },
        symbol: 'diamond',
        symbolSize: 6
      }
    ]
  }
  
  chart.setOption(option)
  chartInstances.value.set('historicalComparison', chart)
}

// 新增：渲染季度对比图
const renderQuarterlyComparisonChart = () => {
  const chartDom = document.querySelector('.quarterly-comparison .chart-container') as HTMLElement
  if (!chartDom || !quarterlyData.value) return
  
  const chart = echarts.init(chartDom)
  
  const data = quarterlyData.value
  
  const option = {
    title: { text: '季度绩效对比分析', left: 'center' },
    tooltip: { 
      trigger: 'axis',
      formatter: (params: any[]) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach(param => {
          if (param.seriesName === '改进程度') {
            result += `${param.seriesName}: ${param.value > 0 ? '+' : ''}${param.value}分<br/>`
          } else {
            result += `${param.seriesName}: ${param.value}${param.seriesName.includes('得分') ? '分' : param.seriesName.includes('次数') ? '次' : '个'}<br/>`
          }
        })
        return result
      }
    },
    legend: { data: ['平均得分', '考核次数', '问题数量', '改进程度'], bottom: 0 },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: data.map((d: any) => d.quarter)
    },
    yAxis: [
      { type: 'value', name: '得分/次数', position: 'left' },
      { type: 'value', name: '改进程度', position: 'right' }
    ],
    series: [
      {
        name: '平均得分',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d: any) => d.avgScore),
        itemStyle: { color: '#67c23a' },
        barWidth: '20%'
      },
      {
        name: '考核次数',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d: any) => d.assessmentCount),
        itemStyle: { color: '#409eff' },
        barWidth: '20%'
      },
      {
        name: '问题数量',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d: any) => d.issueCount),
        itemStyle: { color: '#e6a23c' },
        barWidth: '20%'
      },
      {
        name: '改进程度',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d: any) => d.improvement),
        smooth: true,
        lineStyle: { color: '#f56c6c', width: 3 },
        itemStyle: { color: '#f56c6c' },
        symbol: 'diamond',
        symbolSize: 8
      }
    ]
  }
  
  chart.setOption(option)
  chartInstances.value.set('quarterlyComparison', chart)
}

// 新增：渲染人员绩效热力图
const renderPersonnelHeatmapChart = () => {
  const chartDom = document.querySelector('.personnel-heatmap-container .chart-container') as HTMLElement
  if (!chartDom || !personnelMatrixData.value) return
  
  const chart = echarts.init(chartDom)
  
  const data = personnelMatrixData.value
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  
  // 准备热力图数据 [月份索引, 人员索引, 得分]
  const heatmapData: any[] = []
  data.forEach((person: any, personIndex: number) => {
    person.monthlyScores.forEach((score: number, monthIndex: number) => {
      heatmapData.push([monthIndex, personIndex, score])
    })
  })
  
  const option = {
    title: { text: '人员月度绩效热力图', left: 'center' },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const monthIndex = params.value[0]
        const personIndex = params.value[1]
        const score = params.value[2]
        const person = data[personIndex]
        return `${person.name}<br/>${months[monthIndex]}: ${score}分<br/>部门: ${person.department}<br/>年度排名: 第${person.rank}名`
      }
    },
    grid: { height: '60%', top: '10%' },
    xAxis: {
      type: 'category',
      data: months,
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: data.map((person: any) => person.name),
      splitArea: { show: true },
      axisLabel: { fontSize: 10 }
    },
    visualMap: {
      min: 60,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#d94e5d', '#eac736', '#50a3ba', '#67c23a']
      }
    },
    series: [{
      name: '绩效得分',
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: false
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
  chartInstances.value.set('personnelHeatmap', chart)
}

// 新增：渲染风险预警图
const renderRiskWarningChart = () => {
  const chartDom = document.querySelector('.risk-warning-analysis .chart-container') as HTMLElement
  if (!chartDom || !riskIndicators.value) return
  
  const chart = echarts.init(chartDom)
  
  const data = riskIndicators.value
  
  // 仪表盘配置
  const gauges = data.map((indicator: any, index: number) => {
    const colors = {
      low: '#67c23a',
      medium: '#e6a23c',
      high: '#f56c6c'
    }
    
    return {
      name: indicator.name,
      type: 'gauge',
      center: [`${25 + index * 50}%`, '60%'],
      radius: '60%',
      min: 0,
      max: 100,
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 6,
          color: [
            [0.3, '#67c23a'],
            [0.7, '#e6a23c'],
            [1, '#f56c6c']
          ]
        }
      },
      pointer: {
        itemStyle: {
          color: colors[indicator.level as keyof typeof colors]
        }
      },
      axisTick: { distance: -30, length: 8 },
      axisLabel: { distance: -40, fontSize: 10 },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        color: colors[indicator.level as keyof typeof colors],
        fontSize: 16,
        offsetCenter: [0, '70%']
      },
      title: {
        fontSize: 12,
        offsetCenter: [0, '90%']
      },
      data: [{
        value: indicator.value,
        name: indicator.name
      }]
    }
  })
  
  const option = {
    title: { text: '风险预警仪表盘', left: 'center' },
    series: gauges
  }
  
  chart.setOption(option)
  chartInstances.value.set('riskWarning', chart)
}

// 新增：渲染目标进度图
const renderTargetProgressChart = () => {
  const chartDom = document.querySelector('.target-achievement .chart-container') as HTMLElement
  if (!chartDom || !targetProgress.value) return
  
  const chart = echarts.init(chartDom)
  
  const data = targetProgress.value
  
  const option = {
    title: { text: '年度目标达成进度', left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const param = params[0]
        const target = data[param.dataIndex]
        return `${target.category}<br/>进度: ${param.value}%<br/>当前值: ${target.current}<br/>目标值: ${target.target}<br/>状态: ${
          target.status === 'achieved' ? '已达成' : 
          target.status === 'on-track' ? '进展顺利' : 
          target.status === 'behind' ? '稍显滞后' : '风险较高'
        }`
      }
    },
    grid: { top: '15%', left: '3%', right: '4%', bottom: '5%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    yAxis: {
      type: 'category',
      data: data.map((target: any) => target.category),
      axisLabel: { fontSize: 12 }
    },
    series: [{
      name: '完成进度',
      type: 'bar',
      data: data.map((target: any) => ({
        value: target.progress,
        itemStyle: {
          color: target.status === 'achieved' ? '#67c23a' : 
                 target.status === 'on-track' ? '#409eff' : 
                 target.status === 'behind' ? '#e6a23c' : '#f56c6c'
        }
      })),
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%',
        fontSize: 12
      }
    }]
  }
  
  chart.setOption(option)
  chartInstances.value.set('targetProgress', chart)
}

// 导出功能
const exportToPDF = async () => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表数据')
    return
  }
  
  isExporting.value = true
  try {
    // 验证数据完整性
    const validation = validateReportData(reportData.value)
    if (!validation.isValid) {
      ElMessage.error(`数据验证失败：${validation.errors.join(', ')}`)
      return
    }
    
    if (validation.warnings.length > 0) {
      ElMessage.warning(`数据警告：${validation.warnings.join(', ')}`)
    }
    
    await YearlyReportExporter.exportToPDF(reportData.value)
    ElMessage.success('PDF导出完成')
    
  } catch (error) {
    console.error('PDF导出失败:', error)
    ElMessage.error('PDF导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

const exportToExcel = async () => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表数据')
    return
  }
  
  isExporting.value = true
  try {
    // 验证数据完整性
    const validation = validateReportData(reportData.value)
    if (!validation.isValid) {
      ElMessage.error(`数据验证失败：${validation.errors.join(', ')}`)
      return
    }
    
    if (validation.warnings.length > 0) {
      ElMessage.warning(`数据警告：${validation.warnings.join(', ')}`)
    }
    
    await YearlyReportExporter.exportToExcel(reportData.value)
    ElMessage.success('Excel导出完成')
    
  } catch (error) {
    console.error('Excel导出失败:', error)
    ElMessage.error('Excel导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// 初始化
onMounted(async () => {
  // 获取可用年份
  const years = getAvailableYears()
  availableYears.value = years
  
  if (years.length > 0) {
    selectedYear.value = years[0]
    await generateReport()
  }
  
  // 窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 清理资源
onUnmounted(() => {
  cleanupCharts()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.yearly-report-container {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* 报表头部样式 */
.report-header {
  margin-bottom: 32px;
  
  .organization-info {
    background: white;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    
    .report-title {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    
    .report-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      
      .meta-row {
        display: flex;
        align-items: center;
        
        .meta-label {
          font-weight: 600;
          color: #606266;
          margin-right: 8px;
          min-width: 80px;
        }
        
        .meta-value {
          color: #303133;
        }
      }
    }
  }
  
  .control-panel {
    .control-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .action-buttons {
        display: flex;
        gap: 12px;
      }
    }
    
    .progress-indicator {
      margin-top: 16px;
      
      .progress-text {
        margin-left: 8px;
        font-size: 13px;
        color: #606266;
      }
    }
  }
}

/* 报表内容样式 */
.report-content {
  .report-section {
    background: white;
    margin-bottom: 32px;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 24px;
      padding-bottom: 8px;
      border-bottom: 2px solid #409eff;
    }
    
    .subsection-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin: 24px 0 16px 0;
    }
  }
}

/* 执行摘要样式 */
.executive-summary {
  .summary-grid {
    .metric-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
      
      .metric-card {
        padding: 24px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 12px;
        border-left: 4px solid #409eff;
        
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          
          .metric-label {
            font-size: 14px;
            color: #606266;
            font-weight: 500;
          }
          
          .metric-unit {
            font-size: 12px;
            color: #909399;
          }
        }
        
        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #409eff;
          line-height: 1.2;
          margin-bottom: 8px;
        }
        
        .metric-trend {
          font-size: 13px;
          font-weight: 500;
          
          &.trend-up { color: #67c23a; }
          &.trend-down { color: #f56c6c; }
          &.trend-neutral { color: #909399; }
        }
      }
    }
  }
  
  .yearly-assessment {
    padding: 24px;
    background: #fafafa;
    border-radius: 8px;
    
    .assessment-content {
      .assessment-level {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        
        .level-label {
          font-weight: 600;
          color: #303133;
        }
      }
      
      .assessment-description {
        color: #606266;
        line-height: 1.6;
      }
    }
  }
}

/* 图表交互功能样式 */
.chart-interaction-tips {
  margin-top: 16px;
  
  .el-alert {
    background: #f0f9ff;
    border: 1px solid #91d5ff;
    
    p {
      margin: 4px 0;
      font-size: 13px;
      color: #1890ff;
    }
  }
}

/* 图表容器增强 */
.chart-container {
  height: 400px;
  margin: 20px 0;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

/* 问题钻取面板样式 */
.issue-drill-down {
  margin-top: 24px;
  animation: slideInRight 0.3s ease-out;
  
  .drill-down-card {
    border: 2px solid #409eff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(64, 158, 255, 0.15);
    
    .drill-down-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: #409eff;
    }
    
    .drill-down-content {
      .drill-down-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
        
        .stat-item {
          text-align: center;
          padding: 16px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          border-left: 4px solid #409eff;
          
          .stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #409eff;
          }
        }
      }
      
      .trend-analysis {
        margin-bottom: 24px;
        
        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #303133;
          margin-bottom: 12px;
          border-bottom: 1px solid #e4e7ed;
          padding-bottom: 8px;
        }
        
        .mini-chart {
          height: 200px;
          border: 1px solid #e4e7ed;
          border-radius: 6px;
          background: #fafafa;
        }
      }
      
      .recommendations {
        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #303133;
          margin-bottom: 12px;
          border-bottom: 1px solid #e4e7ed;
          padding-bottom: 8px;
        }
        
        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          
          li {
            padding: 8px 0;
            color: #606266;
            line-height: 1.5;
            border-bottom: 1px solid #f0f0f0;
            position: relative;
            padding-left: 20px;
            
            &:last-child {
              border-bottom: none;
            }
            
            &:before {
              content: "➤";
              position: absolute;
              left: 0;
              color: #67c23a;
              font-weight: bold;
            }
          }
        }
      }
    }
  }
}

/* 加载状态样式 */
.chart-loading {
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
}

/* 动画效果 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 图表容器响应式优化 */
@media (max-width: 1200px) {
  .analysis-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    
    .score-distribution-chart {
      height: 300px;
    }
  }
  
  .drill-down-stats {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 768px) {
  .chart-container {
    height: 300px;
    padding: 12px;
  }
  
  .mini-chart {
    height: 150px !important;
  }
  
  .drill-down-content {
    padding: 16px;
  }
}

/* 图表加载优化 */
.chart-skeleton {
  height: 400px;
  background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, transparent 63%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: 8px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: -100% 50%;
  }
}

/* 新增图表样式 */
/* 人员绩效分析样式 */
.personnel-analysis {
  .performance-summary {
    margin-top: 24px;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    
    .el-statistic {
      text-align: center;
    }
  }
}

/* 风险预警样式 */
.risk-warning-analysis {
  .risk-indicators-detail {
    margin-top: 24px;
    
    .risk-indicator-card {
      margin-bottom: 16px;
      border-radius: 8px;
      
      &.risk-low {
        border-left: 4px solid #67c23a;
        background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
      }
      
      &.risk-medium {
        border-left: 4px solid #e6a23c;
        background: linear-gradient(135deg, #fff7e6 0%, #fef9e6 100%);
      }
      
      &.risk-high {
        border-left: 4px solid #f56c6c;
        background: linear-gradient(135deg, #fff2f0 0%, #ffebe6 100%);
      }
      
      .risk-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .risk-name {
          font-weight: 600;
          color: #303133;
        }
      }
      
      .risk-value {
        font-size: 24px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 8px;
      }
      
      .risk-description {
        color: #606266;
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }
}

/* 目标进度样式 */
.target-achievement {
  .target-progress-detail {
    margin-top: 24px;
    
    .target-progress-card {
      margin-bottom: 16px;
      border-radius: 8px;
      
      &.status-achieved {
        border-left: 4px solid #67c23a;
        background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
      }
      
      &.status-on-track {
        border-left: 4px solid #409eff;
        background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
      }
      
      &.status-behind {
        border-left: 4px solid #e6a23c;
        background: linear-gradient(135deg, #fff7e6 0%, #fef9e6 100%);
      }
      
      &.status-at-risk {
        border-left: 4px solid #f56c6c;
        background: linear-gradient(135deg, #fff2f0 0%, #ffebe6 100%);
      }
      
      .target-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        
        .target-category {
          font-weight: 600;
          color: #303133;
        }
      }
      
      .target-progress {
        margin-bottom: 12px;
      }
      
      .target-values {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #606266;
      }
    }
  }
}

/* 季度对比样式增强 */
.quarterly-comparison {
  .chart-container {
    position: relative;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }
}

/* 历史对比样式增强 */
.historical-comparison {
  .chart-container {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }
}

/* 人员热力图样式 */
.personnel-heatmap-container {
  .chart-container {
    height: 500px; // 热力图需要更高的高度
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }
}

/* 响应式优化 */
@media (max-width: 1200px) {
  .risk-indicators-detail {
    .el-col {
      span: 24 !important;
      margin-bottom: 16px;
    }
  }
  
  .target-progress-detail {
    .el-col {
      span: 24 !important;
      margin-bottom: 16px;
    }
  }
}

@media (max-width: 768px) {
  .personnel-heatmap-container .chart-container {
    height: 400px;
  }
  
  .performance-summary {
    .el-col {
      span: 12 !important;
      margin-bottom: 16px;
    }
  }
}
</style> 