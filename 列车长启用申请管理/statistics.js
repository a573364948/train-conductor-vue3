// 统计与报表相关代码

// 初始化统计与报表页面
function initStatistics() {
  setupStatisticsListeners();
  updateStatisticsCharts();
  updateDepartmentStats();
}

// 设置统计与报表相关的事件监听器
function setupStatisticsListeners() {
  // 部门筛选
  const departmentFilter = document.getElementById('stats-department-filter');
  departmentFilter.addEventListener('change', () => {
    updateStatisticsCharts();
  });
  
  // 编辑定员按钮
  document.getElementById('edit-quota-btn').addEventListener('click', openEditQuotaModal);
  
  // 编辑定员表单提交
  document.getElementById('edit-quota-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveQuotaChanges();
  });
  
  // 导出按钮
  document.getElementById('export-statistics').addEventListener('click', exportStatistics);
}

// 更新统计图表
function updateStatisticsCharts() {
  updateDepartmentStatusChart();
  updateQuotaComparisonChart();
  updateApplicationTrendChart();
}

// 更新部门状态分布图表
function updateDepartmentStatusChart() {
  const ctx = document.getElementById('departmentStatusChart').getContext('2d');
  const departmentFilter = document.getElementById('stats-department-filter').value;
  
  // 选择的部门（如果未选择则展示所有部门）
  const departments = departmentFilter ? [departmentFilter] : getAllDepartmentNames();
  
  // 获取数据
  const datasets = [];
  
  for (const department of departments) {
    const officialCount = getConductorsByDepartmentAndStatus(department, '正式启用').length;
    const temporaryCount = getConductorsByDepartmentAndStatus(department, '临时启用').length;
    const reserveCount = getConductorsByDepartmentAndStatus(department, '后备').length;
    const dismissedCount = getConductorsByDepartmentAndStatus(department, '免职').length;
    
    datasets.push({
      label: department,
      data: [officialCount, temporaryCount, reserveCount, dismissedCount]
    });
  }
  
  const labels = ['正式启用', '临时启用', '后备', '免职'];
  
  // 清除旧图表
  if (window.departmentStatusChart && typeof window.departmentStatusChart.destroy === 'function') {
    window.departmentStatusChart.destroy();
  }
  
  // 创建新图表
  window.departmentStatusChart = createBarChart(
    ctx, 
    labels, 
    datasets, 
    departmentFilter ? `${departmentFilter}列车长状态分布` : '各部门列车长状态分布'
  );
}

// 更新人员配置对比图表
function updateQuotaComparisonChart() {
  const ctx = document.getElementById('quotaComparisonChart').getContext('2d');
  
  // 获取各部门数据 - 使用动态部门列表
  const departments = getAllDepartmentNames();
  
  // 筛选出有配额或有实际人数的部门，避免图表过于复杂
  const filteredDepartments = departments.filter(dept => {
    const quota = departmentQuotas[dept] || 0;
    const actual = getConductorsByDepartmentAndStatus(dept, '正式启用').length + 
                  getConductorsByDepartmentAndStatus(dept, '临时启用').length;
    return quota > 0 || actual > 0;
  });
  
  const quotas = filteredDepartments.map(dept => departmentQuotas[dept] || 0);
  const actual = filteredDepartments.map(dept => 
    getConductorsByDepartmentAndStatus(dept, '正式启用').length + 
    getConductorsByDepartmentAndStatus(dept, '临时启用').length
  );
  
  // 创建数据集
  const datasets = [
    {
      label: '定员人数',
      data: quotas
    },
    {
      label: '实际人数',
      data: actual
    }
  ];
  
  // 清除旧图表
  if (window.quotaComparisonChart && typeof window.quotaComparisonChart.destroy === 'function') {
    window.quotaComparisonChart.destroy();
  }
  
  // 创建新图表
  window.quotaComparisonChart = createBarChart(ctx, filteredDepartments, datasets, '部门人员配置对比');
}

// 更新申请趋势图表
function updateApplicationTrendChart() {
  const ctx = document.getElementById('applicationTrendChart').getContext('2d');
  
  // 获取申请趋势数据
  const trend = getApplicationTrend();
  
  // 创建数据集
  const datasets = [
    {
      label: '正式启用',
      data: trend.official
    },
    {
      label: '临时启用',
      data: trend.temporary
    },
    {
      label: '免职',
      data: trend.dismissal
    }
  ];
  
  // 清除旧图表
  if (window.applicationTrendChart && typeof window.applicationTrendChart.destroy === 'function') {
    window.applicationTrendChart.destroy();
  }
  
  // 创建新图表
  window.applicationTrendChart = createLineChart(ctx, trend.months, datasets, '申请趋势（近6个月）');
}

