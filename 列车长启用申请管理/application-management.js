// 申请管理相关代码

// 当前页码和每页显示数量
let currentApplicationPage = 1;
const applicationsPerPage = 10;

// 当前筛选条件
let applicationFilters = {
  search: '',
  department: '',
  type: 'all',
  dateFrom: '',
  dateTo: ''
};

// 初始化申请管理
function initApplicationManagement() {
  setupApplicationListeners();
  updateApplicationTable();
}

// 设置申请管理相关的事件监听器
function setupApplicationListeners() {
  // 申请类型标签页
  const tabs = document.querySelectorAll('.application-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 更新标签页样式
      tabs.forEach(t => {
        t.classList.remove('border-black', 'font-medium');
        t.classList.add('border-transparent', 'text-gray-500');
      });
      tab.classList.remove('border-transparent', 'text-gray-500');
      tab.classList.add('border-black', 'font-medium');
      
      // 更新筛选条件
      applicationFilters.type = tab.dataset.tab;
      currentApplicationPage = 1;
      updateApplicationTable();
    });
  });
  
  // 搜索框
  const searchInput = document.getElementById('application-search');
  searchInput.addEventListener('input', () => {
    applicationFilters.search = searchInput.value.trim();
    currentApplicationPage = 1;
    updateApplicationTable();
  });
  
  // 部门筛选
  const departmentFilter = document.getElementById('application-department-filter');
  departmentFilter.addEventListener('change', () => {
    applicationFilters.department = departmentFilter.value;
    currentApplicationPage = 1;
    updateApplicationTable();
  });
  
  // 日期范围筛选
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  
  dateFrom.addEventListener('change', () => {
    applicationFilters.dateFrom = dateFrom.value;
    currentApplicationPage = 1;
    updateApplicationTable();
  });
  
  dateTo.addEventListener('change', () => {
    applicationFilters.dateTo = dateTo.value;
    currentApplicationPage = 1;
    updateApplicationTable();
  });
  
  // 分页按钮
  document.getElementById('application-prev-page').addEventListener('click', () => {
    if (currentApplicationPage > 1) {
      currentApplicationPage--;
      updateApplicationTable();
    }
  });
  
  document.getElementById('application-next-page').addEventListener('click', () => {
    const filteredApplications = getFilteredApplications();
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);
    
    if (currentApplicationPage < totalPages) {
      currentApplicationPage++;
      updateApplicationTable();
    }
  });
  
  // 导入功能
  document.getElementById('import-applications').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('import-applications-modal').classList.remove('hidden');
  });
  
  // 下载申请导入模板
  document.getElementById('download-application-template').addEventListener('click', (e) => {
    e.preventDefault();
    downloadApplicationTemplate();
  });
  
  // 申请导入表单提交
  document.getElementById('import-applications-form').addEventListener('submit', (e) => {
    e.preventDefault();
    importApplications();
  });
  
  // 新建申请按钮
  document.getElementById('create-official-application').addEventListener('click', () => {
    openNewApplicationModal('正式启用');
  });
  
  document.getElementById('create-temporary-application').addEventListener('click', () => {
    openNewApplicationModal('临时启用');
  });
  
  document.getElementById('create-dismissal-application').addEventListener('click', () => {
    openNewApplicationModal('免职');
  });
  
  // 员工查找按钮
  document.getElementById('lookup-employee').addEventListener('click', lookupEmployeeForApplication);
  
  // 新建申请表单提交
  document.getElementById('new-application-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitNewApplication();
  });
  
  // 导出按钮
  document.getElementById('export-applications').addEventListener('click', exportApplications);
  
  // 注意：删除申请的按钮是在updateApplicationTable函数中动态添加的
  // 每次表格更新时，都会为删除按钮添加事件监听器，调用confirmDeleteApplication函数
}

