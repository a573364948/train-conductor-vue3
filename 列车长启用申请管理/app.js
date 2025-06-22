// 主应用程序入口文件

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  try {
    initApp();
  } catch (error) {
    console.error('应用初始化出错:', error);
    alert('系统初始化出错，请刷新页面重试。如问题持续存在，请联系管理员。');
  }
});

// 初始化应用
function initApp() {
  // 设置导航切换
  setupNavigation();
  
  // 设置模态框事件
  setupModals();
  
  try {
    // 首先确保数据已加载
    if (typeof loadData === 'function') {
      loadData();
      console.log('数据已加载', window.departments ? `加载了 ${window.departments.length} 个部门` : '未找到部门数据');
    }
    
    // 初始化仪表盘（默认显示）
    initDashboard();
    
    // 初始化列车长列表（隐藏状态）
    initConductorList();
    
    // 初始化申请管理（隐藏状态）
    initApplicationManagement();
    
    // 初始化统计与报表（隐藏状态）
    initStatistics();
    
    // 初始化系统设置（隐藏状态）
    initSettings();
    
    // 初始化数据备份与恢复功能
    if (typeof initBackupRestore === 'function') {
      initBackupRestore();
    }
    
    // 应用系统设置
    applySystemSettings();
    
    // 更新所有部门选择器
    markDepartmentSelectors();
    updateDepartmentSelectors();
    
    // 初始化时立即检查一次临时启用过期
    checkAndProcessExpiredTemporary();
    
    // 设置定时检查（每小时检查一次）
    setInterval(checkAndProcessExpiredTemporary, 1000 * 60 * 60);
  } catch (error) {
    console.error('模块初始化出错:', error);
    // 继续执行，不要中断整个应用
  }
}

// 检查并处理过期的临时启用
function checkAndProcessExpiredTemporary() {
  const today = new Date();
  const tempPeriodMonths = systemSettings.tempPeriod || 3;
  let hasChanges = false;
  
  conductors.filter(c => c.status === '临时启用').forEach(conductor => {
    // 查找最近的临时启用申请
    const tempApp = applications
      .filter(a => a.employeeId === conductor.employeeId && 
                   a.type === '临时启用' && 
                   a.status === '已处理')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (tempApp) {
      const appDate = new Date(tempApp.date);
      const expiryDate = new Date(appDate);
      expiryDate.setMonth(appDate.getMonth() + tempPeriodMonths);
      
      if (today > expiryDate) {
        // 自动转为后备状态
        conductor.status = '后备';
        conductor.note = (conductor.note ? conductor.note + '; ' : '') + 
          `临时启用已于${expiryDate.toLocaleDateString('zh-CN')}过期`;
        hasChanges = true;
        
        console.log(`列车长 ${conductor.name} 的临时启用已过期，已自动转为后备状态`);
      }
    }
  });
  
  if (hasChanges) {
    // 保存数据
    saveData();
    
    // 刷新当前视图
    if (!document.getElementById('dashboard').classList.contains('hidden')) {
      initDashboard();
    }
    if (!document.getElementById('conductor-list').classList.contains('hidden')) {
      updateConductorTable();  
    }
    if (!document.getElementById('statistics').classList.contains('hidden')) {
      updateStatisticsCharts();
      updateDepartmentStats();
    }
  }
}

// 标记所有的部门选择器
function markDepartmentSelectors() {
  // 添加属性以便于识别
  const departmentSelectors = [
    document.getElementById('department-filter'),
    document.getElementById('stats-department-filter'),
    document.getElementById('application-department-filter')
  ];
  
  departmentSelectors.forEach(selector => {
    if (selector) {
      selector.setAttribute('data-department-selector', 'true');
      selector.setAttribute('data-default-text', '所有部门');
    }
  });
  
  // 添加编辑部门和添加部门表单中的部门选择器
  const formSelectors = [
    document.querySelector('#add-conductor-form [name="department"]'),
    document.querySelector('#edit-conductor-form [name="department"]')
  ];
  
  formSelectors.forEach(selector => {
    if (selector) {
      selector.setAttribute('data-department-selector', 'true');
      selector.setAttribute('data-default-text', '选择部门');
    }
  });
}

