// Initial data for the application
let conductors = [
  { id: 1, employeeId: '100001', name: '张三', department: '旅游车队', status: '正式启用', note: '' },
  { id: 2, employeeId: '100002', name: '李四', department: '京哈高铁车队', status: '临时启用', note: '' },
  { id: 3, employeeId: '100003', name: '王五', department: '京广高铁车队', status: '后备', note: '培训中' },
  { id: 4, employeeId: '100004', name: '赵六', department: '短预车队', status: '正式启用', note: '' },
  { id: 5, employeeId: '100005', name: '孙七', department: '京丹车队', status: '正式启用', note: '' },
  { id: 6, employeeId: '100006', name: '周八', department: '京张城际车队', status: '后备', note: '怀孕休假' },
  { id: 7, employeeId: '100007', name: '吴九', department: '京广动卧车队', status: '正式启用', note: '' },
  { id: 8, employeeId: '100008', name: '郑十', department: '高铁二队', status: '临时启用', note: '' },
  { id: 9, employeeId: '100009', name: '冯一', department: '京秦车队', status: '后备', note: '' },
  { id: 10, employeeId: '100010', name: '陈二', department: '京沪车队', status: '正式启用', note: '' },
  { id: 11, employeeId: '100011', name: '褚三', department: '高铁一队', status: '正式启用', note: '' },
  { id: 12, employeeId: '100012', name: '卫四', department: '京深车队', status: '后备', note: '' },
  { id: 13, employeeId: '100013', name: '蒋五', department: '京通车队', status: '正式启用', note: '' },
  { id: 14, employeeId: '100014', name: '沈六', department: '京照车队', status: '正式启用', note: '' },
  { id: 15, employeeId: '100015', name: '韩七', department: '京宜车队', status: '临时启用', note: '' },
  { id: 16, employeeId: '100016', name: '杨八', department: '京张高铁车队', status: '正式启用', note: '' },
  { id: 17, employeeId: '100017', name: '朱九', department: '联运车队', status: '后备', note: '' },
  { id: 18, employeeId: '100018', name: '秦十', department: '青岛车队', status: '正式启用', note: '' },
  { id: 19, employeeId: '100019', name: '尤一', department: '旅游车队', status: '后备', note: '' },
  { id: 20, employeeId: '100020', name: '许二', department: '京哈高铁车队', status: '正式启用', note: '' },
];

// 部门数据
let departments = [
  { id: 1, departmentId: 'D001', departmentName: '旅游车队', organization: '铁路局', quota: 10, note: '' },
  { id: 2, departmentId: 'D002', departmentName: '京哈高铁车队', organization: '铁路局', quota: 12, note: '' },
  { id: 3, departmentId: 'D003', departmentName: '京广高铁车队', organization: '铁路局', quota: 8, note: '' },
  { id: 4, departmentId: 'D004', departmentName: '短预车队', organization: '铁路局', quota: 10, note: '' },
  { id: 5, departmentId: 'D005', departmentName: '京丹车队', organization: '铁路局', quota: 10, note: '' },
  { id: 6, departmentId: 'D006', departmentName: '京张城际车队', organization: '铁路局', quota: 12, note: '' },
  { id: 7, departmentId: 'D007', departmentName: '京广动卧车队', organization: '铁路局', quota: 8, note: '' },
  { id: 8, departmentId: 'D008', departmentName: '高铁二队', organization: '铁路局', quota: 10, note: '' },
  { id: 9, departmentId: 'D009', departmentName: '京秦车队', organization: '铁路局', quota: 10, note: '' },
  { id: 10, departmentId: 'D010', departmentName: '京沪车队', organization: '铁路局', quota: 12, note: '' },
  { id: 11, departmentId: 'D011', departmentName: '高铁一队', organization: '铁路局', quota: 8, note: '' },
  { id: 12, departmentId: 'D012', departmentName: '京深车队', organization: '铁路局', quota: 10, note: '' },
  { id: 13, departmentId: 'D013', departmentName: '京通车队', organization: '铁路局', quota: 10, note: '' },
  { id: 14, departmentId: 'D014', departmentName: '京照车队', organization: '铁路局', quota: 12, note: '' },
  { id: 15, departmentId: 'D015', departmentName: '京宜车队', organization: '铁路局', quota: 8, note: '' },
  { id: 16, departmentId: 'D016', departmentName: '京张高铁车队', organization: '铁路局', quota: 10, note: '' },
  { id: 17, departmentId: 'D017', departmentName: '联运车队', organization: '铁路局', quota: 10, note: '' },
  { id: 18, departmentId: 'D018', departmentName: '青岛车队', organization: '铁路局', quota: 12, note: '' },
];