// 更新申请表格
function updateApplicationTable() {
  const tableBody = document.getElementById('applications-table-body');
  const filteredApplications = getFilteredApplications();
  
  // 计算分页信息
  const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);
  const start = (currentApplicationPage - 1) * applicationsPerPage;
  const end = start + applicationsPerPage;
  const pageApplications = filteredApplications.slice(start, end);
  
  // 更新分页控件
  document.getElementById('total-applications').textContent = filteredApplications.length;
  document.getElementById('application-current-page').textContent = currentApplicationPage;
  document.getElementById('application-total-pages').textContent = totalPages || 1;
  
  // 启用/禁用上一页/下一页按钮
  document.getElementById('application-prev-page').disabled = currentApplicationPage <= 1;
  document.getElementById('application-next-page').disabled = currentApplicationPage >= totalPages;
  
  // 清空表格
  tableBody.innerHTML = '';
  
  // 没有数据时显示提示
  if (pageApplications.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="7" class="py-4 px-4 text-center text-gray-500">没有符合条件的申请</td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }
  
  // 添加表格行
  pageApplications.forEach((application, index) => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');
    
    // 计算当前页中的序号
    const displayIndex = start + index + 1;
    
    // 操作按钮HTML
    let operationsHtml = '';
    
    // 如果是待处理状态，显示"通过"和"拒绝"按钮
    if (application.status === '待处理') {
      operationsHtml = `
        <div class="flex space-x-2">
          <button class="approve-application-btn text-green-600 hover:text-green-800" title="通过申请" data-id="${application.id}">
            <i class="ri-check-line"></i>
          </button>
          <button class="reject-application-btn text-yellow-600 hover:text-yellow-800" title="拒绝申请" data-id="${application.id}">
            <i class="ri-close-line"></i>
          </button>
          <button class="delete-application-btn text-red-600 hover:text-red-800" title="删除申请" data-id="${application.id}">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      `;
    } else {
      // 已处理状态只显示删除按钮
      operationsHtml = `
        <button class="delete-application-btn text-red-600 hover:text-red-800" title="删除申请" data-id="${application.id}">
          <i class="ri-delete-bin-line"></i>
        </button>
      `;
    }
    
    row.innerHTML = `
      <td class="py-3 px-4">${application.type}</td>
      <td class="py-3 px-4">${application.employeeId}</td>
      <td class="py-3 px-4">${application.name}</td>
      <td class="py-3 px-4">${application.department}</td>
      <td class="py-3 px-4">${application.date}</td>
      <td class="py-3 px-4">
        <span class="status-badge ${application.status === '待处理' ? 'status-reserve' : 'status-official'}">${application.status}</span>
      </td>
      <td class="py-3 px-4 text-right">
        ${operationsHtml}
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // 添加按钮事件监听器
    const deleteBtn = row.querySelector('.delete-application-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteApplication(application.id));
    
    // 为待处理申请添加通过和拒绝按钮事件
    if (application.status === '待处理') {
      const approveBtn = row.querySelector('.approve-application-btn');
      approveBtn.addEventListener('click', () => approveApplication(application.id));
      
      const rejectBtn = row.querySelector('.reject-application-btn');
      rejectBtn.addEventListener('click', () => rejectApplication(application.id));
    }
  });
}

// 根据筛选条件获取申请列表
function getFilteredApplications() {
  let filtered = [...applications];
  
  // 申请类型筛选 - 将英文标签值映射到中文申请类型
  if (applicationFilters.type && applicationFilters.type !== 'all') {
    const typeMap = {
      'official': '正式启用',
      'temporary': '临时启用',
      'dismissal': '免职'
    };
    
    // 使用映射的类型值进行筛选
    const mappedType = typeMap[applicationFilters.type];
    if (mappedType) {
      filtered = filtered.filter(a => a.type === mappedType);
    }
  }
  
  // 部门筛选
  if (applicationFilters.department) {
    filtered = filtered.filter(a => a.department === applicationFilters.department);
  }
  
  // 日期范围筛选
  if (applicationFilters.dateFrom) {
    filtered = filtered.filter(a => a.date >= applicationFilters.dateFrom);
  }
  
  if (applicationFilters.dateTo) {
    filtered = filtered.filter(a => a.date <= applicationFilters.dateTo);
  }
  
  // 搜索筛选
  if (applicationFilters.search) {
    const search = applicationFilters.search.toLowerCase();
    filtered = filtered.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.employeeId.toLowerCase().includes(search)
    );
  }
  
  // 按日期降序排序
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return filtered;
}

// 打开新建申请模态框
function openNewApplicationModal(type) {
  // 清空表单
  document.getElementById('new-application-form').reset();
  
  // 设置申请类型
  document.getElementById('application-type').value = type;
  
  // 设置模态框标题
  document.getElementById('application-modal-title').textContent = `新建${type}申请`;
  
  // 设置当前日期为默认申请日期
  const today = new Date().toISOString().split('T')[0];
  document.querySelector('#new-application-form [name="applicationDate"]').value = today;
  
  // 确保部门选择器被填充
  updateDepartmentSelectors();
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('new-application-modal').classList.remove('hidden');
}

// 查找员工信息填充申请表单
function lookupEmployeeForApplication() {
  const employeeIdInput = document.getElementById('application-employee-id');
  const employeeId = employeeIdInput.value.trim();
  
  if (!employeeId) {
    alert('请输入工号');
    return;
  }
  
  // 查找员工信息
  const conductor = getConductorByEmployeeId(employeeId);
  
  if (!conductor) {
    alert('未找到该工号对应的列车长');
    return;
  }
  
  // 填充表单
  document.getElementById('application-name').value = conductor.name;
  
  // 设置部门下拉框的值，但保持可选状态
  const departmentSelect = document.getElementById('application-department');
  
  // 确保部门选择框已经被填充选项
  if (departmentSelect.options.length <= 1) {
    // 如果还没有填充选项，先调用更新部门选择器函数
    updateDepartmentSelectors();
  }
  
  // 设置部门值
  departmentSelect.value = conductor.department;
  
  document.getElementById('application-current-status').value = conductor.status;
}

// 提交新申请
function submitNewApplication() {
  const form = document.getElementById('new-application-form');
  
  // 获取表单数据
  const employeeId = form.querySelector('[name="employeeId"]').value.trim();
  const name = form.querySelector('[name="name"]').value.trim();
  const department = form.querySelector('[name="department"]').value.trim();
  const type = document.getElementById('application-type').value;
  const date = form.querySelector('[name="applicationDate"]').value;
  let note = form.querySelector('[name="note"]').value.trim();
  
  // 验证必填字段
  if (!employeeId || !name || !department || !date) {
    alert('请填写完整信息');
    return;
  }
  
  // 验证员工是否存在
  const conductor = getConductorByEmployeeId(employeeId);
  if (!conductor) {
    alert('未找到该工号对应的列车长');
    return;
  }
  
  // 验证申请类型是否合理
  if (type === '正式启用' && conductor.status === '正式启用') {
    alert('该列车长已经是正式启用状态');
    return;
  }
  
  if (type === '临时启用' && conductor.status === '临时启用') {
    alert('该列车长已经是临时启用状态');
    return;
  }
  
  if (type === '免职' && conductor.status === '免职') {
    alert('该列车长已经是免职状态');
    return;
  }
  
  // 检查部门是否发生变更
  const departmentChanged = conductor.department !== department;
  if (departmentChanged) {
    // 确认部门变更操作
    if (!confirm(`确定要将"${conductor.name}"的部门从"${conductor.department}"变更为"${department}"吗？`)) {
      return;
    }
    
    // 更新列车长部门信息
    updateConductor({
      ...conductor,
      department: department
    });
    
    // 在备注中自动添加部门变更记录
    if (note) {
      note += `\n部门变更：${conductor.department} → ${department}`;
    } else {
      note = `部门变更：${conductor.department} → ${department}`;
    }
  }
  
  // 创建新申请
  const newApplication = {
    employeeId,
    name,
    department,
    type,
    date,
    note
  };
  
  // 添加申请
  addApplication(newApplication);
  
  // 关闭模态框
  closeModals();
  
  // 更新表格
  updateApplicationTable();
  
  // 更新列车长表格，确保部门变更立即显示
  if (document.getElementById('conductor-list').classList.contains('hidden') === false) {
    updateConductorTable();
  }
  
  // 如果在仪表盘页面，也更新仪表盘
  if (document.getElementById('dashboard').classList.contains('hidden') === false) {
    updateRecentApplications();
    updateConductorCounts();
    updateCharts();
  }
}

// 通过申请
function approveApplication(applicationId) {
  if (confirm('确定要通过此申请吗？')) {
    // 查找当前申请
    const application = applications.find(a => a.id === applicationId);
    if (!application) return;
    
    // 获取相关列车长
    const conductor = getConductorByEmployeeId(application.employeeId);
    if (!conductor) {
      alert('未找到对应的列车长信息');
      return;
    }
    
    // 更新申请状态
    updateApplicationStatus(applicationId, '已处理');
    
    // 根据申请类型更新列车长状态
    let newStatus = conductor.status;
    switch(application.type) {
      case '正式启用':
        newStatus = '正式启用';
        break;
      case '临时启用':
        newStatus = '临时启用';
        break;
      case '免职':
        newStatus = '免职';
        break;
    }
    
    // 更新列车长状态
    updateConductor({
      ...conductor,
      status: newStatus
    });
    
    // 更新表格
    updateApplicationTable();
    
    // 更新列车长表格
    if (document.getElementById('conductor-list').classList.contains('hidden') === false) {
      updateConductorTable();
    }
    
    // 如果在仪表盘页面，也更新仪表盘
    if (document.getElementById('dashboard').classList.contains('hidden') === false) {
      updateRecentApplications();
      updateConductorCounts();
      updateCharts();
    }
    
    // 更新统计页面
    if (document.getElementById('statistics').classList.contains('hidden') === false) {
      updateStatisticsCharts();
      updateDepartmentStats();
    }
    
    // 显示成功提示
    alert(`已通过"${application.type}"申请，列车长"${application.name}"的状态已更新为"${newStatus}"`);
  }
}

// 拒绝申请
function rejectApplication(applicationId) {
  // 获取拒绝原因
  const reason = prompt('请输入拒绝原因（可选）：');
  if (reason === null) return; // 用户取消了操作
  
  if (confirm('确定要拒绝此申请吗？')) {
    // 找到对应的申请
    const application = applications.find(a => a.id === applicationId);
    if (!application) return;
    
    // 添加拒绝原因到申请备注
    if (reason) {
      application.note = application.note 
        ? `${application.note}\n拒绝原因：${reason}` 
        : `拒绝原因：${reason}`;
    }
    
    // 更新申请状态为已处理
    updateApplicationStatus(applicationId, '已处理');
    
    // 列车长状态已在 updateApplicationStatus 中根据最新日期的申请更新
    
    // 更新表格
    updateApplicationTable();
    
    // 更新列车长表格
    if (document.getElementById('conductor-list').classList.contains('hidden') === false) {
      updateConductorTable();
    }
    
    // 如果在仪表盘页面，也更新仪表盘
    if (document.getElementById('dashboard').classList.contains('hidden') === false) {
      updateRecentApplications();
      updateConductorCounts();
      updateCharts();
    }
    
    // 更新统计页面
    if (document.getElementById('statistics').classList.contains('hidden') === false) {
      updateStatisticsCharts();
      updateDepartmentStats();
    }
    
    // 显示成功提示
    alert(`已拒绝"${application.type}"申请`);
  }
}

// 导出申请数据
function exportApplications() {
  const filteredApplications = getFilteredApplications();
  
  // 创建CSV内容
  let csvContent = '序号,申请类型,部门,工号,姓名,申请日期,状态\n';
  
  filteredApplications.forEach((app, index) => {
    csvContent += `${index + 1},${app.type},${app.department},${app.employeeId},${app.name},${app.date},${app.status}\n`;
  });
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `申请记录_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 下载申请导入模板
function downloadApplicationTemplate() {
  // 获取有效的部门列表
  const departments = getAllDepartmentNames ? getAllDepartmentNames() : 
    ['旅游车队', '京哈高铁车队', '京广高铁车队', '短预车队', '京丹车队'];
  
  // 选择几个部门作为示例
  const sampleDepartments = departments.slice(0, 3);
  if (sampleDepartments.length < 3) {
    // 如果部门不足，使用默认的几个
    sampleDepartments.push(...['京哈高铁车队', '京广高铁车队', '高铁一队'].slice(0, 3 - sampleDepartments.length));
  }
  
  // 创建CSV内容
  let csvContent = '申请类型,工号,姓名,部门,申请日期,状态\n';
  csvContent += `正式启用,100001,姓名1,${sampleDepartments[0] || '旅游车队'},${new Date().toISOString().split('T')[0]},已处理\n`;
  csvContent += `临时启用,100002,姓名2,${sampleDepartments[1] || '京哈高铁车队'},${new Date().toISOString().split('T')[0]},已处理\n`;
  csvContent += `免职,100003,姓名3,${sampleDepartments[2] || '京广高铁车队'},${new Date().toISOString().split('T')[0]},待处理\n`;
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', '申请记录导入模板.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 导入申请记录
function importApplications() {
  const form = document.getElementById('import-applications-form');
  const data = form.querySelector('[name="applicationsData"]').value.trim();
  const updateExisting = form.querySelector('[name="updateExisting"]').checked;
  
  if (!data) {
    showApplicationsImportResult('error', '请输入申请记录数据');
    return;
  }
  
  // 调用批量导入函数
  const result = batchImportApplications(data, updateExisting);
  
  // 显示导入结果
  if (result.success) {
    showApplicationsImportResult(
      'success', 
      `成功导入 ${result.successCount} 条申请记录，失败 ${result.failureCount} 条`,
      result
    );
    
    // 更新申请表格
    updateApplicationTable();
    
    // 如果在列车长列表页面，也更新列车长表格
    if (document.getElementById('conductor-list').classList.contains('hidden') === false) {
      updateConductorTable();
    }
    
    // 如果在仪表盘页面，也更新仪表盘
    if (document.getElementById('dashboard').classList.contains('hidden') === false) {
      updateRecentApplications();
    }
  } else {
    showApplicationsImportResult(
      'error', 
      `导入失败，${result.failureCount} 条申请记录导入出错`,
      result
    );
  }
}

// 显示申请导入结果
function showApplicationsImportResult(type, message, result = null) {
  const resultDiv = document.getElementById('applications-import-result');
  const messageDiv = document.getElementById('applications-import-message');
  const detailsDiv = document.getElementById('applications-import-details');
  
  resultDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100');
  detailsDiv.classList.add('hidden');
  
  if (type === 'success') {
    resultDiv.classList.add('bg-green-100');
    messageDiv.innerHTML = `<span class="text-green-700">✓ ${message}</span>`;
    
    // 如果有详细信息，显示
    if (result && (result.details.length > 0 || result.errors.length > 0)) {
      let detailsHtml = '';
      
      // 成功记录
      if (result.details.length > 0) {
        detailsHtml += '<div class="text-green-700 mb-2">成功记录:</div>';
        detailsHtml += '<ul class="list-disc list-inside text-green-700 pl-2">';
        result.details.forEach(detail => {
          detailsHtml += `<li>${detail}</li>`;
        });
        detailsHtml += '</ul>';
      }
      
      // 失败记录
      if (result.errors.length > 0) {
        detailsHtml += '<div class="text-red-700 mt-2 mb-1">失败记录:</div>';
        detailsHtml += '<ul class="list-disc list-inside text-red-700 pl-2">';
        result.errors.forEach(error => {
          detailsHtml += `<li>${error}</li>`;
        });
        detailsHtml += '</ul>';
      }
      
      detailsDiv.innerHTML = detailsHtml;
      detailsDiv.classList.remove('hidden');
    }
  } else if (type === 'error') {
    resultDiv.classList.add('bg-red-100');
    messageDiv.innerHTML = `<span class="text-red-700">✗ ${message}</span>`;
    
    // 如果有错误详情，显示
    if (result && result.errors.length > 0) {
      let detailsHtml = '<div class="text-red-700 mb-1">错误详情:</div>';
      detailsHtml += '<ul class="list-disc list-inside text-red-700 pl-2">';
      result.errors.forEach(error => {
        detailsHtml += `<li>${error}</li>`;
      });
      detailsHtml += '</ul>';
      
      detailsDiv.innerHTML = detailsHtml;
      detailsDiv.classList.remove('hidden');
    }
  }
  
  resultDiv.classList.remove('hidden');
}

// 确认删除申请
function confirmDeleteApplication(applicationId) {
  if (confirm('确定要删除此申请吗？')) {
    // 删除申请
    deleteApplication(applicationId);
    
    // 更新表格
    updateApplicationTable();
    
    // 如果在仪表盘页面，也更新仪表盘
    if (document.getElementById('dashboard').classList.contains('hidden') === false) {
      updateRecentApplications();
    }
  }
} 