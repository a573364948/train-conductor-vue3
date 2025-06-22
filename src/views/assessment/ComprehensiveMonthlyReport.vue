<template>
  <div class="comprehensive-report-container">


    <!-- 增强控制面板 -->
    <el-card class="control-panel" shadow="never">
      <div class="control-row">
        <div class="control-item">
          <label>选择月份：</label>
          <el-select 
            v-model="selectedMonth" 
            placeholder="请选择月份"
            @change="handleMonthChange"
            style="width: 200px"
            filterable
          >
            <el-option
              v-for="month in availableMonths"
              :key="month"
              :label="`${month}（数据可用）`"
              :value="month"
            />
          </el-select>
        </div>
        
        <div class="control-item">
          <label>PDF分页：</label>
          <el-switch
            v-model="useManualPageBreaks"
            active-text="手动分页"
            inactive-text="智能分页"
            style="--el-switch-on-color: #13ce66; --el-switch-off-color: #409eff"
            @change="savePageBreakSettings"
          />
        </div>
        
        <div class="control-item" v-if="useManualPageBreaks">
          <label>显示分页线：</label>
          <el-switch
            v-model="showPageBreakLines"
            active-text="显示"
            inactive-text="隐藏"
            size="small"
            @change="savePageBreakSettings"
          />
        </div>
        
        <div class="control-item" v-if="useManualPageBreaks">
          <el-button type="primary" size="small" @click="addPageBreak">
            <el-icon><Plus /></el-icon>
            添加分页点
          </el-button>
          <el-button type="danger" size="small" @click="clearAllPageBreaks" v-if="pageBreakPositions.length > 0">
            <el-icon><Delete /></el-icon>
            清空分页点
          </el-button>
        </div>
        
        <div class="control-item" v-if="useManualPageBreaks && pageBreakPositions.length > 0">
          <el-tag type="info" size="small">
            已保存 {{ pageBreakPositions.length }} 个分页点
          </el-tag>
        </div>
        
        <div class="control-actions">
          <el-button 
            type="primary" 
            @click="generateComprehensiveReport"
            :loading="loading"
            :disabled="!selectedMonth"
          >
            <el-icon><MagicStick /></el-icon>
            生成智能报表
          </el-button>
          
          
          <el-dropdown 
            split-button 
            type="success"
            @click="exportToPDF('screen')"
            @command="exportToPDF"
            :loading="exporting"
            :disabled="!hasData"
          >
            <el-icon><Download /></el-icon>
            导出PDF (电脑版)
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="screen">
                  <el-icon><Monitor /></el-icon>
                  电脑查看版 (网页尺寸)
                </el-dropdown-item>
                <el-dropdown-item command="preview" divided>
                  <el-icon><Edit /></el-icon>
                  预览布局编辑器
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
          <el-button 
            type="warning"
            @click="refreshData"
            :disabled="loading"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>
      
      <!-- 生成进度条 -->
      <div v-if="loading" class="progress-section">
        <el-progress
          :percentage="analysisProgress"
          :stroke-width="8"
          :text-inside="true"
          status="success"
        />
        <p class="progress-text">{{ currentStep }}</p>
      </div>
    </el-card>

    <!-- 报表内容 -->
    <div v-if="hasData" class="report-content" ref="reportContent" :class="{ 'show-page-breaks': showPageBreakLines }">
      <!-- 报表标题 -->
      <div class="report-header">
        <h1>{{ reportData.title }}</h1>
        <div class="report-meta">
          <span>生成时间：{{ reportData.timestamp }}</span>
          <span>数据来源：列车长考核管理系统</span>
        </div>
      </div>

      <!-- 核心指标概览 -->
      <div class="metrics-overview">
        <h2>一、核心指标概览</h2>
        <el-row :gutter="20">
          <el-col :span="4" v-for="metric in reportData.coreMetrics" :key="metric.key">
            <div class="metric-card" :class="{ 'metric-new': metric.trendClass === 'trend-new' }">
              <div class="metric-value">{{ metric.value }}</div>
              <div class="metric-label">{{ metric.label }}</div>
              <div class="metric-unit" v-if="metric.unit">{{ metric.unit }}</div>
              <div class="metric-trend" :class="metric.trendClass">
                {{ metric.trend }}
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 管理力度智能分析 -->
      <div v-if="reportData.managementSnapshot" class="management-analysis-section">
        <h2>二、管理力度智能分析</h2>
        
        <!-- 管理力度概览 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="management-overview-card">
              <template #header>
                <h3>综合评估</h3>
              </template>
              <div class="management-score">
                <div class="score-circle" :class="`score-${reportData.managementSnapshot.level}`">
                  <span class="score-value">{{ reportData.managementSnapshot.overallScore }}</span>
                  <span class="score-unit">分</span>
                </div>
                <div class="score-level">{{ reportData.managementSnapshot.level }}</div>
                <div class="score-description">{{ reportData.managementSnapshot.description }}</div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="16">
            <el-card class="management-radar-card">
              <template #header>
                <h3>五维评估快速预览</h3>
              </template>
              <div class="quick-preview-grid">
                <div v-for="(value, key) in reportData.managementSnapshot.indicators" :key="key" class="preview-item">
                  <div class="preview-label">{{ key }}</div>
                  <div class="preview-score" :class="getIndicatorClass(value)">{{ value }}分</div>
                  <div class="preview-level">{{ getIndicatorLevel(value) }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 指标详情 -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card class="indicators-detail-card">
              <template #header>
                <div class="indicators-header">
                  <h3>管理力度评分详细说明</h3>
                  <div class="score-calculation">
                    <span class="calculation-text">综合评分 = (标准一致性 + 考核覆盖率 + 管理严格度 + 问题识别力 + 管理均衡性) ÷ 5</span>
                  </div>
                </div>
              </template>
              
              <!-- 分值详情表格 -->
              <el-table :data="getScoreBreakdown()" style="width: 100%; margin-bottom: 20px;" stripe>
                <el-table-column prop="dimension" label="评估维度" width="150" />
                <el-table-column prop="score" label="得分" width="100" align="center">
                  <template #default="scope">
                    <span :class="getIndicatorClass(scope.row.score)" style="font-weight: bold;">
                      {{ scope.row.score }}分
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="level" label="等级" width="100" align="center">
                  <template #default="scope">
                    <el-tag :type="getIndicatorTagType(scope.row.score)">
                      {{ getIndicatorLevel(scope.row.score) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="详细说明" />
                <el-table-column prop="suggestion" label="改进建议" width="200" />
              </el-table>
              
              <!-- 综合评分汇总 -->
              <div class="score-summary">
                <div class="summary-item">
                  <span class="summary-label">各维度平均分：</span>
                  <span class="summary-value">{{ getAverageScore() }}分</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">综合评级：</span>
                  <el-tag :type="getIndicatorTagType(reportData.managementSnapshot.overallScore)" size="large">
                    {{ reportData.managementSnapshot.level }}
                  </el-tag>
                </div>
                <div class="summary-item">
                  <span class="summary-label">评估结论：</span>
                  <span class="summary-description">{{ reportData.managementSnapshot.description }}</span>
                </div>
              </div>
              
              <!-- 传统指标卡片（保留） -->
              <div class="traditional-indicators" style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; color: #666;">五维度评分卡片</h4>
              <el-row :gutter="20">
                <el-col :span="4" v-for="(value, key) in reportData.managementSnapshot.indicators" :key="key">
                  <div class="indicator-item">
                    <div class="indicator-name">{{ key }}</div>
                    <div class="indicator-value" :class="getIndicatorClass(value)">{{ value }}分</div>
                    <div class="indicator-level">{{ getIndicatorLevel(value) }}</div>
                  </div>
                </el-col>
              </el-row>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 手动分页标记：在第三部分前分页 -->
      <div 
        v-if="useManualPageBreaks && manualPageBreaks.includes('break-after-management')" 
        class="manual-page-break" 
        data-break-id="break-after-management"
        style="height: 1px; visibility: hidden; page-break-before: always;"
      ></div>

      <!-- 图表分析 -->
      <div class="charts-section">
        <h2>三、全段整体数据分析图表</h2>
        
        <!-- 第一行：饼图和时间趋势 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>扣分类别分布</h3>
                  <span class="chart-desc">各类别扣分占比统计</span>    

                </div>
              </template>
              <div ref="categoryPieChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>扣分趋势分析</h3>
                  <span class="chart-desc">科室与车队扣分时间趋势</span>    

                </div>
              </template>
              <div ref="timeTrendChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 第二行：扣分次数和Top10问题 -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>各部门扣分次数对比</h3>
                  <span class="chart-desc">科室与车队扣分频次对比</span>    

                </div>
              </template>
              <div ref="deductionCountChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>Top10 扣分问题排行</h3>
                  <span class="chart-desc">最常见问题统计分析</span>    

                </div>
              </template>
              <div ref="top10IssuesChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 第三行：管理力度雷达和评分离散度 -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>管理力度综合评估</h3>
                  <span class="chart-desc">五维度雷达分析</span>    

                </div>
              </template>
              <div ref="managementRadarChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>评分离散度分析</h3>
                  <span class="chart-desc">"吃大锅饭"风险评估（分数越高风险越高）</span>    

                </div>
              </template>
              <div ref="scoreDispersionChart" style="width: 100%; height: 350px;"></div>
              
              <!-- 添加说明文字 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <strong>分析说明</strong>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <p style="margin: 0 0 8px 0;"><strong>风险评分逻辑（分数越高风险越高）：</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li><span style="color: #ff4d4f;">90-100分（极高风险）</span>：标准差≤1，评分过于集中，严重"吃大锅饭"现象</li>
                      <li><span style="color: #ff7875;">75-90分（高风险）</span>：标准差1-2，评分区分度严重不足，亟需改善</li>
                      <li><span style="color: #faad14;">25-75分（中等风险）</span>：标准差2-4，评分区分度有所改善，仍需加强</li>
                      <li><span style="color: #52c41a;">10-25分（低风险）</span>：标准差4-6，评分区分度良好，标准执行到位</li>
                      <li><span style="color: #1890ff;">1-10分（极低/无风险）</span>：标准差>6，评分区分度优秀，考核标准严格</li>
                    </ul>
                    <p style="margin: 8px 0 0 0; color: #666;"><strong>提示：</strong>分数越高越需要重点关注！鼠标悬停查看详细风险分析</p>
                  </div>
                </el-alert>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 第四行：新增日期分布图表 -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>考核日期分布</h3>
                  <span class="chart-desc">分析考核工作时间规律</span>    

                </div>
              </template>
              <div ref="assessDateDistributionChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>录入时效性分析</h3>
                  <span class="chart-desc">评估录入及时性和工作效率</span>    

                </div>
              </template>
              <div ref="entryTimingAnalysisChart" style="width: 100%; height: 350px;"></div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 传统图表保留（第五行） -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>部门在岗人数分布</h3>
                  <span class="chart-desc">各部门人员配备情况</span>    

                </div>
              </template>
              <div ref="onDutyChart" style="width: 100%; height: 300px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="chart-header">
                  <h3>月度奖励分布</h3>
                  <span class="chart-desc">各部门奖励金额对比</span>    

                </div>
              </template>
              <div ref="rewardChart" style="width: 100%; height: 300px;"></div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 详细分析表格 -->
      <div class="tables-section">
        <h2>四、详细数据分析</h2>
        
        <!-- 部门综合统计 -->
        <div class="table-card">
          <h3>部门综合统计表</h3>
          <el-table :data="reportData.departmentStats" stripe style="width: 100%">
            <el-table-column prop="department" label="部门" width="150" />
            <el-table-column prop="onDutyCount" label="在岗人数" width="100" align="center" />
            <el-table-column prop="totalReward" label="总奖励金额" width="120" align="center">
              <template #default="scope">
                {{ formatCurrency(scope.row.totalReward) }}
              </template>
            </el-table-column>
            <el-table-column prop="avgReward" label="人均奖励" width="120" align="center">
              <template #default="scope">
                {{ formatCurrency(scope.row.avgReward) }}
              </template>
            </el-table-column>
            <el-table-column prop="assessmentCount" label="考核次数" width="100" align="center" />
            <el-table-column prop="totalDeductions" label="总扣分" width="100" align="center" />
            <el-table-column prop="avgScore" label="平均得分" width="100" align="center">
              <template #default="scope">
                {{ scope.row.avgScore.toFixed(1) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 手动结论分析 -->
      <div class="manual-conclusion-section">
        <div class="conclusion-header">
          <h2>五、分析结论与建议</h2>
          <div class="conclusion-actions">
            <el-button type="primary" @click="showConclusionEditor = true" v-if="!editingConclusion">
              <el-icon><Edit /></el-icon>
              添加结论分析
            </el-button>
            <el-button type="success" @click="saveConclusionAnalysis" v-if="editingConclusion" :loading="savingConclusion">
              <el-icon><Check /></el-icon>
              保存
            </el-button>
            <el-button @click="cancelConclusionEdit" v-if="editingConclusion">
              <el-icon><Close /></el-icon>
              取消
            </el-button>
          </div>
        </div>

        <!-- 显示已保存的结论 -->
        <div v-if="savedConclusion && !editingConclusion" class="saved-conclusion">
        <div class="conclusion-content">
            <div v-html="savedConclusion.content"></div>
            </div>
          <div class="conclusion-meta">
            <span>编辑时间：{{ savedConclusion.updateTime }}</span>
            <el-button text @click="editSavedConclusion">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </div>
        </div>

        <!-- 结论编辑器 -->
        <div v-if="showConclusionEditor || editingConclusion" class="conclusion-editor">
          <div class="editor-header">
            <h3>{{ editingConclusion ? '编辑' : '添加' }}结论分析</h3>
          </div>
          
          <!-- 快速模板 -->
          <div class="template-section">
            <label>快速模板：</label>
            <el-select 
              v-model="selectedTemplate" 
              placeholder="选择模板或自定义输入" 
              @change="applyTemplate"
              clearable
              style="width: 300px"
            >
              <el-option label="人员管理分析模板" value="personnel" />
              <el-option label="考核质量分析模板" value="assessment" />
              <el-option label="问题改进建议模板" value="improvement" />
              <el-option label="综合评价模板" value="comprehensive" />
            </el-select>
          </div>

          <!-- 富文本编辑器 -->
          <div class="editor-content">
            <el-input
              v-model="conclusionContent"
              type="textarea"
              :rows="12"
              placeholder="请输入分析结论与建议..."
              show-word-limit
              maxlength="2000"
            />
          </div>

          <!-- 编辑提示 -->
          <div class="editor-tips">
            <el-alert
              title="编辑提示"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>• 建议按照：现状分析 → 问题识别 → 改进建议 → 预期效果的结构编写</p>
                <p>• 可以引用报表中的具体数据来支撑分析结论</p>
                <p>• 建议措施要具体可行，便于后续跟踪执行</p>
              </template>
            </el-alert>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!savedConclusion && !showConclusionEditor && !editingConclusion" class="empty-conclusion">
          <el-empty description="暂无结论分析，点击上方按钮添加" />
        </div>
      </div>
      
      <!-- 可视化分页线 -->
      <div v-if="useManualPageBreaks && showPageBreakLines" class="page-break-lines">
        <div 
          v-for="pageBreak in pageBreakPositions" 
          :key="pageBreak.id"
          class="page-break-line"
          :style="{ top: pageBreak.top + 'px' }"
          @mousedown="startDragPageBreak(pageBreak.id, $event)"
        >
          <div class="page-break-handle">
            <span class="page-break-label">{{ pageBreak.label }}</span>
            <div class="page-break-actions">
              <el-button size="small" type="danger" circle @click="removePageBreak(pageBreak.id)">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="page-break-dashed-line"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasData && !loading" class="empty-state">
      <el-empty description="请选择月份并生成报表" />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-loading text="正在生成综合报表..." />
    </div>    
    
    <!-- 预览布局编辑器模态框 -->
    <el-dialog
      v-model="showLayoutPreview"
      title="A4布局预览编辑器"
      :width="'90%'"
      :top="'5vh'"
      destroy-on-close
      append-to-body
    >
      <div class="layout-preview-container">
        <!-- 工具栏 -->
        <div class="preview-toolbar">
          <div class="toolbar-left">
            <el-button type="primary" @click="saveLayoutSettings">
              <el-icon><Check /></el-icon>
              保存布局
            </el-button>
            <el-button @click="resetLayoutSettings">
              <el-icon><Refresh /></el-icon>
              重置布局
            </el-button>
            <el-button type="warning" @click="autoAdjustAllBlocks">
              <el-icon><MagicStick /></el-icon>
              自动调整大小
            </el-button>
          </div>
          <div class="toolbar-right">
            <el-button type="info" @click="addNewPage">
              <el-icon><Plus /></el-icon>
              添加页面
            </el-button>
            <el-button type="success" @click="exportFromPreview">
              <el-icon><Download /></el-icon>
              导出PDF
            </el-button>
          </div>
        </div>

        <!-- A4预览页面 -->
        <div class="a4-preview-pages" ref="previewContainer">
          <div
            v-for="page in previewPages"
            :key="page.id"
            class="a4-preview-page"
            :style="{ minHeight: '297mm' }"
            :data-page-id="page.id"
          >
            <div class="page-header">
              第{{ page.id }}页
              <div class="page-actions">
                <el-button v-if="previewPages.length > 1" size="small" type="danger" circle @click="deletePage(page.id)" title="删除此页">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            
            <!-- 可拖拽的内容块 -->
            <div
              v-for="block in page.blocks"
              :key="block.id"
              class="draggable-block"
              :class="{ 'dragging': block.isDragging }"
              :style="{
                position: 'absolute',
                left: block.x + 'px',
                top: block.y + 'px',
                width: block.width + 'px',
                height: block.height + 'px',
                zIndex: block.zIndex
              }"
              @mousedown="startDragBlock(block, $event)"
              @dblclick="onBlockDoubleClick(block)"
            >
              <div class="block-header">
                <span class="block-title">{{ block.title }}</span>
                <div class="block-actions">
                  <el-button size="small" type="warning" circle @click="autoAdjustBlockSize(block)" title="自动调整大小">
                    <el-icon><MagicStick /></el-icon>
                  </el-button>
                  <el-dropdown @command="(command) => handleBlockAction(command, block)" trigger="click">
                    <el-button size="small" type="info" circle title="移动到其他页">
                      <el-icon><Switch /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item 
                          v-for="targetPage in previewPages" 
                          :key="targetPage.id" 
                          :command="`move-to-${targetPage.id}`"
                          :disabled="targetPage.id === page.id"
                        >
                          移动到第{{ targetPage.id }}页
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button size="small" type="primary" circle @click="editBlockContent(block)" title="编辑内容">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button size="small" type="danger" circle @click="removeBlock(block)" title="删除">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <div class="block-content" v-html="block.content"></div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, TrendCharts, MagicStick, Refresh, Edit, Check, Close, Monitor, Plus, Delete, Switch } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useMainStore } from '@/stores'
import { useManagementIntensity } from '@/composables/useManagementIntensity'
import { useSegmentCharts } from '@/composables/useSegmentCharts'
import { useDateSelection } from '@/composables/useDate'

// Store
const mainStore = useMainStore()

// Composables
const { 
  calculateOptimizedManagementIntensity
} = useManagementIntensity()

const {
  getDeductionCategoryPieChartOption,
  getTimeTrendLineChartOption,
  getDeductionCountBarChartOption,
  getTop10IssuesBarChartOption,
  getManagementIntensityRadarChartOption,
  getScoreDispersionChartOption,
  getAssessDateDistributionChartOption,
  getEntryTimingAnalysisChartOption
} = useSegmentCharts()

const {
  selectedMonth,
  availableMonths: dateAvailableMonths,
  initializeMonthSelection
} = useDateSelection()

// 响应式数据
const loading = ref(false)
const exporting = ref(false)
const hasData = ref(false)
const analysisProgress = ref(0)
const currentStep = ref('')

// 手动结论分析相关
const showConclusionEditor = ref(false)
const editingConclusion = ref(false)
const savingConclusion = ref(false)
const conclusionContent = ref('')
const selectedTemplate = ref('')

// 手动分页控制
const useManualPageBreaks = ref(true) // 默认启用手动分页
const manualPageBreaks = ref<string[]>(['break-after-management']) // 预设分页位置
const showPageBreakLines = ref(true) // 显示分页线
const isDraggingPageBreak = ref(false) // 正在拖拽分页点
const pageBreakPositions = ref<{id: string, top: number, label: string}[]>([
  { id: 'break-after-management', top: 0, label: '分页点 1' }
]) // 分页点位置信息
const savedConclusion = ref<any>(null)

// 预览布局编辑器
const showLayoutPreview = ref(false)
const previewContainer = ref<HTMLElement>()
const previewPages = ref<any[]>([])
const isDraggingBlock = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const currentDragBlock = ref<any>(null)

// DOM引用 - 核心图表
const reportContent = ref<HTMLElement>()
const categoryPieChart = ref<HTMLElement>()
const timeTrendChart = ref<HTMLElement>()
const deductionCountChart = ref<HTMLElement>()
const top10IssuesChart = ref<HTMLElement>()
const managementRadarChart = ref<HTMLElement>()
const scoreDispersionChart = ref<HTMLElement>()
// 新增日期分布图表
const assessDateDistributionChart = ref<HTMLElement>()
const entryTimingAnalysisChart = ref<HTMLElement>()
// 保留原有图表
const onDutyChart = ref<HTMLElement>()
const rewardChart = ref<HTMLElement>()
const assessmentChart = ref<HTMLElement>()
const managementChart = ref<HTMLElement>()

// 图表实例 - 核心图表
let categoryPieChartInstance: echarts.ECharts | null = null
let timeTrendChartInstance: echarts.ECharts | null = null
let deductionCountChartInstance: echarts.ECharts | null = null
let top10IssuesChartInstance: echarts.ECharts | null = null
let managementRadarChartInstance: echarts.ECharts | null = null
let scoreDispersionChartInstance: echarts.ECharts | null = null
// 新增日期分布图表实例
let assessDateDistributionChartInstance: echarts.ECharts | null = null
let entryTimingAnalysisChartInstance: echarts.ECharts | null = null
// 保留原有图表实例
let onDutyChartInstance: echarts.ECharts | null = null
let rewardChartInstance: echarts.ECharts | null = null
let assessmentChartInstance: echarts.ECharts | null = null
let managementChartInstance: echarts.ECharts | null = null

// 报表数据
const reportData = ref<any>({
  title: '',
  timestamp: '',
  coreMetrics: [] as any[],
  departmentStats: [] as any[],
  conclusions: [] as any[],
  managementSnapshot: null,
  managementAnalysis: null
})

// 计算属性
const availableMonths = computed(() => {
  const months: string[] = []
  
  // 从月度数据获取
  if (mainStore.monthlyData) {
    mainStore.monthlyData.forEach((m: any) => {
      const monthKey = `${m.year}-${String(m.month).padStart(2, '0')}`
      if (!months.includes(monthKey)) {
        months.push(monthKey)
      }
    })
  }
  
  return months.sort().reverse()
})


// 月份变化处理
const handleMonthChange = () => {
  if (selectedMonth.value) {
    hasData.value = false
    // 加载该月份保存的分页设置
    loadPageBreakSettings()
    // 加载该月份保存的结论
    loadSavedConclusion()
    // 自动生成报表
    setTimeout(() => {
      generateComprehensiveReport()
    }, 100)
  }
}

// 刷新数据
const refreshData = async () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请先选择月份')
    return
  }
  
  // 重新生成基础报表
  hasData.value = false
  await mainStore.loadDatabase()
  await generateComprehensiveReport()
}

