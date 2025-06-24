// 数据备份与恢复模块

// 导出所有系统数据为JSON文件
function exportAllData() {
  // 收集所有需要导出的数据
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      conductors: window.conductors || [],
      applications: window.applications || [],
      departments: window.departments || [],
      departmentQuotas: window.departmentQuotas || {},
      systemSettings: window.systemSettings || {}
    }
  };
  
  // 转换为JSON字符串
  const jsonData = JSON.stringify(exportData, null, 2);
  
  // 创建Blob对象
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 使用当前日期时间作为文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  link.download = `conductor_system_backup_${timestamp}.json`;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// 导入数据
function importData(jsonText) {
  try {
    // 解析JSON
    const importedData = JSON.parse(jsonText);
    
    // 验证数据结构
    if (!importedData.version || !importedData.data) {
      throw new Error('导入数据格式不正确');
    }
    
    const result = {
      success: true,
      message: '数据导入成功',
      details: {
        conductors: 0,
        applications: 0,
        departments: 0,
        settings: false
      }
    };
    
    // 导入部门数据
    if (Array.isArray(importedData.data.departments) && importedData.data.departments.length > 0) {
      window.departments = importedData.data.departments;
      result.details.departments = importedData.data.departments.length;
    }
    
    // 导入列车长数据
    if (Array.isArray(importedData.data.conductors) && importedData.data.conductors.length > 0) {
      window.conductors = importedData.data.conductors;
      result.details.conductors = importedData.data.conductors.length;
    }
    
    // 导入申请数据
    if (Array.isArray(importedData.data.applications) && importedData.data.applications.length > 0) {
      window.applications = importedData.data.applications;
      result.details.applications = importedData.data.applications.length;
    }
    
    // 导入部门定员数据
    if (importedData.data.departmentQuotas) {
      window.departmentQuotas = importedData.data.departmentQuotas;
    }
    
    // 导入系统设置
    if (importedData.data.systemSettings) {
      window.systemSettings = importedData.data.systemSettings;
      result.details.settings = true;
    }
    
    // 保存所有数据到localStorage
    saveData();
    
    // 刷新页面视图
    refreshAllViews();
    
    return result;
  } catch (error) {
    console.error('导入数据失败:', error);
    return {
      success: false,
      message: `导入失败: ${error.message}`
    };
  }
}

// 从文件导入数据
function importDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = importData(event.target.result);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
}

// 刷新所有视图
function refreshAllViews() {
  // 刷新各个模块的视图
  if (typeof updateDepartmentTable === 'function') {
    updateDepartmentTable();
  }
  
  if (typeof updateConductorTable === 'function') {
    updateConductorTable();
  }
  
  if (typeof updateApplicationTable === 'function') {
    updateApplicationTable();
  }
  
  if (typeof initDashboard === 'function') {
    initDashboard();
  }
  
  if (typeof updateDepartmentSelectors === 'function') {
    updateDepartmentSelectors();
  }
  
  if (typeof loadSystemSettings === 'function') {
    loadSystemSettings();
  }
}

// 创建备份文件名
function createBackupFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `列车长系统备份_${year}${month}${day}_${hours}${minutes}.json`;
}

// 初始化备份与恢复功能
function initBackupRestore() {
  // 添加相关事件监听器
  document.getElementById('export-backup-btn')?.addEventListener('click', exportAllData);
  
  // 导入文件选择监听
  const importFileInput = document.getElementById('import-file-input');
  if (importFileInput) {
    importFileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        try {
          // 显示导入中提示
          document.getElementById('import-status').textContent = '正在导入数据，请稍候...';
          document.getElementById('import-status').classList.remove('hidden');
          
          // 执行导入
          const result = await importDataFromFile(e.target.files[0]);
          
          // 显示导入结果
          if (result.success) {
            document.getElementById('import-status').textContent = `导入成功：${result.message}`;
            document.getElementById('import-status').classList.add('text-green-600');
            
            // 显示详细结果
            let details = [];
            if (result.details.departments > 0) {
              details.push(`部门: ${result.details.departments}个`);
            }
            if (result.details.conductors > 0) {
              details.push(`列车长: ${result.details.conductors}人`);
            }
            if (result.details.applications > 0) {
              details.push(`申请记录: ${result.details.applications}条`);
            }
            if (result.details.settings) {
              details.push('系统设置已更新');
            }
            
            if (details.length > 0) {
              document.getElementById('import-details').textContent = `导入项: ${details.join(', ')}`;
              document.getElementById('import-details').classList.remove('hidden');
            }
          } else {
            document.getElementById('import-status').textContent = result.message;
            document.getElementById('import-status').classList.add('text-red-600');
          }
        } catch (error) {
          document.getElementById('import-status').textContent = `导入出错: ${error.message}`;
          document.getElementById('import-status').classList.add('text-red-600');
        }
        
        // 重置文件输入框
        e.target.value = '';
      }
    });
  }
  
  // 触发导入文件选择对话框的按钮
  document.getElementById('import-backup-btn')?.addEventListener('click', () => {
    // 清除之前的状态
    document.getElementById('import-status').textContent = '';
    document.getElementById('import-status').classList.remove('text-green-600', 'text-red-600', 'hidden');
    document.getElementById('import-details').classList.add('hidden');
    
    // 触发文件选择
    document.getElementById('import-file-input').click();
  });
} 