// 列车长信息管理相关代码

// 当前页码和每页显示数量
let currentConductorPage = 1;
const conductorsPerPage = 10;

// 当前筛选条件
let conductorFilters = {
  search: '',
  department: '',
  status: ''
};

// 初始化列车长列表
function initConductorList() {
  setupConductorListeners();
  updateConductorTable();
}

// 设置列车长列表相关的事件监听器
function setupConductorListeners() {
  // 搜索框
  const searchInput = document.getElementById('conductor-search');
  searchInput.addEventListener('input', () => {
    conductorFilters.search = searchInput.value.trim();
    currentConductorPage = 1;
    updateConductorTable();
  });
  
  // 部门筛选
  const departmentFilter = document.getElementById('department-filter');
  departmentFilter.addEventListener('change', () => {
    conductorFilters.department = departmentFilter.value;
    currentConductorPage = 1;
    updateConductorTable();
  });
  
  // 状态筛选
  const statusFilter = document.getElementById('status-filter');
  statusFilter.addEventListener('change', () => {
    conductorFilters.status = statusFilter.value;
    currentConductorPage = 1;
    updateConductorTable();
  });
  
  // 分页按钮
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentConductorPage > 1) {
      currentConductorPage--;
      updateConductorTable();
    }
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    const filteredConductors = getFilteredConductors();
    const totalPages = Math.ceil(filteredConductors.length / conductorsPerPage);
    
    if (currentConductorPage < totalPages) {
      currentConductorPage++;
      updateConductorTable();
    }
  });
  
  // 添加列车长按钮
  document.getElementById('add-conductor-btn').addEventListener('click', () => {
    openAddConductorModal();
  });
  
  // 导入列车长按钮
  document.getElementById('import-conductors-btn').addEventListener('click', () => {
    openImportConductorsModal();
  });
  
  // 导入列车长文件选择
  document.getElementById('conductor-excel-file').addEventListener('change', (e) => {
    const fileLabel = document.getElementById('selected-file-name');
    if (e.target.files.length > 0) {
      fileLabel.textContent = e.target.files[0].name;
      fileLabel.classList.remove('text-gray-400');
      fileLabel.classList.add('text-black');
    } else {
      fileLabel.textContent = '未选择文件';
      fileLabel.classList.remove('text-black');
      fileLabel.classList.add('text-gray-400');
    }
  });
  
  // 导入列车长表单提交
  document.getElementById('import-conductors-form').addEventListener('submit', (e) => {
    e.preventDefault();
    importConductorsFromExcel();
  });
  
  // 下载导入模板
  document.getElementById('download-template').addEventListener('click', (e) => {
    e.preventDefault();
    downloadImportTemplate();
  });
  
  // 添加列车长表单提交
  document.getElementById('add-conductor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addNewConductor();
  });
  
  // 编辑列车长表单提交
  document.getElementById('edit-conductor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveEditedConductor();
  });
  
  // 导出按钮
  document.getElementById('export-conductors').addEventListener('click', exportConductors);
}