// 生成综合报表
const generateComprehensiveReport = async () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请先选择月份')
    return
  }

  loading.value = true
  hasData.value = false
  analysisProgress.value = 0
  
  try {
    currentStep.value = '准备数据...'
    analysisProgress.value = 10
    
    await mainStore.loadDatabase()
    
    const [year, month] = selectedMonth.value.split('-').map(Number)
    
    // 获取月度数据
    const monthlyData = mainStore.monthlyData.find(m => 
      m.year === year && m.month === month
    )
    
    if (!monthlyData) {
      ElMessage.error(`未找到${selectedMonth.value}的月度数据`)
      return
    }

    currentStep.value = '分析考核数据...'
    analysisProgress.value = 30
    
    // 获取考核数据
    const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
    
    currentStep.value = '生成管理力度分析...'
    analysisProgress.value = 50
    
    // 整合管理力度分析
    const managementAnalysis = calculateOptimizedManagementIntensity(selectedMonth.value)
    
    currentStep.value = '整合分析结果...'
    analysisProgress.value = 70
    
    // 生成增强报表数据
    const report = generateEnhancedReportData(monthlyData, assessmentData, managementAnalysis)
    reportData.value = report
    
    currentStep.value = '渲染图表...'
    analysisProgress.value = 90
    
    hasData.value = true
    
    // 渲染图表
    await nextTick()
    renderCharts()
    
    currentStep.value = '分析完成'
    analysisProgress.value = 100
    
    ElMessage.success(`${selectedMonth.value}智能分析报表生成完成`)
    
    // 加载保存的分页设置（覆盖默认设置）
    setTimeout(() => {
      loadPageBreakSettings()
    }, 800)
    
  } catch (error) {
    console.error('生成报表失败:', error)
    ElMessage.error('生成报表失败，请重试')
  } finally {
    loading.value = false
  }
}

// 生成增强报表数据（新版本）
const generateEnhancedReportData = (monthlyData: any, assessmentData: any[], managementAnalysis: any) => {
  const activeStaff = monthlyData.data.filter((s: any) => s.isActive)
  const totalReward = activeStaff.reduce((sum: number, s: any) => sum + (s.rewardAmount || 0), 0)
  const avgReward = activeStaff.length > 0 ? totalReward / activeStaff.length : 0
  const totalDeductions = assessmentData.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
  
  // 增强核心指标
  const coreMetrics = [
    {
      key: 'onDuty',
      label: '在岗人数',
      value: activeStaff.length,
      trend: '较上月+2人',
      trendClass: 'trend-up',
      unit: '人'
    },
    {
      key: 'totalReward',
      label: '总奖励金额',
      value: formatCurrency(totalReward),
      trend: '较上月+5.2%',
      trendClass: 'trend-up',
      unit: '元'
    },
    {
      key: 'avgReward',
      label: '人均奖励',
      value: formatCurrency(avgReward),
      trend: '较上月+3.1%',
      trendClass: 'trend-up',
      unit: '元'
    },
    {
      key: 'assessmentCount',
      label: '考核记录数',
      value: assessmentData.length,
      trend: '较上月-8条',
      trendClass: 'trend-down',
      unit: '条'
    },
    {
      key: 'managementScore',
      label: '管理力度综合评分',
      value: managementAnalysis.success ? managementAnalysis.overallAssessment?.overallScore || 0 : 0,
      trend: '新增智能评估',
      trendClass: 'trend-new',
      unit: '分'
    }
  ]

  // 管理力度快照
  const managementSnapshot = {
    overallScore: managementAnalysis.success ? managementAnalysis.overallAssessment?.overallScore || 0 : 0,
    level: managementAnalysis.success ? managementAnalysis.overallAssessment?.level || '未评估' : '未评估',
    description: managementAnalysis.success ? managementAnalysis.overallAssessment?.description || '' : '数据不足',
    indicators: managementAnalysis.success ? {
      标准一致性: managementAnalysis.indicators?.consistencyIndex || 0,
      考核覆盖率: managementAnalysis.indicators?.coverageRate || 0,
      管理严格度: managementAnalysis.indicators?.strictnessIndex || 0,
      问题识别力: managementAnalysis.indicators?.identificationCapability || 0,
      管理均衡性: managementAnalysis.indicators?.balanceIndex || 0
    } : {
      标准一致性: 0,
      考核覆盖率: 0,
      管理严格度: 0,
      问题识别力: 0,
      管理均衡性: 0
    }
  }

  // 部门统计
  const departmentStats = calculateDepartmentStats(activeStaff, assessmentData)
  
  // 增强分析结论
  const conclusions = generateEnhancedConclusions(activeStaff, assessmentData, departmentStats, managementAnalysis)

  return {
    title: `${selectedMonth.value} 列车长月度报表`,
    timestamp: new Date().toLocaleString('zh-CN'),
    coreMetrics,
    departmentStats,
    conclusions,
    managementSnapshot,
    managementAnalysis
  }
}

// 生成报表数据（原版本，保留兼容）
const generateReportData = (monthlyData: any, assessmentData: any[]) => {
  const activeStaff = monthlyData.data.filter((s: any) => s.isActive)
  const totalReward = activeStaff.reduce((sum: number, s: any) => sum + (s.rewardAmount || 0), 0)
  const avgReward = activeStaff.length > 0 ? totalReward / activeStaff.length : 0
  const totalDeductions = assessmentData.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
  
  // 核心指标
  const coreMetrics = [
    {
      key: 'onDuty',
      label: '在岗人数',
      value: activeStaff.length,
      trend: '较上月+2人',
      trendClass: 'trend-up'
    },
    {
      key: 'totalReward',
      label: '总奖励金额',
      value: formatCurrency(totalReward),
      trend: '较上月+5.2%',
      trendClass: 'trend-up'
    },
    {
      key: 'avgReward',
      label: '人均奖励',
      value: formatCurrency(avgReward),
      trend: '较上月+3.1%',
      trendClass: 'trend-up'
    },
    {
      key: 'assessmentCount',
      label: '考核记录数',
      value: assessmentData.length,
      trend: '较上月-8条',
      trendClass: 'trend-down'
    }
  ]

  // 部门统计
  const departmentStats = calculateDepartmentStats(activeStaff, assessmentData)
  
  // 分析结论
  const conclusions = generateConclusions(activeStaff, assessmentData, departmentStats)

  return {
    title: `${selectedMonth.value} 列车长综合分析报表`,
    timestamp: new Date().toLocaleString('zh-CN'),
    coreMetrics,
    departmentStats,
    conclusions
  }
}

// 计算部门统计
const calculateDepartmentStats = (activeStaff: any[], assessmentData: any[]) => {
  const deptMap = new Map()
  
  // 初始化部门数据
  activeStaff.forEach(staff => {
    if (!deptMap.has(staff.department)) {
      deptMap.set(staff.department, {
        department: staff.department,
        onDutyCount: 0,
        totalReward: 0,
        avgReward: 0,
        assessmentCount: 0,
        totalDeductions: 0,
        avgScore: 0
      })
    }
    
    const dept = deptMap.get(staff.department)
    dept.onDutyCount++
    dept.totalReward += staff.rewardAmount
  })
  
  // 计算考核数据
  assessmentData.forEach(assessment => {
    if (deptMap.has(assessment.department)) {
      const dept = deptMap.get(assessment.department)
      dept.assessmentCount++
      dept.totalDeductions += Math.abs(assessment.totalScore || 0)
      dept.avgScore += assessment.finalScore || 0
    }
  })
  
  // 计算平均值
  deptMap.forEach(dept => {
    dept.avgReward = dept.onDutyCount > 0 ? dept.totalReward / dept.onDutyCount : 0
    dept.avgScore = dept.assessmentCount > 0 ? dept.avgScore / dept.assessmentCount : 0
  })
  
  return Array.from(deptMap.values()).sort((a, b) => b.onDutyCount - a.onDutyCount)
}

// 生成增强分析结论（新版本）
const generateEnhancedConclusions = (activeStaff: any[], assessmentData: any[], departmentStats: any[], managementAnalysis: any) => {
  const conclusions = [
    {
      title: '人员在岗情况',
      content: `本月共有${activeStaff.length}名列车长在岗，在岗率保持稳定。各部门在岗情况基本均衡。`,
      suggestions: [
        '继续维持当前在岗规模',
        '关注部门间人员配备平衡',
        '做好人员储备和培训工作'
      ]
    },
    {
      title: '奖励发放分析',
      content: `本月奖励总额${formatCurrency(activeStaff.reduce((sum, s) => sum + (s.rewardAmount || 0), 0))}，人均奖励水平合理。`,
      suggestions: [
        '保持奖励标准的公平性',
        '根据考核结果适度调整',
        '建立奖励激励长效机制'
      ]
    },
    {
      title: '考核质量评估',
      content: `本月共产生${assessmentData.length}条考核记录，考核覆盖面广，质量总体良好。`,
      suggestions: [
        '继续提高考核标准',
        '加强考核结果应用',
        '完善考核反馈机制'
      ]
    }
  ]
  
  // 添加管理力度分析结论
  if (managementAnalysis.success) {
    const overallScore = managementAnalysis.overallAssessment?.overallScore || 0
    const level = managementAnalysis.overallAssessment?.level || '未评估'
    
    conclusions.push({
      title: '管理力度智能分析',
      content: `智能分析显示本月管理力度综合评分${overallScore}分，评级为"${level}"。${managementAnalysis.overallAssessment?.description || ''}`,
      suggestions: managementAnalysis.overallAssessment?.suggestions || [
        '持续关注管理力度变化',
        '定期优化管理方式',
        '加强部门间协调配合'
      ]
    })
    
    // 根据具体指标添加针对性建议
    if (managementAnalysis.indicators?.consistencyIndex < 60) {
      conclusions.push({
        title: '标准一致性改进',
        content: `科室与车队考核标准协调性不足，一致性指数仅${managementAnalysis.indicators.consistencyIndex}分。`,
        suggestions: [
          '统一科室与车队考核标准',
          '加强考核培训和沟通',
          '建立标准化考核流程'
        ]
      })
    }
    
    if (managementAnalysis.indicators?.coverageRate < 70) {
      conclusions.push({
        title: '考核覆盖率提升',
        content: `考核覆盖率${managementAnalysis.indicators.coverageRate}%，存在管理盲区。`,
        suggestions: [
          '提高日常考核频次',
          '扩大考核覆盖面',
          '重点关注未覆盖人员'
        ]
      })
    }
  }
  
  return conclusions
}

