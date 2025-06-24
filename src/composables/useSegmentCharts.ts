/**
 * 全段分析图表 Composable
 * 实现6个核心图表：扣分类别分布、时间趋势、扣分次数、Top10问题、管理力度对比、评分离散度
 * 
 * @author 列车长考核系统
 * @version 1.0.0
 */

import { ref } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export function useSegmentCharts() {
  const loading = ref(false)

  /**
   * 图表1：扣分类别分布饼图
   */
  const getDeductionCategoryPieChartOption = (assessmentData: any[]): EChartsOption => {
    console.log('饼图数据分析:', assessmentData.slice(0, 2))
    
    // 统计各类别扣分
    const categoryStats: Record<string, number> = {}
    assessmentData.forEach(record => {
      // 检查数据结构：details 数组包含扣分详情
      if (record.details && Array.isArray(record.details)) {
        record.details.forEach((detail: any) => {
          const category = detail.itemCategory || detail.category || '其他'
          const deduction = Math.abs(detail.deduction || detail.score || 0)
          categoryStats[category] = (categoryStats[category] || 0) + deduction
        })
      }
    })

    console.log('类别统计:', categoryStats)

    // 转换为图表数据
    const chartData = Object.keys(categoryStats).map(category => ({
      name: category,
      value: Math.round(categoryStats[category] * 100) / 100
    })).sort((a, b) => b.value - a.value)

    // 如果没有数据，使用测试数据
    if (chartData.length === 0) {
      return {
        title: { 
          text: '扣分类别分布', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c}分 ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 5,
          top: 40,
          textStyle: { fontSize: 10 }
        },
        series: [{
          name: '扣分分布',
          type: 'pie',
          data: [
            { name: '服务质量', value: 30 },
            { name: '安全管理', value: 25 },
            { name: '纪律作风', value: 20 },
            { name: '其他', value: 25 }
          ],
          radius: ['35%', '60%'],
          center: ['65%', '55%'],
          label: {
            show: true,
            position: 'outside',
            fontSize: 10
          }
        }]
      }
    }

    return {
      title: {
        text: '扣分类别分布',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c}分 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 5,
        top: 40,
        width: 120,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: {
          fontSize: 10,
          lineHeight: 12
        },
        formatter: function(name: string) {
          // 限制图例文字长度
          return name.length > 8 ? name.substring(0, 8) + '...' : name
        }
      },
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      series: [{
        name: '扣分分布',
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['65%', '55%'], // 向右下移动，给图例留空间
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'outside',
          fontSize: 10,
          formatter: function(params: any) {
            // 简化标签显示，避免重叠
            if (params.percent < 5) {
              return '' // 小于5%的不显示标签
            }
            return `${params.name}\n${params.value}分`
          },
          rich: {
            name: {
              fontSize: 10,
              color: '#333'
            },
            value: {
              fontSize: 9,
              color: '#666'
            }
          }
        },
        labelLine: {
          show: true,
          length: 8,
          length2: 5,
          smooth: true
        },
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
  }

  /**
   * 图表2：时间趋势折线图
   */
  const getTimeTrendLineChartOption = (monthlyData: Record<string, any[]>): EChartsOption => {
    console.log('趋势图数据分析:', Object.keys(monthlyData), monthlyData)
    
    const months = Object.keys(monthlyData).sort()
    const officeData: number[] = []
    const teamData: number[] = []
    const totalData: number[] = []

    months.forEach(month => {
      const data = monthlyData[month] || []
      console.log(`${month}月数据:`, data.slice(0, 2))
      
      // 判断考核部门类型
      const getDeptType = (assessorDeptName: string): '车队' | '科室' => {
        if (!assessorDeptName) return '科室'
        
        // 包含车队关键词的为车队
        if (assessorDeptName.includes('车队')) return '车队'
        
        // 科室关键词
        const officeKeywords = ['科', '处', '室', '部', '中心']
        if (officeKeywords.some(keyword => assessorDeptName.includes(keyword))) return '科室'
        
        // 默认为科室
        return '科室'
      }

      // 分别统计科室和车队扣分 - 使用totalScore的绝对值作为扣分
      const officeDeductions = data
        .filter(record => {
          const assessorType = getDeptType(record.assessorDepartmentName || record.assessorDepartment)
          return assessorType === '科室'
        })
        .reduce((sum, record) => sum + Math.abs(record.totalScore || 0), 0)
        
      const teamDeductions = data
        .filter(record => {
          const assessorType = getDeptType(record.assessorDepartmentName || record.assessorDepartment)
          return assessorType === '车队'
        })
        .reduce((sum, record) => sum + Math.abs(record.totalScore || 0), 0)

      console.log(`${month}统计: 科室=${officeDeductions}, 车队=${teamDeductions}`)

      officeData.push(Math.round(officeDeductions * 100) / 100)
      teamData.push(Math.round(teamDeductions * 100) / 100)
      totalData.push(Math.round((officeDeductions + teamDeductions) * 100) / 100)
    })

    // 如果没有数据，使用测试数据
    if (months.length === 0) {
      return {
        title: { 
          text: '扣分趋势分析', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        legend: { data: ['科室扣分', '车队扣分'], top: 35 },
        grid: { left: '10%', right: '10%', bottom: '10%', top: '20%' },
        xAxis: { 
          type: 'category', 
          data: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
          axisLabel: { fontSize: 10 }
        },
        yAxis: { type: 'value', name: '扣分总计' },
        series: [
          { 
            name: '科室扣分', 
            type: 'line', 
            data: [50, 60, 40, 55, 45], 
            itemStyle: { color: '#ff6b6b' },
            smooth: true
          },
          { 
            name: '车队扣分', 
            type: 'line', 
            data: [30, 35, 25, 32, 28], 
            itemStyle: { color: '#4ecdc4' },
            smooth: true
          }
        ]
      }
    }

    return {
      title: {
        text: '扣分趋势分析',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['科室扣分', '车队扣分', '总扣分'],
        top: 50
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '20%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '扣分总计',
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      series: [
        {
          name: '科室扣分',
          type: 'line',
          data: officeData,
          smooth: true,
          lineStyle: {
            color: '#ff6b6b'
          },
          itemStyle: {
            color: '#ff6b6b'
          }
        },
        {
          name: '车队扣分',
          type: 'line',
          data: teamData,
          smooth: true,
          lineStyle: {
            color: '#4ecdc4'
          },
          itemStyle: {
            color: '#4ecdc4'
          }
        },
        {
          name: '总扣分',
          type: 'line',
          data: totalData,
          smooth: true,
          lineStyle: {
            color: '#45b7d1',
            width: 3
          },
          itemStyle: {
            color: '#45b7d1'
          }
        }
      ]
    }
  }

  /**
   * 图表3：扣分次数柱状图
   */
  const getDeductionCountBarChartOption = (assessmentData: any[]): EChartsOption => {
    console.log('次数图数据分析:', assessmentData.slice(0, 2))
    
    // 判断考核部门类型
    const getDeptType = (assessorDeptName: string): '车队' | '科室' => {
      if (!assessorDeptName) return '科室'
      
      // 包含车队关键词的为车队
      if (assessorDeptName.includes('车队')) return '车队'
      
      // 科室关键词
      const officeKeywords = ['科', '处', '室', '部', '中心']
      if (officeKeywords.some(keyword => assessorDeptName.includes(keyword))) return '科室'
      
      // 默认为科室
      return '科室'
    }

    // 统计各部门扣分次数
    const departmentStats: Record<string, { office: number; team: number }> = {}
    assessmentData.forEach(record => {
      const dept = record.department || '未知部门'
      if (!departmentStats[dept]) {
        departmentStats[dept] = { office: 0, team: 0 }
      }
      
      const assessorType = getDeptType(record.assessorDepartmentName || record.assessorDepartment)
      if (assessorType === '科室') {
        departmentStats[dept].office++
      } else if (assessorType === '车队') {
        departmentStats[dept].team++
      }
    })

    console.log('部门统计:', departmentStats)

    // 转换为图表数据
    const departments = Object.keys(departmentStats).slice(0, 10) // 只显示前10个部门
    const officeData = departments.map(dept => departmentStats[dept].office)
    const teamData = departments.map(dept => departmentStats[dept].team)

    // 如果没有数据，使用测试数据
    if (departments.length === 0) {
      return {
        title: { 
          text: '各部门扣分次数对比', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        legend: { data: ['科室扣分次数', '车队扣分次数'], top: 35 },
        grid: { left: '10%', right: '10%', bottom: '25%', top: '20%' },
        xAxis: { 
          type: 'category', 
          data: ['高铁车队', '动车车队', '普速车队'],
          axisLabel: {
            rotate: 45,
            fontSize: 9
          }
        },
        yAxis: { type: 'value', name: '扣分次数' },
        series: [
          { 
            name: '科室扣分次数', 
            type: 'bar', 
            data: [15, 12, 8], 
            itemStyle: { color: '#ff6b6b' } 
          },
          { 
            name: '车队扣分次数', 
            type: 'bar', 
            data: [10, 8, 6], 
            itemStyle: { color: '#4ecdc4' } 
          }
        ]
      }
    }

    return {
      title: {
        text: '各部门扣分次数对比',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['科室扣分次数', '车队扣分次数'],
        top: 50
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '25%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: departments.map(dept => dept.length > 8 ? dept.substring(0, 8) + '...' : dept),
        axisLabel: {
          rotate: 45,
          fontSize: 9,
          margin: 8
        }
      },
      yAxis: {
        type: 'value',
        name: '扣分次数'
      },
      series: [
        {
          name: '科室扣分次数',
          type: 'bar',
          data: officeData,
          itemStyle: {
            color: '#ff6b6b'
          }
        },
        {
          name: '车队扣分次数',
          type: 'bar',
          data: teamData,
          itemStyle: {
            color: '#4ecdc4'
          }
        }
      ]
    }
  }

  /**
   * 图表4：Top10问题柱状图
   */
  const getTop10IssuesBarChartOption = (assessmentData: any[]): EChartsOption => {
    console.log('Top10数据分析:', assessmentData.slice(0, 2))
    
    // 统计问题项目
    const issueStats: Record<string, number> = {}
    assessmentData.forEach(record => {
      if (record.details && Array.isArray(record.details)) {
        record.details.forEach((detail: any) => {
          const issue = detail.item || detail.itemDetail || detail.itemName || '未知问题'
          const deduction = Math.abs(detail.deduction || detail.score || 0)
          issueStats[issue] = (issueStats[issue] || 0) + deduction
        })
      }
    })

    console.log('问题统计:', Object.keys(issueStats).slice(0, 5))

    // 获取Top10问题
    const top10Issues = Object.keys(issueStats)
      .map(issue => ({
        name: issue.length > 20 ? issue.substring(0, 20) + '...' : issue,
        value: Math.round(issueStats[issue] * 100) / 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // 如果没有数据，使用测试数据
    if (top10Issues.length === 0) {
      return {
        title: { 
          text: 'Top10 扣分问题排行', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        grid: { left: '10%', right: '10%', bottom: '25%', top: '20%' },
        xAxis: { 
          type: 'category', 
          data: ['服务质量问题', '安全管理问题', '纪律作风问题'],
          axisLabel: {
            rotate: 45,
            fontSize: 9
          }
        },
        yAxis: { type: 'value', name: '累计扣分' },
        series: [{
          type: 'bar',
          data: [10, 8, 6],
          itemStyle: { color: '#ff6b6b' },
          label: {
            show: true,
            position: 'top',
            fontSize: 9
          }
        }]
      }
    }

    return {
      title: {
        text: 'Top10 扣分问题排行',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: '{b}: {c}分'
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '30%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: top10Issues.map(item => item.name),
        axisLabel: {
          rotate: 45,
          fontSize: 9,
          interval: 0,
          margin: 8,
          formatter: function(value: string) {
            // 进一步缩短X轴标签，避免重叠
            return value.length > 12 ? value.substring(0, 12) + '...' : value
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '累计扣分'
      },
      series: [{
        name: '累计扣分',
        type: 'bar',
        data: top10Issues.map(item => item.value),
        itemStyle: {
          color: (params: any) => {
            // 渐变色
            const colors = ['#ff6b6b', '#ffa726', '#ffcc02', '#66bb6a', '#42a5f5']
            return colors[params.dataIndex % colors.length]
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}分'
        }
      }]
    }
  }

  /**
   * 图表5：管理力度综合评估雷达图（简化版）
   */
  const getManagementIntensityRadarChartOption = (managementData: any): EChartsOption => {
    console.log('雷达图数据分析:', managementData)
    
    // 检查是否有优化的评估数据
    if (managementData?.radarData) {
      // 使用优化的雷达图数据
      const { indicators, values } = managementData.radarData
      
      return {
        title: {
          text: '管理力度综合评估',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const data = params.data
            const indicator = indicators[params.dataIndex]
            return `${indicator.name}<br/>
                   得分：${data.value[params.dataIndex]}<br/>
                   说明：${indicator.description}`
          }
        },
        grid: {
          left: '5%',
          right: '5%',
          bottom: '5%',
          top: '15%'
        },
        radar: {
          indicator: indicators.map((ind: any) => ({
            name: ind.name,
            max: ind.max
          })),
          center: ['50%', '55%'],
          radius: '60%',
          splitNumber: 5,
          axisName: {
            fontSize: 11,
            color: '#333'
          },
          splitArea: {
            areaStyle: {
              color: ['rgba(171, 217, 233, 0.1)', 'rgba(171, 217, 233, 0.2)']
            }
          }
        },
        series: [{
          name: '管理力度综合评估',
          type: 'radar',
          data: [{
            value: values,
            name: '当前状态',
            itemStyle: {
              color: '#1890ff'
            },
            areaStyle: {
              opacity: 0.25,
              color: '#1890ff'
            },
            lineStyle: {
              width: 2
            }
          }]
        }]
      }
    }
    
    // 无数据时的占位符图表
    return {
      title: { 
        text: '管理力度综合评估（请选择月份）', 
        left: 'center',
        top: 10,
        textStyle: { fontSize: 14, color: '#999' }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '5%',
        top: '15%'
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
        radius: '50%'
      },
      series: [{
        type: 'radar',
        data: [{
          value: [60, 70, 65, 55, 75],
          name: '示例数据',
          itemStyle: { color: '#ddd' },
          areaStyle: { opacity: 0.2, color: '#ddd' }
        }]
      }]
    }
  }

  /**
   * 图表6：评分离散度分析图
   */
  const getScoreDispersionChartOption = (dispersionData: any): EChartsOption => {
    console.log('离散度图数据分析:', dispersionData)
    
    if (!dispersionData) {
      // 返回测试离散度图
      return {
        title: { 
          text: '评分离散度分析', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        legend: { data: ['标准差'], top: 35 },
        grid: { 
          left: '15%', 
          right: '10%', 
          bottom: '20%', 
          top: '20%' 
        },
        xAxis: { 
          type: 'category', 
          data: ['高铁车队', '动车车队', '普速车队'],
          axisLabel: {
            fontSize: 10,
            rotate: 45
          }
        },
        yAxis: { 
          type: 'value',
          name: '标准差' 
        },
        series: [{
          name: '标准差',
          type: 'bar',
          data: [2.5, 3.2, 1.8],
          itemStyle: { color: '#45b7d1' }
        }]
      }
    }

    const departmentNames = Object.keys(dispersionData.departmentAnalysis || {})
    const standardDeviations = departmentNames.map(dept => 
      dispersionData.departmentAnalysis[dept]?.statistics?.standardDeviation || 0
    )
    const riskScores = departmentNames.map(dept => 
      dispersionData.departmentAnalysis[dept]?.bigPotRisk?.score || 0
    )
    
    // 获取详细的风险信息用于tooltip
    const riskDetails = departmentNames.map(dept => ({
      level: dispersionData.departmentAnalysis[dept]?.bigPotRisk?.level || '未知',
      description: dispersionData.departmentAnalysis[dept]?.bigPotRisk?.description || '',
      coefficientOfVariation: dispersionData.departmentAnalysis[dept]?.statistics?.coefficientOfVariation || 0,
      sampleSize: dispersionData.departmentAnalysis[dept]?.statistics?.sampleSize || 0,
      mean: dispersionData.departmentAnalysis[dept]?.statistics?.mean || 0,
      range: dispersionData.departmentAnalysis[dept]?.statistics?.range || 0
    }))

    return {
      title: {
        text: '评分离散度分析',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex
          const dept = departmentNames[dataIndex]
          const risk = riskDetails[dataIndex]
          
          let html = `<div style="font-weight: bold; color: #333; margin-bottom: 8px;">${dept}</div>`
          
          params.forEach((param: any) => {
            if (param.seriesName === '标准差') {
              html += `<div style="margin-bottom: 4px;">
                      <span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${param.color}"></span>
                      ${param.seriesName}: ${param.value}
                     </div>`
              html += `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">
                      平均分: ${risk.mean}分 | 分数范围: ${risk.range}分 | 样本数: ${risk.sampleSize}个
                     </div>`
              html += `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">
                      变异系数: ${risk.coefficientOfVariation}%
                     </div>`
            } else if (param.seriesName === '风险分数') {
              const levelColor = risk.level === '极高风险' ? '#ff4d4f' :
                                risk.level === '高风险' ? '#ff7875' :
                                risk.level === '中等风险' ? '#faad14' :
                                risk.level === '低风险' ? '#52c41a' :
                                risk.level === '极低风险' ? '#1890ff' :
                                risk.level === '几乎无风险' ? '#1890ff' : '#666'
              
              html += `<div style="margin-bottom: 4px;">
                      <span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${param.color}"></span>
                      ${param.seriesName}: ${param.value}分
                     </div>`
              html += `<div style="margin-bottom: 6px;">
                      <span style="color: ${levelColor}; font-weight: bold;">风险等级: ${risk.level}</span>
                     </div>`
              html += `<div style="color: #333; font-size: 12px; line-height: 1.4; max-width: 300px;">
                      <strong>风险分析:</strong> ${risk.description}
                     </div>`
            }
          })
          
          return html
        }
      },
      legend: {
        data: ['标准差', '风险分数'],
        top: 35
      },
      grid: {
        left: '15%',
        right: '15%',
        bottom: '25%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: departmentNames.map(name => name.length > 8 ? name.substring(0, 8) + '...' : name),
        axisLabel: {
          rotate: 45,
          fontSize: 9,
          margin: 8
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '标准差',
          position: 'left',
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          name: '风险分数（分数越高风险越高）',
          position: 'right',
          min: 0,
          max: 100,
          axisLabel: {
            formatter: '{value}分'
          }
        }
      ],
      series: [
        {
          name: '标准差',
          type: 'bar',
          data: standardDeviations,
          itemStyle: {
            color: '#36cfc9'
          }
        },
        {
          name: '风险分数',
          type: 'line',
          yAxisIndex: 1,
          data: riskScores,
          lineStyle: {
            color: '#ff4d4f',
            width: 3
          },
          itemStyle: {
            color: '#ff4d4f',
            borderWidth: 2,
            borderColor: '#fff'
          },
          symbol: 'circle',
          symbolSize: 8
        }
      ]
    }
  }

  /**
   * 图表7：考核日期分布图
   */
  const getAssessDateDistributionChartOption = (assessmentData: any[]): EChartsOption => {
    console.log('考核日期分布数据分析:', assessmentData.slice(0, 2))
    
    // 统计每日考核次数
    const dateStats: Record<string, number> = {}
    assessmentData.forEach(record => {
      const assessDate = record.assessDate
      if (assessDate) {
        dateStats[assessDate] = (dateStats[assessDate] || 0) + 1
      }
    })

    console.log('日期统计:', dateStats)

    // 按日期排序并转换为图表数据
    const sortedDates = Object.keys(dateStats).sort()
    const dates = sortedDates
    const counts = sortedDates.map(date => dateStats[date])

    // 如果没有数据，使用测试数据
    if (dates.length === 0) {
      return {
        title: { 
          text: '考核日期分布', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { 
          trigger: 'axis',
          formatter: '{b}: {c}次考核'
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
        xAxis: { 
          type: 'category', 
          data: ['03-01', '03-05', '03-10', '03-15', '03-20'],
          axisLabel: { 
            fontSize: 10,
            rotate: 45
          }
        },
        yAxis: { 
          type: 'value', 
          name: '考核次数',
          minInterval: 1
        },
        series: [{
          type: 'bar',
          data: [8, 12, 15, 6, 10],
          itemStyle: { color: '#5470c6' },
          barWidth: '60%'
        }]
      }
    }

    return {
      title: {
        text: '考核日期分布',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          const param = params[0]
          return `${param.name}: ${param.value}次考核`
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates.map(date => date.substring(5)), // 显示MM-DD格式
        axisLabel: {
          fontSize: 10,
          rotate: 45,
          margin: 8
        },
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '考核次数',
        minInterval: 1,
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#5470c6'
        },
        barWidth: '60%',
        emphasis: {
          itemStyle: {
            color: '#4ea3d9'
          }
        }
      }]
    }
  }

  /**
   * 图表8：录入时效性分析图
   */
  const getEntryTimingAnalysisChartOption = (assessmentData: any[]): EChartsOption => {
    console.log('录入时效性数据分析:', assessmentData.slice(0, 2))
    
    // 计算录入延迟统计
    const dailyDelayAvg: Record<string, { totalDelay: number, count: number }> = {}
    
    assessmentData.forEach(record => {
      const assessDate = record.assessDate
      const assessTime = record.assessTime
      
      if (assessDate && assessTime) {
        // 计算延迟天数
        const assessDateObj = new Date(assessDate)
        const assessTimeObj = new Date(assessTime)
        const delayDays = Math.round((assessTimeObj.getTime() - assessDateObj.getTime()) / (1000 * 60 * 60 * 24))
        
        // 按录入时间分组
        const entryDate = assessTime
        if (!dailyDelayAvg[entryDate]) {
          dailyDelayAvg[entryDate] = { totalDelay: 0, count: 0 }
        }
        dailyDelayAvg[entryDate].totalDelay += delayDays
        dailyDelayAvg[entryDate].count += 1
      }
    })

    // 计算每日平均延迟
    const sortedEntryDates = Object.keys(dailyDelayAvg).sort()
    const entryDates = sortedEntryDates
    const avgDelays = sortedEntryDates.map(date => {
      const stats = dailyDelayAvg[date]
      return Math.round((stats.totalDelay / stats.count) * 10) / 10
    })
    const entryCounts = sortedEntryDates.map(date => dailyDelayAvg[date].count)

    // 如果没有数据，使用测试数据
    if (entryDates.length === 0) {
      return {
        title: { 
          text: '录入时效性分析', 
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        legend: { 
          data: ['录入次数', '平均延迟天数'], 
          top: 35 
        },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
        xAxis: { 
          type: 'category', 
          data: ['04-25', '04-26', '04-27', '04-28', '04-29'],
          axisLabel: { fontSize: 10, rotate: 45 }
        },
        yAxis: [
          { type: 'value', name: '录入次数', position: 'left' },
          { type: 'value', name: '延迟天数', position: 'right' }
        ],
        series: [
          { 
            name: '录入次数', 
            type: 'bar', 
            data: [15, 18, 22, 12, 8], 
            itemStyle: { color: '#91cc75' },
            yAxisIndex: 0
          },
          { 
            name: '平均延迟天数', 
            type: 'line', 
            data: [25, 22, 20, 28, 30], 
            itemStyle: { color: '#fac858' },
            yAxisIndex: 1,
            smooth: true
          }
        ]
      }
    }

    return {
      title: {
        text: '录入时效性分析',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          let result = `${params[0].name}<br/>`
          params.forEach((param: any) => {
            const unit = param.seriesName === '录入次数' ? '次' : '天'
            result += `${param.marker}${param.seriesName}: ${param.value}${unit}<br/>`
          })
          return result
        }
      },
      legend: {
        data: ['录入次数', '平均延迟天数'],
        top: 50
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: entryDates.map(date => date.substring(5)), // 显示MM-DD格式
        axisLabel: {
          fontSize: 10,
          rotate: 45,
          margin: 8
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '录入次数',
          position: 'left',
          minInterval: 1,
          axisLine: {
            lineStyle: {
              color: '#91cc75'
            }
          },
          axisLabel: {
            color: '#91cc75'
          }
        },
        {
          type: 'value',
          name: '延迟天数',
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#fac858'
            }
          },
          axisLabel: {
            color: '#fac858'
          }
        }
      ],
      series: [
        {
          name: '录入次数',
          type: 'bar',
          data: entryCounts,
          itemStyle: {
            color: '#91cc75'
          },
          yAxisIndex: 0,
          barWidth: '60%'
        },
        {
          name: '平均延迟天数',
          type: 'line',
          data: avgDelays,
          itemStyle: {
            color: '#fac858'
          },
          lineStyle: {
            color: '#fac858'
          },
          yAxisIndex: 1,
          smooth: true
        }
      ]
    }
  }

  return {
    loading,
    getDeductionCategoryPieChartOption,
    getTimeTrendLineChartOption,
    getDeductionCountBarChartOption,
    getTop10IssuesBarChartOption,
    getManagementIntensityRadarChartOption,
    getScoreDispersionChartOption,
    getAssessDateDistributionChartOption,
    getEntryTimingAnalysisChartOption
  }
} 