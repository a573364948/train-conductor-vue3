/**
 * 性能监控工具 - 第四阶段性能优化
 * 监控系统性能、内存使用、加载时间等关键指标
 */

// 性能监控接口
interface PerformanceMetrics {
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  loadTimes: {
    domContentLoaded: number
    loadComplete: number
    firstContentfulPaint: number
  }
  renderPerformance: {
    chartRenderTime?: number
    pageRenderTime?: number
  }
  userInteraction: {
    clickResponseTime?: number
    scrollPerformance?: number
  }
}

// 性能监控类
class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeMonitoring()
  }

  /**
   * 初始化性能监控
   */
  private initializeMonitoring() {
    // 监控页面加载性能
    this.monitorLoadPerformance()
    
    // 监控内存使用
    this.monitorMemoryUsage()
    
    // 监控用户交互性能
    this.monitorUserInteraction()
    
    // 监控长任务
    this.monitorLongTasks()
  }

  /**
   * 监控页面加载性能
   */
  private monitorLoadPerformance() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      this.metrics.loadTimes = {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstContentfulPaint: this.getFirstContentfulPaint()
      }
    }
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFirstContentfulPaint(): number {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
    return fcpEntry ? fcpEntry.startTime : 0
  }

  /**
   * 监控内存使用（如果浏览器支持）
   */
  private monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      }
    }
  }

  /**
   * 监控用户交互性能
   */
  private monitorUserInteraction() {
    let clickStartTime = 0
    
    // 监控点击响应时间
    document.addEventListener('mousedown', () => {
      clickStartTime = performance.now()
    })
    
    document.addEventListener('click', () => {
      if (clickStartTime) {
        const responseTime = performance.now() - clickStartTime
        this.metrics.userInteraction = {
          ...this.metrics.userInteraction,
          clickResponseTime: responseTime
        }
      }
    })
  }

  /**
   * 监控长任务（阻塞主线程的任务）
   */
  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.duration > 50) { // 超过50ms的任务被认为是长任务
              console.warn(`长任务检测到: ${entry.name}, 持续时间: ${entry.duration.toFixed(2)}ms`)
            }
          })
        })
        
        observer.observe({ entryTypes: ['longtask'] })
        this.observers.push(observer)
      } catch (e) {
        console.warn('长任务监控不支持')
      }
    }
  }

  /**
   * 监控图表渲染性能
   */
  public startChartRenderMonitoring(chartId: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      this.metrics.renderPerformance = {
        ...this.metrics.renderPerformance,
        chartRenderTime: renderTime
      }
      
      if (renderTime > 100) {
        console.warn(`图表 ${chartId} 渲染时间较长: ${renderTime.toFixed(2)}ms`)
      }
    }
  }

  /**
   * 监控页面渲染性能
   */
  public startPageRenderMonitoring(): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      this.metrics.renderPerformance = {
        ...this.metrics.renderPerformance,
        pageRenderTime: renderTime
      }
    }
  }

  /**
   * 获取当前性能指标
   */
  public getMetrics(): Partial<PerformanceMetrics> {
    // 更新内存使用情况
    this.monitorMemoryUsage()
    return { ...this.metrics }
  }

  /**
   * 生成性能报告
   */
  public generateReport(): string {
    const metrics = this.getMetrics()
    
    let report = '=== 性能监控报告 ===\n\n'
    
    if (metrics.memoryUsage) {
      report += `内存使用:\n`
      report += `  已使用: ${metrics.memoryUsage.used}MB\n`
      report += `  总计: ${metrics.memoryUsage.total}MB\n`
      report += `  使用率: ${metrics.memoryUsage.percentage}%\n\n`
    }
    
    if (metrics.loadTimes) {
      report += `加载性能:\n`
      report += `  DOM加载: ${metrics.loadTimes.domContentLoaded.toFixed(2)}ms\n`
      report += `  完全加载: ${metrics.loadTimes.loadComplete.toFixed(2)}ms\n`
      report += `  首次内容绘制: ${metrics.loadTimes.firstContentfulPaint.toFixed(2)}ms\n\n`
    }
    
    if (metrics.renderPerformance) {
      report += `渲染性能:\n`
      if (metrics.renderPerformance.chartRenderTime) {
        report += `  图表渲染: ${metrics.renderPerformance.chartRenderTime.toFixed(2)}ms\n`
      }
      if (metrics.renderPerformance.pageRenderTime) {
        report += `  页面渲染: ${metrics.renderPerformance.pageRenderTime.toFixed(2)}ms\n`
      }
      report += '\n'
    }
    
    if (metrics.userInteraction) {
      report += `交互性能:\n`
      if (metrics.userInteraction.clickResponseTime) {
        report += `  点击响应: ${metrics.userInteraction.clickResponseTime.toFixed(2)}ms\n`
      }
    }
    
    return report
  }

  /**
   * 输出性能警告
   */
  public checkPerformanceWarnings(): string[] {
    const warnings: string[] = []
    const metrics = this.getMetrics()
    
    // 检查内存使用
    if (metrics.memoryUsage && metrics.memoryUsage.percentage > 80) {
      warnings.push(`内存使用率过高: ${metrics.memoryUsage.percentage}%`)
    }
    
    // 检查加载时间
    if (metrics.loadTimes) {
      if (metrics.loadTimes.loadComplete > 3000) {
        warnings.push(`页面加载时间过长: ${metrics.loadTimes.loadComplete.toFixed(0)}ms`)
      }
      if (metrics.loadTimes.firstContentfulPaint > 1500) {
        warnings.push(`首次内容绘制时间过长: ${metrics.loadTimes.firstContentfulPaint.toFixed(0)}ms`)
      }
    }
    
    // 检查渲染性能
    if (metrics.renderPerformance) {
      if (metrics.renderPerformance.chartRenderTime && metrics.renderPerformance.chartRenderTime > 200) {
        warnings.push(`图表渲染时间过长: ${metrics.renderPerformance.chartRenderTime.toFixed(0)}ms`)
      }
    }
    
    return warnings
  }

  /**
   * 清理监控器
   */
  public cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor()

// 导出工具函数
export const startChartRenderMonitoring = (chartId: string) => 
  performanceMonitor.startChartRenderMonitoring(chartId)

export const startPageRenderMonitoring = () => 
  performanceMonitor.startPageRenderMonitoring()

export const getPerformanceMetrics = () => 
  performanceMonitor.getMetrics()

export const generatePerformanceReport = () => 
  performanceMonitor.generateReport()

export const checkPerformanceWarnings = () => 
  performanceMonitor.checkPerformanceWarnings()

export const cleanupPerformanceMonitoring = () => 
  performanceMonitor.cleanup()

// 在开发环境下自动输出性能报告
if (import.meta.env.DEV) {
  // 页面加载完成后输出性能报告
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log(generatePerformanceReport())
      
      const warnings = checkPerformanceWarnings()
      if (warnings.length > 0) {
        console.warn('性能警告:')
        warnings.forEach(warning => console.warn(`- ${warning}`))
      }
    }, 1000)
  })
}

export default performanceMonitor 