let applications = [
  { 
    id: 1, 
    type: '正式启用', 
    employeeId: '100003', 
    name: '王五', 
    department: '京广高铁车队', 
    date: '2023-04-15',
    status: '已处理'
  },
  { 
    id: 2, 
    type: '临时启用', 
    employeeId: '100015', 
    name: '韩七', 
    department: '京宜车队', 
    date: '2023-05-20',
    status: '已处理'
  },
  { 
    id: 3, 
    type: '临时启用', 
    employeeId: '100002', 
    name: '李四', 
    department: '京哈高铁车队', 
    date: '2023-06-10',
    status: '已处理'
  },
  { 
    id: 4, 
    type: '免职', 
    employeeId: '100021', 
    name: '何三', 
    department: '高铁二队', 
    date: '2023-06-25',
    status: '已处理'
  },
  { 
    id: 5, 
    type: '正式启用', 
    employeeId: '100017', 
    name: '朱九', 
    department: '联运车队', 
    date: '2023-07-05',
    status: '待处理'
  },
  { 
    id: 6, 
    type: '临时启用', 
    employeeId: '100008', 
    name: '郑十', 
    department: '高铁二队', 
    date: '2023-07-15',
    status: '已处理'
  },
  { 
    id: 7, 
    type: '免职', 
    employeeId: '100022', 
    name: '吕四', 
    department: '京沪车队', 
    date: '2023-08-10',
    status: '待处理'
  }
];

// Department quotas (定员人数) - 这个结构将迁移到departments中，保留兼容性
let departmentQuotas = {
  '旅游车队': 10,
  '京哈高铁车队': 12,
  '京广高铁车队': 8,
  '短预车队': 10,
  '京丹车队': 10,
  '京张城际车队': 12,
  '京广动卧车队': 8,
  '高铁二队': 10,
  '京秦车队': 10,
  '京沪车队': 12,
  '高铁一队': 8,
  '京深车队': 10,
  '京通车队': 10,
  '京照车队': 12,
  '京宜车队': 8,
  '京张高铁车队': 10,
  '联运车队': 10,
  '青岛车队': 12
};

// 系统设置
let systemSettings = {
  systemName: '列车长管理系统',
  tempPeriod: 3 // 临时启用期限（月）
};

// Local storage functions
function saveData() {
  localStorage.setItem('conductors', JSON.stringify(conductors));
  localStorage.setItem('applications', JSON.stringify(applications));
  localStorage.setItem('departmentQuotas', JSON.stringify(departmentQuotas));
  localStorage.setItem('departments', JSON.stringify(departments));
  localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
}

function loadData() {
  // Load conductors
  const savedConductors = localStorage.getItem('conductors');
  if (savedConductors) {
    conductors = JSON.parse(savedConductors);
  }
  
  // Load applications
  const savedApplications = localStorage.getItem('applications');
  if (savedApplications) {
    applications = JSON.parse(savedApplications);
  }
  
  // Load department quotas
  const savedQuotas = localStorage.getItem('departmentQuotas');
  if (savedQuotas) {
    departmentQuotas = JSON.parse(savedQuotas);
  }
  
  // Load departments
  const savedDepartments = localStorage.getItem('departments');
  if (savedDepartments) {
    departments = JSON.parse(savedDepartments);
  }
  
  // Load system settings
  const savedSettings = localStorage.getItem('systemSettings');
  if (savedSettings) {
    systemSettings = JSON.parse(savedSettings);
  }
  
  // 同步部门定员数据到departmentQuotas（兼容）
  syncDepartmentQuotas();
  
  // 确保所有列车长状态根据最新申请日期更新
  refreshAllConductorStatuses();
}

