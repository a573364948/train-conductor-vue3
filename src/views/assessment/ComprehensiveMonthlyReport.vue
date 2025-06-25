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
          <el-col :span="6" v-for="metric in reportData.coreMetrics" :key="metric.key">
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

      <!-- 月度考核质量分析 -->
      <div v-if="reportData.qualityAnalysis" class="quality-analysis-section">
        <h2>二、月度考核质量分析</h2>
        
        <!-- 分部门录入时效分析 & 考核与录入时间分布热度分析 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="timing-chart-card">
              <template #header>
                <h3>分部门录入时效分析</h3>
                <span class="card-desc">各部门平均录入延迟天数对比</span>
              </template>
              <div ref="timingAnalysisChart" class="timing-chart" style="height: 350px;"></div>

              <!-- 可编辑说明框 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>分析说明</strong>
                      <el-button
                        type="text"
                        size="small"
                        @click="openTextEditor('timingAnalysis')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <div v-html="chartExplanations.timingAnalysis"></div>
                  </div>
                </el-alert>
              </div>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card class="timing-comparison-card">
              <template #header>
                <h3>考核与录入时间分布热度分析</h3>
                <span class="card-desc">每天考核/录入峰值部门数对比</span>
              </template>
              <div ref="timingComparisonChart" class="timing-comparison-chart" style="height: 350px;"></div>

              <!-- 可编辑说明框 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>分析说明</strong>
                      <el-button
                        type="text"
                        size="small"
                        @click="openTextEditor('timingComparison')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <div v-html="chartExplanations.timingComparison"></div>
                  </div>
                </el-alert>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 考核力度分析 -->
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card class="assessment-intensity-card">
              <template #header>
                <h3>各部门考核力度分析</h3>
                <span class="card-desc">热力图显示各部门内不同问题类别的考核占比，颜色越深表示该类别在本部门考核中占比越高</span>
              </template>
              <div ref="assessmentIntensityHeatmap" style="width: 100%; height: 600px;"></div>

              <!-- 可编辑说明框 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>分析说明</strong>
                      <el-button
                        type="text"
                        size="small"
                        @click="openTextEditor('assessmentIntensity')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <div v-html="chartExplanations.assessmentIntensity"></div>
                  </div>
                </el-alert>
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
        
        <!-- 第一行：扣分类别分布和部门在岗人数 -->
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
                  <h3>部门在岗人数分布</h3>
                  <span class="chart-desc">各部门人员配备情况</span>

                </div>
              </template>
              <div ref="onDutyChart" style="width: 100%; height: 350px;"></div>
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

        <!-- 第三行：扣分趋势分析和评分离散度分析 -->
        <el-row :gutter="20" style="margin-top: 20px;">
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
        
        <!-- 第四行：考核质量分析 -->
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

              <!-- 可编辑说明框 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>分析说明</strong>
                      <el-button
                        type="text"
                        size="small"
                        @click="openTextEditor('assessDateDistribution')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <div v-html="chartExplanations.assessDateDistribution"></div>
                  </div>
                </el-alert>
              </div>
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

              <!-- 可编辑说明框 -->
              <div class="chart-explanation">
                <el-alert type="info" :closable="false" style="margin-top: 16px;">
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>分析说明</strong>
                      <el-button
                        type="text"
                        size="small"
                        @click="openTextEditor('entryTimingAnalysis')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <div style="font-size: 13px; line-height: 1.6;">
                    <div v-html="chartExplanations.entryTimingAnalysis"></div>
                  </div>
                </el-alert>
              </div>
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
            <el-button type="danger" @click="resetToDefaultLayout">
              <el-icon><Delete /></el-icon>
              恢复默认布局
            </el-button>
            <el-button type="warning" @click="autoAdjustAllBlocks">
              <el-icon><MagicStick /></el-icon>
              自动调整大小
            </el-button>
            <el-button type="success" @click="optimizeChartDisplay">
              <el-icon><View /></el-icon>
              优化图表显示
            </el-button>
          </div>
          <div class="toolbar-right">
            <el-button type="info" @click="addNewPage">
              <el-icon><Plus /></el-icon>
              添加页面
            </el-button>
            <el-button type="warning" @click="addTextBox">
              <el-icon><Edit /></el-icon>
              添加文本框
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
              :data-chart-type="block.chartType"
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
                    <el-button size="small" type="info" circle title="更多操作">
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <!-- 移动选项 -->
                        <el-dropdown-item
                          v-for="targetPage in previewPages"
                          :key="targetPage.id"
                          :command="`move-to-${targetPage.id}`"
                          :disabled="targetPage.id === page.id"
                        >
                          移动到第{{ targetPage.id }}页
                        </el-dropdown-item>

                        <!-- 文本框特殊操作 -->
                        <template v-if="block.blockType === 'textbox'">
                          <el-dropdown-item divided command="edit-textbox">
                            <el-icon><Edit /></el-icon>
                            编辑文本
                          </el-dropdown-item>
                          <el-dropdown-item command="delete-textbox">
                            <el-icon><Delete /></el-icon>
                            删除文本框
                          </el-dropdown-item>
                        </template>
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

    <!-- 图表说明编辑器弹窗 -->
    <el-dialog
      v-model="showTextEditor"
      title="编辑图表说明"
      width="70%"
      :top="'8vh'"
      destroy-on-close
      append-to-body
    >
      <div class="text-editor-container">
        <!-- 工具栏 -->
        <div class="editor-toolbar">
          <div class="toolbar-section">
            <label>文字格式：</label>
            <el-button-group>
              <el-button
                :type="isBold ? 'primary' : 'default'"
                size="small"
                @click="toggleBold"
                title="加粗 (Ctrl+B)"
              >
                <strong>B</strong>
              </el-button>
              <el-button
                :type="isItalic ? 'primary' : 'default'"
                size="small"
                @click="toggleItalic"
                title="斜体 (Ctrl+I)"
              >
                <em>I</em>
              </el-button>
            </el-button-group>
          </div>

          <div class="toolbar-section">
            <label>文字颜色：</label>
            <el-color-picker
              v-model="selectedColor"
              @change="applyColor"
              size="small"
              :predefine="colorPresets"
            />
          </div>

          <div class="toolbar-section">
            <label>字体大小：</label>
            <el-select
              v-model="selectedFontSize"
              @change="applyFontSize"
              size="small"
              style="width: 100px"
            >
              <el-option label="小 (12px)" value="12px" />
              <el-option label="正常 (13px)" value="13px" />
              <el-option label="中 (14px)" value="14px" />
              <el-option label="大 (16px)" value="16px" />
              <el-option label="特大 (18px)" value="18px" />
            </el-select>
          </div>
        </div>

        <!-- 编辑区域 -->
        <div class="editor-content">
          <div class="editor-input-section">
            <label>编辑内容：</label>
            <el-input
              ref="editorTextarea"
              v-model="editingText"
              type="textarea"
              :rows="8"
              placeholder="请输入图表分析说明..."
              @keydown="handleKeydown"
              @select="updateSelection"
              @click="updateSelection"
            />
          </div>

          <div class="editor-preview-section">
            <label>预览效果：</label>
            <div class="preview-content" v-html="previewHtml"></div>
          </div>
        </div>

        <!-- 快速模板 -->
        <div class="editor-templates">
          <label>快速模板：</label>
          <el-button-group>
            <el-button size="small" @click="insertTemplate('timing')">时效分析模板</el-button>
            <el-button size="small" @click="insertTemplate('quality')">质量分析模板</el-button>
            <el-button size="small" @click="insertTemplate('trend')">趋势分析模板</el-button>
            <el-button size="small" @click="insertTemplate('suggestion')">建议模板</el-button>
          </el-button-group>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button @click="clearContent" type="warning">清空内容</el-button>
          <el-button type="primary" @click="saveEdit">保存</el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, TrendCharts, MagicStick, Refresh, Edit, Check, Close, Monitor, Plus, Delete, Switch, MoreFilled, View } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useMainStore } from '@/stores'

import { useSegmentCharts } from '@/composables/useSegmentCharts'
import { useDateSelection } from '@/composables/useDate'

// Store
const mainStore = useMainStore()

// Composables