// 更新部门统计数据表格
function updateDepartmentStats() {
  const tableBody = document.getElementById('department-stats-body');
  
  // 获取统计数据
  const departmentStats = getDepartmentStatistics();
  
  // 清空表格
  tableBody.innerHTML = '';
  
  // 添加表格行
  departmentStats.forEach(stat => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');
    
    // 计算空缺率的颜色
    let vacancyRateColor = 'text-green-600';
    if (parseFloat(stat.vacancyRate) > 10) {
      vacancyRateColor = 'text-yellow-600';
    }
    if (parseFloat(stat.vacancyRate) > 20) {
      vacancyRateColor = 'text-red-600';
    }
    
    row.innerHTML = `
      <td class="py-3 px-4">${stat.department}</td>
      <td class="py-3 px-4 text-center">${stat.quota}</td>
      <td class="py-3 px-4 text-center">${stat.official}</td>
      <td class="py-3 px-4 text-center">${stat.temporary}</td>
      <td class="py-3 px-4 text-center">${stat.reserve}</td>
      <td class="py-3 px-4 text-center">${stat.vacancies}</td>
      <td class="py-3 px-4 text-center ${vacancyRateColor}">${stat.vacancyRate}%</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // 添加总计行
  const totalRow = document.createElement('tr');
  totalRow.classList.add('font-medium', 'bg-gray-50');
  
  const totalQuota = departmentStats.reduce((sum, stat) => sum + stat.quota, 0);
  const totalOfficial = departmentStats.reduce((sum, stat) => sum + stat.official, 0);
  const totalTemporary = departmentStats.reduce((sum, stat) => sum + stat.temporary, 0);
  const totalReserve = departmentStats.reduce((sum, stat) => sum + stat.reserve, 0);
  const totalVacancies = departmentStats.reduce((sum, stat) => sum + stat.vacancies, 0);
  const totalVacancyRate = totalQuota > 0 ? (totalVacancies / totalQuota * 100).toFixed(1) : '0.0';
  
  // 计算总空缺率的颜色
  let totalVacancyRateColor = 'text-green-600';
  if (parseFloat(totalVacancyRate) > 10) {
    totalVacancyRateColor = 'text-yellow-600';
  }
  if (parseFloat(totalVacancyRate) > 20) {
    totalVacancyRateColor = 'text-red-600';
  }
  
  totalRow.innerHTML = `
    <td class="py-3 px-4">总计</td>
    <td class="py-3 px-4 text-center">${totalQuota}</td>
    <td class="py-3 px-4 text-center">${totalOfficial}</td>
    <td class="py-3 px-4 text-center">${totalTemporary}</td>
    <td class="py-3 px-4 text-center">${totalReserve}</td>
    <td class="py-3 px-4 text-center">${totalVacancies}</td>
    <td class="py-3 px-4 text-center ${totalVacancyRateColor}">${totalVacancyRate}%</td>
  `;
  
  tableBody.appendChild(totalRow);
}

// 打开编辑定员模态框
function openEditQuotaModal() {
  // 动态获取所有部门
  const departments = getAllDepartmentNames();
  
  // 获取表单容器
  const formFieldsContainer = document.getElementById('quota-form-fields');
  if (!formFieldsContainer) return;
  
  // 清空现有内容
  formFieldsContainer.innerHTML = '';
  
  // 动态生成部门定员输入框
  departments.forEach(dept => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'flex items-center space-x-4';
    
    const actualCount = getConductorsByDepartmentAndStatus(dept, '正式启用').length + 
                       getConductorsByDepartmentAndStatus(dept, '临时启用').length;
    const quota = departmentQuotas[dept] || 0;
    
    fieldDiv.innerHTML = `
      <label class="block text-sm font-medium text-gray-700 w-32">${dept}</label>
      <input type="number" name="quota-${dept}" class="input-field w-24" min="0" value="${quota}" required>
      <span class="text-sm text-gray-500">当前: <span class="current-count" data-department="${dept}">${actualCount}</span> 人</span>
    `;
    
    formFieldsContainer.appendChild(fieldDiv);
  });
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('edit-quota-modal').classList.remove('hidden');
}

// 保存定员变更
function saveQuotaChanges() {
  // 动态获取所有部门
  const departments = getAllDepartmentNames();
  
  departments.forEach(dept => {
    const input = document.querySelector(`[name="quota-${dept}"]`);
    if (input) {
      const quota = parseInt(input.value) || 0;
      
      // 更新定员数据
      updateDepartmentQuota(dept, quota);
    }
  });
  
  // 关闭模态框
  closeModals();
  
  // 更新图表和统计
  updateQuotaComparisonChart();
  updateDepartmentStats();
}

// 导出统计报表
function exportStatistics() {
  // 获取统计数据
  const departmentStats = getDepartmentStatistics();
  
  // 创建CSV内容
  let csvContent = '部门,定员数,正式启用,临时启用,后备,空缺数,空缺率\n';
  
  departmentStats.forEach(stat => {
    csvContent += `${stat.department},${stat.quota},${stat.official},${stat.temporary},${stat.reserve},${stat.vacancies},${stat.vacancyRate}%\n`;
  });
  
  // 添加总计行
  const totalQuota = departmentStats.reduce((sum, stat) => sum + stat.quota, 0);
  const totalOfficial = departmentStats.reduce((sum, stat) => sum + stat.official, 0);
  const totalTemporary = departmentStats.reduce((sum, stat) => sum + stat.temporary, 0);
  const totalReserve = departmentStats.reduce((sum, stat) => sum + stat.reserve, 0);
  const totalVacancies = departmentStats.reduce((sum, stat) => sum + stat.vacancies, 0);
  const totalVacancyRate = totalQuota > 0 ? (totalVacancies / totalQuota * 100).toFixed(1) : '0.0';
  
  csvContent += `总计,${totalQuota},${totalOfficial},${totalTemporary},${totalReserve},${totalVacancies},${totalVacancyRate}%\n`;
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `列车长统计报表_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 