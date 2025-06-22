// 设置页面相关代码

// 当前页码和每页显示数量
let currentDepartmentPage = 1;
const departmentsPerPage = 10;

// 初始化设置页面
function initSettings() {
  setupSettingsListeners();
  updateDepartmentTable();
  loadSystemSettings();
}

// 设置系统设置页面的事件监听器
function setupSettingsListeners() {
  // 添加部门按钮
  document.getElementById('add-department-btn').addEventListener('click', () => {
    openAddDepartmentModal();
  });
  
  // 批量添加部门按钮
  document.getElementById('batch-add-departments-btn').addEventListener('click', () => {
    openBatchAddDepartmentsModal();
  });
  
  // 分页按钮
  document.getElementById('department-prev-page').addEventListener('click', () => {
    if (currentDepartmentPage > 1) {
      currentDepartmentPage--;
      updateDepartmentTable();
    }
  });
  
  document.getElementById('department-next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(departments.length / departmentsPerPage);
    
    if (currentDepartmentPage < totalPages) {
      currentDepartmentPage++;
      updateDepartmentTable();
    }
  });
  
  // 添加部门表单提交
  document.getElementById('add-department-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addNewDepartment();
  });
  
  // 编辑部门表单提交
  document.getElementById('edit-department-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEditedDepartment();
  });
  
  // 批量添加部门表单提交
  document.getElementById('batch-add-departments-form').addEventListener('submit', (e) => {
    e.preventDefault();
    batchAddDepartments();
  });
  
  // 下载部门模板
  document.getElementById('download-department-template').addEventListener('click', (e) => {
    e.preventDefault();
    downloadDepartmentTemplate();
  });
  
  // 系统设置表单提交
  document.getElementById('system-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSystemSettings();
  });
}

// 打开添加部门模态框
function openAddDepartmentModal() {
  // 清空表单
  document.getElementById('add-department-form').reset();
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('add-department-modal').classList.remove('hidden');
}

// 打开编辑部门模态框
function openEditDepartmentModal(departmentId) {
  const department = getDepartmentById(departmentId);
  if (!department) return;
  
  // 填充表单
  const form = document.getElementById('edit-department-form');
  form.querySelector('[name="id"]').value = department.id;
  form.querySelector('[name="departmentId"]').value = department.departmentId;
  form.querySelector('[name="departmentName"]').value = department.departmentName;
  form.querySelector('[name="organization"]').value = department.organization;
  form.querySelector('[name="quota"]').value = department.quota;
  form.querySelector('[name="note"]').value = department.note || '';
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('edit-department-modal').classList.remove('hidden');
}

// 打开批量添加部门模态框
function openBatchAddDepartmentsModal() {
  // 清空表单
  document.getElementById('batch-add-departments-form').reset();
  
  // 隐藏结果区域
  document.getElementById('batch-import-result').classList.add('hidden');
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('batch-add-departments-modal').classList.remove('hidden');
}