// 更新列车长表格
function updateConductorTable() {
  const tableBody = document.getElementById('conductor-list-body');
  const filteredConductors = getFilteredConductors();
  
  // 计算分页信息
  const totalPages = Math.ceil(filteredConductors.length / conductorsPerPage);
  const start = (currentConductorPage - 1) * conductorsPerPage;
  const end = start + conductorsPerPage;
  const pageConductors = filteredConductors.slice(start, end);
  
  // 更新分页控件
  document.getElementById('total-conductors').textContent = filteredConductors.length;
  document.getElementById('current-page').textContent = currentConductorPage;
  document.getElementById('total-pages').textContent = totalPages || 1;
  
  // 启用/禁用上一页/下一页按钮
  document.getElementById('prev-page').disabled = currentConductorPage <= 1;
  document.getElementById('next-page').disabled = currentConductorPage >= totalPages;
  
  // 清空表格
  tableBody.innerHTML = '';
  
  // 没有数据时显示提示
  if (pageConductors.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `
      <td colspan="6" class="py-4 px-4 text-center text-gray-500">没有符合条件的列车长</td>
    `;
    tableBody.appendChild(noDataRow);
    return;
  }
  
  // 添加表格行
  pageConductors.forEach(conductor => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');
    
    // 根据状态获取对应的样式
    let statusClass = '';
    switch(conductor.status) {
      case '正式启用': statusClass = 'status-official'; break;
      case '临时启用': statusClass = 'status-temporary'; break;
      case '后备': statusClass = 'status-reserve'; break;
      case '免职': statusClass = 'status-dismissed'; break;
    }
    
    row.innerHTML = `
      <td class="py-3 px-4">${conductor.employeeId}</td>
      <td class="py-3 px-4">${conductor.name}</td>
      <td class="py-3 px-4">${conductor.department}</td>
      <td class="py-3 px-4">
        <span class="status-badge ${statusClass}">${conductor.status}</span>
      </td>
      <td class="py-3 px-4 text-gray-500">${conductor.note || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button class="edit-conductor-btn text-blue-600 hover:text-blue-800 mr-3" data-id="${conductor.id}">
          <i class="ri-edit-line"></i>
        </button>
        <button class="delete-conductor-btn text-red-600 hover:text-red-800" data-id="${conductor.id}">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // 添加编辑按钮事件监听器
    const editBtn = row.querySelector('.edit-conductor-btn');
    editBtn.addEventListener('click', () => openEditConductorModal(conductor.id));
    
    // 添加删除按钮事件监听器
    const deleteBtn = row.querySelector('.delete-conductor-btn');
    deleteBtn.addEventListener('click', () => confirmDeleteConductor(conductor.id));
  });
}

// 根据筛选条件获取列车长列表
function getFilteredConductors() {
  let filtered = [...conductors];
  
  // 部门筛选
  if (conductorFilters.department) {
    filtered = filtered.filter(c => c.department === conductorFilters.department);
  }
  
  // 状态筛选
  if (conductorFilters.status) {
    filtered = filtered.filter(c => c.status === conductorFilters.status);
  }
  
  // 搜索筛选
  if (conductorFilters.search) {
    const search = conductorFilters.search.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.employeeId.toLowerCase().includes(search)
    );
  }
  
  return filtered;
}

// 打开导入列车长模态框
function openImportConductorsModal() {
  // 重置表单
  document.getElementById('import-conductors-form').reset();
  document.getElementById('selected-file-name').textContent = '未选择文件';
  document.getElementById('selected-file-name').classList.remove('text-black');
  document.getElementById('selected-file-name').classList.add('text-gray-400');
  
  // 隐藏导入结果区域
  document.getElementById('import-result').classList.add('hidden');
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('import-conductors-modal').classList.remove('hidden');
}

// 导入Excel文件中的列车长信息
async function importConductorsFromExcel() {
  const fileInput = document.getElementById('conductor-excel-file');
  const resultDiv = document.getElementById('import-result');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showImportResult('error', '请选择Excel文件');
    return;
  }
  
  const file = fileInput.files[0];
  // 检查文件类型
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  
  if (!validTypes.includes(file.type) && 
      !(file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
    showImportResult('error', '请上传有效的Excel文件 (.xlsx, .xls, .csv)');
    return;
  }
  
  try {
    // 显示加载状态
    showImportResult('loading', '正在处理文件，请稍候...');
    
    // 读取文件
    const data = await readExcelFile(file);
    
    if (!data || data.length === 0) {
      showImportResult('error', '无法读取数据或文件为空');
      return;
    }
    
    // 验证并处理数据
    const result = processImportedData(data);
    
    // 显示导入结果
    showImportResult(
      result.success ? 'success' : 'error',
      `${result.message}，成功导入 ${result.successCount} 条，失败 ${result.failureCount} 条`,
      result
    );
    
    if (result.successCount > 0) {
      // 更新表格
      updateConductorTable();
      
      // 如果在仪表盘页面，也更新仪表盘
      if (document.getElementById('dashboard').classList.contains('hidden') === false) {
        initDashboard();
      }
    }
  } catch (error) {
    console.error('导入Excel失败', error);
    showImportResult('error', '导入失败：' + (error.message || '未知错误'));
  }
}

// 读取Excel文件
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, {type: 'array'});
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function(error) {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// 显示导入结果
function showImportResult(type, message, result) {
  const resultDiv = document.getElementById('import-result');
  const messageDiv = document.getElementById('import-message');
  const detailsDiv = document.getElementById('import-details');
  
  resultDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'bg-blue-100');
  
  // 确保错误详情区域存在
  if (!detailsDiv) {
    const newDetailsDiv = document.createElement('div');
    newDetailsDiv.id = 'import-details';
    newDetailsDiv.className = 'mt-3 text-sm overflow-auto max-h-40';
    resultDiv.appendChild(newDetailsDiv);
  }
  
  // 清空上次的错误详情
  const detailsContainer = detailsDiv || document.getElementById('import-details');
  detailsContainer.innerHTML = '';
  detailsContainer.classList.add('hidden');
  
  if (type === 'success') {
    resultDiv.classList.add('bg-green-100');
    messageDiv.innerHTML = `<span class="text-green-700">✓ ${message}</span>`;
  } else if (type === 'error') {
    resultDiv.classList.add('bg-red-100');
    messageDiv.innerHTML = `<span class="text-red-700">✗ ${message}</span>`;
    
    // 如果有错误详情，显示它们
    if (result && result.errors && result.errors.length > 0) {
      detailsContainer.innerHTML = `
        <div class="font-medium text-red-700 mb-1">错误详情:</div>
        <ul class="list-disc list-inside text-red-600 pl-2">
          ${result.errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      `;
      detailsContainer.classList.remove('hidden');
    }
  } else if (type === 'loading') {
    resultDiv.classList.add('bg-blue-100');
    messageDiv.innerHTML = `<span class="text-blue-700">⟳ ${message}</span>`;
  }
  
  resultDiv.classList.remove('hidden');
}

// 处理导入的数据
function processImportedData(data) {
  const result = {
    success: false,
    message: '',
    successCount: 0,
    failureCount: 0,
    errors: []
  };
  
  // 至少需要有一行标题和一行数据
  if (data.length < 2) {
    result.message = '文件格式不正确，至少需要包含标题行和数据行';
    return result;
  }
  
  // 获取标题行
  const headers = data[0].map(h => String(h).trim());
  
  // 检查必要的列是否存在
  const requiredColumns = ['工号', '姓名', '部门', '状态'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    result.message = `缺少必要的列：${missingColumns.join(', ')}`;
    return result;
  }
  
  // 获取列索引
  const idIndex = headers.indexOf('工号');
  const nameIndex = headers.indexOf('姓名');
  const departmentIndex = headers.indexOf('部门');
  const statusIndex = headers.indexOf('状态');
  const noteIndex = headers.indexOf('备注');
  
  // 获取有效的部门列表
  const validDepartments = getAllDepartmentNames ? getAllDepartmentNames() : 
    ['旅游车队', '京哈高铁车队', '京广高铁车队', '短预车队', '京丹车队', '京张城际车队', 
     '京广动卧车队', '高铁二队', '京秦车队', '京沪车队', '高铁一队', '京深车队', 
     '京通车队', '京照车队', '京宜车队', '京张高铁车队', '联运车队', '青岛车队'];
  
  // 处理数据行
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 跳过空行
    if (!row || row.length === 0 || !row[idIndex]) {
      continue;
    }
    
    try {
      // 提取数据
      const employeeId = String(row[idIndex]).trim();
      const name = String(row[nameIndex] || '').trim();
      const department = String(row[departmentIndex] || '').trim();
      const status = String(row[statusIndex] || '').trim();
      const note = noteIndex >= 0 && row[noteIndex] ? String(row[noteIndex]).trim() : '';
      
      // 验证必填字段
      if (!employeeId || !name || !department || !status) {
        result.failureCount++;
        result.errors.push(`第 ${i+1} 行：缺少必填字段`);
        continue;
      }
      
      // 验证状态值是否有效
      const validStatuses = ['正式启用', '临时启用', '后备', '免职'];
      if (!validStatuses.includes(status)) {
        result.failureCount++;
        result.errors.push(`第 ${i+1} 行：状态值 "${status}" 无效，必须是 ${validStatuses.join('、')}`);
        continue;
      }
      
      // 验证部门值是否有效
      if (!validDepartments.includes(department)) {
        result.failureCount++;
        result.errors.push(`第 ${i+1} 行：部门 "${department}" 无效，必须是系统中存在的部门`);
        continue;
      }
      
      // 检查工号是否已存在
      const existingConductor = conductors.find(c => c.employeeId === employeeId);
      
      if (existingConductor) {
        // 更新现有记录
        existingConductor.name = name;
        existingConductor.department = department;
        existingConductor.status = status;
        existingConductor.note = note;
      } else {
        // 创建新记录
        const newConductor = {
          id: getNextId(conductors),
          employeeId,
          name,
          department,
          status,
          note
        };
        
        conductors.push(newConductor);
      }
      
      result.successCount++;
    } catch (error) {
      result.failureCount++;
      result.errors.push(`第 ${i+1} 行：处理出错 - ${error.message || '未知错误'}`);
    }
  }
  
  // 保存数据
  if (result.successCount > 0) {
    saveData();
    result.success = true;
    result.message = '导入完成';
  } else {
    result.message = '没有成功导入任何数据';
  }
  
  return result;
}

// 打开添加列车长模态框
function openAddConductorModal() {
  // 清空表单
  document.getElementById('add-conductor-form').reset();
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('add-conductor-modal').classList.remove('hidden');
}

// 打开编辑列车长模态框
function openEditConductorModal(conductorId) {
  // 获取列车长信息
  const conductor = conductors.find(c => c.id === conductorId);
  if (!conductor) return;
  
  // 填充表单
  const form = document.getElementById('edit-conductor-form');
  form.querySelector('[name="id"]').value = conductor.id;
  form.querySelector('[name="employeeId"]').value = conductor.employeeId;
  form.querySelector('[name="name"]').value = conductor.name;
  form.querySelector('[name="department"]').value = conductor.department;
  form.querySelector('[name="status"]').value = conductor.status;
  form.querySelector('[name="note"]').value = conductor.note || '';
  
  // 显示模态框
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('edit-conductor-modal').classList.remove('hidden');
}

// 添加新列车长
function addNewConductor() {
  const form = document.getElementById('add-conductor-form');
  
  // 获取表单数据
  const newConductor = {
    employeeId: form.querySelector('[name="employeeId"]').value.trim(),
    name: form.querySelector('[name="name"]').value.trim(),
    department: form.querySelector('[name="department"]').value,
    status: form.querySelector('[name="status"]').value,
    note: form.querySelector('[name="note"]').value.trim()
  };
  
  // 校验工号是否已存在
  if (conductors.some(c => c.employeeId === newConductor.employeeId)) {
    alert('该工号已存在');
    return;
  }
  
  // 添加列车长
  addConductor(newConductor);
  
  // 关闭模态框
  closeModals();
  
  // 更新表格
  updateConductorTable();
  
  // 如果在仪表盘页面，也更新仪表盘
  if (document.getElementById('dashboard').classList.contains('hidden') === false) {
    initDashboard();
  }
}

// 保存编辑后的列车长信息
function saveEditedConductor() {
  const form = document.getElementById('edit-conductor-form');
  
  // 获取表单数据
  const editedConductor = {
    id: parseInt(form.querySelector('[name="id"]').value),
    employeeId: form.querySelector('[name="employeeId"]').value.trim(),
    name: form.querySelector('[name="name"]').value.trim(),
    department: form.querySelector('[name="department"]').value,
    status: form.querySelector('[name="status"]').value,
    note: form.querySelector('[name="note"]').value.trim()
  };
  
  // 提示用户手动修改可能被申请记录覆盖
  if (editedConductor.status !== conductors.find(c => c.id === editedConductor.id).status) {
    const confirmChange = confirm(
      '手动修改列车长状态可能会被最新申请记录覆盖。如果有日期更新的启用/免职申请，系统会自动以最新申请记录为准。确定要继续吗？'
    );
    if (!confirmChange) {
      return;
    }
  }
  
  // 更新列车长信息
  updateConductor(editedConductor);
  
  // 关闭模态框
  closeModals();
  
  // 更新表格
  updateConductorTable();
  
  // 如果在仪表盘页面，也更新仪表盘
  if (document.getElementById('dashboard').classList.contains('hidden') === false) {
    initDashboard();
  }
}

// 确认删除列车长
function confirmDeleteConductor(conductorId) {
  if (confirm('确定要删除此列车长吗？')) {
    // 删除列车长
    const index = conductors.findIndex(c => c.id === conductorId);
    if (index !== -1) {
      conductors.splice(index, 1);
      saveData();
      
      // 更新表格
      updateConductorTable();
      
      // 如果在仪表盘页面，也更新仪表盘
      if (document.getElementById('dashboard').classList.contains('hidden') === false) {
        initDashboard();
      }
    }
  }
}

// 导出列车长数据
function exportConductors() {
  const filteredConductors = getFilteredConductors();
  
  // 创建CSV内容
  let csvContent = '工号,姓名,部门,状态,备注\n';
  
  filteredConductors.forEach(conductor => {
    csvContent += `${conductor.employeeId},${conductor.name},${conductor.department},${conductor.status},${conductor.note || ''}\n`;
  });
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `列车长信息_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 下载导入模板
function downloadImportTemplate() {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 获取有效的部门列表
  const departments = getAllDepartmentNames ? getAllDepartmentNames() : 
    ['旅游车队', '京哈高铁车队', '京广高铁车队', '短预车队', '京丹车队'];
  
  // 选择几个部门作为示例
  const sampleDepartments = departments.slice(0, 4);
  if (sampleDepartments.length < 4) {
    // 如果部门不足，使用默认的几个
    sampleDepartments.push(...['京哈高铁车队', '京广高铁车队', '高铁一队', '京沪车队'].slice(0, 4 - sampleDepartments.length));
  }
  
  // 创建示例数据
  const exampleData = [
    ['工号', '姓名', '部门', '状态', '备注'],
    ['100001', '张三', sampleDepartments[0] || '旅游车队', '正式启用', ''],
    ['100002', '李四', sampleDepartments[1] || '京哈高铁车队', '临时启用', '临时顶岗'],
    ['100003', '王五', sampleDepartments[2] || '京广高铁车队', '后备', '培训中'],
    ['100004', '赵六', sampleDepartments[3] || '高铁二队', '免职', '因病免职']
  ];
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(exampleData);
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '列车长信息');
  
  // 导出为Excel文件
  XLSX.writeFile(wb, '列车长导入模板.xlsx');
} 