// 同步部门定员数据到departmentQuotas
function syncDepartmentQuotas() {
  // 清空旧的 departmentQuotas
  departmentQuotas = {};
  
  // 从 departments 数组重建
  departments.forEach(dept => {
    departmentQuotas[dept.departmentName] = dept.quota || 0;
  });
}

// 刷新所有列车长的状态，确保与最新申请日期一致
function refreshAllConductorStatuses() {
  // 获取所有有申请记录的列车长ID
  const employeeIdsWithApplications = Array.from(
    new Set(applications.map(app => app.employeeId))
  );
  
  // 对每个有申请记录的列车长更新状态
  employeeIdsWithApplications.forEach(employeeId => {
    updateConductorByLatestApplication(employeeId);
  });
}

// Data utility functions
function getNextId(collection) {
  if (collection.length === 0) return 1;
  return Math.max(...collection.map(item => item.id)) + 1;
}

// 部门相关函数
function getDepartmentById(id) {
  return departments.find(d => d.id === id);
}

function getDepartmentByDepartmentId(departmentId) {
  return departments.find(d => d.departmentId === departmentId);
}

function getDepartmentByName(name) {
  return departments.find(d => d.departmentName === name);
}

function getAllDepartmentNames() {
  return departments.map(d => d.departmentName);
}

function addDepartment(newDepartment) {
  // 检查部门编号和名称是否已存在
  if (departments.some(d => d.departmentId === newDepartment.departmentId)) {
    throw new Error('部门编号已存在');
  }
  
  if (departments.some(d => d.departmentName === newDepartment.departmentName)) {
    throw new Error('部门名称已存在');
  }
  
  newDepartment.id = getNextId(departments);
  departments.push(newDepartment);
  
  // 同步到departmentQuotas
  departmentQuotas[newDepartment.departmentName] = newDepartment.quota;
  
  saveData();
  return newDepartment;
}

function updateDepartment(updatedDepartment) {
  const index = departments.findIndex(d => d.id === updatedDepartment.id);
  if (index === -1) {
    throw new Error('部门不存在');
  }
  
  // 如果部门名称有修改，需要检查是否与其他部门重名
  if (updatedDepartment.departmentName !== departments[index].departmentName &&
      departments.some(d => d.id !== updatedDepartment.id && 
                           d.departmentName === updatedDepartment.departmentName)) {
    throw new Error('部门名称已存在');
  }
  
  // 如果部门名称变了，需要处理关联数据
  const oldName = departments[index].departmentName;
  if (oldName !== updatedDepartment.departmentName) {
    // 更新列车长的部门名称
    conductors.forEach(c => {
      if (c.department === oldName) {
        c.department = updatedDepartment.departmentName;
      }
    });
    
    // 更新申请的部门名称
    applications.forEach(a => {
      if (a.department === oldName) {
        a.department = updatedDepartment.departmentName;
      }
    });
    
    // 更新部门定员
    departmentQuotas[updatedDepartment.departmentName] = updatedDepartment.quota;
    delete departmentQuotas[oldName];
  } else {
    // 只更新定员
    departmentQuotas[updatedDepartment.departmentName] = updatedDepartment.quota;
  }
  
  departments[index] = { ...departments[index], ...updatedDepartment };
  saveData();
  return departments[index];
}

function deleteDepartment(id) {
  const index = departments.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error('部门不存在');
  }
  
  const department = departments[index];
  
  // 检查是否有列车长属于该部门
  if (conductors.some(c => c.department === department.departmentName)) {
    throw new Error('该部门下有列车长，无法删除');
  }
  
  // 删除部门定员
  delete departmentQuotas[department.departmentName];
  
  // 删除部门
  departments.splice(index, 1);
  saveData();
}

function getConductorsByStatus(status) {
  if (!status) return conductors;
  return conductors.filter(conductor => conductor.status === status);
}

function getConductorsByDepartment(department) {
  if (!department) return conductors;
  return conductors.filter(conductor => conductor.department === department);
}