// 生成分析结论（原版本，保留兼容）
const generateConclusions = (activeStaff: any[], assessmentData: any[], departmentStats: any[]) => {
  return [
    {
      title: '人员在岗情况',
      content: `本月共有${activeStaff.length}名列车长在岗，在岗率保持稳定。各部门在岗情况基本均衡。`,
      suggestions: [
        '继续维持当前在岗规模',
        '关注部门间人员配备平衡',
        '做好人员储备和培训工作'
      ]
    },
    {
      title: '奖励发放分析',
      content: `本月奖励总额${formatCurrency(activeStaff.reduce((sum, s) => sum + (s.rewardAmount || 0), 0))}，人均奖励水平合理。`,
      suggestions: [
        '保持奖励标准的公平性',
        '根据考核结果适度调整',
        '建立奖励激励长效机制'
      ]
    },
    {
      title: '考核质量评估',
      content: `本月共产生${assessmentData.length}条考核记录，考核覆盖面广，质量总体良好。`,
      suggestions: [
        '继续提高考核标准',
        '加强考核结果应用',
        '完善考核反馈机制'
      ]
    }
  ]
}

// 渲染图表 - 更新为包含8个核心图表
const renderCharts = () => {
  // 渲染核心图表
  renderCategoryPieChart()
  renderTimeTrendChart()
  renderDeductionCountChart()
  renderTop10IssuesChart()
  renderManagementRadarChart()
  renderScoreDispersionChart()
  
  // 渲染新增日期分布图表
  renderAssessDateDistributionChart()
  renderEntryTimingAnalysisChart()
  
  // 渲染传统图表
  renderOnDutyChart()
  renderRewardChart()
  renderAssessmentChart()
  renderManagementChart()
}

// 新增：渲染扣分类别分布饼图
const renderCategoryPieChart = () => {
  if (!categoryPieChart.value) return
  
  categoryPieChartInstance = echarts.init(categoryPieChart.value)
  
  // 获取考核数据
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  const option = getDeductionCategoryPieChartOption(assessmentData)
  
  categoryPieChartInstance.setOption(option)
}

// 新增：渲染时间趋势折线图
const renderTimeTrendChart = () => {
  if (!timeTrendChart.value) return
  
  timeTrendChartInstance = echarts.init(timeTrendChart.value)
  
  // 获取多月数据用于趋势分析
  const monthlyData: Record<string, any[]> = {}
  if (mainStore.database?.assessmentDB) {
    // 获取当前月份及前几个月的数据
    const currentDate = new Date(selectedMonth.value + '-01')
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = mainStore.database.assessmentDB[monthKey] || []
    }
  }
  
  const option = getTimeTrendLineChartOption(monthlyData)
  timeTrendChartInstance.setOption(option)
}

// 新增：渲染扣分次数对比柱状图
const renderDeductionCountChart = () => {
  if (!deductionCountChart.value) return
  
  deductionCountChartInstance = echarts.init(deductionCountChart.value)
  
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  const option = getDeductionCountBarChartOption(assessmentData)
  
  deductionCountChartInstance.setOption(option)
}

// 新增：渲染Top10问题柱状图
const renderTop10IssuesChart = () => {
  if (!top10IssuesChart.value) return
  
  top10IssuesChartInstance = echarts.init(top10IssuesChart.value)
  
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  const option = getTop10IssuesBarChartOption(assessmentData)
  
  top10IssuesChartInstance.setOption(option)
}

// 新增：渲染管理力度雷达图（优化版）
const renderManagementRadarChart = () => {
  if (!managementRadarChart.value) return
  
  managementRadarChartInstance = echarts.init(managementRadarChart.value)
  
  // 使用报表数据中的管理力度分析结果
  const managementData = reportData.value.managementAnalysis || reportData.value.managementSnapshot
  const option = getManagementIntensityRadarChartOption(managementData)
  
  managementRadarChartInstance.setOption(option)
}



// 新增：渲染评分离散度分析图
const renderScoreDispersionChart = () => {
  if (!scoreDispersionChart.value) return
  
  scoreDispersionChartInstance = echarts.init(scoreDispersionChart.value)
  
  // 准备离散度分析数据
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  
  // 按部门分组数据
  const departmentData: Record<string, any[]> = {}
  assessmentData.forEach(record => {
    const dept = record.department || '未知部门'
    if (!departmentData[dept]) {
      departmentData[dept] = []
    }
    departmentData[dept].push(record)
  })
  
  // 生成离散度分析（简化版，避免导入错误）
  const dispersionData = generateSimpleDispersionAnalysis(departmentData)
  const option = getScoreDispersionChartOption(dispersionData)
  
  scoreDispersionChartInstance.setOption(option)
}

// 简化的离散度分析函数（避免导入错误）
const generateSimpleDispersionAnalysis = (departmentData: Record<string, any[]>) => {
  const departmentAnalysis: Record<string, any> = {}
  
  Object.keys(departmentData).forEach(department => {
    const records = departmentData[department]
    if (records.length === 0) return
    
    // 提取分数
    const scores = records.map(record => record.finalScore || record.totalScore || 100)
    
    // 计算基础统计
    const sum = scores.reduce((a, b) => a + b, 0)
    const mean = sum / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    const standardDeviation = Math.sqrt(variance)
    const range = Math.max(...scores) - Math.min(...scores)
    
    // 计算变异系数（相对离散度）
    const coefficientOfVariation = mean !== 0 ? (standardDeviation / mean) * 100 : 0
    
    // 优化的风险评估算法
    let riskScore = 100
    let riskLevel = '极低风险'
    let riskDescription = ''
    
    // 基于标准差和变异系数的综合评估（反向逻辑 - 分数越高风险越高）
    if (standardDeviation <= 1) {
      // 标准差很小，"吃大锅饭"风险极高
      riskScore = Math.min(100, 90 + standardDeviation * 10)
      riskLevel = '极高风险'
      riskDescription = '评分过于集中，存在严重的"吃大锅饭"现象，缺乏有效的绩效区分'
    } else if (standardDeviation <= 2) {
      // 标准差仍然很小，风险很高
      riskScore = Math.max(75, 90 - (standardDeviation - 1) * 15)
      riskLevel = '高风险'
      riskDescription = '评分区分度严重不足，"吃大锅饭"风险高，亟需建立差异化考核标准'
    } else if (standardDeviation <= 4) {
      // 标准差开始有改善，风险降低
      riskScore = Math.max(25, 75 - (standardDeviation - 2) * 25)
      riskLevel = '中等风险'
      riskDescription = '评分区分度有所改善，但仍需进一步提高考核标准的执行力度'
    } else if (standardDeviation <= 6) {
      // 标准差良好，风险较低
      riskScore = Math.max(10, 25 - (standardDeviation - 4) * 7.5)
      riskLevel = '低风险'
      riskDescription = '评分区分度良好，能够较好区分不同绩效水平，考核标准执行到位'
    } else if (standardDeviation <= 8) {
      // 标准差优秀，风险很低
      riskScore = Math.max(5, 10 - (standardDeviation - 6) * 2.5)
      riskLevel = '极低风险'
      riskDescription = '评分区分度优秀，能够有效区分各层次绩效水平，考核标准严格执行'
    } else {
      // 标准差极佳，风险几乎没有
      riskScore = Math.max(1, 5 - (standardDeviation - 8) * 0.5)
      riskLevel = '几乎无风险'
      riskDescription = '评分区分度极佳，能够精确区分各层次绩效水平，考核标准严格且一致'
    }
    
    // 基于样本数量调整（样本过少会导致评估不准确）
    if (records.length < 5) {
      riskScore = Math.min(riskScore + 20, 90)
      riskDescription += '（样本数量较少，评估置信度较低）'
    }
    
    // 基于变异系数进一步调整（反向逻辑）
    if (coefficientOfVariation < 5) {
      riskScore = Math.min(riskScore + 15, 95)
      if (!riskDescription.includes('吃大锅饭')) {
        riskDescription = '变异系数过低，' + riskDescription
      }
    }
    
    departmentAnalysis[department] = {
      statistics: {
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        mean: Math.round(mean * 100) / 100,
        range: Math.round(range * 100) / 100,
        coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
        sampleSize: records.length
      },
      bigPotRisk: {
        score: Math.round(riskScore),
        level: riskLevel,
        description: riskDescription
      }
    }
  })
  
  return { departmentAnalysis }
}

// 新增：渲染考核日期分布图
const renderAssessDateDistributionChart = () => {
  if (!assessDateDistributionChart.value) return
  
  assessDateDistributionChartInstance = echarts.init(assessDateDistributionChart.value)
  
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  const option = getAssessDateDistributionChartOption(assessmentData)
  
  assessDateDistributionChartInstance.setOption(option)
}

// 新增：渲染录入时效性分析图
const renderEntryTimingAnalysisChart = () => {
  if (!entryTimingAnalysisChart.value) return
  
  entryTimingAnalysisChartInstance = echarts.init(entryTimingAnalysisChart.value)
  
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  const option = getEntryTimingAnalysisChartOption(assessmentData)
  
  entryTimingAnalysisChartInstance.setOption(option)
}

// 渲染在岗人数图表
const renderOnDutyChart = () => {
  if (!onDutyChart.value) return
  
  onDutyChartInstance = echarts.init(onDutyChart.value)
  
  const data = reportData.value.departmentStats.map((d: any) => ({
    name: d.department,
    value: d.onDutyCount
  }))
  
  const option = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data,
      emphasis: { itemStyle: { shadowBlur: 10 } }
    }]
  }
  
  onDutyChartInstance.setOption(option)
}

// 渲染奖励图表
const renderRewardChart = () => {
  if (!rewardChart.value) return
  
  rewardChartInstance = echarts.init(rewardChart.value)
  
  const depts = reportData.value.departmentStats.map((d: any) => d.department)
  const rewards = reportData.value.departmentStats.map((d: any) => d.avgReward)
  
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: depts },
    yAxis: { type: 'value', name: '奖励金额(元)' },
    series: [{
      type: 'bar',
      data: rewards,
      itemStyle: { color: '#67c23a' }
    }]
  }
  
  rewardChartInstance.setOption(option)
}

// 渲染考核图表
const renderAssessmentChart = () => {
  if (!assessmentChart.value) return
  
  assessmentChartInstance = echarts.init(assessmentChart.value)
  
  const depts = reportData.value.departmentStats.map((d: any) => d.department)
  const deductions = reportData.value.departmentStats.map((d: any) => d.totalDeductions)
  
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: depts },
    yAxis: { type: 'value', name: '扣分' },
    series: [{
      type: 'bar',
      data: deductions,
      itemStyle: { color: '#f56c6c' }
    }]
  }
  
  assessmentChartInstance.setOption(option)
}

// 渲染管理力度图表
const renderManagementChart = () => {
  if (!managementChart.value) return
  
  managementChartInstance = echarts.init(managementChart.value)
  
  const depts = reportData.value.departmentStats.map((d: any) => d.department)
  const avgScores = reportData.value.departmentStats.map((d: any) => d.avgScore)
  
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: depts },
    yAxis: { type: 'value', name: '平均分', min: 80 },
    series: [{
      type: 'line',
      data: avgScores,
      smooth: true,
      itemStyle: { color: '#409eff' }
    }]
  }
  
  managementChartInstance.setOption(option)
}

// PDF导出 - 支持两种版本和预览
const exportToPDF = async (version: string = 'screen') => {
  if (!hasData.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  // 如果是预览功能，直接打开预览窗口
  if (version === 'preview') {
    openLayoutPreview()
    return
  }

  exporting.value = true
  
  try {
    // 动态导入相关库
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])

    const versionName = '电脑查看版'
    ElMessage.info(`正在生成${versionName}PDF报表...`)

    if (!reportContent.value) throw new Error('找不到报表内容')

    await exportScreenVersion(html2canvas, jsPDF)

    ElMessage.success(`${versionName}PDF报表导出成功！`)

  } catch (error: any) {
    console.error('PDF导出失败:', error)
    ElMessage.error(`PDF导出失败: ${error?.message || '请重试'}`)
  } finally {
    exporting.value = false
  }
}

// 打开预览布局编辑器
const openLayoutPreview = async () => {
  if (!hasData.value) {
    ElMessage.warning('请先生成报表数据')
    return
  }
  
  showLayoutPreview.value = true
  
  // 初始化预览页面数据
  await nextTick()
  initializePreviewPages()
}

// 初始化预览页面
const initializePreviewPages = () => {
  // 创建完整的A4报表内容布局
  previewPages.value = [
    {
      id: 1,
      blocks: [
        {
          id: 'reportHeader',
          title: '报表标题区',
          content: generateReportHeaderHTML(),
          x: 20,
          y: 20,
          width: 750,
          height: 120,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'basicInfo',
          title: '一、核心指标概览',
          content: generateBasicInfoHTML(),
          x: 20,
          y: 150,
          width: 750,
          height: 200,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'managementAnalysis',
          title: '二、管理力度智能分析',
          content: generateManagementAnalysisHTML(),
          x: 20,
          y: 370,
          width: 750,
          height: 450, // 增加高度以容纳完整表格
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'dataTable',
          title: '3.4 数据摘要',
          content: generateDataTableHTML(),
          x: 20,
          y: 690,
          width: 750,
          height: 200,
          zIndex: 1,
          isDragging: false
        }
      ]
    },
    {
      id: 2,
      blocks: [
        {
          id: 'chart1',
          title: '3.1 扣分类别分布',
          content: generateChartPlaceholderHTML('categoryPieChart', '扣分类别分布饼图'),
          x: 20,
          y: 20,
          width: 750,
          height: 400,
          zIndex: 1,
          isDragging: false,
          chartType: 'pie'
        },
        {
          id: 'chart2',
          title: '3.2 各部门扣分次数对比',
          content: generateChartPlaceholderHTML('deductionCountChart', '部门扣分对比柱状图'),
          x: 20,
          y: 440,
          width: 750,
          height: 400,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        }
      ]
    },
    {
      id: 3,
      blocks: [
        {
          id: 'chart3',
          title: '3.3 评分离散度分析',
          content: generateChartPlaceholderHTML('scoreDispersionChart', '评分离散度散点图'),
          x: 20,
          y: 20,
          width: 750,
          height: 400,
          zIndex: 1,
          isDragging: false,
          chartType: 'scatter'
        },
        {
          id: 'conclusions',
          title: '四、分析结论与建议',
          content: generateConclusionsHTML(),
          x: 20,
          y: 440,
          width: 750,
          height: 400,
          zIndex: 1,
          isDragging: false
        }
      ]
    }
  ]
  
  // 加载保存的布局设置
  loadLayoutSettings()
  
  // 延迟渲染图表
  setTimeout(() => {
    renderPreviewCharts()
  }, 1000)
}