const {
  getDeductionCategoryPieChartOption,
  getTimeTrendLineChartOption,
  getDeductionCountBarChartOption,
  getTop10IssuesBarChartOption,

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

// 图表说明相关
const chartExplanations = ref({
  timingAnalysis: '时效分类标准：<span style="color: #52c41a;">5天内（优秀）</span>、<span style="color: #faad14;">6-10天（一般）</span>、<span style="color: #ff4d4f;">10天以上（差）</span>。延迟天数越高的部门需重点关注录入流程优化。',
  timingComparison: '热度分析：通过对比每日考核与录入的部门数量，识别工作集中度和时间分布规律。峰值差异较大时段需关注工作负荷平衡。',
  assessmentIntensity: '热力图解读：颜色越深表示该问题类别在对应部门的考核中占比越高。有助于识别各部门重点关注的问题领域和考核侧重点。',
  assessDateDistribution: '时间规律分析：展示考核工作在月内的时间分布特征。有助于优化考核计划安排和工作负荷分配。',
  entryTimingAnalysis: '效率评估：通过录入时效分布评估整体工作效率和流程优化空间。及时录入率越高说明工作流程越顺畅。'
})

// 弹窗编辑器相关
const showTextEditor = ref(false)
const currentEditingField = ref('')
const editingText = ref('')
const selectedColor = ref('#333333')
const selectedFontSize = ref('13px')
const isBold = ref(false)
const isItalic = ref(false)
const editorTextarea = ref<HTMLTextAreaElement>()
const selectionStart = ref(0)
const selectionEnd = ref(0)

// 颜色预设
const colorPresets = [
  '#333333', '#666666', '#999999',
  '#ff4d4f', '#fa541c', '#fa8c16',
  '#faad14', '#a0d911', '#52c41a',
  '#13c2c2', '#1890ff', '#2f54eb',
  '#722ed1', '#eb2f96'
]
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

const scoreDispersionChart = ref<HTMLElement>()
// 新增日期分布图表
const assessDateDistributionChart = ref<HTMLElement>()
// 考核力度热力图
const assessmentIntensityHeatmap = ref<HTMLElement>()
const entryTimingAnalysisChart = ref<HTMLElement>()
// 新增考核质量分析图表
const timingAnalysisChart = ref<HTMLElement>()
const timingComparisonChart = ref<HTMLElement>()
// 保留原有图表
const onDutyChart = ref<HTMLElement>()
const assessmentChart = ref<HTMLElement>()
const managementChart = ref<HTMLElement>()

// 图表实例 - 核心图表
let categoryPieChartInstance: echarts.ECharts | null = null
let timeTrendChartInstance: echarts.ECharts | null = null
let deductionCountChartInstance: echarts.ECharts | null = null
let top10IssuesChartInstance: echarts.ECharts | null = null

let scoreDispersionChartInstance: echarts.ECharts | null = null
// 新增日期分布图表实例
let assessDateDistributionChartInstance: echarts.ECharts | null = null
let entryTimingAnalysisChartInstance: echarts.ECharts | null = null
// 考核力度热力图实例
let assessmentIntensityHeatmapInstance: echarts.ECharts | null = null
// 新增考核质量分析图表实例
let timingAnalysisChartInstance: echarts.ECharts | null = null
let timingComparisonChartInstance: echarts.ECharts | null = null
// 保留原有图表实例
let onDutyChartInstance: echarts.ECharts | null = null
let assessmentChartInstance: echarts.ECharts | null = null
let managementChartInstance: echarts.ECharts | null = null

// 报表数据
const reportData = ref<any>({
  title: '',
  timestamp: '',
  coreMetrics: [] as any[],
  departmentStats: [] as any[],
  conclusions: [] as any[],
  qualityAnalysis: null
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
    // 加载该月份保存的图表说明
    loadSavedExplanations()
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
    
    currentStep.value = '整合分析结果...'
    analysisProgress.value = 70

    // 生成增强报表数据
    const report = generateEnhancedReportData(monthlyData, assessmentData, null)
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

// 生成考核质量分析数据
const generateQualityAnalysis = (activeStaff: any[], assessmentData: any[]) => {
  // 1. 分部门录入时效分析（参考正确算法）
  const departmentTimingMap = new Map()

  assessmentData.forEach(a => {
    const dept = a.department || '未知部门'
    if (!departmentTimingMap.has(dept)) {
      departmentTimingMap.set(dept, { delays: [], onTimeCount: 0, totalCount: 0 })
    }

    const deptData = departmentTimingMap.get(dept)
    deptData.totalCount++

    // 使用正确的算法：assessDate（考核日期）和 assessTime（录入时间）
    if (a.assessDate && a.assessTime) {
      const assessDateObj = new Date(a.assessDate)
      const assessTimeObj = new Date(a.assessTime)
      const delayDays = Math.round((assessTimeObj.getTime() - assessDateObj.getTime()) / (1000 * 60 * 60 * 24))

      // 确保延迟天数不为负数
      const actualDelay = Math.max(0, delayDays)
      deptData.delays.push(actualDelay)
      if (actualDelay <= 5) deptData.onTimeCount++ // 5天内算及时
    } else {
      // 如果没有录入时间，假设延迟3天
      deptData.delays.push(3)
    }
  })

  const departmentTiming = Array.from(departmentTimingMap.entries()).map(([dept, data]) => {
    const avgDelayDays = data.delays.length > 0 ? Math.round(data.delays.reduce((sum: number, delay: number) => sum + delay, 0) / data.delays.length) : 0
    const maxDelayDays = data.delays.length > 0 ? Math.max(...data.delays) : 0
    const onTimeRate = data.totalCount > 0 ? (data.onTimeCount / data.totalCount) * 100 : 0

    let timingLevel = '优秀'
    let note = '录入及时'
    if (avgDelayDays > 10) {
      timingLevel = '较差'
      note = '录入延迟严重，需改进'
    } else if (avgDelayDays > 5) {
      timingLevel = '一般'
      note = '录入有延迟，需关注'
    }

    return {
      department: dept,
      avgDelayDays,
      maxDelayDays,
      onTimeRate,
      timingLevel,
      note
    }
  }).sort((a, b) => b.avgDelayDays - a.avgDelayDays) // 延迟最高的排在前面

  // 2. 考核和录入时间分布分析
  const departmentPeakMap = new Map()

  assessmentData.forEach(a => {
    const dept = a.department || '未知部门'
    if (!departmentPeakMap.has(dept)) {
      departmentPeakMap.set(dept, {
        assessmentDates: new Map(),
        entryDates: new Map(),
        totalAssessments: 0
      })
    }

    const deptData = departmentPeakMap.get(dept)
    deptData.totalAssessments++

    // 统计考核日期
    if (a.assessDate) {
      const day = new Date(a.assessDate).getDate()
      deptData.assessmentDates.set(day, (deptData.assessmentDates.get(day) || 0) + 1)
    }

    // 统计录入日期（使用assessTime字段）
    if (a.assessTime) {
      const day = new Date(a.assessTime).getDate()
      deptData.entryDates.set(day, (deptData.entryDates.get(day) || 0) + 1)
    }
  })

  const departmentPeakDays = Array.from(departmentPeakMap.entries()).map(([dept, data]) => {
    // 找出考核最多的日期
    let peakAssessmentDate = '无'
    let peakAssessmentCount = 0
    let assessmentPattern = '分散'

    if (data.assessmentDates.size > 0) {
      const maxEntry = Array.from(data.assessmentDates.entries()).reduce((max, current) =>
        current[1] > max[1] ? current : max
      )
      peakAssessmentDate = `${maxEntry[0]}日`
      peakAssessmentCount = maxEntry[1]

      // 判断考核规律
      if (peakAssessmentCount >= data.totalAssessments * 0.5) {
        assessmentPattern = '集中'
      } else if (peakAssessmentCount >= data.totalAssessments * 0.3) {
        assessmentPattern = '相对集中'
      }
    }

    // 找出录入最多的日期
    let peakEntryDate = '无'
    let peakEntryCount = 0
    let entryPattern = '分散'

    if (data.entryDates.size > 0) {
      const maxEntry = Array.from(data.entryDates.entries()).reduce((max, current) =>
        current[1] > max[1] ? current : max
      )
      peakEntryDate = `${maxEntry[0]}日`
      peakEntryCount = maxEntry[1]

      // 判断录入规律
      if (peakEntryCount >= data.totalAssessments * 0.5) {
        entryPattern = '集中'
      } else if (peakEntryCount >= data.totalAssessments * 0.3) {
        entryPattern = '相对集中'
      }
    }

    return {
      department: dept,
      peakAssessmentDate,
      peakAssessmentCount,
      assessmentPattern,
      peakEntryDate,
      peakEntryCount,
      entryPattern
    }
  })

  // 3. 考核力度分析（各部门考核最多的三类扣分类别）
  const departmentIntensityMap = new Map()

  assessmentData.forEach(a => {
    const dept = a.department || '未知部门'
    if (!departmentIntensityMap.has(dept)) {
      departmentIntensityMap.set(dept, {
        categories: new Map(),
        totalAssessments: 0,
        totalDeductions: 0
      })
    }

    const deptData = departmentIntensityMap.get(dept)
    deptData.totalAssessments++

    if (a.details && Array.isArray(a.details)) {
      a.details.forEach((detail: any) => {
        if (detail.deduction && detail.deduction < 0) {
          const category = detail.category || '其他问题'
          deptData.categories.set(category, (deptData.categories.get(category) || 0) + 1)
          deptData.totalDeductions += Math.abs(detail.deduction)
        }
      })
    }
  })

  const departmentIntensity = Array.from(departmentIntensityMap.entries()).map(([dept, data]) => {
    // 获取前三类问题
    const sortedCategories = Array.from(data.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const topCategory1 = sortedCategories[0] ? { name: sortedCategories[0][0], count: sortedCategories[0][1] } : { name: '无', count: 0 }
    const topCategory2 = sortedCategories[1] ? { name: sortedCategories[1][0], count: sortedCategories[1][1] } : { name: '无', count: 0 }
    const topCategory3 = sortedCategories[2] ? { name: sortedCategories[2][0], count: sortedCategories[2][1] } : { name: '无', count: 0 }

    // 计算考核力度评分
    const intensityScore = data.totalAssessments > 0 ? (data.categories.size * 20 + Math.min(data.totalAssessments * 5, 50)) : 0

    let intensityLevel = '一般'
    let focusArea = '综合管理'

    if (intensityScore >= 80) {
      intensityLevel = '严格'
    } else if (intensityScore >= 60) {
      intensityLevel = '适中'
    } else if (intensityScore < 40) {
      intensityLevel = '宽松'
    }

    // 根据主要问题类型确定考核重点
    if (topCategory1.name.includes('安全')) {
      focusArea = '安全管理'
    } else if (topCategory1.name.includes('服务')) {
      focusArea = '服务质量'
    } else if (topCategory1.name.includes('操作')) {
      focusArea = '操作规范'
    }

    return {
      department: dept,
      totalAssessments: data.totalAssessments,
      topCategory1,
      topCategory2,
      topCategory3,
      intensityScore,
      intensityLevel,
      focusArea
    }
  }).sort((a, b) => b.totalAssessments - a.totalAssessments)

  return {
    departmentTiming,
    departmentPeakDays,
    departmentIntensity
  }
}

// 生成增强报表数据（新版本）
const generateEnhancedReportData = (monthlyData: any, assessmentData: any[], managementAnalysis: any = null) => {
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

  ]

  // 考核质量分析
  const qualityAnalysis = generateQualityAnalysis(activeStaff, assessmentData)

  // 部门统计
  const departmentStats = calculateDepartmentStats(activeStaff, assessmentData)
  
  // 增强分析结论
  const conclusions = generateEnhancedConclusions(activeStaff, assessmentData, departmentStats, null)

  return {
    title: `${selectedMonth.value} 列车长月度报表`,
    timestamp: new Date().toLocaleString('zh-CN'),
    coreMetrics,
    departmentStats,
    conclusions,
    qualityAnalysis
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
const generateEnhancedConclusions = (activeStaff: any[], assessmentData: any[], departmentStats: any[], managementAnalysis: any = null) => {
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
  
  // 管理力度分析结论已移除
  
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

// 渲染图表 - 更新为包含9个核心图表
const renderCharts = () => {
  // 渲染核心图表
  renderCategoryPieChart()
  renderTimeTrendChart()
  renderDeductionCountChart()
  renderTop10IssuesChart()
  renderScoreDispersionChart()

  // 渲染新增日期分布图表
  renderAssessDateDistributionChart()
  renderEntryTimingAnalysisChart()

  // 渲染考核力度热力图
  renderAssessmentIntensityHeatmap()

  // 渲染考核质量分析图表
  renderTimingAnalysisChart()
  renderTimingComparisonChart()

  // 渲染传统图表
  renderOnDutyChart()
  renderAssessmentChart()
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

// 新增：渲染考核质量分析-录入时效性图表
const renderTimingAnalysisChart = () => {
  if (!timingAnalysisChart.value || !reportData.value.qualityAnalysis) return

  timingAnalysisChartInstance = echarts.init(timingAnalysisChart.value)

  const timingData = reportData.value.qualityAnalysis.departmentTiming

  const option = {
    title: {
      text: '分部门录入时效分析',
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const data = params[0]
        const timingInfo = timingData.find((t: any) => t.department === data.name)
        return `
          <div style="padding: 6px;">
            <div style="font-weight: bold; margin-bottom: 3px;">${data.name}</div>
            <div>平均延迟：${Math.round(data.value)}天</div>
            <div>最大延迟：${timingInfo?.maxDelayDays || 0}天</div>
            <div>及时率：${timingInfo?.onTimeRate?.toFixed(1) || 0}%</div>
            <div>等级：${timingInfo?.timingLevel || '未知'}</div>
          </div>
        `
      }
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '18%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timingData.map((item: any) => item.department),
      axisLabel: {
        rotate: 45,
        fontSize: 10,
        interval: 0 // 显示所有标签
      }
    },
    yAxis: {
      type: 'value',
      name: '延迟天数',
      nameTextStyle: {
        fontSize: 11
      },
      axisLabel: {
        formatter: '{value}天',
        fontSize: 10
      }
    },
    series: [{
      name: '平均延迟天数',
      type: 'bar',
      data: timingData.map((item: any) => ({
        value: item.avgDelayDays,
        itemStyle: {
          color: item.avgDelayDays <= 5 ? '#67c23a' :   // 5天内为优秀（绿色）
                 item.avgDelayDays <= 10 ? '#e6a23c' :  // 10天内为一般（黄色）
                 '#f56c6c'                               // 10天以上为较差（红色）
        }
      })),
      label: {
        show: true,
        position: 'top',
        formatter: function(params: any) {
          return Math.round(params.value) + '天'
        },
        fontSize: 9
      },
      barWidth: '50%'
    }]
  }

  timingAnalysisChartInstance.setOption(option)
}

// 新增：渲染考核与录入时间分布热度分析图表
const renderTimingComparisonChart = () => {
  if (!timingComparisonChart.value || !reportData.value.qualityAnalysis) return

  timingComparisonChartInstance = echarts.init(timingComparisonChart.value)

  const peakData = reportData.value.qualityAnalysis.departmentPeakDays

  // 统计每个日期的考核和录入热度
  const assessmentHeatMap = new Map<number, { count: number, departments: string[] }>()
  const entryHeatMap = new Map<number, { count: number, departments: string[] }>()

  // 初始化1-31日的数据
  for (let day = 1; day <= 31; day++) {
    assessmentHeatMap.set(day, { count: 0, departments: [] })
    entryHeatMap.set(day, { count: 0, departments: [] })
  }

  // 统计每个部门的考核和录入峰值日期
  peakData.forEach((dept: any) => {
    // 统计考核峰值日期
    if (dept.peakAssessmentDate && dept.peakAssessmentDate !== '无') {
      const dayMatch = dept.peakAssessmentDate.match(/(\d+)日/)
      if (dayMatch) {
        const day = parseInt(dayMatch[1])
        if (day >= 1 && day <= 31) {
          const dayData = assessmentHeatMap.get(day)!
          dayData.count++
          dayData.departments.push(dept.department)
        }
      }
    }

    // 统计录入峰值日期
    if (dept.peakEntryDate && dept.peakEntryDate !== '无') {
      const dayMatch = dept.peakEntryDate.match(/(\d+)日/)
      if (dayMatch) {
        const day = parseInt(dayMatch[1])
        if (day >= 1 && day <= 31) {
          const dayData = entryHeatMap.get(day)!
          dayData.count++
          dayData.departments.push(dept.department)
        }
      }
    }
  })

  // 智能筛选要显示的日期
  const getDisplayDays = () => {
    const hasDataDays = []
    const noDataDays = []

    // 分类有数据和无数据的日期
    for (let day = 1; day <= 31; day++) {
      const assessmentCount = assessmentHeatMap.get(day)!.count
      const entryCount = entryHeatMap.get(day)!.count

      if (assessmentCount > 0 || entryCount > 0) {
        hasDataDays.push(day)
      } else {
        noDataDays.push(day)
      }
    }

    // 关键时间节点（总是保留）
    const keyDays = [1, 15, 31]

    // 从无数据日期中选择要保留的
    const selectedNoDataDays = []

    // 确保关键日期被保留
    keyDays.forEach(day => {
      if (noDataDays.includes(day) && !hasDataDays.includes(day)) {
        selectedNoDataDays.push(day)
      }
    })

    // 根据有数据日期的数量，决定保留多少无数据日期
    const hasDataCount = hasDataDays.length
    let targetNoDataCount = 0

    if (hasDataCount < 8) {
      targetNoDataCount = 8 // 数据少时多保留一些
    } else if (hasDataCount < 15) {
      targetNoDataCount = 5 // 中等数据量
    } else {
      targetNoDataCount = 3 // 数据多时少保留
    }

    // 从剩余无数据日期中均匀选择
    const remainingNoDataDays = noDataDays.filter(day => !selectedNoDataDays.includes(day))
    const interval = Math.max(1, Math.floor(remainingNoDataDays.length / Math.max(1, targetNoDataCount - selectedNoDataDays.length)))

    for (let i = 0; i < remainingNoDataDays.length && selectedNoDataDays.length < targetNoDataCount; i += interval) {
      selectedNoDataDays.push(remainingNoDataDays[i])
    }

    // 合并并排序所有要显示的日期
    const displayDays = [...hasDataDays, ...selectedNoDataDays].sort((a, b) => a - b)
    return displayDays
  }

  const displayDays = getDisplayDays()

  // 生成图表数据
  const xAxisData = []
  const assessmentSeriesData = []
  const entrySeriesData = []

  displayDays.forEach(day => {
    xAxisData.push(`${day}日`)

    const assessmentData = assessmentHeatMap.get(day)!
    assessmentSeriesData.push({
      value: assessmentData.count,
      departments: assessmentData.departments,
      day: day
    })

    const entryData = entryHeatMap.get(day)!
    entrySeriesData.push({
      value: entryData.count,
      departments: entryData.departments,
      day: day
    })
  })

  const maxCount = Math.max(
    Math.max(...assessmentSeriesData.map(d => d.value)),
    Math.max(...entrySeriesData.map(d => d.value))
  )

  const option = {
    title: {
      text: '考核与录入热度分析',
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const day = params[0].name
        const assessmentInfo = assessmentSeriesData[params[0].dataIndex]
        const entryInfo = entrySeriesData[params[0].dataIndex]

        return `
          <div style="padding: 6px;">
            <div style="font-weight: bold; margin-bottom: 6px;">${day}</div>

            <div style="margin-bottom: 4px;">
              <span style="color: #409eff;">●</span> 考核峰值：${assessmentInfo.value}个部门
            </div>
            ${assessmentInfo.value > 0 ? `
              <div style="margin-bottom: 4px; margin-left: 12px; font-size: 11px;">
                ${assessmentInfo.departments.slice(0, 3).map((dept: string) => `• ${dept}`).join('<br/>')}
                ${assessmentInfo.departments.length > 3 ? '<br/>...' : ''}
              </div>
            ` : ''}

            <div style="margin-bottom: 4px;">
              <span style="color: #67c23a;">●</span> 录入峰值：${entryInfo.value}个部门
            </div>
            ${entryInfo.value > 0 ? `
              <div style="margin-left: 12px; font-size: 11px;">
                ${entryInfo.departments.slice(0, 3).map((dept: string) => `• ${dept}`).join('<br/>')}
                ${entryInfo.departments.length > 3 ? '<br/>...' : ''}
              </div>
            ` : ''}
          </div>
        `
      }
    },
    legend: {
      data: ['考核峰值', '录入峰值'],
      top: 35,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: {
        fontSize: 11
      }
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '18%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        fontSize: 10,
        interval: displayDays.length > 20 ? 1 : 0, // 根据显示日期数量调整间隔
        rotate: displayDays.length > 15 ? 45 : 30
      }
    },
    yAxis: {
      type: 'value',
      name: '部门数',
      nameTextStyle: {
        fontSize: 11
      },
      axisLabel: {
        formatter: '{value}',
        fontSize: 10
      },
      min: 0,
      max: Math.max(maxCount + 1, 3) // 确保有足够的显示空间
    },
    series: [
      {
        name: '考核峰值部门数',
        type: 'bar',
        data: assessmentSeriesData.map((item: any) => item.value),
        itemStyle: {
          color: '#409eff'
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params: any) {
            return params.value > 0 ? params.value : ''
          },
          fontSize: 9,
          color: '#409eff'
        },
        barWidth: displayDays.length > 15 ? '25%' : '35%'
      },
      {
        name: '录入峰值',
        type: 'bar',
        data: entrySeriesData.map((item: any) => item.value),
        itemStyle: {
          color: '#67c23a'
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params: any) {
            return params.value > 0 ? params.value : ''
          },
          fontSize: 9,
          color: '#67c23a'
        },
        barWidth: displayDays.length > 15 ? '25%' : '35%'
      }
    ]
  }

  timingComparisonChartInstance.setOption(option)
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

// 渲染考核力度热力图
const renderAssessmentIntensityHeatmap = () => {
  if (!assessmentIntensityHeatmap.value) return

  assessmentIntensityHeatmapInstance = echarts.init(assessmentIntensityHeatmap.value)

  // 获取考核数据
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  console.log('热力图数据调试:', {
    selectedMonth: selectedMonth.value,
    assessmentDataLength: assessmentData.length,
    sampleData: assessmentData.slice(0, 3)
  })

  // 生成热力图数据
  const heatmapData = generateHeatmapData(assessmentData)
  console.log('热力图处理后数据:', heatmapData)

  const option = {
    title: {
      text: '',
      left: 'center',
      textStyle: {
        fontSize: 14
      }
    },
    tooltip: {
      position: 'top',
      formatter: function(params: any) {
        const [categoryIndex, deptIndex] = params.data
        const category = heatmapData.categories[categoryIndex]
        const department = heatmapData.departments[deptIndex]
        const percentage = params.value
        const totalCount = heatmapData.deptTotalCount[department] || 0
        const actualCount = Math.round((percentage / 100) * totalCount)
        return `${department}<br/>${category}<br/>占比: ${percentage}%<br/>次数: ${actualCount}/${totalCount}`
      }
    },
    grid: {
      height: '75%',
      top: '10%',
      left: '15%',
      right: '5%'
    },
    xAxis: {
      type: 'category',
      data: heatmapData.categories,
      splitArea: {
        show: true
      },
      axisLabel: {
        fontSize: 11,
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'category',
      data: heatmapData.departments,
      splitArea: {
        show: true
      },
      axisLabel: {
        fontSize: 11
      }
    },
    visualMap: {
      min: 0,
      max: 100, // 百分比最大值为100%
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '2%',
      splitNumber: 5,
      inRange: {
        color: ['#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#b71c1c']
      },
      text: ['高占比', '低占比'],
      formatter: '{value}%',
      textStyle: {
        fontSize: 11
      },
      itemWidth: 15,
      itemHeight: 140
    },
    series: [{
      name: '考核次数',
      type: 'heatmap',
      data: heatmapData.data,
      label: {
        show: true,
        fontSize: 10,
        fontWeight: 'bold',
        formatter: function(params: any) {
          return params.value > 0 ? `${params.value}%` : ''
        },
        color: function(params: any) {
          // 根据百分比大小动态调整文字颜色，适配白-黄-橙-红配色
          const value = params.value
          if (value === 0) return 'transparent'
          if (value <= 20) return '#374151'  // 深灰色（白色/浅黄背景）
          if (value <= 50) return '#1f2937'  // 更深灰色（黄色/橙色背景）
          return '#ffffff'  // 白色（红色/深红色背景）
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
          borderColor: '#374151',
          borderWidth: 2
        }
      },
      itemStyle: {
        borderWidth: 0
      }
    }]
  }

  assessmentIntensityHeatmapInstance.setOption(option)
}

// 生成热力图数据
const generateHeatmapData = (assessmentData: any[]) => {
  // 统计各部门各类别的考核次数
  const deptCategoryCount: Record<string, Record<string, number>> = {}
  const deptTotalCount: Record<string, number> = {}
  const allCategories = new Set<string>()
  const allDepartments = new Set<string>()

  assessmentData.forEach(record => {
    const dept = record.department || '未知部门'
    allDepartments.add(dept)

    // 遍历考核详情，统计各类别
    if (record.details && Array.isArray(record.details)) {
      record.details.forEach((detail: any) => {
        const category = detail.itemCategory || '其他'

        // 排除空类别，但保留"其他"类别
        if (!category || category.trim() === '') return

        allCategories.add(category)

        if (!deptCategoryCount[dept]) {
          deptCategoryCount[dept] = {}
        }
        if (!deptTotalCount[dept]) {
          deptTotalCount[dept] = 0
        }

        deptCategoryCount[dept][category] = (deptCategoryCount[dept][category] || 0) + 1
        deptTotalCount[dept] += 1
      })
    }
  })

  const departments = Array.from(allDepartments).sort()

  // 计算每个类别的总体热度（所有部门的平均占比）
  const categoryHeatMap: Record<string, number> = {}
  Array.from(allCategories).forEach(category => {
    let totalPercentage = 0
    let validDeptCount = 0

    departments.forEach(dept => {
      const totalCount = deptTotalCount[dept] || 0
      if (totalCount > 0) {
        const count = deptCategoryCount[dept]?.[category] || 0
        const percentage = (count / totalCount) * 100
        totalPercentage += percentage
        validDeptCount++
      }
    })

    // 计算平均占比作为热度指标
    categoryHeatMap[category] = validDeptCount > 0 ? totalPercentage / validDeptCount : 0
  })

  // 按热度排序类别，"其他"类别始终放在最后
  const categories = Array.from(allCategories).sort((a, b) => {
    // "其他"类别始终排在最后
    if (a === '其他' && b !== '其他') return 1
    if (b === '其他' && a !== '其他') return -1
    if (a === '其他' && b === '其他') return 0

    // 其他类别按热度从高到低排序
    return categoryHeatMap[b] - categoryHeatMap[a]
  })

  console.log('热力图数据统计:', {
    departments,
    categories,
    categoryHeatMap,
    deptCategoryCount,
    deptTotalCount
  })

  // 生成热力图数据格式 [categoryIndex, deptIndex, percentage]
  const data: [number, number, number][] = []
  let maxValue = 0

  departments.forEach((dept, deptIndex) => {
    const totalCount = deptTotalCount[dept] || 0
    categories.forEach((category, categoryIndex) => {
      const count = deptCategoryCount[dept]?.[category] || 0
      // 计算占比（百分比）
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      data.push([categoryIndex, deptIndex, percentage])
      maxValue = Math.max(maxValue, percentage)
    })
  })

  return {
    data,
    departments,
    categories,
    maxValue: Math.max(maxValue, 1), // 确保最小值为1
    deptTotalCount // 返回各部门总数，用于tooltip显示
  }
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
  // 创建完整的A4报表内容布局 - 7页优化结构
  previewPages.value = [
    // 第1页：标题 + 核心指标 + 录入时效分析
    {
      id: 1,
      blocks: [
        {
          id: 'reportHeader',
          title: '报表标题区',
          content: generateReportHeaderHTML(),
          x: 20,
          y: 50,
          width: 750,
          height: 120,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'coreMetrics',
          title: '一、核心指标概览',
          content: generateCoreMetricsHTML(),
          x: 20,
          y: 190,
          width: 750,
          height: 250,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'timingAnalysisChart',
          title: '分部门录入时效分析',
          content: generateChartPlaceholderHTML('timingAnalysisChart', '分部门录入时效分析'),
          x: 20,
          y: 460,
          width: 750,
          height: 300,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        },
        {
          id: 'timingAnalysisText',
          title: '时效分析说明',
          content: generateTextBoxHTML('时效分类标准：5天内（优秀）、6-10天（一般）、10天以上（差）。延迟天数越高的部门需重点关注录入流程优化。'),
          x: 20,
          y: 780,
          width: 750,
          height: 70,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        }
      ]
    },
    // 第2页：热度分析 + 考核力度分析
    {
      id: 2,
      blocks: [
        {
          id: 'qualityAnalysisHeader',
          title: '二、月度考核质量分析',
          content: generateQualityAnalysisHeaderHTML(),
          x: 20,
          y: 30,
          width: 750,
          height: 80,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'timingComparisonChart',
          title: '考核与录入时间分布热度分析',
          content: generateChartPlaceholderHTML('timingComparisonChart', '考核与录入时间分布热度分析'),
          x: 20,
          y: 130,
          width: 750,
          height: 280,
          zIndex: 1,
          isDragging: false,
          chartType: 'line'
        },
        {
          id: 'timingComparisonText',
          title: '热度分析说明',
          content: generateTextBoxHTML('热度分析：通过对比每日考核与录入的部门数量，识别工作集中度和时间分布规律。峰值差异较大时段需关注工作负荷平衡。'),
          x: 20,
          y: 430,
          width: 750,
          height: 70,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        },
        {
          id: 'assessmentIntensityChart',
          title: '各部门考核力度分析',
          content: generateChartPlaceholderHTML('assessmentIntensityHeatmap', '各部门考核力度分析'),
          x: 20,
          y: 520,
          width: 750,
          height: 280,
          zIndex: 1,
          isDragging: false,
          chartType: 'heatmap'
        },
        {
          id: 'assessmentIntensityText',
          title: '考核力度说明',
          content: generateTextBoxHTML('热力图解读：颜色越深表示该问题类别在对应部门的考核中占比越高。有助于识别各部门重点关注的问题领域和考核侧重点。'),
          x: 20,
          y: 820,
          width: 750,
          height: 70,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        }
      ]
    },
    // 第3页：全段数据分析开篇 + 扣分类别 + 部门人数
    {
      id: 3,
      blocks: [
        {
          id: 'chartsHeader',
          title: '三、全段整体数据分析图表',
          content: generateChartsHeaderHTML(),
          x: 20,
          y: 50,
          width: 750,
          height: 60,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'categoryPieChart',
          title: '扣分类别分布',
          content: generateChartPlaceholderHTML('categoryPieChart', '扣分类别分布'),
          x: 20,
          y: 130,
          width: 750,
          height: 350,
          zIndex: 1,
          isDragging: false,
          chartType: 'pie'
        },
        {
          id: 'onDutyChart',
          title: '部门在岗人数分布',
          content: generateChartPlaceholderHTML('onDutyChart', '部门在岗人数分布'),
          x: 20,
          y: 500,
          width: 750,
          height: 300,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        }
      ]
    },
    // 第4页：部门对比分析
    {
      id: 4,
      blocks: [
        {
          id: 'deductionCountChart',
          title: '各部门扣分次数对比',
          content: generateChartPlaceholderHTML('deductionCountChart', '各部门扣分次数对比'),
          x: 20,
          y: 50,
          width: 750,
          height: 350,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        },
        {
          id: 'top10IssuesChart',
          title: 'Top10 扣分问题排行',
          content: generateChartPlaceholderHTML('top10IssuesChart', 'Top10 扣分问题排行'),
          x: 20,
          y: 420,
          width: 750,
          height: 350,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        }
      ]
    },
    // 第5页：趋势和离散度分析
    {
      id: 5,
      blocks: [
        {
          id: 'timeTrendChart',
          title: '扣分趋势分析',
          content: generateChartPlaceholderHTML('timeTrendChart', '扣分趋势分析'),
          x: 20,
          y: 50,
          width: 750,
          height: 300,
          zIndex: 1,
          isDragging: false,
          chartType: 'line'
        },
        {
          id: 'scoreDispersionChart',
          title: '评分离散度分析',
          content: generateChartPlaceholderHTML('scoreDispersionChart', '评分离散度分析'),
          x: 20,
          y: 370,
          width: 750,
          height: 300,
          zIndex: 1,
          isDragging: false,
          chartType: 'scatter'
        },
        {
          id: 'scoreDispersionText',
          title: '离散度分析说明',
          content: generateTextBoxHTML('风险评分逻辑（分数越高风险越高）：90-100分（极高风险）、75-90分（高风险）、25-75分（中等风险）、10-25分（低风险）、1-10分（极低风险）'),
          x: 20,
          y: 690,
          width: 750,
          height: 80,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        }
      ]
    },
    // 第6页：时间分布分析
    {
      id: 6,
      blocks: [
        {
          id: 'assessDateDistributionChart',
          title: '考核日期分布',
          content: generateChartPlaceholderHTML('assessDateDistributionChart', '考核日期分布'),
          x: 20,
          y: 50,
          width: 750,
          height: 280,
          zIndex: 1,
          isDragging: false,
          chartType: 'bar'
        },
        {
          id: 'assessDateText',
          title: '考核日期说明',
          content: generateTextBoxHTML('时间规律分析：展示考核工作在月内的时间分布特征。有助于优化考核计划安排和工作负荷分配。'),
          x: 20,
          y: 350,
          width: 750,
          height: 70,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        },
        {
          id: 'entryTimingAnalysisChart',
          title: '录入时效性分析',
          content: generateChartPlaceholderHTML('entryTimingAnalysisChart', '录入时效性分析'),
          x: 20,
          y: 440,
          width: 750,
          height: 280,
          zIndex: 1,
          isDragging: false,
          chartType: 'pie'
        },
        {
          id: 'entryTimingText',
          title: '录入时效说明',
          content: generateTextBoxHTML('效率评估：通过录入时效分布评估整体工作效率和流程优化空间。及时录入率越高说明工作流程越顺畅。'),
          x: 20,
          y: 740,
          width: 750,
          height: 70,
          zIndex: 1,
          isDragging: false,
          blockType: 'textbox'
        }
      ]
    },
    // 第7页：总结页面
    {
      id: 7,
      blocks: [
        {
          id: 'detailedAnalysisHeader',
          title: '四、详细数据分析',
          content: generateDetailedAnalysisHeaderHTML(),
          x: 20,
          y: 50,
          width: 750,
          height: 60,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'departmentStatsTable',
          title: '部门综合统计表',
          content: generateDepartmentStatsHTML(),
          x: 20,
          y: 130,
          width: 750,
          height: 350,
          zIndex: 1,
          isDragging: false
        },
        {
          id: 'conclusionsSection',
          title: '五、分析结论与建议',
          content: generateConclusionsHTML(),
          x: 20,
          y: 500,
          width: 750,
          height: 350,
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
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">一、核心指标概览</h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
        ${metrics.map((metric: any) => `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef;">
            <div style="font-size: 24px; font-weight: bold; color: #333; margin-bottom: 8px;">${metric.value}</div>
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">${metric.label}</div>
            ${metric.unit ? `<div style="font-size: 12px; color: #999; margin-bottom: 5px;">${metric.unit}</div>` : ''}
            <div style="font-size: 12px; color: ${metric.trendClass === 'trend-up' ? '#52c41a' : metric.trendClass === 'trend-down' ? '#ff4d4f' : '#1890ff'};">${metric.trend}</div>
          </div>
        `).join('')}
      </div>
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

// 生成质量分析标题HTML
const generateQualityAnalysisHeaderHTML = () => {
  return `
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">二、月度考核质量分析</h2>
    </div>
  `
}



// 生成图表分析标题HTML
const generateChartsHeaderHTML = () => {
  return `
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">三、全段整体数据分析图表</h2>
    </div>
  `
}



// 生成详细分析标题HTML
const generateDetailedAnalysisHeaderHTML = () => {
  return `
    <div style="padding: 15px 0;">
      <h2 style="font-size: 18px; margin: 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">四、详细数据分析</h2>
    </div>
  `
}

// 生成部门统计表HTML
const generateDepartmentStatsHTML = () => {
  const stats = reportData.value.departmentStats || []
  return `
    <div style="padding: 10px; border: 1px solid #e9ecef; border-radius: 8px; background: #fff;">
      <h3 style="font-size: 16px; margin: 0 0 15px 0; color: #333;">部门综合统计表</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">部门</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">在岗人数</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">总奖励金额</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">人均奖励</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">考核次数</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">总扣分</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">平均得分</th>
          </tr>
        </thead>
        <tbody>
          ${stats.map((stat: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${stat.department}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${stat.onDutyCount}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatCurrency(stat.totalReward)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${formatCurrency(stat.avgReward)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${stat.assessmentCount}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${stat.totalDeductions}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${stat.avgScore.toFixed(1)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// 生成独立文本框HTML
const generateTextBoxHTML = (text: string) => {
  return `
    <div style="padding: 12px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #333;">
      ${text}
    </div>
  `
}

// 生成图表占位符HTML
const generateChartPlaceholderHTML = (chartId: string, chartTitle: string) => {
  return `
    <div style="padding: 10px; border: 1px solid #e9ecef; border-radius: 8px; background: #fff;">
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
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">五、分析结论与建议</h2>
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
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #409eff; padding-bottom: 8px;">五、分析结论与建议</h2>
        <div style="background: #f9fafb; padding: 30px; text-align: center; border: 2px dashed #d1d5db; border-radius: 8px; color: #666;">
          暂无结论分析内容，请先添加分析结论
        </div>
      </div>
    `
  }
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
    // 质量分析图表
    renderPreviewChart('preview-timingAnalysisChart', 'bar')
    renderPreviewChart('preview-timingComparisonChart', 'line')
    renderPreviewChart('preview-assessmentIntensityHeatmap', 'heatmap')

    // 整体数据分析图表
    renderPreviewChart('preview-categoryPieChart', 'pie')
    renderPreviewChart('preview-onDutyChart', 'bar')
    renderPreviewChart('preview-deductionCountChart', 'bar')
    renderPreviewChart('preview-top10IssuesChart', 'bar')
    renderPreviewChart('preview-timeTrendChart', 'line')
    renderPreviewChart('preview-scoreDispersionChart', 'scatter')
    renderPreviewChart('preview-assessDateDistributionChart', 'bar')
    renderPreviewChart('preview-entryTimingAnalysisChart', 'pie')
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
  
  // 根据图表类型和容器ID生成配置
  switch (containerId) {
    case 'preview-categoryPieChart':
      option = getDeductionCategoryPieChartOption(assessmentData)
      break
    case 'preview-onDutyChart':
      // 获取在岗人数数据
      const monthlyData = mainStore.monthlyData.find(m =>
        m.year === parseInt(selectedMonth.value.split('-')[0]) &&
        m.month === parseInt(selectedMonth.value.split('-')[1])
      )
      if (monthlyData) {
        const activeStaff = monthlyData.data.filter((s: any) => s.isActive)
        option = generateOnDutyChartOption(activeStaff)
      }
      break
    case 'preview-deductionCountChart':
      option = getDeductionCountBarChartOption(assessmentData)
      break
    case 'preview-top10IssuesChart':
      option = getTop10IssuesBarChartOption(assessmentData)
      break
    case 'preview-timeTrendChart':
      // 获取多月数据用于趋势分析
      const monthlyDataForTrend: Record<string, any[]> = {}
      availableMonths.value.forEach(month => {
        monthlyDataForTrend[month] = mainStore.database?.assessmentDB?.[month] || []
      })
      option = getTimeTrendLineChartOption(monthlyDataForTrend)
      break
    case 'preview-scoreDispersionChart':
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
    case 'preview-assessDateDistributionChart':
      option = getAssessDateDistributionChartOption(assessmentData)
      break
    case 'preview-entryTimingAnalysisChart':
      option = getEntryTimingAnalysisChartOption(assessmentData)
      break
    case 'preview-timingAnalysisChart':
      // 生成时效分析数据
      option = generateTimingAnalysisChartOption(assessmentData)
      break
    case 'preview-timingComparisonChart':
      // 生成时间分布对比数据
      option = generateTimingComparisonChartOption(assessmentData)
      break
    case 'preview-assessmentIntensityHeatmap':
      // 生成考核力度热力图数据
      option = generateAssessmentIntensityHeatmapOption(assessmentData)
      break
    default:
      // 默认显示简单的占位图表
      option = {
        title: { text: '图表加载中...', left: 'center', top: 'middle' },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [] }]
      }
  }
  
  chart.setOption(option)
  
  // 响应容器大小变化
  const resizeObserver = new ResizeObserver(() => {
    chart.resize()
  })
  resizeObserver.observe(container)
  
  console.log(`✅ 图表渲染完成: ${containerId}`)
}

// 生成在岗人数图表选项
const generateOnDutyChartOption = (activeStaff: any[]) => {
  const deptMap = new Map()
  activeStaff.forEach(staff => {
    const dept = staff.department || '未知部门'
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
  })

  const data = Array.from(deptMap.entries()).map(([dept, count]) => ({
    name: dept,
    value: count
  }))

  return {
    title: { text: '部门在岗人数分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { rotate: 45, fontSize: 10 }
    },
    yAxis: { type: 'value', name: '人数' },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: { color: '#5470c6' }
    }]
  }
}

// 生成时效分析图表选项
const generateTimingAnalysisChartOption = (assessmentData: any[]) => {
  // 计算各部门平均延迟天数
  const departmentTimingMap = new Map()

  assessmentData.forEach(a => {
    const dept = a.department || '未知部门'
    if (!departmentTimingMap.has(dept)) {
      departmentTimingMap.set(dept, { delays: [], totalCount: 0 })
    }

    const deptData = departmentTimingMap.get(dept)
    deptData.totalCount++

    if (a.assessDate && a.assessTime) {
      const assessDateObj = new Date(a.assessDate)
      const assessTimeObj = new Date(a.assessTime)
      const delayDays = Math.round((assessTimeObj.getTime() - assessDateObj.getTime()) / (1000 * 60 * 60 * 24))
      const actualDelay = Math.max(0, delayDays)
      deptData.delays.push(actualDelay)
    } else {
      deptData.delays.push(3) // 默认延迟3天
    }
  })

  const data = Array.from(departmentTimingMap.entries()).map(([dept, data]) => {
    const avgDelayDays = data.delays.length > 0 ?
      Math.round(data.delays.reduce((sum: number, delay: number) => sum + delay, 0) / data.delays.length) : 0
    return { name: dept, value: avgDelayDays }
  }).sort((a, b) => b.value - a.value)

  return {
    title: { text: '分部门录入时效分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}天'
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { rotate: 45, fontSize: 10 }
    },
    yAxis: { type: 'value', name: '平均延迟天数' },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: d.value,
        itemStyle: {
          color: d.value <= 5 ? '#52c41a' : d.value <= 10 ? '#faad14' : '#ff4d4f'
        }
      }))
    }]
  }
}

// 生成时间分布对比图表选项
const generateTimingComparisonChartOption = (assessmentData: any[]) => {
  const assessmentDates = new Map()
  const entryDates = new Map()

  assessmentData.forEach(a => {
    if (a.assessDate) {
      const day = new Date(a.assessDate).getDate()
      assessmentDates.set(day, (assessmentDates.get(day) || 0) + 1)
    }
    if (a.assessTime) {
      const day = new Date(a.assessTime).getDate()
      entryDates.set(day, (entryDates.get(day) || 0) + 1)
    }
  })

  const days = Array.from({length: 31}, (_, i) => i + 1)

  return {
    title: { text: '考核与录入时间分布对比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['考核数量', '录入数量'], bottom: 0 },
    xAxis: {
      type: 'category',
      data: days,
      name: '日期'
    },
    yAxis: { type: 'value', name: '数量' },
    series: [
      {
        name: '考核数量',
        type: 'line',
        data: days.map(day => assessmentDates.get(day) || 0),
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '录入数量',
        type: 'line',
        data: days.map(day => entryDates.get(day) || 0),
        itemStyle: { color: '#52c41a' }
      }
    ]
  }
}

// 生成考核力度热力图选项
const generateAssessmentIntensityHeatmapOption = (assessmentData: any[]) => {
  // 简化版热力图数据
  const departments = ['车队一', '车队二', '车队三', '调度科', '安全科']
  const categories = ['安全问题', '服务问题', '操作问题', '管理问题', '其他问题']

  const data: any[] = []
  departments.forEach((dept, deptIndex) => {
    categories.forEach((cat, catIndex) => {
      const count = Math.floor(Math.random() * 20) + 1 // 模拟数据
      data.push([deptIndex, catIndex, count])
    })
  })

  return {
    title: { text: '各部门考核力度热力图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${departments[params.data[0]]}<br/>${categories[params.data[1]]}: ${params.data[2]}次`
      }
    },
    grid: { height: '60%', top: '10%' },
    xAxis: {
      type: 'category',
      data: departments,
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: categories,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: 20,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'] }
    },
    series: [{
      name: '考核次数',
      type: 'heatmap',
      data: data,
      label: { show: true, fontSize: 10 },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  }
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

// 恢复默认布局（清除保存的布局数据）
const resetToDefaultLayout = () => {
  ElMessageBox.confirm(
    '确定要恢复默认布局吗？这将清除当前月份保存的所有布局设置，并应用最新的默认布局。',
    '恢复默认布局',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    if (selectedMonth.value) {
      // 清除保存的布局数据
      const key = `layoutSettings_${selectedMonth.value}`
      localStorage.removeItem(key)

      // 重新初始化为默认布局
      initializePreviewPages()

      ElMessage.success('已恢复为最新的默认布局')
    }
  }).catch(() => {
    // 用户取消
  })
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

// 优化图表显示
const optimizeChartDisplay = () => {
  console.log('🎯 开始优化图表显示...')

  let optimizedCount = 0

  previewPages.value.forEach(page => {
    page.blocks.forEach(block => {
      // 如果是图表类型的块，优化其显示
      if (block.chartType) {
        const originalHeight = block.height

        // 根据图表类型设置最佳高度
        const optimalHeights = {
          'pie': 500,
          'bar': 450,
          'line': 450,
          'scatter': 450,
          'heatmap': 400
        }

        const newHeight = optimalHeights[block.chartType] || 450

        if (block.height < newHeight) {
          block.height = newHeight
          optimizedCount++
          console.log(`📊 优化图表 ${block.title}: ${originalHeight}px → ${newHeight}px`)
        }
      }
    })

    // 重新调整页面内容块位置，避免重叠
    adjustPageBlockPositions(page)
  })

  if (optimizedCount > 0) {
    ElMessage.success(`已优化 ${optimizedCount} 个图表的显示高度`)
  } else {
    ElMessage.info('所有图表显示已是最优状态')
  }
}

// 调整单个页面内容块位置，避免重叠
const adjustPageBlockPositions = (page: any) => {
  const blocks = [...page.blocks].sort((a, b) => a.y - b.y)

  for (let i = 1; i < blocks.length; i++) {
    const currentBlock = blocks[i]
    const previousBlock = blocks[i - 1]

    const expectedY = previousBlock.y + previousBlock.height + 20
    if (currentBlock.y < expectedY) {
      currentBlock.y = expectedY
    }
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

// 添加文本框
const addTextBox = () => {
  if (previewPages.value.length === 0) {
    ElMessage.warning('请先添加页面')
    return
  }

  // 添加到第一页
  const firstPage = previewPages.value[0]
  const newTextBoxId = `textbox_${Date.now()}`

  const newTextBox = {
    id: newTextBoxId,
    title: '新文本框',
    content: generateTextBoxHTML('请双击编辑此文本框内容...'),
    x: 50,
    y: 100,
    width: 300,
    height: 80,
    zIndex: 10,
    isDragging: false,
    blockType: 'textbox'
  }

  firstPage.blocks.push(newTextBox)
  ElMessage.success('已添加新文本框，可拖拽到任意位置')
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
  } else if (command === 'edit-textbox') {
    editTextBox(block)
  } else if (command === 'delete-textbox') {
    deleteTextBox(block)
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

// 编辑文本框
const editTextBox = (block: any) => {
  ElMessageBox.prompt('编辑文本框内容', '文本编辑', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValue: block.content.replace(/<[^>]*>/g, ''), // 移除HTML标签显示纯文本
    inputPlaceholder: '请输入文本内容...'
  }).then(({ value }) => {
    if (value) {
      block.content = generateTextBoxHTML(value)
      ElMessage.success('文本框内容已更新')
    }
  }).catch(() => {
    // 用户取消编辑
  })
}

// 删除文本框
const deleteTextBox = (block: any) => {
  ElMessageBox.confirm(
    `确定要删除文本框"${block.title}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // 找到包含此文本框的页面
    const page = previewPages.value.find(p =>
      p.blocks.some((b: any) => b.id === block.id)
    )

    if (page) {
      const blockIndex = page.blocks.findIndex((b: any) => b.id === block.id)
      if (blockIndex > -1) {
        page.blocks.splice(blockIndex, 1)
        ElMessage.success('文本框已删除')
      }
    }
  }).catch(() => {
    // 用户取消删除
  })
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

// 新增：获取百分比
const getPercentage = (value: number, total: number): string => {
  if (total === 0) return '0.0'
  return ((value / total) * 100).toFixed(1)
}

// 新增：获取分数样式类
const getScoreClass = (score: number): string => {
  if (score >= 90) return 'text-success'
  if (score >= 80) return 'text-primary'
  if (score >= 70) return 'text-warning'
  return 'text-danger'
}

// 新增：获取延迟样式类
const getDelayClass = (delayDays: number): string => {
  if (delayDays <= 5) return 'text-success'   // 5天内为优秀（绿色）
  if (delayDays <= 10) return 'text-warning'  // 10天内为一般（黄色）
  return 'text-danger'                         // 10天以上为较差（红色）
}

// 新增：获取时效标签类型
const getTimingTagType = (delayDays: number): 'success' | 'primary' | 'warning' | 'danger' => {
  if (delayDays <= 5) return 'success'   // 5天内为优秀（绿色）
  if (delayDays <= 10) return 'warning'  // 10天内为一般（黄色）
  return 'danger'                        // 10天以上为较差（红色）
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

// 弹窗编辑器方法
const openTextEditor = (field: string) => {
  currentEditingField.value = field
  editingText.value = chartExplanations.value[field] || ''
  showTextEditor.value = true

  // 重置格式状态
  isBold.value = false
  isItalic.value = false
  selectedColor.value = '#333333'
  selectedFontSize.value = '13px'

  // 等待DOM更新后聚焦
  nextTick(() => {
    if (editorTextarea.value?.textarea) {
      editorTextarea.value.textarea.focus()
    }
  })
}

const saveEdit = () => {
  if (currentEditingField.value) {
    chartExplanations.value[currentEditingField.value] = editingText.value

    // 保存到localStorage
    const key = `chart-explanation-${selectedMonth.value}-${currentEditingField.value}`
    localStorage.setItem(key, editingText.value)

    showTextEditor.value = false
    ElMessage.success('图表说明已保存')
  }
}

const cancelEdit = () => {
  showTextEditor.value = false
  editingText.value = ''
  currentEditingField.value = ''
}

const clearContent = () => {
  editingText.value = ''
}

// 获取当前选中的文本位置
const updateSelection = () => {
  if (editorTextarea.value?.textarea) {
    const textarea = editorTextarea.value.textarea
    selectionStart.value = textarea.selectionStart
    selectionEnd.value = textarea.selectionEnd
  }
}

// 在光标位置插入文本
const insertTextAtCursor = (beforeText: string, afterText: string = '') => {
  if (!editorTextarea.value?.textarea) return

  const textarea = editorTextarea.value.textarea
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = editingText.value.substring(start, end)

  const newText = editingText.value.substring(0, start) +
                  beforeText + selectedText + afterText +
                  editingText.value.substring(end)

  editingText.value = newText

  // 设置新的光标位置
  nextTick(() => {
    const newCursorPos = start + beforeText.length + selectedText.length + afterText.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

// 格式化功能
const toggleBold = () => {
  isBold.value = !isBold.value
  if (isBold.value) {
    insertTextAtCursor('<strong>', '</strong>')
  }
}

const toggleItalic = () => {
  isItalic.value = !isItalic.value
  if (isItalic.value) {
    insertTextAtCursor('<em>', '</em>')
  }
}

const applyColor = (color: string) => {
  if (color) {
    insertTextAtCursor(`<span style="color: ${color};">`, '</span>')
  }
}

const applyFontSize = (size: string) => {
  if (size) {
    insertTextAtCursor(`<span style="font-size: ${size};">`, '</span>')
  }
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        toggleBold()
        break
      case 'i':
        event.preventDefault()
        toggleItalic()
        break
      case 's':
        event.preventDefault()
        saveEdit()
        break
    }
  }
}

// 快速模板插入
const insertTemplate = (type: string) => {
  let template = ''

  switch (type) {
    case 'timing':
      template = '时效分析：<strong>优秀</strong>（<span style="color: #52c41a;">5天内</span>）、<strong>一般</strong>（<span style="color: #faad14;">6-10天</span>）、<strong>较差</strong>（<span style="color: #ff4d4f;">10天以上</span>）。建议重点关注延迟较高的部门，优化录入流程。'
      break
    case 'quality':
      template = '质量评估：通过<strong>数据分析</strong>发现，整体质量水平<span style="color: #52c41a;">良好</span>，但仍需在以下方面加强：<br/>1. 提高数据准确性<br/>2. 加强过程监控<br/>3. 完善反馈机制'
      break
    case 'trend':
      template = '趋势分析：从图表可以看出，<strong>整体趋势</strong>呈现<span style="color: #1890ff;">稳定上升</span>态势。建议继续保持当前良好势头，同时关注<span style="color: #faad14;">波动较大</span>的时段。'
      break
    case 'suggestion':
      template = '改进建议：<br/>1. <strong>短期目标</strong>：<span style="color: #fa541c;">立即整改</span>突出问题<br/>2. <strong>中期规划</strong>：建立长效机制<br/>3. <strong>长期愿景</strong>：实现<span style="color: #52c41a;">持续改进</span>'
      break
  }

  if (template) {
    // 在当前光标位置插入模板
    if (editorTextarea.value?.textarea) {
      const textarea = editorTextarea.value.textarea
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      editingText.value = editingText.value.substring(0, start) +
                         template +
                         editingText.value.substring(end)

      // 设置光标到插入内容的末尾
      nextTick(() => {
        const newPos = start + template.length
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
      })
    }
  }
}

// 计算预览HTML
const previewHtml = computed(() => {
  return editingText.value || '<span style="color: #999;">预览内容将在这里显示...</span>'
})

const loadSavedExplanations = () => {
  if (!selectedMonth.value) return

  Object.keys(chartExplanations.value).forEach(key => {
    // 兼容新旧两种localStorage键名格式
    const newKey = `chart-explanation-${selectedMonth.value}-${key}`
    const oldKey = `chart_explanation_${selectedMonth.value}_${key}`

    const saved = localStorage.getItem(newKey) || localStorage.getItem(oldKey)
    if (saved) {
      chartExplanations.value[key as keyof typeof chartExplanations.value] = saved
    }
  })
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
    // 管理力度分析区域已移除，使用核心指标区域作为参考
    const coreMetricsSection = reportContent.value.querySelector('.metrics-overview')
    if (coreMetricsSection) {
      const sectionBottom = (coreMetricsSection as HTMLElement).offsetTop + (coreMetricsSection as HTMLElement).offsetHeight + 20

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
    
    // 2. 管理力度分析部分已移除
    
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
    // 加载保存的图表说明
    loadSavedExplanations();
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
  padding: 0 10px;
}

.metrics-overview h2 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 25px;
  font-weight: 600;
  text-align: left;
  border-bottom: 2px solid #409eff;
  padding-bottom: 10px;
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
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
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
  overflow: visible;
  min-height: 400px;
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
  min-height: 350px;
  height: auto;
  overflow: visible;
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

/* 图表容器特殊样式 */
.draggable-block[data-chart-type] {
  min-height: 450px;
}

.draggable-block[data-chart-type] .block-content {
  min-height: 400px;
  padding: 10px;
}

/* 确保图表内容完整显示 */
.block-content canvas,
.block-content svg,
.block-content .echarts-container {
  max-width: 100%;
  height: auto !important;
  min-height: 350px;
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

/* 新增：考核质量分析样式 */
.quality-analysis-section {
  margin-bottom: 30px;

  h2 {
    margin-bottom: 20px;
    margin-top: 25px;
  }
}

.timing-analysis-card,
.timing-chart-card,
.timing-table-card,
.timing-comparison-card,
.assessment-timing-card,
.entry-timing-card,
.assessment-intensity-card {
  transition: all 0.3s ease;

  .card-desc {
    font-size: 12px;
    color: #999;
    margin-left: 10px;
  }

  .el-card__body {
    padding: 15px 8px;
  }
}

/* 为第二部分图表卡片添加hover效果 */
.timing-analysis-card:hover,
.timing-chart-card:hover,
.timing-table-card:hover,
.timing-comparison-card:hover,
.assessment-timing-card:hover,
.entry-timing-card:hover,
.assessment-intensity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.timing-comparison-chart {
  width: 100%;
  height: 350px;
}

.timing-chart {
  width: 100%;
  height: 350px;
}

.timing-calculation-note {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;

  h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }

  p {
    margin: 5px 0;
    font-size: 12px;
    color: #666;
    line-height: 1.4;

    strong {
      color: #333;
    }
  }
}

.peak-date {
  font-weight: 600;
  color: #409eff;
}

.peak-count {
  font-weight: 600;
  color: #e6a23c;
}

.pattern-text {
  font-size: 12px;
  color: #666;
}

.assessment-count {
  font-weight: 600;
  color: #67c23a;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.category-count {
  font-size: 11px;
  color: #999;
}

.focus-area {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.quality-distribution {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.distribution-item {
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid;
}

.distribution-item.excellent {
  background: #f0f9ff;
  border-color: #67c23a;
}

.distribution-item.good {
  background: #f0f9ff;
  border-color: #409eff;
}

.distribution-item.average {
  background: #fefce8;
  border-color: #e6a23c;
}

.distribution-item.poor {
  background: #fef2f2;
  border-color: #f56c6c;
}

.distribution-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.distribution-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.distribution-percent {
  font-size: 14px;
  color: #999;
}

.time-analysis {
  padding: 20px;
}

.time-period {
  margin-bottom: 15px;
}

.period-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.period-bar {
  position: relative;
  height: 30px;
  background: #f5f5f5;
  border-radius: 15px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 15px;
  transition: width 0.3s ease;
}

.bar-text {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  font-size: 12px;
  color: #333;
  font-weight: 500;
}

.issue-analysis {
  padding: 20px;
}

.issue-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 25px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
}

.top-issues h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.issue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.issue-item {
  display: grid;
  grid-template-columns: 30px 1fr 60px 60px;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  gap: 10px;
}

.issue-rank {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.issue-name {
  font-size: 14px;
  color: #333;
}

.issue-count {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.issue-percentage {
  font-size: 12px;
  color: #999;
  text-align: center;
}

/* 通用文本颜色类 */
.text-success { color: #67c23a; }
.text-primary { color: #409eff; }
.text-warning { color: #e6a23c; }
.text-danger { color: #f56c6c; }
.text-info { color: #909399; }

/* 图表说明编辑框优化 */
.chart-explanation .el-textarea {
  width: 100% !important;
}

.chart-explanation .el-textarea__inner {
  min-height: 100px !important;
  line-height: 1.6 !important;
  font-size: 13px !important;
  border-radius: 6px !important;
  border: 1px solid #dcdfe6 !important;
  transition: border-color 0.3s ease !important;
}

.chart-explanation .el-textarea__inner:focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1) !important;
}

.chart-explanation .el-textarea__inner:hover {
  border-color: #c0c4cc !important;
}

/* 编辑按钮样式优化 */
.chart-explanation .el-button--text {
  color: #409eff !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
  transition: all 0.3s ease !important;
}

.chart-explanation .el-button--text:hover {
  background-color: rgba(64, 158, 255, 0.1) !important;
  color: #337ecc !important;
}

/* 弹窗编辑器样式 */
.text-editor-container {
  padding: 0;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.editor-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.editor-input-section,
.editor-preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-input-section label,
.editor-preview-section label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.preview-content {
  min-height: 200px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  line-height: 1.6;
  overflow-y: auto;
}

.editor-templates {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bae6fd;
}

.editor-templates label {
  font-size: 13px;
  color: #0369a1;
  font-weight: 500;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .editor-content {
    grid-template-columns: 1fr;
  }

  .editor-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-section {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .editor-templates {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .editor-templates .el-button-group {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .editor-templates .el-button {
    flex: 1;
    min-width: 120px;
  }
}
</style>

