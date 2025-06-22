<template>
  <div class="demo-container">
    <div class="demo-header">
      <h1>管理力度综合评估优化效果演示</h1>
      <p class="description">对比传统版与优化版的分析效果</p>
    </div>

    <el-row :gutter="20">
      <!-- 传统版雷达图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <h3>传统版评估</h3>
          </template>
          <div ref="traditionalChartRef" style="width: 100%; height: 400px;"></div>
          
          <div class="analysis-result">
            <h4>分析结论：</h4>
            <p>{{ traditionalConclusion }}</p>
            
            <h4>存在问题：</h4>
            <ul>
              <li v-for="issue in traditionalIssues" :key="issue">{{ issue }}</li>
            </ul>
          </div>
        </el-card>
      </el-col>

      <!-- 优化版雷达图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <h3>优化版评估</h3>
          </template>
          <div ref="optimizedChartRef" style="width: 100%; height: 400px;"></div>
          
          <div class="analysis-result">
            <h4>综合评估：</h4>
            <p>{{ optimizedConclusion }}</p>
            
            <h4>具体分析：</h4>
            <ul>
              <li v-for="analysis in optimizedAnalysis" :key="analysis">{{ analysis }}</li>
            </ul>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 对比总结 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <h3>优化效果对比</h3>
      </template>
      
      <el-table :data="comparisonData" style="width: 100%">
        <el-table-column prop="aspect" label="对比维度" width="150" />
        <el-table-column prop="traditional" label="传统版" />
        <el-table-column prop="optimized" label="优化版" />
        <el-table-column prop="improvement" label="改进效果" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

// DOM引用
const traditionalChartRef = ref<HTMLElement>()
const optimizedChartRef = ref<HTMLElement>()

// 图表实例
let traditionalChart: echarts.ECharts | null = null
let optimizedChart: echarts.ECharts | null = null

// 演示数据
const demoData = {
  onDutyCount: 156,
  officeAvgDeduction: 3.11,
  teamAvgDeduction: 1.50,
  assessmentCount: 89,
  problemCategories: 5,
  problemItems: 23,
  coveredPersons: 112
}

// 传统版结论
const traditionalConclusion = ref('管理力度指数48分，评估为"不足"。车队人均扣分比科室低52%，存在管理力度不足问题。')

const traditionalIssues = ref([
  '指标维度混乱：分数、人数、百分比混合显示',
  '缺乏统一量纲：各指标无法有效对比',
  '信息价值有限：只能看出扣分差异',
  '改进建议模糊：难以指导具体行动'
])

// 优化版结论
const optimizedConclusion = ref('综合得分69分，评级为"一般"。管理力度综合水平一般，需要重点改进。')

const optimizedAnalysis = ref([
  '标准一致性48分：科室和车队在问题处理上协调性不足，可能存在科室扣分多而车队扣分少的管理脱节现象',
  '考核覆盖率72分：仍有28%的在岗人员未被考核',
  '管理严格度85分：相对历史水平较为严格',
  '问题识别力76分：问题发现能力良好',
  '管理均衡性65分：各部门管理力度存在一定差异'
])

// 对比数据
const comparisonData = ref([
  {
    aspect: '指标体系',
    traditional: '5个混合维度',
    optimized: '5个标准化维度',
    improvement: '量纲统一，逻辑清晰'
  },
  {
    aspect: '计算方法',
    traditional: '简单比值计算',
    optimized: '基于统计学方法',
    improvement: '科学性大幅提升'
  },
  {
    aspect: '分析深度',
    traditional: '单一扣分对比',
    optimized: '多维度综合评估',
    improvement: '分析更加全面'
  },
  {
    aspect: '实用价值',
    traditional: '笼统的管理建议',
    optimized: '针对性改进方向',
    improvement: '可操作性增强'
  },
  {
    aspect: '用户体验',
    traditional: '难以理解和比较',
    optimized: '直观易懂，便于决策',
    improvement: '大幅改善用户体验'
  }
])

// 初始化图表
const initCharts = () => {
  if (traditionalChartRef.value) {
    traditionalChart = echarts.init(traditionalChartRef.value)
    renderTraditionalChart()
  }
  
  if (optimizedChartRef.value) {
    optimizedChart = echarts.init(optimizedChartRef.value)
    renderOptimizedChart()
  }
}

// 渲染传统版雷达图
const renderTraditionalChart = () => {
  const option = {
    title: {
      text: '传统版管理力度评估',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: [
        { name: '科室人均扣分', max: 10 },
        { name: '车队人均扣分', max: 10 },
        { name: '管理力度指数', max: 100 },
        { name: '扣分记录数', max: 100 },
        { name: '在岗人数', max: 200 }
      ],
      center: ['50%', '55%'],
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          demoData.officeAvgDeduction,
          demoData.teamAvgDeduction,
          48, // 管理力度指数
          demoData.assessmentCount,
          demoData.onDutyCount
        ],
        name: '当前状态',
        itemStyle: { color: '#ff6b6b' },
        areaStyle: { opacity: 0.3, color: '#ff6b6b' }
      }]
    }]
  }
  
  traditionalChart?.setOption(option)
}

// 渲染优化版雷达图
const renderOptimizedChart = () => {
  const option = {
    title: {
      text: '优化版管理力度综合评估',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const names = ['标准一致性', '考核覆盖率', '管理严格度', '问题识别力', '管理均衡性']
        const descriptions = [
          '科室与车队在问题识别和处理上的协调程度，重点关注方向一致性（科室严重的问题车队也严重）、合理差异性（车队扣分适度高于科室体现自查能力强）',
          '考核覆盖在岗人员的比例',
          '相对于历史水平的严格程度',
          '发现和识别问题的能力',
          '各部门管理力度的均衡程度'
        ]
        const value = params.data.value[params.dataIndex]
        return `${names[params.dataIndex]}<br/>
               得分：${value}分<br/>
               说明：${descriptions[params.dataIndex]}`
      }
    },
    radar: {
      indicator: [
        { name: '标准一致性', max: 100 },
        { name: '考核覆盖率', max: 100 },
        { name: '管理严格度', max: 100 },
        { name: '问题识别力', max: 100 },
        { name: '管理均衡性', max: 100 }
      ],
      center: ['50%', '55%'],
      radius: '60%',
      splitNumber: 5,
      axisName: {
        fontSize: 11,
        color: '#333'
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(30, 144, 255, 0.05)', 'rgba(30, 144, 255, 0.1)']
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [48, 72, 85, 76, 65], // 优化版各项指标
        name: '当前状态',
        itemStyle: { color: '#1890ff' },
        areaStyle: { opacity: 0.25, color: '#1890ff' },
        lineStyle: { width: 2 }
      }]
    }]
  }
  
  optimizedChart?.setOption(option)
}

// 窗口大小变化处理
const handleResize = () => {
  traditionalChart?.resize()
  optimizedChart?.resize()
}

onMounted(() => {
  setTimeout(() => {
    initCharts()
    window.addEventListener('resize', handleResize)
  }, 500)
})
</script>

<style lang="scss" scoped>
.demo-container {
  padding: 20px;
  
  .demo-header {
    text-align: center;
    margin-bottom: 30px;
    
    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: #2c3e50;
    }
    
    .description {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }
  }
  
  .analysis-result {
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    
    h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #495057;
    }
    
    p {
      margin: 0 0 15px 0;
      font-size: 13px;
      line-height: 1.5;
    }
    
    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 5px;
        font-size: 12px;
        line-height: 1.4;
      }
    }
  }
}

:deep(.el-card__header) {
  padding: 15px 20px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }
}
</style> 