// 设置导航栏切换
function setupNavigation() {
  const navItems = document.querySelectorAll('nav a.nav-item');
  const sections = document.querySelectorAll('.section');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 更新导航项状态
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // 显示对应的部分，隐藏其他部分
      const targetId = item.getAttribute('data-section');
      
      sections.forEach(section => {
        if (section.id === targetId) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
    });
  });
}

// 设置模态框
function setupModals() {
  // 获取所有关闭按钮
  const closeButtons = document.querySelectorAll('.modal-close');
  
  // 点击关闭按钮时关闭模态框
  closeButtons.forEach(button => {
    button.addEventListener('click', closeModals);
  });
  
  // 点击模态框背景时关闭模态框
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) {
      closeModals();
    }
  });
  
  // ESC 键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
    }
  });
}

// 关闭所有模态框
function closeModals() {
  // 隐藏背景遮罩
  document.getElementById('modal-overlay').classList.add('hidden');
  
  // 隐藏所有模态框
  const modals = document.querySelectorAll('#modal-overlay > div');
  modals.forEach(modal => {
    modal.classList.add('hidden');
    
    // 清理表单状态
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => {
      form.reset();
      
      // 清理任何错误提示或结果显示
      const resultDivs = form.querySelectorAll('[id*="result"], [id*="message"], [id*="details"], [id*="status"]');
      resultDivs.forEach(div => {
        div.classList.add('hidden');
        div.textContent = '';
        div.classList.remove('bg-green-100', 'bg-red-100', 'bg-blue-100', 
                           'text-green-600', 'text-green-700', 
                           'text-red-600', 'text-red-700', 
                           'text-blue-600', 'text-blue-700');
      });
    });
    
    // 特殊处理：文件选择显示
    const fileNameDisplay = modal.querySelector('#selected-file-name');
    if (fileNameDisplay) {
      fileNameDisplay.textContent = '未选择文件';
      fileNameDisplay.classList.remove('text-black');
      fileNameDisplay.classList.add('text-gray-400');
    }
  });
}

// 处理锚点导航
function handleHashChange() {
  const hash = window.location.hash;
  if (hash) {
    const targetSection = hash.substring(1);
    const navItem = document.querySelector(`[data-section="${targetSection}"]`);
    
    if (navItem) {
      navItem.click();
    }
  }
}

// 页面加载和哈希变化时处理锚点
window.addEventListener('load', handleHashChange);
window.addEventListener('hashchange', handleHashChange);

// 更新部门选择器
function updateDepartmentSelectors() {
  // 获取所有部门选择器（包括标记的和未标记的）
  const allSelectors = document.querySelectorAll(
    'select[name="department"], select[data-department-selector="true"], #department-filter, #stats-department-filter, #application-department-filter'
  );
  
  allSelectors.forEach(selector => {
    // 保存当前值
    const currentValue = selector.value;
    
    // 判断默认文本
    const defaultText = selector.getAttribute('data-default-text') || 
                       (selector.id && selector.id.includes('filter') ? '所有部门' : '选择部门');
    
    // 清空现有选项
    selector.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    selector.appendChild(defaultOption);
    
    // 获取部门列表
    const deptNames = getAllDepartmentNames ? getAllDepartmentNames() : [];
    
    // 添加所有部门
    deptNames.forEach(deptName => {
      const option = document.createElement('option');
      option.value = deptName;
      option.textContent = deptName;
      selector.appendChild(option);
    });
    
    // 恢复原值（如果存在）
    if (currentValue && deptNames.includes(currentValue)) {
      selector.value = currentValue;
    }
  });
} 