function getConductorsByDepartmentAndStatus(department, status) {
  let filtered = conductors;
  
  if (department) {
    filtered = filtered.filter(c => c.department === department);
  }
  
  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  
  return filtered;
}

function getConductorByEmployeeId(employeeId) {
  return conductors.find(c => c.employeeId === employeeId);
}

function getApplicationsByType(type) {
  if (!type || type === 'all') return applications;
  return applications.filter(app => app.type === type);
}

function getApplicationsByDepartment(department) {
  if (!department) return applications;
  return applications.filter(app => app.department === department);
}

function getApplicationsByDateRange(startDate, endDate) {
  if (!startDate && !endDate) return applications;
  
  let filtered = applications;
  
  if (startDate) {
    filtered = filtered.filter(app => new Date(app.date) >= new Date(startDate));
  }
  
  if (endDate) {
    filtered = filtered.filter(app => new Date(app.date) <= new Date(endDate));
  }
  
  return filtered;
}

function getApplicationTrend() {
  // Get last 6 months
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(today.getMonth() - i);
    months.push({
      month: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      label: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    });
  }
  
  // Count applications by month and type
  const result = {
    months: months.map(m => m.label),
    official: months.map(m => {
      return applications.filter(app => 
        app.type === '正式启用' && 
        app.date.substring(0, 7) === m.month
      ).length;
    }),
    temporary: months.map(m => {
      return applications.filter(app => 
        app.type === '临时启用' && 
        app.date.substring(0, 7) === m.month
      ).length;
    }),
    dismissal: months.map(m => {
      return applications.filter(app => 
        app.type === '免职' && 
        app.date.substring(0, 7) === m.month
      ).length;
    })
  };
  
  return result;
}

function getDepartmentStatistics() {
  // 获取所有部门列表，而不是使用硬编码的部门列表
  const departments = getAllDepartmentNames();
  
  return departments.map(dept => {
    const quota = departmentQuotas[dept] || 0;
    const official = conductors.filter(c => c.department === dept && c.status === '正式启用').length;
    const temporary = conductors.filter(c => c.department === dept && c.status === '临时启用').length;
    const reserve = conductors.filter(c => c.department === dept && c.status === '后备').length;
    const vacancies = Math.max(0, quota - official);
    const vacancyRate = quota > 0 ? (vacancies / quota * 100).toFixed(1) : '0.0';
    
    return {
      department: dept,
      quota,
      official,
      temporary,
      reserve,
      vacancies,
      vacancyRate
    };
  });
}

function processTemporaryApplications() {
  // Check for expired temporary applications (3 months from application date)
  const today = new Date();
  
  // Find conductors who are temporarily enabled and have an application
  const tempConductors = conductors.filter(c => c.status === '临时启用');
  
  tempConductors.forEach(conductor => {
    // Find the most recent temporary application for this conductor
    const tempApp = applications
      .filter(a => a.employeeId === conductor.employeeId && a.type === '临时启用')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (tempApp) {
      const appDate = new Date(tempApp.date);
      const expiryDate = new Date(appDate);
      expiryDate.setMonth(appDate.getMonth() + 3);
      
      // If the temporary application has expired
      if (today > expiryDate) {
        // Update conductor status to "后备"
        const conductorIndex = conductors.findIndex(c => c.id === conductor.id);
        if (conductorIndex !== -1) {
          conductors[conductorIndex].status = '后备';
          // Maybe add a note about automatic expiration
          conductors[conductorIndex].note += conductors[conductorIndex].note ? 
            '; 临时启用已过期' : '临时启用已过期';
            
          // Save changes
          saveData();
        }
      }
    }
  });
}

function addConductor(newConductor) {
  newConductor.id = getNextId(conductors);
  conductors.push(newConductor);
  saveData();
  return newConductor;
}

function updateConductor(updatedConductor) {
  const index = conductors.findIndex(c => c.id === updatedConductor.id);
  if (index !== -1) {
    conductors[index] = { ...conductors[index], ...updatedConductor };
    saveData();
    return conductors[index];
  }
  return null;
}