// 生成核心指标HTML
const generateCoreMetricsHTML = () => {
  const metrics = reportData.value.coreMetrics || []
  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
      ${metrics.map((metric: any) => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #333;">${metric.value}</div>
          <div style="font-size: 14px; color: #666; margin-top: 5px;">${metric.label}</div>
          <div style="font-size: 12px; color: #999; margin-top: 3px;">${metric.trend}</div>
        </div>
      `).join('')}
    </div>
  `
}

// 生成报表标题区HTML
const generateReportHeaderHTML = () => {
  return `
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #409eff;">
      <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #333;">${reportData.value.title}</h1>
      <div style="color: #666; font-size: 14px;">
        <span style="margin-right: 30px;">生成时间：${reportData.value.timestamp}</span>
        <span>数据来源：列车长考核管理系统</span>
      </div>
    </div>
  `
}

// 生成基本信息HTML
const generateBasicInfoHTML = () => {
  const coreMetrics = reportData.value.coreMetrics || []
  
  return `
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">一、核心指标概览</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">指标名称</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">数值</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">单位</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">对比</th>
          </tr>
        </thead>
        <tbody>
          ${coreMetrics.map((metric: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">${metric.label}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; font-size: 14px;">${metric.value}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">${metric.unit || ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">${metric.trend}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// 生成管理力度分析HTML
const generateManagementAnalysisHTML = () => {
  const snapshot = reportData.value.managementSnapshot
  if (!snapshot) return '<div>暂无管理力度分析数据</div>'
  
  return `
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">二、管理力度智能分析</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="text-align: center; margin-bottom: 15px;">
          <span style="font-size: 14px; color: #666;">综合评分：</span>
          <span style="font-size: 24px; font-weight: bold; color: #409eff; margin: 0 10px;">${snapshot.overallScore}分</span>
          <span style="font-size: 14px; color: #666;">（${snapshot.level}）</span>
        </div>
        <div style="text-align: center; color: #333; font-size: 14px; line-height: 1.6;">
          <strong>计算公式：</strong>(标准一致性 + 考核覆盖率 + 管理严格度 + 问题识别力 + 管理均衡性) ÷ 5
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">评估维度</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">得分</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">等级</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">说明</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(snapshot.indicators).map(([key, value]: [string, any]) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">${key}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; font-size: 14px;">${value}分</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 14px;">
                ${value >= 80 ? '优秀' : value >= 70 ? '良好' : value >= 60 ? '一般' : '待改进'}
              </td>
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 14px;">
                ${getIndicatorDescription(key, value)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// 生成数据表格HTML
const generateDataTableHTML = () => {
  const departmentStats = reportData.value.departmentStats || []
  
  return `
    <div style="padding: 15px 0;">
      <h3 style="font-size: 16px; margin: 0 0 10px 0; color: #333;">3.4 数据摘要</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">部门</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">在岗人数</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">总奖励金额</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">考核次数</th>
            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">平均得分</th>
          </tr>
        </thead>
        <tbody>
          ${departmentStats.map((dept: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px;">${dept.department}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.onDutyCount}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(dept.totalReward)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.assessmentCount}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.avgScore.toFixed(1)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// 生成图表占位符HTML
const generateChartPlaceholderHTML = (chartId: string, chartTitle: string) => {
  return `
    <div style="padding: 10px;">
      <h3 style="font-size: 16px; margin: 0 0 10px 0; color: #333; text-align: center;">${chartTitle}</h3>
      <div id="preview-${chartId}" style="width: 100%; height: 350px; background: #fafafa; border: 1px dashed #ddd; display: flex; align-items: center; justify-content: center; color: #999;">
        正在加载图表...
      </div>
    </div>
  `
}

// 生成结论HTML
const generateConclusionsHTML = () => {
  const savedConclusion = getSavedConclusion()
  
  if (savedConclusion?.content) {
    return `
      <div style="padding: 15px 0;">
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">四、分析结论与建议</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; line-height: 1.6; font-size: 14px;">
          ${savedConclusion.content}
        </div>
        <div style="text-align: right; margin-top: 10px; color: #666; font-size: 12px;">
          编辑时间：${savedConclusion.updateTime}
        </div>
      </div>
    `
  } else {
    return `
      <div style="padding: 15px 0;">
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">四、分析结论与建议</h2>
        <div style="background: #f9fafb; padding: 30px; text-align: center; border: 2px dashed #d1d5db; border-radius: 8px; color: #666;">
          暂无结论分析内容，请先添加分析结论
        </div>
      </div>
    `
  }
}

// 获取指标说明
const getIndicatorDescription = (indicator: string, value: number): string => {
  const descriptions: Record<string, Record<string, string>> = {
    '标准一致性': {
      '80+': '科室与车队考核标准高度一致，管理统一性优秀',
      '70+': '考核标准基本一致，管理协调性良好',
      '60+': '考核标准存在差异，需加强协调',
      '60-': '考核标准差异较大，急需统一管理标准'
    },
    '考核覆盖率': {
      '80+': '考核覆盖面广，管理无死角',
      '70+': '考核覆盖较好，少量盲区',
      '60+': '考核覆盖一般，存在管理盲区',
      '60-': '考核覆盖不足，管理盲区较多'
    },
    '管理严格度': {
      '80+': '管理标准严格，执行力强',
      '70+': '管理相对严格，执行良好',
      '60+': '管理标准一般，执行有待加强',
      '60-': '管理较松散，急需提高标准'
    },
    '问题识别力': {
      '80+': '问题识别敏锐，发现及时',
      '70+': '问题识别较好，反应及时',
      '60+': '问题识别一般，反应滞后',
      '60-': '问题识别不足，反应迟钝'
    },
    '管理均衡性': {
      '80+': '各部门管理均衡，公平性强',
      '70+': '管理相对均衡，公平性良好',
      '60+': '管理存在偏差，公平性一般',
      '60-': '管理失衡，公平性待改善'
    }
  }
  
  const levelKey = value >= 80 ? '80+' : value >= 70 ? '70+' : value >= 60 ? '60+' : '60-'
  return descriptions[indicator]?.[levelKey] || '评估中...'
}

// 获取保存的结论
const getSavedConclusion = () => {
  if (!selectedMonth.value) return null
  
  const key = `conclusion_${selectedMonth.value}`
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (error) {
      console.error('解析保存的结论失败:', error)
      return null
    }
  }
  
  return null
}

// 渲染预览图表
const renderPreviewCharts = async () => {
  console.log('🎨 开始渲染预览图表...')
  
  // 等待DOM元素创建
  await nextTick()
  
  // 渲染各个图表
  setTimeout(() => {
    renderPreviewChart('preview-categoryPieChart', 'pie')
    renderPreviewChart('preview-deductionCountChart', 'bar')
    renderPreviewChart('preview-scoreDispersionChart', 'scatter')
  }, 500)
}

// 渲染单个预览图表
const renderPreviewChart = (containerId: string, chartType: string) => {
  const container = document.getElementById(containerId)
  if (!container) {
    console.warn(`找不到图表容器: ${containerId}`)
    return
  }
  
  console.log(`📊 渲染图表: ${containerId} (类型: ${chartType})`)
  
  // 获取当前月份的评估数据
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  
  if (!assessmentData || assessmentData.length === 0) {
    console.warn(`⚠️ 没有找到 ${selectedMonth.value} 的评估数据`)
    return
  }
  
  const chart = echarts.init(container)
  let option = {}
  
  // 根据图表类型生成配置
  switch (chartType) {
    case 'pie':
      option = getDeductionCategoryPieChartOption(assessmentData)
      break
    case 'bar':
      option = getDeductionCountBarChartOption(assessmentData)
      break
    case 'scatter':
      {
        // 按部门分组数据
        const departmentData: Record<string, any[]> = {}
        assessmentData.forEach(record => {
          const dept = record.department || '未知部门'
          if (!departmentData[dept]) {
            departmentData[dept] = []
          }
          departmentData[dept].push(record)
        })
        const dispersionData = generateSimpleDispersionAnalysis(departmentData)
        option = getScoreDispersionChartOption(dispersionData)
      }
      break
  }
  
  chart.setOption(option)
  
  // 响应容器大小变化
  const resizeObserver = new ResizeObserver(() => {
    chart.resize()
  })
  resizeObserver.observe(container)
  
  console.log(`✅ 图表渲染完成: ${containerId}`)
}

// 生成管理力度分析HTML（保持向后兼容）
const generateManagementHTML = () => {
  const snapshot = reportData.value.managementSnapshot
  if (!snapshot) return '<div>暂无管理力度分析数据</div>'
  
  return `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="margin: 0 0 15px 0;">管理力度智能分析</h3>
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #409eff;">${snapshot.overallScore}分</div>
          <div style="font-size: 14px; color: #666;">${snapshot.level}</div>
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; color: #333; line-height: 1.6;">${snapshot.description}</p>
        </div>
      </div>
    </div>
  `
}

// 开始拖拽内容块
const startDragBlock = (block: any, event: MouseEvent) => {
  isDraggingBlock.value = true
  currentDragBlock.value = block
  block.isDragging = true
  
  const rect = previewContainer.value?.getBoundingClientRect()
  if (rect) {
    dragOffset.value = {
      x: event.clientX - rect.left - block.x,
      y: event.clientY - rect.top - block.y
    }
  }
  
  // 提高z-index
  block.zIndex = 999
  
  document.addEventListener('mousemove', onDragBlock)
  document.addEventListener('mouseup', stopDragBlock)
  event.preventDefault()
}

// 拖拽内容块
const onDragBlock = (event: MouseEvent) => {
  if (!isDraggingBlock.value || !currentDragBlock.value || !previewContainer.value) return
  
  const rect = previewContainer.value.getBoundingClientRect()
  const newX = Math.max(0, event.clientX - rect.left - dragOffset.value.x)
  const newY = Math.max(0, event.clientY - rect.top - dragOffset.value.y)
  
  currentDragBlock.value.x = newX
  currentDragBlock.value.y = newY
}

// 停止拖拽内容块
const stopDragBlock = () => {
  if (currentDragBlock.value) {
    currentDragBlock.value.isDragging = false
    currentDragBlock.value.zIndex = 1
  }
  
  isDraggingBlock.value = false
  currentDragBlock.value = null
  
  document.removeEventListener('mousemove', onDragBlock)
  document.removeEventListener('mouseup', stopDragBlock)
}

// 编辑内容块
const editBlockContent = (block: any) => {
  // TODO: 实现内容编辑功能
  ElMessage.info('内容编辑功能开发中...')
}

// 删除内容块
const removeBlock = (block: any) => {
  previewPages.value.forEach(page => {
    const index = page.blocks.findIndex((b: any) => b.id === block.id)
    if (index > -1) {
      page.blocks.splice(index, 1)
    }
  })
  ElMessage.success('已删除内容块')
}

// 保存布局设置
const saveLayoutSettings = () => {
  if (!selectedMonth.value) return
  
  const layoutData = {
    pages: previewPages.value,
    saveTime: new Date().toISOString()
  }
  
  const key = `layoutSettings_${selectedMonth.value}`
  localStorage.setItem(key, JSON.stringify(layoutData))
  
  ElMessage.success('布局设置已保存')
}

// 加载布局设置
const loadLayoutSettings = () => {
  if (!selectedMonth.value) return
  
  const key = `layoutSettings_${selectedMonth.value}`
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      const layoutData = JSON.parse(saved)
      previewPages.value = layoutData.pages || previewPages.value
      console.log(`📂 已加载 ${selectedMonth.value} 的布局设置`)
    } catch (error) {
      console.error('加载布局设置失败:', error)
    }
  }
}

// 重置布局设置
const resetLayoutSettings = () => {
  initializePreviewPages()
  ElMessage.success('布局已重置为默认设置')
}

// 从预览导出PDF
const exportFromPreview = async () => {
  if (!hasData.value || previewPages.value.length === 0) {
    ElMessage.warning('请先生成报表数据')
    return
  }

  ElMessage.info('正在准备智能布局，请稍候...')
  exporting.value = true

  // 导出前自动优化布局
  await autoAdjustAllBlocks();
  adjustBlockPositions();
  await nextTick();
  
  try {
    // 动态导入相关库
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])
    
    await exportPreviewLayoutPDF(html2canvas, jsPDF)
    
    ElMessage.success('预览布局PDF导出成功！')
    
  } catch (error: any) {
    console.error('预览布局PDF导出失败:', error)
    ElMessage.error(`PDF导出失败: ${error?.message || '请重试'}`)
  } finally {
    exporting.value = false
    showLayoutPreview.value = false
  }
}

// 导出预览布局PDF
const exportPreviewLayoutPDF = async (html2canvas: any, jsPDF: any) => {
  console.log('📄 [预览布局] 开始生成预览布局PDF...')
  
  const pdf = new jsPDF('p', 'mm', 'a4')
  let isFirstPage = true
  
  // 为每个预览页面生成PDF页面
  for (const page of previewPages.value) {
    console.log(`📝 处理第${page.id}页，包含${page.blocks.length}个内容块`)
    
    if (!isFirstPage) {
      pdf.addPage()
    }
    isFirstPage = false
    
    // 创建临时页面容器
    const pageContainer = await createPreviewPageContainer(page)
    
    if (!pageContainer) {
      console.warn(`⚠️ 第${page.id}页容器创建失败`)
      continue
    }
    
    // 临时添加到DOM
    pageContainer.style.position = 'absolute'
    pageContainer.style.left = '-9999px'
    pageContainer.style.top = '0'
    pageContainer.style.width = '210mm'
    pageContainer.style.height = '297mm'
    pageContainer.style.background = 'white'
    pageContainer.style.overflow = 'hidden'
    document.body.appendChild(pageContainer)
    
    // 等待内容渲染
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      // 使用html2canvas截取页面
      const canvas = await html2canvas(pageContainer, {
      scale: 2,
      useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        foreignObjectRendering: false
      })
      
      // 转换为图片并添加到PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdfWidth = 210 // A4宽度mm
      const pdfHeight = 297 // A4高度mm
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      console.log(`✅ 第${page.id}页已添加到PDF`)
      
    } catch (error) {
      console.error(`❌ 第${page.id}页处理失败:`, error)
    } finally {
      // 清理临时容器
      document.body.removeChild(pageContainer)
    }
  }
  
  // 保存PDF
  pdf.save(`${selectedMonth.value}_综合分析报表_预览布局版.pdf`)
  console.log('🎉 预览布局PDF生成完成')
}

// 创建预览页面容器
const createPreviewPageContainer = async (page: any): Promise<HTMLElement | null> => {
  try {
    const container = document.createElement('div')
    container.className = 'preview-pdf-page'
    container.style.cssText = `
      width: 210mm;
      height: 297mm;
      background: white;
      position: relative;
      font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      overflow: hidden;
      box-sizing: border-box;
    `
    
    // 为每个内容块创建对应的DOM元素
    const blockPromises = page.blocks.map(async (block: any) => {
      const blockElement = document.createElement('div');
      blockElement.className = 'preview-pdf-block';
      blockElement.style.cssText = `
        position: absolute;
        left: ${block.x}px;
        top: ${block.y}px;
        width: ${block.width}px;
        height: ${block.height}px;
        background: white;
        border-radius: 4px;
        overflow: hidden;
        box-sizing: border-box;
      `;

      if (block.chartType) {
        blockElement.innerHTML = await generateChartForPDF(block);
      } else {
        blockElement.innerHTML = `<div style="padding: 15px; width: 100%; height: 100%; box-sizing: border-box; overflow: hidden;">${block.content}</div>`;
      }
      return blockElement;
    });

    const blockElements = await Promise.all(blockPromises);
    blockElements.forEach(el => container.appendChild(el));
    
    return container
    
  } catch (error) {
    console.error('创建预览页面容器失败:', error)
    return null
  }
}

// 为PDF生成图表内容
const generateChartForPDF = (block: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // 创建临时图表容器
      const chartContainer = document.createElement('div');
      chartContainer.style.cssText = `
        width: ${block.width - 30}px;
        height: ${block.height - 60}px;
        margin: 15px;
      `;
      
      // 临时添加到DOM
      chartContainer.style.position = 'absolute';
      chartContainer.style.left = '-9999px';
      chartContainer.style.top = '0';
      document.body.appendChild(chartContainer);
      
      // 初始化图表
      const chart = echarts.init(chartContainer);
      
      chart.on('finished', () => {
        setTimeout(() => { // Add a small delay to ensure rendering is complete on all browsers
          const chartImage = chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#ffffff'
          });

          // 清理资源
          chart.dispose();
          document.body.removeChild(chartContainer);
          
          // 返回图片HTML
          resolve(`
            <div style="padding: 10px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">${getChartTitle(block)}</h3>
              <img src="${chartImage}" style="width: 100%; height: auto; max-width: ${block.width - 20}px;" />
            </div>
          `);
        }, 50);
      });

      let option = {};
      const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || [];

      // 根据图表类型生成配置
      switch (block.chartType) {
        case 'pie':
          option = getDeductionCategoryPieChartOption(assessmentData);
          break;
        case 'bar':
          option = getDeductionCountBarChartOption(assessmentData);
          break;
        case 'scatter':
          {
            const departmentData: Record<string, any[]> = {};
            assessmentData.forEach(record => {
              const dept = record.department || '未知部门';
              if (!departmentData[dept]) {
                departmentData[dept] = [];
              }
              departmentData[dept].push(record);
            });
            const dispersionData = generateSimpleDispersionAnalysis(departmentData);
            option = getScoreDispersionChartOption(dispersionData);
          }
          break;
      }
      
      chart.setOption(option);
      
    } catch (error) {
      console.error('生成图表失败:', error);
      reject(`<div style="padding: 15px; text-align: center; color: #999;">图表渲染失败</div>`);
    }
  });
}

// 获取图表标题
const getChartTitle = (block: any): string => {
  const titles: Record<string, string> = {
    'pie': '扣分类别分布',
    'bar': '各部门扣分次数对比',
    'scatter': '评分离散度分析'
  }
  return titles[block.chartType] || block.title
}

// 自动调整所有内容块大小
const autoAdjustAllBlocks = async () => {
  console.log('🔧 开始自动调整内容块大小...')
  
  await nextTick()
  
  const adjustmentPromises: Promise<boolean>[] = [];
  
  // 遍历所有页面的所有内容块
  previewPages.value.forEach(page => {
    page.blocks.forEach((block: any) => {
      adjustmentPromises.push(autoAdjustBlockSize(block));
    })
  })

  const results = await Promise.all(adjustmentPromises);
  const adjustedCount = results.filter(r => r === true).length;
  
  if (adjustedCount > 0) {
    ElMessage.success(`已自动调整 ${adjustedCount} 个内容块的大小`)
  } else {
    ElMessage.info('所有内容块大小已是最优状态')
  }
}

// 自动调整单个内容块大小
const autoAdjustBlockSize = (block: any): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // 图表等固定高度内容不作调整
      if (block.chartType) {
        resolve(false);
        return;
      }

      // 创建临时容器来测量内容尺寸
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = block.width + 'px'
      tempContainer.style.padding = '15px'
      tempContainer.style.boxSizing = 'border-box'
      tempContainer.style.visibility = 'hidden'
      tempContainer.style.fontSize = '14px'
      tempContainer.style.lineHeight = '1.6'
      tempContainer.innerHTML = block.content
      
      document.body.appendChild(tempContainer)
      
      requestAnimationFrame(() => {
        const contentHeight = tempContainer.scrollHeight;
        const headerHeight = 35; // 块头部和边距的估算高度
        const minHeight = 100; // 最小高度
        const newHeight = Math.max(contentHeight + headerHeight, minHeight);
        
        document.body.removeChild(tempContainer);
        
        if (Math.abs(newHeight - block.height) > 10) {
          console.log(`📏 调整 ${block.title}: ${block.height}px → ${newHeight}px`)
          block.height = newHeight
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.error('自动调整内容块大小失败:', error)
      resolve(false);
    }
  });
}

// 测量图表内容尺寸
const measureChartBlockSize = (block: any): { width: number, height: number } => {
  // 图表类型的固定尺寸
  if (block.chartType) {
    return {
      width: 750,
      height: 420 // 包含标题和图表的完整高度
    }
  }
  
  // 默认尺寸
  return {
    width: block.width,
    height: block.height
  }
}

// 智能调整内容块位置（避免重叠）
const adjustBlockPositions = () => {
  const A4_PAGE_HEIGHT_PX = 1123; // 297mm at 96dpi, a safe approximation
  const TOP_MARGIN = 20;
  const BOTTOM_MARGIN = 20;
  const BLOCK_SPACING = 20;
  const USABLE_HEIGHT = A4_PAGE_HEIGHT_PX - TOP_MARGIN - BOTTOM_MARGIN;

  // 1. Flatten all blocks into a single list, preserving order by page and y-pos
  const allBlocks = previewPages.value.flatMap(page => 
    [...page.blocks].sort((a, b) => a.y - b.y)
  );

  // Clear existing pages and prepare for rebuild
  const newPages = [{ id: 1, blocks: [] as any[] }];
  let currentPageIndex = 0;
  let currentY = TOP_MARGIN;

  // 2. Iterate and place blocks
  allBlocks.forEach(block => {
    // Check if the block fits on the current page
    if (currentY + block.height > USABLE_HEIGHT && newPages[currentPageIndex].blocks.length > 0) {
      // Doesn't fit, move to the next page
      currentPageIndex++;
      currentY = TOP_MARGIN;
      
      // Create a new page if it doesn't exist
      if (!newPages[currentPageIndex]) {
        newPages.push({ id: currentPageIndex + 1, blocks: [] });
      }
    }

    // Place the block
    block.y = currentY;
    newPages[currentPageIndex].blocks.push(block);

    // Update Y for the next block
    currentY += block.height + BLOCK_SPACING;
  });

  // 3. Update the original reactive ref
  previewPages.value = newPages;
  console.log(`📑 布局重排完成，共 ${newPages.length} 页。`);
};

// 内容块双击自动调整
const onBlockDoubleClick = async (block: any) => {
  const adjusted = await autoAdjustBlockSize(block)
  if (adjusted) {
    ElMessage.success(`已调整 ${block.title} 的大小`)
  } else {
    ElMessage.info(`${block.title} 大小已是最优状态`)
  }
}

// 添加新页面
const addNewPage = () => {
  const newPageId = Math.max(...previewPages.value.map(p => p.id)) + 1
  
  const newPage = {
    id: newPageId,
    blocks: []
  }
  
  previewPages.value.push(newPage)
  
  ElMessage.success(`已添加第${newPageId}页`)
  
  // 自动滚动到新页面
  setTimeout(() => {
    const newPageElement = document.querySelector(`[data-page-id="${newPageId}"]`)
    if (newPageElement) {
      newPageElement.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

// 删除页面
const deletePage = (pageId: number) => {
  const pageIndex = previewPages.value.findIndex(p => p.id === pageId)
  if (pageIndex === -1) return
  
  const page = previewPages.value[pageIndex]
  
  // 如果页面有内容，询问确认
  if (page.blocks.length > 0) {
    ElMessageBox.confirm(
      `第${pageId}页包含 ${page.blocks.length} 个内容块，删除后将无法恢复。是否继续？`,
      '确认删除页面',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      performPageDeletion(pageId)
    }).catch(() => {
      ElMessage.info('已取消删除')
    })
  } else {
    performPageDeletion(pageId)
  }
}

// 执行页面删除
const performPageDeletion = (pageId: number) => {
  const pageIndex = previewPages.value.findIndex(p => p.id === pageId)
  if (pageIndex === -1) return
  
  previewPages.value.splice(pageIndex, 1)
  
  // 重新编号页面
  previewPages.value.forEach((page, index) => {
    page.id = index + 1
  })
  
  ElMessage.success(`已删除页面，剩余 ${previewPages.value.length} 页`)
}

// 处理内容块操作
const handleBlockAction = (command: string, block: any) => {
  if (command.startsWith('move-to-')) {
    const targetPageId = parseInt(command.replace('move-to-', ''))
    moveBlockToPage(block, targetPageId)
  }
}

// 移动内容块到指定页面
const moveBlockToPage = (block: any, targetPageId: number) => {
  // 找到当前页面和目标页面
  const currentPage = previewPages.value.find(page => 
    page.blocks.some((b: any) => b.id === block.id)
  )
  const targetPage = previewPages.value.find(page => page.id === targetPageId)
  
  if (!currentPage || !targetPage) {
    ElMessage.error('移动失败：找不到页面')
    return
  }
  
  if (currentPage.id === targetPageId) {
    ElMessage.info('内容块已在目标页面')
    return
  }
  
  // 从当前页面移除
  const blockIndex = currentPage.blocks.findIndex((b: any) => b.id === block.id)
  if (blockIndex > -1) {
    currentPage.blocks.splice(blockIndex, 1)
  }
  
  // 添加到目标页面，调整位置避免重叠
  const newBlock = {
    ...block,
    x: 20,
    y: getNextAvailableY(targetPage)
  }
  
  targetPage.blocks.push(newBlock)
  
  ElMessage.success(`已将 ${block.title} 移动到第${targetPageId}页`)
  
  // 滚动到目标页面
  setTimeout(() => {
    const targetPageElement = document.querySelector(`[data-page-id="${targetPageId}"]`)
    if (targetPageElement) {
      targetPageElement.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

// 获取页面中下一个可用的Y坐标
const getNextAvailableY = (page: any): number => {
  if (page.blocks.length === 0) return 20
  
  // 找到最底部的内容块
  const maxY = Math.max(...page.blocks.map((b: any) => b.y + b.height))
  return maxY + 20 // 添加20px间距
}

// 复制内容块到另一页（保留原块）
const copyBlockToPage = (block: any, targetPageId: number) => {
  const targetPage = previewPages.value.find(page => page.id === targetPageId)
  
  if (!targetPage) {
    ElMessage.error('复制失败：找不到目标页面')
    return
  }
  
  // 创建新的内容块ID
  const newBlockId = `${block.id}_copy_${Date.now()}`
  
  const newBlock = {
    ...block,
    id: newBlockId,
    title: `${block.title} (副本)`,
    x: 20,
    y: getNextAvailableY(targetPage)
  }
  
  targetPage.blocks.push(newBlock)
  
  ElMessage.success(`已将 ${block.title} 复制到第${targetPageId}页`)
}

// 导出电脑查看版（接近原网页尺寸）
const exportScreenVersion = async (html2canvas: any, jsPDF: any) => {
  console.log('🚀 [DEBUG] exportScreenVersion 函数被调用 - 最新版本!')
  
  // 导出时临时隐藏分页线
  const originalShowPageBreakLines = showPageBreakLines.value
  showPageBreakLines.value = false
  
  // 等待DOM更新
  await nextTick()

    const canvas = await html2canvas(reportContent.value, {
      scale: 2,
      useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: false,
    foreignObjectRendering: false
  })

  // 使用较大的PDF尺寸来保持原网页比例
  const pdf = new jsPDF('p', 'mm', [297, 420]) // A3尺寸
  const imgData = canvas.toDataURL('image/png', 0.95)
  
  const pdfWidth = 297
  const pdfHeight = 420
  const imgWidth = pdfWidth - 20 // 留10mm边距
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pageContentHeight = pdfHeight - 20 // 页面内容高度
  
  // 简化分页：使用等分页与智能调整
  const pageBreaks = createSmartPageBreaks(canvas.height, pageContentHeight, imgWidth, canvas.width)
  
  let pageNumber = 1
  
  // 为每页创建裁剪后的Canvas图片
  for (let i = 0; i < pageBreaks.length; i++) {
    const yOffset = pageBreaks[i]
    
    console.log(`📖 正在添加第${pageNumber}页，Canvas Y偏移: ${yOffset}px`)
    
    if (pageNumber > 1) {
      pdf.addPage()
      console.log(`➕ 已添加新页面 (第${pageNumber}页)`)
    }
    
    // 计算当前页面的高度范围
    const nextYOffset = i < pageBreaks.length - 1 ? pageBreaks[i + 1] : canvas.height
    const pageHeightInCanvas = nextYOffset - yOffset
    
    // 创建页面裁剪Canvas
    const pageCanvas = document.createElement('canvas')
    const pageCtx = pageCanvas.getContext('2d')!
    pageCanvas.width = canvas.width
    pageCanvas.height = pageHeightInCanvas
    
    // 从原Canvas裁剪当前页面内容
    pageCtx.drawImage(
      canvas,
      0, yOffset,           // 源Canvas的起始位置
      canvas.width, pageHeightInCanvas,  // 源Canvas的裁剪尺寸
      0, 0,                 // 目标Canvas的位置
      canvas.width, pageHeightInCanvas   // 目标Canvas的尺寸
    )
    
    // 转换为图片
    const pageImgData = pageCanvas.toDataURL('image/png', 0.95)
    const pageImgHeight = (pageHeightInCanvas * imgWidth) / canvas.width
    
    // 添加到PDF
    pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, pageImgHeight)
    
    console.log(`🖼️ 第${pageNumber}页详情: Canvas区域=${yOffset}px-${nextYOffset}px (高度=${pageHeightInCanvas}px), PDF高度=${pageImgHeight}px`)
    
    pageNumber++
    
    // 避免无限循环
    if (pageNumber > 20) break
  }

  pdf.save(`${selectedMonth.value}_综合分析报表_电脑查看版.pdf`)
  
  // 恢复分页线显示状态
  showPageBreakLines.value = originalShowPageBreakLines
}

// 创建基于内容结构的智能分页断点
const createSmartPageBreaks = (canvasHeight: number, pageContentHeight: number, imgWidth: number, canvasWidth: number): number[] => {
  console.log('🎯 [DEBUG] createSmartPageBreaks 函数被调用 - 最新智能分页版本!')
  
  const pageBreaks: number[] = []
  
  // 第一页总是从顶部开始
  pageBreaks.push(0)
  
  try {
    // 优先使用手动分页标记
    if (useManualPageBreaks.value) {
      console.log('📍 使用手动分页模式')
      
      // 使用动态分页点位置
      if (pageBreakPositions.value.length > 0) {
        console.log(`🔍 使用 ${pageBreakPositions.value.length} 个动态分页点`)
        
        // 获取报表容器的高度用于转换坐标
        const reportContentElement = reportContent.value!
        const containerHeight = reportContentElement.scrollHeight
        
        // 重新构建分页点数组，确保第一页正确
        const dynamicBreaks: number[] = []
        
        pageBreakPositions.value.forEach((pageBreak, index) => {
          // 转换分页点位置到Canvas坐标
          const scrollHeightRatio = pageBreak.top / containerHeight
          const breakTopInCanvas = scrollHeightRatio * canvasHeight
          
          console.log(`📍 ${pageBreak.label}: 页面位置=${pageBreak.top}px, Canvas位置=${breakTopInCanvas}px, 容器高度=${containerHeight}px`)
          
          dynamicBreaks.push(breakTopInCanvas)
        })
        
        // 按位置排序分页点
        dynamicBreaks.sort((a, b) => a - b)
        
        // 重建页面断点：第一页从0开始，到第一个分页点结束
        pageBreaks.length = 0  // 清空数组
        pageBreaks.push(0)  // 第一页从0开始
        
        // 添加所有动态分页点
        dynamicBreaks.forEach(breakPoint => {
          pageBreaks.push(breakPoint)
        })
        
        // 计算在Canvas坐标系下的页面高度
        const pageHeightInPx = (pageContentHeight * canvasWidth) / imgWidth
        
        // 从最后一个手动分页点开始，按等分页继续分页
        let currentY = pageBreaks[pageBreaks.length - 1] + pageHeightInPx
        while (currentY < canvasHeight) {
          pageBreaks.push(currentY)
          currentY += pageHeightInPx
        }
        
        console.log('🎯 动态分页完成，分页点:', pageBreaks)
        if (pageBreaks.length > 1) {
          console.log(`📄 第一页内容：0px - ${pageBreaks[1]}px`)
        }
        
        // 验证分页点是否合理
        pageBreaks.forEach((breakPoint, index) => {
          if (index > 0) {
            const percentage = ((breakPoint / canvasHeight) * 100).toFixed(1)
            console.log(`📄 第${index + 1}页起始位置: ${breakPoint}px (占总高度${percentage}%)`)
          }
        })
        
        return pageBreaks
      }
      
      // 回退：查找静态分页标记
      const manualBreakElements = reportContent.value?.querySelectorAll('.manual-page-break') as NodeListOf<HTMLElement>
      
      if (manualBreakElements && manualBreakElements.length > 0) {
        console.log(`🔍 找到${manualBreakElements.length}个手动分页标记`)
        
        manualBreakElements.forEach((breakElement, index) => {
          const breakOffsetTop = breakElement.offsetTop
          const containerScrollHeight = reportContent.value!.scrollHeight
          
          // 转换为Canvas坐标
          const scrollHeightRatio = breakOffsetTop / containerScrollHeight
          const breakTopInCanvas = scrollHeightRatio * canvasHeight
          
          console.log(`📍 分页标记${index + 1}: DOM位置=${breakOffsetTop}px, Canvas位置=${breakTopInCanvas}px`)
          
          pageBreaks.push(breakTopInCanvas)
        })
        
        // 按位置排序分页点
        pageBreaks.sort((a, b) => a - b)
        
        // 计算在Canvas坐标系下的页面高度
        const pageHeightInPx = (pageContentHeight * canvasWidth) / imgWidth
        
        // 从最后一个手动分页点开始，按等分页继续分页
        let currentY = pageBreaks[pageBreaks.length - 1] + pageHeightInPx
        while (currentY < canvasHeight) {
          pageBreaks.push(currentY)
          currentY += pageHeightInPx
        }
        
        console.log('🎯 手动分页完成，分页点:', pageBreaks)
        return pageBreaks
      } else {
        console.log('⚠️ 未找到手动分页标记，回退到智能分页')
      }
    }
    
    // 智能分页：查找第三部分的开始位置作为第二页的起点
    const chartsSection = reportContent.value?.querySelector('.charts-section') as HTMLElement
    
    if (chartsSection && reportContent.value) {
      // 使用offsetTop获取更精确的位置（相对于容器）
      const chartsSectionTop = chartsSection.offsetTop
      const containerScrollHeight = reportContent.value.scrollHeight
      
      // 转换为Canvas坐标
      const scrollHeightRatio = chartsSectionTop / containerScrollHeight
      const chartsSectionTopInCanvas = scrollHeightRatio * canvasHeight
      
      console.log('第三部分位置详细计算:', {
        chartsSectionOffsetTop: chartsSectionTop,
        containerScrollHeight,
        scrollHeightRatio,
        chartsSectionTopInCanvas,
        canvasHeight
      })
      
      // 计算在Canvas坐标系下的页面高度
      const pageHeightInPx = (pageContentHeight * canvasWidth) / imgWidth
      
      // 检查第三部分位置是否合理（不在第一页的前10%）
      if (chartsSectionTopInCanvas > pageHeightInPx * 0.1) {
        // 重新生成分页点：第二页从第三部分开始
        // 清空之前可能添加的分页点，重新生成
        const newPageBreaks = [0]  // 第一页从0开始
        
        // 第二页从第三部分标题开始，向上调整更多以确保完整显示标题和间距
        // 增加调整量到300px，确保第三部分的标题、间距等都包含在第二页
        const secondPageStart = Math.max(chartsSectionTopInCanvas - 300, 0)
        newPageBreaks.push(secondPageStart)
        
        console.log(`🎯 智能分页: 第二页从${secondPageStart}px开始，第三部分原始位置=${chartsSectionTopInCanvas}px，向上调整了${chartsSectionTopInCanvas - secondPageStart}px`)
        
        // 从第二页开始，按等分页继续分页
        let currentY = secondPageStart + pageHeightInPx
        while (currentY < canvasHeight) {
          newPageBreaks.push(currentY)
          currentY += pageHeightInPx
        }
        
        // 替换原来的pageBreaks
        pageBreaks.length = 0  // 清空数组
        pageBreaks.push(...newPageBreaks)  // 添加新的分页点
      } else {
        // 第三部分太靠前，使用常规等分页
        let currentY = pageHeightInPx
        while (currentY < canvasHeight) {
          pageBreaks.push(currentY)
          currentY += pageHeightInPx
        }
      }
    } else {
      // 找不到第三部分，使用等分页
      const pageHeightInPx = (pageContentHeight * canvasWidth) / imgWidth
      let currentY = pageHeightInPx
      
      while (currentY < canvasHeight) {
        pageBreaks.push(currentY)
        currentY += pageHeightInPx
      }
    }
  } catch (error) {
    console.error('分页计算出错，使用兜底方案:', error)
    // 出错时使用简单等分页
    const pageHeightInPx = (pageContentHeight * canvasWidth) / imgWidth
    let currentY = pageHeightInPx
    
    while (currentY < canvasHeight) {
      pageBreaks.push(currentY)
      currentY += pageHeightInPx
    }
  }
  
  console.log('🔍 最终分页信息详细:', {
    pageBreaks,
    totalPages: pageBreaks.length,
    canvasHeight,
    pageContentHeight,
    每页高度像素: (pageContentHeight * canvasWidth) / imgWidth
  })
  
  // 详细打印每个分页点
  pageBreaks.forEach((breakPoint, index) => {
    console.log(`📄 第${index + 1}页起始位置: ${breakPoint}px (占总高度${((breakPoint / canvasHeight) * 100).toFixed(1)}%)`)
  })
  
  return pageBreaks
}







// 导出A4打印版（重新排版，五号字体）
const exportPrintVersion = async (html2canvas: any, jsPDF: any) => {
  console.log('📄 [A4打印版] 开始生成A4打印版PDF...')
  
  exporting.value = true
  
  try {
    // 创建A4打印版容器
    const printContainer = await createA4PrintContainer()
    
    if (!printContainer) {
      ElMessage.error('创建打印版布局失败')
      return
    }
    
    // 将容器临时添加到DOM（不可见）
    printContainer.style.position = 'absolute'
    printContainer.style.left = '-9999px'
    printContainer.style.top = '0'
    printContainer.style.width = '210mm'  // A4宽度
    printContainer.style.background = 'white'
    document.body.appendChild(printContainer)
    
    // 等待图表渲染完成
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 2000)) // 增加等待时间确保图表渲染完成
    
    // 使用html2canvas生成图片
    const canvas = await html2canvas(printContainer, {
      scale: 2.5,  // 进一步提高清晰度
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true, // 改善文字渲染
      foreignObjectRendering: false, // 禁用以提高兼容性
      imageTimeout: 15000, // 增加超时时间
      removeContainer: true, // 自动清理
      windowWidth: 794,  // A4宽度（210mm = 794px at 96dpi）
      windowHeight: 1123  // A4高度（297mm = 1123px at 96dpi）
    })
    
    // 创建PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png', 1.0) // 最高质量
    
    // A4尺寸
    const pdfWidth = 210
    const pdfHeight = 297
    const margin = 10
    const contentWidth = pdfWidth - 2 * margin
    const contentHeight = pdfHeight - 2 * margin
    
    // 计算图片在PDF中的尺寸
    const imgWidth = contentWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // 自动分页
    let pageNumber = 1
    let yPosition = 0

    while (yPosition < imgHeight) {
      if (pageNumber > 1) {
      pdf.addPage()
      }
      
      // 创建当前页的裁剪Canvas
      const pageCanvas = document.createElement('canvas')
      const pageCtx = pageCanvas.getContext('2d')!
      
      const sourceY = yPosition * (canvas.width / imgWidth)
      const sourceHeight = Math.min(
        contentHeight * (canvas.width / imgWidth),
        canvas.height - sourceY
      )
      
      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeight
      
      // 裁剪当前页内容
      pageCtx.drawImage(
        canvas,
        0, sourceY,      // 源位置
        canvas.width, sourceHeight,  // 源尺寸
        0, 0,            // 目标位置
        canvas.width, sourceHeight   // 目标尺寸
      )
      
      // 添加到PDF
      const pageImgData = pageCanvas.toDataURL('image/png', 1.0) // 最高质量
      const pageImgHeight = (sourceHeight * imgWidth) / canvas.width
      
      pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight)
      
      yPosition += contentHeight
      pageNumber++
      
      // 防止无限循环
      if (pageNumber > 50) break
    }
    
    // 清理DOM
    document.body.removeChild(printContainer)
    
    // 保存PDF
    pdf.save(`${selectedMonth.value}_综合分析报表_A4打印版.pdf`)
    
    ElMessage.success('A4打印版PDF生成成功！')

  } catch (error) {
    console.error('生成A4打印版PDF失败:', error)
    ElMessage.error('生成A4打印版PDF失败，请重试')
  } finally {
    exporting.value = false
  }
}















// 工具函数
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('zh-CN', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })
}

// 获取指标样式类
const getIndicatorClass = (value: number): string => {
  if (value >= 80) return 'indicator-excellent'
  if (value >= 70) return 'indicator-good'
  if (value >= 60) return 'indicator-average'
  return 'indicator-poor'
}

// 获取指标等级
const getIndicatorLevel = (value: number): string => {
  if (value >= 80) return '优秀'
  if (value >= 70) return '良好'
  if (value >= 60) return '一般'
  return '待改进'
}

// 获取指标标签类型（用于el-tag）
const getIndicatorTagType = (value: number): 'success' | 'primary' | 'warning' | 'danger' => {
  if (value >= 80) return 'success'
  if (value >= 70) return 'primary'
  if (value >= 60) return 'warning'
  return 'danger'
}

// 获取分值详细分解
const getScoreBreakdown = () => {
  if (!reportData.value.managementSnapshot?.indicators) return []
  
  const indicators = reportData.value.managementSnapshot.indicators
  const breakdown = [
    {
      dimension: '标准一致性',
      score: indicators['标准一致性'] || 0,
      description: '科室与车队在问题识别和处理上的协调程度，重点关注方向一致性和合理差异性',
      suggestion: indicators['标准一致性'] < 70 ? '统一考核标准，加强部门协调' : '保持标准一致性'
    },
    {
      dimension: '考核覆盖率',
      score: indicators['考核覆盖率'] || 0,
      description: '考核覆盖在岗人员的比例，反映管理的全面性',
      suggestion: indicators['考核覆盖率'] < 70 ? '提高考核频次，扩大覆盖面' : '维持良好覆盖率'
    },
    {
      dimension: '管理严格度',
      score: indicators['管理严格度'] || 0,
      description: '相对于历史水平的严格程度，反映管理标准的变化',
      suggestion: indicators['管理严格度'] < 70 ? '适度提高管理标准' : '保持合理严格度'
    },
    {
      dimension: '问题识别力',
      score: indicators['问题识别力'] || 0,
      description: '发现和识别问题的能力，反映管理的敏感性',
      suggestion: indicators['问题识别力'] < 70 ? '提升问题识别培训' : '保持识别能力'
    },
    {
      dimension: '管理均衡性',
      score: indicators['管理均衡性'] || 0,
      description: '各部门管理力度的均衡程度，反映管理的公平性',
      suggestion: indicators['管理均衡性'] < 70 ? '平衡各部门管理力度' : '保持管理均衡'
    }
  ]
  
  return breakdown
}

// 获取平均分
const getAverageScore = () => {
  if (!reportData.value.managementSnapshot?.indicators) return 0
  
  const indicators = reportData.value.managementSnapshot.indicators
  const values = Object.values(indicators) as number[]
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round(sum / values.length)
}

// 手动结论分析相关方法
const saveConclusionAnalysis = async () => {
  if (!conclusionContent.value.trim()) {
    ElMessage.warning('请输入结论分析内容')
    return
  }

  savingConclusion.value = true
  
  try {
    // 保存结论分析（这里可以保存到本地存储或发送到服务器）
    const conclusion = {
      content: conclusionContent.value,
      monthKey: selectedMonth.value,
      updateTime: new Date().toLocaleString('zh-CN'),
      author: '当前用户' // 实际应用中可以从用户信息获取
    }

    // 保存到本地存储
    const key = `conclusion_${selectedMonth.value}`
    localStorage.setItem(key, JSON.stringify(conclusion))
    
    savedConclusion.value = conclusion
    showConclusionEditor.value = false
    editingConclusion.value = false
    
    ElMessage.success('结论分析保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    savingConclusion.value = false
  }
}

const cancelConclusionEdit = () => {
  conclusionContent.value = savedConclusion.value?.content || ''
  showConclusionEditor.value = false
  editingConclusion.value = false
  selectedTemplate.value = ''
}

const editSavedConclusion = () => {
  conclusionContent.value = savedConclusion.value?.content || ''
  editingConclusion.value = true
}

const applyTemplate = (templateType: string) => {
  const templates = {
    personnel: `### 人员管理分析

**现状分析：**
本月在岗人员${reportData.value.coreMetrics?.find((m: any) => m.key === 'onDuty')?.value || 0}人，人员配备相对稳定。

**问题识别：**
1. 部门间人员配备存在不平衡现象
2. 新入职人员培训需要加强

**改进建议：**
1. 优化人员配置，平衡各部门工作负荷
2. 加强新员工入职培训，提升整体素质
3. 建立人才储备机制，应对人员流动

**预期效果：**
通过以上措施，预计可提升整体工作效率10-15%。`,

    assessment: `### 考核质量分析

**现状分析：**
本月共完成考核记录${reportData.value.coreMetrics?.find((m: any) => m.key === 'assessmentCount')?.value || 0}条，考核覆盖面广。

**问题识别：**
1. 考核标准需要进一步统一
2. 考核结果应用有待加强

**改进建议：**
1. 制定更加详细的考核标准和流程
2. 加强考核员培训，提高考核质量
3. 建立考核结果应用机制

**预期效果：**
提升考核公平性和有效性，促进管理水平整体提升。`,

    improvement: `### 问题改进建议

**主要问题：**
1. [请根据报表数据填写具体问题]
2. [请根据报表数据填写具体问题]

**原因分析：**
1. [分析问题产生的根本原因]
2. [分析问题产生的根本原因]

**改进措施：**
1. 短期措施：[立即可执行的改进措施]
2. 中期措施：[需要一定时间的改进措施]
3. 长期措施：[需要长期坚持的改进措施]

**跟踪机制：**
建立问题改进跟踪台账，定期检查改进效果。`,

    comprehensive: `### 综合评价

**整体表现：**
本月各项指标运行平稳，整体管理水平保持稳定。

**亮点分析：**
1. [突出的成绩和表现]
2. [值得推广的经验做法]

**不足之处：**
1. [需要改进的方面]
2. [存在的问题和挑战]

**下月重点：**
1. [下月需要重点关注的工作]
2. [需要持续改进的方向]

**总体建议：**
继续保持良好态势，重点解决存在问题，不断提升管理水平。`
  }

  if (templates[templateType as keyof typeof templates]) {
    conclusionContent.value = templates[templateType as keyof typeof templates]
  }
}

const loadSavedConclusion = () => {
  if (!selectedMonth.value) return
  
  const key = `conclusion_${selectedMonth.value}`
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      savedConclusion.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载保存的结论失败:', error)
    }
  } else {
    savedConclusion.value = null
  }
}

// 分页控制函数
const addPageBreak = () => {
  const newId = `break-${Date.now()}`
  const newLabel = `分页点 ${pageBreakPositions.value.length + 1}`
  
  // 默认添加在报表中间位置
  const defaultTop = 500 + pageBreakPositions.value.length * 200
  
  pageBreakPositions.value.push({
    id: newId,
    top: defaultTop,
    label: newLabel
  })
  
  manualPageBreaks.value.push(newId)
  
  // 保存分页设置
  savePageBreakSettings()
  
  ElMessage.success(`已添加 ${newLabel}`)
}

const clearAllPageBreaks = () => {
  pageBreakPositions.value = []
  manualPageBreaks.value = []
  
  // 保存分页设置
  savePageBreakSettings()
  
  ElMessage.success('已清空所有分页点')
}

const removePageBreak = (id: string) => {
  const index = pageBreakPositions.value.findIndex(p => p.id === id)
  if (index > -1) {
    pageBreakPositions.value.splice(index, 1)
    manualPageBreaks.value = manualPageBreaks.value.filter(breakId => breakId !== id)
    
    // 保存分页设置
    savePageBreakSettings()
    
    ElMessage.success('已删除分页点')
  }
}

const updatePageBreakPosition = (id: string, newTop: number) => {
  const pageBreak = pageBreakPositions.value.find(p => p.id === id)
  if (pageBreak) {
    pageBreak.top = newTop
    
    // 保存分页设置
    savePageBreakSettings()
  }
}

// 拖拽分页点功能
let dragData = { id: '', startY: 0, startTop: 0 }

const startDragPageBreak = (id: string, event: MouseEvent) => {
  isDraggingPageBreak.value = true
  dragData.id = id
  dragData.startY = event.clientY
  
  const pageBreak = pageBreakPositions.value.find(p => p.id === id)
  if (pageBreak) {
    dragData.startTop = pageBreak.top
  }
  
  document.addEventListener('mousemove', onDragPageBreak)
  document.addEventListener('mouseup', stopDragPageBreak)
  event.preventDefault()
}

const onDragPageBreak = (event: MouseEvent) => {
  if (!isDraggingPageBreak.value) return
  
  const deltaY = event.clientY - dragData.startY
  const newTop = Math.max(0, dragData.startTop + deltaY)
  
  updatePageBreakPosition(dragData.id, newTop)
}

const stopDragPageBreak = () => {
  isDraggingPageBreak.value = false
  document.removeEventListener('mousemove', onDragPageBreak)
  document.removeEventListener('mouseup', stopDragPageBreak)
  
  // 拖拽结束后保存分页设置
  savePageBreakSettings()
}

// 初始化和自动定位功能
const updateDefaultPageBreakPosition = () => {
  if (reportContent.value && pageBreakPositions.value.length > 0) {
    // 查找管理力度分析区域
    const managementSection = reportContent.value.querySelector('.management-analysis-section')
    if (managementSection) {
      const sectionBottom = (managementSection as HTMLElement).offsetTop + (managementSection as HTMLElement).offsetHeight + 20
      
      // 更新第一个分页点位置
      pageBreakPositions.value[0].top = sectionBottom
      
      console.log(`🎯 已自动设置分页点位置: ${sectionBottom}px`)
    }
  }
}

// 在报表数据加载后自动调整分页点位置
const autoAdjustPageBreaks = () => {
  setTimeout(() => {
    updateDefaultPageBreakPosition()
  }, 500)
}

// 分页设置保存和加载
const savePageBreakSettings = () => {
  if (!selectedMonth.value) return
  
  const settings = {
    useManualPageBreaks: useManualPageBreaks.value,
    showPageBreakLines: showPageBreakLines.value,
    pageBreakPositions: pageBreakPositions.value,
    manualPageBreaks: manualPageBreaks.value,
    saveTime: new Date().toISOString()
  }
  
  const key = `pageBreakSettings_${selectedMonth.value}`
  localStorage.setItem(key, JSON.stringify(settings))
  
  console.log(`💾 已保存 ${selectedMonth.value} 的分页设置`)
}

const loadPageBreakSettings = () => {
  if (!selectedMonth.value) return
  
  const key = `pageBreakSettings_${selectedMonth.value}`
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      
      useManualPageBreaks.value = settings.useManualPageBreaks ?? true
      showPageBreakLines.value = settings.showPageBreakLines ?? true
      pageBreakPositions.value = settings.pageBreakPositions ?? [
        { id: 'break-after-management', top: 0, label: '分页点 1' }
      ]
      manualPageBreaks.value = settings.manualPageBreaks ?? ['break-after-management']
      
      console.log(`📂 已加载 ${selectedMonth.value} 的分页设置，包含 ${pageBreakPositions.value.length} 个分页点`)
    } catch (error) {
      console.error('加载分页设置失败:', error)
      // 使用默认设置
      resetToDefaultPageBreakSettings()
    }
  } else {
    console.log(`📂 ${selectedMonth.value} 暂无保存的分页设置，使用默认值`)
    resetToDefaultPageBreakSettings()
  }
}

const resetToDefaultPageBreakSettings = () => {
  pageBreakPositions.value = [
    { id: 'break-after-management', top: 0, label: '分页点 1' }
  ]
  manualPageBreaks.value = ['break-after-management']
}

// 创建A4打印版专用布局
const createA4PrintContainer = async (): Promise<HTMLElement | null> => {
  console.log('🖨️ [A4打印版] 创建专用打印布局...')
  
  try {
    // 创建打印容器
    const container = document.createElement('div')
    container.className = 'a4-print-container'
    container.style.cssText = `
      width: 210mm;
      padding: 15mm;
      font-family: "宋体", SimSun, serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      background: white;
      box-sizing: border-box;
      orphans: 3;
      widows: 3;
    `
    
    // 生成标题
    const title = document.createElement('h1')
    title.style.cssText = `
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 20px 0;
    `
    title.textContent = `${selectedMonth.value} 列车长月度报表`
    container.appendChild(title)
    
    // 生成副标题
    const subtitle = document.createElement('p')
    subtitle.style.cssText = `
      text-align: center;
      font-size: 12px;
      color: #666;
      margin: 0 0 30px 0;
    `
    subtitle.textContent = `生成时间：${new Date().toLocaleString('zh-CN')} | 数据来源：列车长考核管理系统`
    container.appendChild(subtitle)
    
    // 1. 核心指标部分
    const coreMetricsSection = createPrintCoreMetrics()
    container.appendChild(coreMetricsSection)
    
    // 2. 管理力度分析部分
    const managementSection = createPrintManagementAnalysis()
    container.appendChild(managementSection)
    
    // 3. 图表部分（简化版）
    const chartsSection = await createPrintCharts()
    container.appendChild(chartsSection)
    
    // 4. 数据表格部分
    const tablesSection = createPrintTables()
    container.appendChild(tablesSection)
    
    // 5. 结论部分
    const conclusionSection = createPrintConclusion()
    container.appendChild(conclusionSection)
    
    return container
    
  } catch (error) {
    console.error('创建A4打印布局失败:', error)
    return null
  }
}

// 创建打印版核心指标
const createPrintCoreMetrics = (): HTMLElement => {
  const section = document.createElement('div')
  section.style.cssText = 'margin-bottom: 30px; page-break-inside: avoid;'
  
  const header = document.createElement('h2')
  header.style.cssText = 'font-size: 16px; font-weight: bold; margin: 0 0 15px 0;'
  header.textContent = '一、核心指标概览'
  section.appendChild(header)
  
  const table = document.createElement('table')
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  `
  
  // 表头
  const thead = document.createElement('thead')
  thead.innerHTML = `
    <tr>
      <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">指标名称</th>
      <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">数值</th>
      <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">单位</th>
      <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">环比</th>
    </tr>
  `
  table.appendChild(thead)
  
  // 表体
  const tbody = document.createElement('tbody')
  reportData.value.coreMetrics?.forEach((metric: any) => {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td style="border: 1px solid #ddd; padding: 8px;">${metric.label}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${metric.value}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${metric.unit || '-'}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${metric.trend}</td>
    `
    tbody.appendChild(row)
  })
  table.appendChild(tbody)
  
  section.appendChild(table)
  return section
}

// 创建打印版管理力度分析
const createPrintManagementAnalysis = (): HTMLElement => {
  const section = document.createElement('div')
  section.style.cssText = 'margin-bottom: 30px; page-break-inside: avoid;'
  
  const header = document.createElement('h2')
  header.style.cssText = 'font-size: 16px; font-weight: bold; margin: 0 0 15px 0;'
  header.textContent = '二、管理力度智能分析'
  section.appendChild(header)
  
  if (reportData.value.managementSnapshot) {
    // 综合评分
    const scoreDiv = document.createElement('div')
    scoreDiv.style.cssText = 'margin-bottom: 15px; font-size: 14px;'
    scoreDiv.innerHTML = `
      <strong>综合评分：</strong>
      <span style="font-size: 18px; color: #409eff; font-weight: bold;">
        ${reportData.value.managementSnapshot.overallScore}分
      </span>
      <span style="color: #666;">（${reportData.value.managementSnapshot.level}）</span>
    `
    section.appendChild(scoreDiv)
    
    // 各维度得分表格
    const table = document.createElement('table')
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 10px;
    `
    
    const breakdown = getScoreBreakdown()
    const thead = document.createElement('thead')
    thead.innerHTML = `
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">评估维度</th>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; width: 80px;">得分</th>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">说明</th>
      </tr>
    `
    table.appendChild(thead)
    
    const tbody = document.createElement('tbody')
    breakdown.forEach((item: any) => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 8px;">${item.dimension}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${item.score}分</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${item.description}</td>
      `
      tbody.appendChild(row)
    })
    table.appendChild(tbody)
    
    section.appendChild(table)
  }
  
  return section
}

// 创建打印版图表（图文并茂版）
const createPrintCharts = async (): Promise<HTMLElement> => {
  const section = document.createElement('div')
  section.style.cssText = 'margin-bottom: 30px;'
  
  const header = document.createElement('h2')
  header.style.cssText = 'font-size: 16px; font-weight: bold; margin: 0 0 15px 0; page-break-after: avoid;'
  header.textContent = '三、数据分析图表'
  section.appendChild(header)
  
  // 创建图表容器
  const chartsContainer = document.createElement('div')
  chartsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 40px;'
  
  // 1. 扣分类别分布饼图
  const pieSection = await createPrintPieChart()
  chartsContainer.appendChild(pieSection)
  
  // 添加分页控制
  const pageBreak1 = document.createElement('div')
  pageBreak1.style.cssText = 'page-break-before: always; height: 1px; visibility: hidden;'
  chartsContainer.appendChild(pageBreak1)
  
  // 2. 部门扣分对比柱状图
  const barSection = await createPrintBarChart()
  chartsContainer.appendChild(barSection)
  
  // 添加分页控制
  const pageBreak2 = document.createElement('div')
  pageBreak2.style.cssText = 'page-break-before: always; height: 1px; visibility: hidden;'
  chartsContainer.appendChild(pageBreak2)
  
  // 3. 评分离散度分析图
  const dispersionSection = await createPrintDispersionChart()
  chartsContainer.appendChild(dispersionSection)
  
  // 4. 关键数据摘要
  const summarySection = createPrintDataSummary()
  chartsContainer.appendChild(summarySection)
  
  section.appendChild(chartsContainer)
  return section
}



// 创建打印版饼图
const createPrintPieChart = async (): Promise<HTMLElement> => {
  const container = document.createElement('div')
  container.style.cssText = 'page-break-inside: avoid; break-inside: avoid; margin-bottom: 30px; min-height: 450px; page-break-before: auto; page-break-after: auto;'
  
  const title = document.createElement('h3')
  title.style.cssText = 'font-size: 14px; font-weight: bold; margin: 0 0 10px 0;'
  title.textContent = '3.1 扣分类别分布情况'
  container.appendChild(title)
  
  const chartContainer = document.createElement('div')
  chartContainer.style.cssText = 'width: 100%; height: 350px; background: #f9f9f9; border: 1px solid #ddd; page-break-inside: avoid; break-inside: avoid; margin: 10px 0; box-sizing: border-box;'
  
  // 创建饼图 - 高清晰度渲染 (350px高度)
  const canvas = document.createElement('canvas')
  canvas.width = 1200  // 提高分辨率
  canvas.height = 525  // 保持1200:525 = 800:350的比例
  canvas.style.cssText = 'width: 100%; height: 100%;'
  chartContainer.appendChild(canvas)
  
  // 渲染饼图
  await renderPrintPieChart(canvas)
  
  container.appendChild(chartContainer)
  
  const description = document.createElement('p')
  description.style.cssText = 'font-size: 12px; margin: 10px 0 0 0; line-height: 1.6;'
  description.textContent = '该饼图显示了各类别扣分的占比分布，可以快速识别主要问题类型。'
  container.appendChild(description)
  
  return container
}

// 创建打印版柱状图
const createPrintBarChart = async (): Promise<HTMLElement> => {
  const container = document.createElement('div')
  container.style.cssText = 'page-break-inside: avoid; break-inside: avoid; margin-bottom: 30px; min-height: 450px; page-break-before: auto; page-break-after: auto;'
  
  const title = document.createElement('h3')
  title.style.cssText = 'font-size: 14px; font-weight: bold; margin: 0 0 10px 0;'
  title.textContent = '3.2 各部门扣分次数对比'
  container.appendChild(title)
  
  const chartContainer = document.createElement('div')
  chartContainer.style.cssText = 'width: 100%; height: 350px; background: #f9f9f9; border: 1px solid #ddd; page-break-inside: avoid; break-inside: avoid; margin: 10px 0; box-sizing: border-box;'
  
  // 创建柱状图 - 高清晰度渲染 (350px高度)
  const canvas = document.createElement('canvas')
  canvas.width = 1200  // 提高分辨率
  canvas.height = 525  // 保持1200:525 = 800:350的比例
  canvas.style.cssText = 'width: 100%; height: 100%;'
  chartContainer.appendChild(canvas)
  
  // 渲染柱状图
  await renderPrintBarChart(canvas)
  
  container.appendChild(chartContainer)
  
  const description = document.createElement('p')
  description.style.cssText = 'font-size: 12px; margin: 10px 0 0 0; line-height: 1.6;'
  description.textContent = '该柱状图对比了科室与车队的扣分频次，有助于分析管理差异。'
  container.appendChild(description)
  
  return container
}

// 创建评分离散度分析图
const createPrintDispersionChart = async (): Promise<HTMLElement> => {
  const container = document.createElement('div')
  container.style.cssText = 'page-break-inside: avoid; break-inside: avoid; margin-bottom: 30px; min-height: 450px; page-break-before: auto; page-break-after: auto;'
  
  const title = document.createElement('h3')
  title.style.cssText = 'font-size: 14px; font-weight: bold; margin: 0 0 10px 0;'
  title.textContent = '3.3 评分离散度分析'
  container.appendChild(title)
  
  const chartContainer = document.createElement('div')
  chartContainer.style.cssText = 'width: 100%; height: 350px; background: #f9f9f9; border: 1px solid #ddd; page-break-inside: avoid; break-inside: avoid; margin: 10px 0; box-sizing: border-box;'
  
  // 创建离散度图 - 高清晰度渲染 (350px高度)
  const canvas = document.createElement('canvas')
  canvas.width = 1200  // 提高分辨率
  canvas.height = 525  // 保持1200:525 = 800:350的比例
  canvas.style.cssText = 'width: 100%; height: 100%;'
  chartContainer.appendChild(canvas)
  
  // 渲染离散度分析图
  await renderPrintDispersionChart(canvas)
  
  container.appendChild(chartContainer)
  
  const description = document.createElement('p')
  description.style.cssText = 'font-size: 12px; margin: 10px 0 0 0; line-height: 1.6;'
  description.textContent = '该散点图展示了各部门评分分布情况，可以直观看出评分的集中度和离散程度，有助于分析管理均衡性。'
  container.appendChild(description)
  
  return container
}

// 创建数据摘要
const createPrintDataSummary = (): HTMLElement => {
  const container = document.createElement('div')
  container.style.cssText = 'background: #f5f5f5; padding: 15px; border-radius: 4px; page-break-inside: avoid; break-inside: avoid; margin-bottom: 30px; min-height: 180px; box-sizing: border-box;'
  
  const title = document.createElement('h3')
  title.style.cssText = 'font-size: 14px; font-weight: bold; margin: 0 0 10px 0;'
  title.textContent = '3.4 关键数据摘要'
  container.appendChild(title)
  
  const summaryList = document.createElement('ul')
  summaryList.style.cssText = 'margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.8;'
  summaryList.innerHTML = `
    <li><strong>考核覆盖：</strong>本月共完成考核 ${reportData.value.coreMetrics?.find((m: any) => m.key === 'assessmentCount')?.value || 0} 条</li>
    <li><strong>人员规模：</strong>在岗人员 ${reportData.value.coreMetrics?.find((m: any) => m.key === 'onDuty')?.value || 0} 人</li>
    <li><strong>奖励水平：</strong>人均奖励 ${reportData.value.coreMetrics?.find((m: any) => m.key === 'avgReward')?.value || 0} 元</li>
    <li><strong>问题情况：</strong>总扣分 ${reportData.value.coreMetrics?.find((m: any) => m.key === 'totalDeductions')?.value || 0} 分</li>
    <li><strong>管理评级：</strong>${reportData.value.managementSnapshot?.level || '待评估'} (${reportData.value.managementSnapshot?.overallScore || 0}分)</li>
  `
  container.appendChild(summaryList)
  
  return container
}



// 渲染打印版饼图
const renderPrintPieChart = async (canvas: HTMLCanvasElement): Promise<void> => {
  try {
    const chartInstance = echarts.init(canvas, null, {
      devicePixelRatio: 2, // 提高设备像素比
      renderer: 'canvas'
    })
    
    // 模拟扣分类别数据
    const categoryData = [
      { name: '安全问题', value: 45, color: '#ff6b6b' },
      { name: '服务质量', value: 28, color: '#4ecdc4' },
      { name: '规章制度', value: 15, color: '#45b7d1' },
      { name: '设备维护', value: 8, color: '#f9ca24' },
      { name: '其他', value: 4, color: '#ddd' }
    ]
    
    const option = {
      series: [{
        type: 'pie',
        radius: ['30%', '70%'],
        center: ['50%', '50%'],
        data: categoryData,
        label: {
          fontSize: 16, // 增大字体
          fontWeight: 700,
          color: '#333',
          formatter: '{b}\n{d}%'
        },
        labelLine: {
          length: 15,
          length2: 8,
          lineStyle: {
            width: 2
          }
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }],
      textStyle: {
        fontSize: 14,
        fontWeight: 700
      }
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('渲染打印版饼图失败:', error)
  }
}

// 渲染打印版柱状图
const renderPrintBarChart = async (canvas: HTMLCanvasElement): Promise<void> => {
  try {
    const chartInstance = echarts.init(canvas, null, {
      devicePixelRatio: 2, // 提高设备像素比
      renderer: 'canvas'
    })
    
    // 模拟部门扣分数据
    const departments = ['客运', '机务', '车辆', '工务', '电务', '供电']
    const officeData = [25, 18, 22, 15, 12, 8]  // 科室扣分
    const trainData = [30, 20, 25, 18, 14, 10]  // 车队扣分
    
    const option = {
      grid: {
        left: '15%',
        right: '10%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: departments,
        axisLabel: {
          fontSize: 14, // 增大字体
          rotate: 0,
          color: '#333'
        },
        axisLine: {
          lineStyle: {
            width: 2
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '扣分次数',
        nameTextStyle: {
          fontSize: 14,
          color: '#333'
        },
        axisLabel: {
          fontSize: 12,
          color: '#333'
        },
        axisLine: {
          lineStyle: {
            width: 2
          }
        },
        splitLine: {
          lineStyle: {
            width: 1,
            color: '#e0e0e0'
          }
        }
      },
      series: [
        {
          name: '科室扣分',
          type: 'bar',
          data: officeData,
          itemStyle: {
            color: '#ff6b6b',
            borderWidth: 1,
            borderColor: '#fff'
          },
          barWidth: '35%'
        },
        {
          name: '车队扣分',
          type: 'bar',
          data: trainData,
          itemStyle: {
            color: '#4ecdc4',
            borderWidth: 1,
            borderColor: '#fff'
          },
          barWidth: '35%'
        }
      ],
      legend: {
        top: '5%',
        textStyle: {
          fontSize: 14,
          color: '#333'
        }
      },
      textStyle: {
        fontSize: 12
      }
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('渲染打印版柱状图失败:', error)
  }
}

// 渲染打印版评分离散度分析图
const renderPrintDispersionChart = async (canvas: HTMLCanvasElement): Promise<void> => {
  try {
    const chartInstance = echarts.init(canvas, null, {
      devicePixelRatio: 2, // 提高设备像素比
      renderer: 'canvas'
    })
    
    // 模拟评分数据
    const scatterData = [
      // 部门, 平均分, 标准差
      ['客运科', 82, 12], ['机务科', 78, 15], ['车辆科', 85, 8],
      ['工务科', 76, 18], ['电务科', 88, 6], ['供电科', 90, 4],
      ['客运队', 75, 20], ['机务队', 73, 22], ['车辆队', 81, 11],
      ['工务队', 69, 25], ['电务队', 86, 7], ['供电队', 87, 9]
    ]
    
    const option = {
      grid: {
        left: '15%',
        right: '10%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        name: '平均得分',
        nameTextStyle: {
          fontSize: 14,
          color: '#333'
        },
        axisLabel: {
          fontSize: 12,
          color: '#333'
        },
        axisLine: {
          lineStyle: {
            width: 2
          }
        },
        splitLine: {
          lineStyle: {
            width: 1,
            color: '#e0e0e0'
          }
        },
        min: 60,
        max: 95
      },
      yAxis: {
        type: 'value',
        name: '评分标准差',
        nameTextStyle: {
          fontSize: 14,
          color: '#333'
        },
        axisLabel: {
          fontSize: 12,
          color: '#333'
        },
        axisLine: {
          lineStyle: {
            width: 2
          }
        },
        splitLine: {
          lineStyle: {
            width: 1,
            color: '#e0e0e0'
          }
        },
        min: 0,
        max: 30
      },
      series: [{
        name: '部门评分分布',
        type: 'scatter',
        data: scatterData.map(item => [item[1], item[2]]),
        symbolSize: 12, // 增大散点尺寸
        itemStyle: {
          color: '#4285f4',
          borderColor: '#fff',
          borderWidth: 2
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }],
      tooltip: {
        formatter: (params: any) => {
          const dataIndex = params.dataIndex
          const dept = scatterData[dataIndex]
          return `${dept[0]}<br/>平均分: ${dept[1]}<br/>标准差: ${dept[2]}`
        },
        textStyle: {
          fontSize: 12
        }
      },
      textStyle: {
        fontSize: 12
      }
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('渲染打印版散点图失败:', error)
  }
}

// 创建打印版表格
const createPrintTables = (): HTMLElement => {
  const section = document.createElement('div')
  section.style.cssText = 'page-break-inside: avoid; margin-bottom: 30px; min-height: 300px;'
  
  const header = document.createElement('h2')
  header.style.cssText = 'font-size: 16px; font-weight: bold; margin: 0 0 15px 0;'
  header.textContent = '四、详细数据分析'
  section.appendChild(header)
  
  // 部门统计表
  if (reportData.value.departmentStats?.length > 0) {
    const table = document.createElement('table')
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 10px;
    `
    
    const thead = document.createElement('thead')
    thead.innerHTML = `
      <tr>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">部门</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">在岗人数</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">总奖励</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">人均奖励</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">考核次数</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">总扣分</th>
        <th style="border: 1px solid #ddd; padding: 6px; background: #f5f5f5;">平均分</th>
      </tr>
    `
    table.appendChild(thead)
    
    const tbody = document.createElement('tbody')
    reportData.value.departmentStats.forEach((dept: any) => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 6px;">${dept.department}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.onDutyCount}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(dept.totalReward)}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatCurrency(dept.avgReward)}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.assessmentCount}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.totalDeductions}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${dept.avgScore.toFixed(1)}</td>
      `
      tbody.appendChild(row)
    })
    table.appendChild(tbody)
    
    section.appendChild(table)
  }
  
  return section
}

// 创建打印版结论
const createPrintConclusion = (): HTMLElement => {
  const section = document.createElement('div')
  section.style.cssText = 'page-break-inside: avoid; margin-bottom: 30px; min-height: 200px;'
  
  const header = document.createElement('h2')
  header.style.cssText = 'font-size: 16px; font-weight: bold; margin: 0 0 15px 0;'
  header.textContent = '五、分析结论与建议'
  section.appendChild(header)
  
  if (savedConclusion.value?.content) {
    const content = document.createElement('div')
    content.style.cssText = 'font-size: 12px; line-height: 1.8;'
    content.innerHTML = savedConclusion.value.content
    section.appendChild(content)
  } else {
    const placeholder = document.createElement('p')
    placeholder.style.cssText = 'font-size: 12px; color: #999; font-style: italic;'
    placeholder.textContent = '（暂无结论分析）'
    section.appendChild(placeholder)
  }
  
  return section
}

// 组件加载时自动选择上个月
onMounted(async () => {
  await mainStore.loadDatabase();
  initializeMonthSelection(availableMonths.value);

  // 如果成功选择了月份，则触发报表生成
  if (selectedMonth.value) {
    handleMonthChange();
  }
});
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.page-header .description {
  font-size: 1.1rem;
  opacity: 0.95;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.control-panel {
  margin-bottom: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: none;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-item label {
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.control-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.progress-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #6b7280;
  font-size: 14px;
}

.report-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.report-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.report-header h1 {
  font-size: 2rem;
  color: #1f2937;
  margin: 0 0 10px 0;
  font-weight: 700;
}

.report-meta {
  display: flex;
  justify-content: center;
  gap: 30px;
  color: #6b7280;
  font-size: 14px;
}

.metrics-overview {
  margin-bottom: 40px;
}

.metrics-overview h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 20px;
  font-weight: 600;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.metric-card.metric-new {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  border-color: #f59e0b;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 5px;
}

.metric-unit {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 10px;
}

.metric-trend {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

.trend-up {
  background: #dcfce7;
  color: #166534;
}

.trend-down {
  background: #fee2e2;
  color: #991b1b;
}

.trend-new {
  background: #ddd6fe;
  color: #5b21b6;
}

.management-analysis-section {
  margin-bottom: 40px;
}

.management-analysis-section h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 20px;
  font-weight: 600;
}

.management-overview-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.management-score {
  text-align: center;
  padding: 20px 0;
}

.score-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-bottom: 15px;
  position: relative;
  background: conic-gradient(from 0deg, #10b981, #34d399, #6ee7b7, #a7f3d0);
}

.score-circle.score-优秀 {
  background: conic-gradient(from 0deg, #10b981, #34d399, #6ee7b7);
}

.score-circle.score-良好 {
  background: conic-gradient(from 0deg, #3b82f6, #60a5fa, #93c5fd);
}

.score-circle.score-一般 {
  background: conic-gradient(from 0deg, #f59e0b, #fbbf24, #fcd34d);
}

.score-circle.score-待改进 {
  background: conic-gradient(from 0deg, #ef4444, #f87171, #fca5a5);
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.score-unit {
  font-size: 1rem;
  color: white;
  opacity: 0.9;
}

.score-level {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 10px;
}

.score-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.management-radar-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.indicators-detail-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.indicator-item {
  text-align: center;
  padding: 15px 10px;
  border-radius: 8px;
  background: #f9fafb;
  margin: 0 5px;
}

.indicator-name {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.indicator-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 5px;
}

.indicator-excellent {
  color: #059669;
}

.indicator-good {
  color: #2563eb;
}

.indicator-average {
  color: #d97706;
}

.indicator-poor {
  color: #dc2626;
}

.indicator-level {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.charts-section {
  margin-bottom: 40px;
}

.charts-section h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 25px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.charts-section h2::before {
  content: '📊';
  font-size: 1.2rem;
}

.chart-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.chart-desc {
  font-size: 12px;
  color: #6b7280;
  font-weight: normal;
}

.tables-section {
  margin-bottom: 40px;
}

.tables-section h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 20px;
  font-weight: 600;
}

.table-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.table-card h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
}

.conclusion-section {
  margin-bottom: 40px;
}

.conclusion-section h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 20px;
  font-weight: 600;
}

.conclusion-content {
  display: grid;
  gap: 25px;
}

.conclusion-item {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  border-left: 4px solid #3b82f6;
}

.conclusion-item h4 {
  margin: 0 0 15px 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

.conclusion-item p {
  margin: 0 0 15px 0;
  color: #4b5563;
  line-height: 1.6;
}

.suggestions {
  background: #f8fafc;
  border-radius: 8px;
  padding: 15px;
}

.suggestions strong {
  color: #1f2937;
  font-size: 14px;
}

.suggestions ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.suggestions li {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 5px;
}

.empty-state, .loading-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-actions {
    justify-content: center;
  }
  
  .report-meta {
    flex-direction: column;
    gap: 10px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

/* 可视化分页线样式 */
.report-content {
  position: relative;
}

.page-break-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 10;
}

.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: auto;
  cursor: move;
  transition: all 0.2s ease;
}

.page-break-line:hover {
  z-index: 20;
}

.page-break-handle {
  position: absolute;
  left: -60px;
  top: -15px;
  background: #409eff;
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  user-select: none;
}

.page-break-handle::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border: 6px solid transparent;
  border-left-color: #409eff;
}

.page-break-label {
  font-weight: 500;
}

.page-break-actions .el-button {
  width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  margin-left: 5px;
}

.page-break-dashed-line {
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    #409eff 0px,
    #409eff 10px,
    transparent 10px,
    transparent 20px
  );
  width: 100%;
  opacity: 0.8;
}

.page-break-line:hover .page-break-dashed-line {
  background: repeating-linear-gradient(
    to right,
    #f56c6c 0px,
    #f56c6c 10px,
    transparent 10px,
    transparent 20px
  );
}

.page-break-line:hover .page-break-handle {
  background: #f56c6c;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

.page-break-line:hover .page-break-handle::after {
  border-left-color: #f56c6c;
}

/* 拖拽时的样式 */
.page-break-line.dragging {
  z-index: 30;
}

.page-break-line.dragging .page-break-dashed-line {
  background: repeating-linear-gradient(
    to right,
    #67c23a 0px,
    #67c23a 10px,
    transparent 10px,
    transparent 20px
  );
}

.page-break-line.dragging .page-break-handle {
  background: #67c23a;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

.page-break-line.dragging .page-break-handle::after {
  border-left-color: #67c23a;
}

/* A4打印版专用样式 */
@media print {
  .a4-print-container {
    font-size: 14px !important;
    line-height: 1.8 !important;
    orphans: 3 !important;
    widows: 3 !important;
  }
  
  .a4-print-container table {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  .a4-print-container h1 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  
  .a4-print-container h2 {
    page-break-after: avoid !important;
    break-after: avoid !important;
    page-break-before: auto !important;
    margin-top: 20px;
  }
  
  .a4-print-container h3 {
    page-break-after: avoid !important;
    break-after: avoid !important;
    margin-bottom: 10px;
  }
  
  .a4-print-container div[style*="page-break-inside: avoid"] {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    page-break-before: auto !important;
    page-break-after: auto !important;
  }
}

/* A4预览样式 */
.a4-print-container {
  box-sizing: border-box;
}

.a4-print-container * {
  box-sizing: border-box;
}

.a4-print-container table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.a4-print-container th,
.a4-print-container td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: left;
}

.a4-print-container th {
  background: #f5f5f5;
  font-weight: bold;
}

.a4-print-container h1,
.a4-print-container h2,
.a4-print-container h3 {
  margin: 0;
  padding: 0;
}

/* 图表容器优化 */
.chart-card .el-card__body {
  padding: 0;
}

/* 新增图表特定样式 */
.chart-card[ref="categoryPieChart"] {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
}

.chart-card[ref="timeTrendChart"] {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.chart-card[ref="deductionCountChart"] {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.chart-card[ref="top10IssuesChart"] {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
}

.chart-card[ref="managementRadarChart"] {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.chart-card[ref="scoreDispersionChart"] {
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
}

/* 手动结论分析样式 */
.manual-conclusion-section {
  margin-bottom: 40px;
}

.conclusion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.conclusion-header h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin: 0;
  font-weight: 600;
}

.conclusion-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.saved-conclusion {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  border-left: 4px solid #10b981;
}

.saved-conclusion .conclusion-content {
  margin-bottom: 15px;
  line-height: 1.6;
  color: #374151;
}

.saved-conclusion .conclusion-content h3 {
  color: #1f2937;
  font-size: 1.1rem;
  margin: 20px 0 10px 0;
  font-weight: 600;
}

.saved-conclusion .conclusion-content p {
  margin-bottom: 12px;
}

.saved-conclusion .conclusion-content ul {
  margin: 10px 0 15px 20px;
}

.saved-conclusion .conclusion-content li {
  margin-bottom: 5px;
}

.conclusion-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
}

.conclusion-editor {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.editor-header {
  margin-bottom: 20px;
}

.editor-header h3 {
  color: #1f2937;
  font-size: 1.2rem;
  margin: 0;
  font-weight: 600;
}

.template-section {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.template-section label {
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.editor-content {
  margin-bottom: 20px;
}

.editor-content .el-textarea__inner {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.editor-content .el-textarea__inner:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.editor-tips {
  margin-top: 15px;
}

.editor-tips .el-alert {
  border-radius: 8px;
}

.editor-tips .el-alert__content p {
  margin: 5px 0;
  font-size: 13px;
}

.empty-conclusion {
  text-align: center;
  padding: 60px 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px dashed #d1d5db;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .conclusion-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .conclusion-actions {
    justify-content: center;
  }
  
  .template-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .template-section label {
    margin-bottom: 8px;
  }
  
  .conclusion-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

/* 评分详情样式 */
.indicators-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-calculation {
  background: #f0f9ff;
  padding: 10px 15px;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.calculation-text {
  font-size: 14px;
  color: #1e40af;
  font-weight: 500;
}

.score-summary {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-weight: 600;
  color: #374151;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f2937;
}

.summary-description {
  color: #6b7280;
  font-size: 14px;
  max-width: 300px;
}

.traditional-indicators {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .score-summary {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .summary-item {
    width: 100%;
    justify-content: space-between;
  }
  
  .calculation-text {
    font-size: 12px;
  }
}

/* 预览布局编辑器样式 */
.layout-preview-container {
  height: 80vh;
  overflow: hidden;
  background: #f5f5f5;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
}

.a4-preview-pages {
  height: calc(100% - 70px);
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.a4-preview-page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  margin: 0 auto 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  page-break-after: always;
}

.page-header {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  background: #409eff;
  color: white;
  padding: 5px 15px;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-actions {
  display: flex;
  gap: 5px;
}

.page-actions .el-button {
  width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
}

.page-actions .el-button .el-icon {
  font-size: 12px;
}

.draggable-block {
  border: 2px dashed transparent;
  cursor: move;
  transition: all 0.2s ease;
  border-radius: 4px;
  overflow: hidden;
}

.draggable-block:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.draggable-block.dragging {
  border-color: #67c23a;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  transform: rotate(2deg);
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  font-size: 12px;
  color: #409eff;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.draggable-block:hover .block-header {
  opacity: 1;
}

.block-title {
  font-weight: bold;
}

.block-actions {
  display: flex;
  gap: 5px;
}

.block-content {
  padding: 15px;
  background: white;
  min-height: 50px;
}

.block-content h1,
.block-content h2,
.block-content h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.block-content h1 {
  font-size: 24px;
  text-align: center;
}

.block-content h3 {
  font-size: 16px;
  border-bottom: 2px solid #409eff;
  padding-bottom: 5px;
}

/* 内容块交互提示 */
.draggable-block::before {
  content: '双击自动调整大小 • 拖拽移动位置';
  position: absolute;
  top: -25px;
  left: 0;
  font-size: 11px;
  color: #999;
  opacity: 0;
  transition: opacity 0.3s ease;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
}

.draggable-block:hover::before {
  opacity: 1;
}

.block-actions .el-button + .el-button {
  margin-left: 3px;
}

/* 自动调整按钮样式 */
.block-actions .el-button[title="自动调整大小"] {
  background: #f39c12;
  border-color: #f39c12;
}

.block-actions .el-button[title="自动调整大小"]:hover {
  background: #e67e22;
  border-color: #e67e22;
}

/* 预览编辑器的响应式设计 */
@media (max-width: 1200px) {
  .a4-preview-page {
    width: 150mm;
    min-height: 210mm;
    transform: scale(0.8);
    transform-origin: top center;
  }
}

@media (max-width: 768px) {
  .preview-toolbar {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }
  
  .a4-preview-page {
    width: 100mm;
    min-height: 140mm;
    transform: scale(0.6);
  }
}

/* 快速预览网格样式 */
.quick-preview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  padding: 20px;
}

.preview-item {
  text-align: center;
  padding: 15px 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.preview-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.preview-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.preview-score {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.preview-level {
  font-size: 11px;
  color: #999;
}
</style>

