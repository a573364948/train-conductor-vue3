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
  } catch (error) {
    console.error('模块初始化出错:', error);
    // 继续执行，不要中断整个应用
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
  modals.forEach(modal => modal.classList.add('hidden'));
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
  // 获取所有部门选择器
  const selectors = document.querySelectorAll('[data-department-selector="true"]');
  
  selectors.forEach(selector => {
    // 保留原有"所有部门"或"选择部门"选项
    const defaultText = selector.getAttribute('data-default-text') || '所有部门';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    
    // 清空现有选项
    selector.innerHTML = '';
    selector.appendChild(defaultOption);
    
    // 添加所有部门
    if (window.departments && Array.isArray(window.departments)) {
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.departmentName;
        option.textContent = dept.departmentName;
        selector.appendChild(option);
      });
    } else {
      // 使用getAllDepartmentNames()函数获取部门列表
      const deptNames = getAllDepartmentNames ? getAllDepartmentNames() : 
        ['旅游车队', '京哈高铁车队', '京广高铁车队', '短预车队', '京丹车队', '京张城际车队', 
         '京广动卧车队', '高铁二队', '京秦车队', '京沪车队', '高铁一队', '京深车队', 
         '京通车队', '京照车队', '京宜车队', '京张高铁车队', '联运车队', '青岛车队'];
      
      deptNames.forEach(deptName => {
        const option = document.createElement('option');
        option.value = deptName;
        option.textContent = deptName;
        selector.appendChild(option);
      });
    }
  });
} 