function addApplication(newApplication) {
  newApplication.id = getNextId(applications);
  newApplication.status = '待处理';
  applications.push(newApplication);
  
  // 获取列车长信息
  const conductor = getConductorByEmployeeId(newApplication.employeeId);
  if (conductor) {
    // 检查部门是否需要更新（无论申请状态如何都更新部门）
    if (conductor.department !== newApplication.department) {
      updateConductor({
        ...conductor,
        department: newApplication.department
      });
    }
  
    // 当添加新申请时，以最新日期申请为准更新列车长状态
    if (newApplication.status === '已处理') {
      updateConductorByLatestApplication(newApplication.employeeId);
    } else {
      // 如果是待处理的申请，仍然按之前的逻辑处理
      if (newApplication.type === '正式启用' || newApplication.type === '临时启用') {
        updateConductor({
          ...conductor,
          status: newApplication.type === '正式启用' ? '正式启用' : '临时启用'
        });
      } else if (newApplication.type === '免职') {
        updateConductor({
          ...conductor,
          status: '后备'
        });
      }
    }
  }
  
  saveData();
  return newApplication;
}

function updateApplicationStatus(id, status) {
  const index = applications.findIndex(a => a.id === id);
  if (index !== -1) {
    const prevStatus = applications[index].status;
    applications[index].status = status;
    
    // 如果申请状态从"待处理"变为"已处理"，需要更新列车长状态
    if (prevStatus === '待处理' && status === '已处理') {
      const employeeId = applications[index].employeeId;
      // 根据最新日期更新列车长状态
      updateConductorByLatestApplication(employeeId);
    }
    
    saveData();
    return applications[index];
  }
  return null;
}

// 删除指定ID的申请记录
function deleteApplication(id) {
  const index = applications.findIndex(a => a.id === id);
  if (index !== -1) {
    // 保存被删除的申请信息（用于返回）
    const deletedApplication = applications[index];
    
    // 从数组中删除
    applications.splice(index, 1);
    
    // 保存更改
    saveData();
    
    return deletedApplication;
  }
  return null;
}

function updateDepartmentQuota(department, quota) {
  // 更新 departments 数组
  const dept = departments.find(d => d.departmentName === department);
  if (dept) {
    dept.quota = parseInt(quota);
  }
  
  // 同步到 departmentQuotas
  departmentQuotas[department] = parseInt(quota);
  
  saveData();
}