// 更新部门表格
function updateDepartmentTable() {
  const tableBody = document.getElementById('department-list-body');
  
  // 确保departments数组已定义且有内容
  if (!window.departments || !Array.isArray(window.departments) || window.departments.length === 0) {
    console.log('部门数据未加载或为空，尝试重新加载...');
    // 如果没有数据，重新加载一次
    loadData && loadData();
  }
  
  // 计算分页信息
  const totalPages = Math.ceil(departments.length / departmentsPerPage);
  const start = (currentDepartmentPage - 1) * departmentsPerPage;
  const end = start + departmentsPerPage;
  const pageDepartments = departments.slice(start, end);
  
  // 更新分页控件
  document.getElementById('total-departments').textContent = departments.length;
  document.getElementById('department-current-page').textContent = currentDepartmentPage;
  document.getElementById('department-total-pages').textContent = totalPages || 1;
  
  // 启用/禁用上一页/下一页按钮
  document.getElementById('department-prev-page').disabled = currentDepartmentPage <= 1;
  document.getElementById('department-next-page').disabled = currentDepartmentPage >= totalPages;
  
  // 清空表格
  tableBody.innerHTML = '';
  
  // 没有数据时显示提示
  if (pageDepartments.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="5" class="py-4 px-4 text-center text-gray-500">没有部门数据</td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }
  
  // 添加表格行
  pageDepartments.forEach(department => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');
    
    row.innerHTML = `
      <td class="py-3 px-4">${department.departmentId || '未定义'}</td>
      <td class="py-3 px-4">${department.departmentName || '未定义'}</td>
      <td class="py-3 px-4">${department.organization || '未定义'}</td>
      <td class="py-3 px-4 text-gray-500">${department.note || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button class="edit-department-btn text-blue-600 hover:text-blue-800 mr-3" data-id="${department.id}">
          <i class="ri-edit-line"></i>
        </button>
        <button class="delete-department-btn text-red-600 hover:text-red-800" data-id="${department.id}">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // 添加编辑按钮事件监听器
    const editBtn = row.querySelector('.edit-department-btn');
    editBtn.addEventListener('click', () => openEditDepartmentModal(department.id));
    
    // 添加删除按钮事件监听器
    const deleteBtn = row.querySelector('.delete-department-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteDepartment(department.id));
  });
  
  // 更新其他表单中的部门选择器
  updateDepartmentSelectors();
}

// 更新系统中所有的部门选择器
function updateDepartmentSelectors() {
  // 获取所有部门选择器
  const selectors = document.querySelectorAll('select[data-department-selector="true"]');
  
  // 更新每个选择器
  selectors.forEach(selector => {
    const currentValue = selector.value;
    selector.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = selector.dataset.defaultText || '选择部门';
    selector.appendChild(defaultOption);
    
    // 添加部门选项
    departments.forEach(department => {
      const option = document.createElement('option');
      option.value = department.departmentName;
      option.textContent = department.departmentName;
      selector.appendChild(option);
    });
    
    // 恢复之前的选择
    if (currentValue) {
      selector.value = currentValue;
    }
  });
}

// 添加新部门
function addNewDepartment() {
  const form = document.getElementById('add-department-form');
  
  // 获取表单数据
  const newDepartment = {
    departmentId: form.querySelector('[name="departmentId"]').value.trim(),
    departmentName: form.querySelector('[name="departmentName"]').value.trim(),
    organization: form.querySelector('[name="organization"]').value.trim(),
    quota: parseInt(form.querySelector('[name="quota"]').value) || 0,
    note: form.querySelector('[name="note"]').value.trim()
  };
  
  try {
    // 添加部门
    addDepartment(newDepartment);
    
    // 关闭模态框
    closeModals();
    
    // 更新表格
    updateDepartmentTable();
    
  } catch (error) {
    alert(error.message);
  }
}

// 保存编辑后的部门信息
function saveEditedDepartment() {
  const form = document.getElementById('edit-department-form');
  
  // 获取表单数据
  const editedDepartment = {
    id: parseInt(form.querySelector('[name="id"]').value),
    departmentId: form.querySelector('[name="departmentId"]').value.trim(),
    departmentName: form.querySelector('[name="departmentName"]').value.trim(),
    organization: form.querySelector('[name="organization"]').value.trim(),
    quota: parseInt(form.querySelector('[name="quota"]').value) || 0,
    note: form.querySelector('[name="note"]').value.trim()
  };
  
  try {
    // 更新部门信息
    updateDepartment(editedDepartment);
    
    // 关闭模态框
    closeModals();
    
    // 更新表格
    updateDepartmentTable();
    
    // 如果在仪表盘页面，也更新仪表盘
    if (document.getElementById('dashboard').classList.contains('hidden') === false) {
      initDashboard();
    }
    
    // 如果在统计与报表页面，也更新图表
    if (document.getElementById('statistics').classList.contains('hidden') === false) {
      updateStatisticsCharts();
      updateDepartmentStats();
    }
    
  } catch (error) {
    alert(error.message);
  }
}

// 确认删除部门
function confirmDeleteDepartment(departmentId) {
  const department = getDepartmentById(departmentId);
  if (!department) return;
  
  if (confirm(`确定要删除部门"${department.departmentName}"吗？`)) {
    try {
      // 删除部门
      deleteDepartment(departmentId);
      
      // 更新表格
      updateDepartmentTable();
      
      // 如果在仪表盘页面，也更新仪表盘
      if (document.getElementById('dashboard').classList.contains('hidden') === false) {
        initDashboard();
      }
      
      // 如果在统计与报表页面，也更新图表
      if (document.getElementById('statistics').classList.contains('hidden') === false) {
        updateStatisticsCharts();
        updateDepartmentStats();
      }
      
    } catch (error) {
      alert(error.message);
    }
  }
}

// 批量添加部门
function batchAddDepartments() {
  const form = document.getElementById('batch-add-departments-form');
  const data = form.querySelector('[name="departmentsData"]').value.trim();
  const updateExisting = form.querySelector('[name="updateExisting"]').checked;
  
  if (!data) {
    showBatchImportResult('error', '请输入部门数据');
    return;
  }
  
  // 解析CSV格式的数据
  const lines = data.split('\n');
  
  const result = {
    success: false,
    successCount: 0,
    failureCount: 0,
    errors: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = line.split(',');
    
    // 至少需要部门编号、部门名称和所属单位
    if (fields.length < 3) {
      result.failureCount++;
      result.errors.push(`第 ${i+1} 行: 数据不完整，至少需要部门编号、部门名称和所属单位`);
      continue;
    }
    
    try {
      const departmentData = {
        departmentId: fields[0].trim(),
        departmentName: fields[1].trim(),
        organization: fields[2].trim(),
        quota: fields.length > 3 ? parseInt(fields[3]) || 0 : 0,
        note: fields.length > 4 ? fields[4].trim() : ''
      };
      
      // 检查是否已存在相同部门编号或名称的部门
      const existingDeptById = getDepartmentByDepartmentId(departmentData.departmentId);
      const existingDeptByName = getDepartmentByName(departmentData.departmentName);
      
      if (existingDeptById && !updateExisting) {
        result.failureCount++;
        result.errors.push(`第 ${i+1} 行: 部门编号 "${departmentData.departmentId}" 已存在`);
        continue;
      }
      
      if (existingDeptByName && existingDeptByName.id !== (existingDeptById ? existingDeptById.id : null) && !updateExisting) {
        result.failureCount++;
        result.errors.push(`第 ${i+1} 行: 部门名称 "${departmentData.departmentName}" 已存在`);
        continue;
      }
      
      // 如果启用了更新现有部门，并且找到了匹配的部门
      if (updateExisting && existingDeptById) {
        const updatedDept = {
          ...existingDeptById,
          departmentName: departmentData.departmentName,
          organization: departmentData.organization,
          quota: departmentData.quota,
          note: departmentData.note
        };
        
        updateDepartment(updatedDept);
      } else {
        // 添加新部门
        addDepartment(departmentData);
      }
      
      result.successCount++;
    } catch (error) {
      result.failureCount++;
      result.errors.push(`第 ${i+1} 行: ${error.message}`);
    }
  }
  
  // 显示导入结果
  if (result.successCount > 0) {
    result.success = true;
    showBatchImportResult('success', `成功导入 ${result.successCount} 个部门，失败 ${result.failureCount} 个`);
    
    // 更新表格
    updateDepartmentTable();
  } else {
    showBatchImportResult('error', `导入失败，${result.failureCount} 个部门导入出错`);
  }
}

// 显示批量导入结果
function showBatchImportResult(type, message) {
  const resultDiv = document.getElementById('batch-import-result');
  const messageDiv = document.getElementById('batch-import-message');
  
  resultDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100');
  
  if (type === 'success') {
    resultDiv.classList.add('bg-green-100');
    messageDiv.innerHTML = `<span class="text-green-700">✓ ${message}</span>`;
  } else if (type === 'error') {
    resultDiv.classList.add('bg-red-100');
    messageDiv.innerHTML = `<span class="text-red-700">✗ ${message}</span>`;
  }
  
  resultDiv.classList.remove('hidden');
}

// 下载部门模板
function downloadDepartmentTemplate() {
  // 创建CSV内容
  let csvContent = '部门编号,部门名称,所属单位,定员人数,备注\n';
  
  // 添加所有新部门作为示例
  const exampleDepartments = [
    {id: 'D001', name: '旅游车队', org: '铁路局', quota: 10, note: '示例数据'},
    {id: 'D002', name: '京哈高铁车队', org: '铁路局', quota: 12, note: '示例数据'},
    {id: 'D003', name: '京广高铁车队', org: '铁路局', quota: 8, note: '示例数据'}
  ];
  
  exampleDepartments.forEach(dept => {
    csvContent += `${dept.id},${dept.name},${dept.org},${dept.quota},${dept.note}\n`;
  });
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', '部门导入模板.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 加载系统设置
function loadSystemSettings() {
  document.getElementById('system-name').value = systemSettings.systemName || '列车长管理系统';
  document.getElementById('temp-period').value = systemSettings.tempPeriod || 3;
}

// 保存系统设置
function saveSystemSettings() {
  const form = document.getElementById('system-settings-form');
  
  // 获取设置值
  systemSettings.systemName = form.querySelector('#system-name').value.trim();
  systemSettings.tempPeriod = parseInt(form.querySelector('#temp-period').value) || 3;
  
  // 保存设置
  saveData();
  
  // 应用设置
  applySystemSettings();
  
  alert('系统设置已保存');
}

// 应用系统设置
function applySystemSettings() {
  // 更新系统名称
  const systemNameElements = document.querySelectorAll('.system-name');
  systemNameElements.forEach(el => {
    el.textContent = systemSettings.systemName;
  });
  
  // 更新页面标题
  document.title = systemSettings.systemName;
} 