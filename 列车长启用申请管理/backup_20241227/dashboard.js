// 仪表盘功能相关代码

// 初始化仪表盘
function initDashboard() {
  updateConductorCounts();
  updateCharts();
  updateRecentApplications();
  updateCurrentDate();
}

// 更新顶部统计卡片的列车长数量
function updateConductorCounts() {
  const officialCount = document.getElementById('official-count');
  const temporaryCount = document.getElementById('temporary-count');
  const reserveCount = document.getElementById('reserve-count');
  
  officialCount.textContent = getConductorsByStatus('正式启用').length;
  temporaryCount.textContent = getConductorsByStatus('临时启用').length;
  reserveCount.textContent = getConductorsByStatus('后备').length;
}

// 更新图表
function updateCharts() {
  updateStatusChart();
  updateDepartmentChart();
}

// 更新状态分布图表
function updateStatusChart() {
  const ctx = document.getElementById('statusChart').getContext('2d');
  
  // 获取各状态列车长数量
  const officialCount = getConductorsByStatus('正式启用').length;
  const temporaryCount = getConductorsByStatus('临时启用').length;
  const reserveCount = getConductorsByStatus('后备').length;
  const dismissedCount = getConductorsByStatus('免职').length;
  
  const labels = ['正式启用', '临时启用', '后备', '免职'];
  const data = [officialCount, temporaryCount, reserveCount, dismissedCount];
  
  // 清除旧图表 - 添加检查确保图表对象存在
  if (window.statusChart && typeof window.statusChart.destroy === 'function') {
    window.statusChart.destroy();
  }
  
  // 创建新图表
  window.statusChart = createPieChart(ctx, labels, data);
}

// 更新部门分布图表
function updateDepartmentChart() {
  const ctx = document.getElementById('departmentChart').getContext('2d');
  
  // 获取所有部门
  const departments = getAllDepartmentNames();
  
  // 计算各部门列车长数量
  const labels = [];
  const data = [];
  
  departments.forEach(dept => {
    const count = getConductorsByDepartment(dept).length;
    // 只显示有人员的部门，避免图表太过复杂
    if (count > 0) {
      labels.push(dept);
      data.push(count);
    }
  });
  
  // 清除旧图表 - 添加检查确保图表对象存在
  if (window.departmentChart && typeof window.departmentChart.destroy === 'function') {
    window.departmentChart.destroy();
  }
  
  // 创建新图表
  window.departmentChart = createPieChart(ctx, labels, data);
}

// 更新近期申请列表
function updateRecentApplications() {
  const recentAppsContainer = document.getElementById('recent-applications');
  
  // 获取最近5条申请
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  // 清空容器
  recentAppsContainer.innerHTML = '';
  
  // 没有申请时显示提示信息
  if (recentApps.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="5" class="py-4 px-4 text-center text-gray-500">暂无申请记录</td>
    `;
    recentAppsContainer.appendChild(noDataRow);
    return;
  }
  
  // 添加申请行
  recentApps.forEach(app => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');
    
    row.innerHTML = `
      <td class="py-3 px-4">${app.type}</td>
      <td class="py-3 px-4">${app.department}</td>
      <td class="py-3 px-4">${app.employeeId}</td>
      <td class="py-3 px-4">${app.name}</td>
      <td class="py-3 px-4">${app.date}</td>
    `;
    
    recentAppsContainer.appendChild(row);
  });
}

// 更新当前日期
function updateCurrentDate() {
  const dateElement = document.getElementById('current-date');
  const now = new Date();
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long'
  };
  
  dateElement.textContent = now.toLocaleDateString('zh-CN', options);
} 