// 批量导入申请记录
function batchImportApplications(applicationsData, updateExisting = false) {
  // 记录导入结果
  const result = {
    success: false,
    successCount: 0,
    failureCount: 0,
    errors: [],
    details: []
  };
  
  // 有效的申请类型
  const validTypes = ['正式启用', '临时启用', '免职'];
  
  // 有效的申请状态
  const validStatuses = ['待处理', '已处理'];
  
  // 获取系统中所有部门名称
  const allDepartments = departments.map(d => d.departmentName);
  
  // 解析申请记录
  const lines = applicationsData.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = line.split(',');
    
    // 至少需要申请类型、工号、姓名、部门和申请日期
    if (fields.length < 5) {
      result.failureCount++;
      result.errors.push(`第 ${i+1} 行: 数据不完整，至少需要申请类型、工号、姓名、部门和申请日期`);
      continue;
    }
    
    try {
      // 解析行数据
      const type = fields[0].trim();
      const employeeId = fields[1].trim();
      const name = fields[2].trim();
      const department = fields[3].trim();
      const date = fields[4].trim();
      const status = fields.length > 5 ? fields[5].trim() : '已处理';
      
      // 检查申请类型是否有效
      if (!validTypes.includes(type)) {
        throw new Error(`申请类型 "${type}" 无效，必须为 "正式启用"、"临时启用" 或 "免职"`);
      }
      
      // 检查申请日期格式是否正确
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`申请日期 "${date}" 格式不正确，应为 YYYY-MM-DD`);
      }
      
      // 检查申请日期是否有效
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`申请日期 "${date}" 无效`);
      }
      
      // 检查状态是否有效
      if (!validStatuses.includes(status)) {
        throw new Error(`申请状态 "${status}" 无效，必须为 "待处理" 或 "已处理"`);
      }
      
      // 检查部门是否存在
      if (!allDepartments.includes(department)) {
        throw new Error(`部门 "${department}" 不存在`);
      }
      
      // 检查是否已存在相同的申请记录（相同员工和日期）
      const existingAppIndex = applications.findIndex(a => 
        a.employeeId === employeeId && a.date === date && a.type === type
      );
      
      // 如果已存在并且不更新现有记录
      if (existingAppIndex !== -1 && !updateExisting) {
        throw new Error(`该员工 (${employeeId}) 在 ${date} 已有相同类型的申请记录`);
      }
      
      // 创建申请记录对象
      const newApplication = {
        type,
        employeeId,
        name,
        department,
        date,
        status
      };
      
      // 如果存在现有记录并允许更新
      if (existingAppIndex !== -1 && updateExisting) {
        newApplication.id = applications[existingAppIndex].id;
        applications[existingAppIndex] = newApplication;
        result.details.push(`更新: ${type} - ${name} (${employeeId}), ${date}`);
      } else {
        // 添加新申请
        newApplication.id = getNextId(applications);
        applications.push(newApplication);
        result.details.push(`新增: ${type} - ${name} (${employeeId}), ${date}`);
      }
      
      // 如果是已处理的申请，根据申请类型更新列车长状态
      if (status === '已处理') {
        updateConductorStatusByApplication(newApplication);
      }
      
      result.successCount++;
    } catch (error) {
      result.failureCount++;
      result.errors.push(`第 ${i+1} 行: ${error.message}`);
    }
  }
  
  // 批量导入结束后，对所有涉及的列车长再次执行最新申请日期检查
  if (result.successCount > 0) {
    // 获取所有导入成功的员工ID
    const importedEmployeeIds = new Set();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = line.split(',');
      if (fields.length >= 5) {
        importedEmployeeIds.add(fields[1].trim());
      }
    }
    
    // 对每个员工再次检查最新申请
    importedEmployeeIds.forEach(empId => {
      updateConductorByLatestApplication(empId);
    });
    
    result.success = true;
    saveData();
  }
  
  return result;
}

// 根据申请更新列车长状态
function updateConductorStatusByApplication(application) {
  // 获取列车长
  let conductor = getConductorByEmployeeId(application.employeeId);
  
  // 如果列车长不存在且是启用类型的申请，则创建新列车长
  if (!conductor && (application.type === '正式启用' || application.type === '临时启用')) {
    conductor = {
      id: getNextId(conductors),
      employeeId: application.employeeId,
      name: application.name,
      department: application.department,
      status: application.type === '正式启用' ? '正式启用' : '临时启用',
      note: `从${application.date}申请导入`
    };
    conductors.push(conductor);
  } 
  // 如果列车长存在，根据最新日期的申请更新状态
  else if (conductor) {
    // 更新部门信息（如果有变化）
    if (conductor.department !== application.department) {
      updateConductor({
        ...conductor,
        department: application.department
      });
    }
    
    // 更新状态信息
    updateConductorByLatestApplication(application.employeeId);
  }
}

// 根据最新日期的申请更新列车长状态的函数
function updateConductorByLatestApplication(employeeId) {
  const conductor = getConductorByEmployeeId(employeeId);
  if (!conductor) return;
  
  // 获取该列车长所有已处理的申请，按日期降序排序
  const conductorApplications = applications
    .filter(app => app.employeeId === employeeId && app.status === '已处理')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // 如果没有申请记录，不做任何更改
  if (conductorApplications.length === 0) return;
  
  // 获取日期最新的申请
  const latestApplication = conductorApplications[0];
  
  // 根据最新申请类型更新状态
  if (latestApplication.type === '正式启用') {
    conductor.status = '正式启用';
  } else if (latestApplication.type === '临时启用') {
    conductor.status = '临时启用';
  } else if (latestApplication.type === '免职') {
    conductor.status = '后备';
  }
  
  // 更新部门信息
  if (conductor.department !== latestApplication.department) {
    conductor.department = latestApplication.department;
  }
  
  // 保存更改
  saveData();
}

// Initialize data when the script loads
loadData();

// Check for expired temporary applications
processTemporaryApplications();
