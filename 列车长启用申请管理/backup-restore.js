// 数据备份与恢复模块

// 从IndexedDB读取所有数据
async function readAllDataFromIndexedDB() {
  return new Promise(async (resolve, reject) => {
    try {
      // 先尝试不同版本号来找到有数据的版本
      const versionsToTry = [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let foundDb = null;
      
      for (let version of versionsToTry) {
        try {
          console.log(`尝试打开数据库版本: ${version || '最新'}`);
          const db = await openDatabaseVersion(version);
          const storeNames = Array.from(db.objectStoreNames);
          console.log(`版本 ${db.version} 的存储对象:`, storeNames);
          
          if (storeNames.length > 0) {
            console.log(`找到有数据的版本: ${db.version}`);
            foundDb = db;
            break;
          } else {
            db.close();
          }
        } catch (error) {
          console.log(`版本 ${version} 打开失败:`, error.message);
        }
      }
      
      if (!foundDb) {
        throw new Error('未找到包含数据的数据库版本');
      }
      
      // 使用找到的数据库进行数据读取
      const allData = await readDataFromDB(foundDb);
      resolve(allData);
      
    } catch (error) {
      console.error('读取数据失败:', error);
      reject(error);
    }
  });
  
  function openDatabaseVersion(version) {
    return new Promise((resolve, reject) => {
      const request = version ? indexedDB.open('conductorSystemDB', version) : indexedDB.open('conductorSystemDB');
      
      request.onerror = () => {
        reject(new Error('无法打开数据库版本 ' + version + ': ' + request.error));
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }
  
  async function readDataFromDB(db) {
    console.log('开始从数据库读取数据, 版本:', db.version);
    console.log('可用的存储对象:', Array.from(db.objectStoreNames));
    
    // 存储所有数据的对象
    const allData = {
      conductors: [],
      applications: [],
      departments: [],
      departmentQuotas: {},
      systemSettings: {}
    };
    
    // 定义需要读取的存储对象
    const storeNames = ['conductors', 'applications', 'departments', 'departmentQuotas', 'systemSettings'];
    
    // 并发读取所有存储对象
    const readPromises = storeNames.map(storeName => {
      return new Promise((storeResolve, storeReject) => {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`存储对象 ${storeName} 不存在，跳过`);
          storeResolve({ storeName, data: storeName === 'departmentQuotas' || storeName === 'systemSettings' ? {} : [] });
          return;
        }
        
        console.log(`开始读取存储对象: ${storeName}`);
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          let data = getAllRequest.result;
          console.log(`存储对象 ${storeName} 读取完成，数据条数:`, Array.isArray(data) ? data.length : typeof data);
          
          // 对于departmentQuotas和systemSettings，如果是数组但应该是对象，进行转换
          if ((storeName === 'departmentQuotas' || storeName === 'systemSettings') && Array.isArray(data)) {
            if (data.length > 0) {
              // 假设第一个元素包含所有数据
              data = data[0] || {};
            } else {
              data = {};
            }
          }
          
          storeResolve({ storeName, data });
        };
        
        getAllRequest.onerror = () => {
          console.error(`读取 ${storeName} 失败:`, getAllRequest.error);
          storeReject(new Error(`读取 ${storeName} 失败: ${getAllRequest.error}`));
        };
        
        transaction.onerror = () => {
          console.error(`事务 ${storeName} 失败:`, transaction.error);
          storeReject(new Error(`事务 ${storeName} 失败: ${transaction.error}`));
        };
      });
    });
    
    // 等待所有读取操作完成
    const results = await Promise.all(readPromises);
    
    // 将结果合并到allData中
    results.forEach(result => {
      allData[result.storeName] = result.data;
      console.log(`合并数据 ${result.storeName}:`, Array.isArray(result.data) ? `${result.data.length} 条记录` : typeof result.data);
    });
    
    console.log('所有数据读取完成:', {
      conductors: Array.isArray(allData.conductors) ? allData.conductors.length : 0,
      applications: Array.isArray(allData.applications) ? allData.applications.length : 0,
      departments: Array.isArray(allData.departments) ? allData.departments.length : 0,
      departmentQuotas: Object.keys(allData.departmentQuotas || {}).length,
      systemSettings: Object.keys(allData.systemSettings || {}).length
    });
    
    // 关闭数据库连接
    db.close();
    
    return allData;
  }
}

// 导出所有系统数据为JSON文件
async function exportAllData() {
  try {
    // 显示加载状态
    const exportButton = document.getElementById('export-backup-btn');
    const originalText = exportButton.innerHTML;
    exportButton.innerHTML = '<i class="ri-loader-4-line mr-2 animate-spin"></i> <span class="text-[15px]">正在导出...</span>';
    exportButton.disabled = true;
    
    // 从IndexedDB读取所有数据
    const dbData = await readAllDataFromIndexedDB();
    
    // 收集所有需要导出的数据
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      metadata: {
        source: 'conductorsystemDB',
        description: '列车长启用申请管理系统数据备份',
        counts: {
          conductors: Array.isArray(dbData.conductors) ? dbData.conductors.length : 0,
          applications: Array.isArray(dbData.applications) ? dbData.applications.length : 0,
          departments: Array.isArray(dbData.departments) ? dbData.departments.length : 0,
          departmentQuotas: Object.keys(dbData.departmentQuotas || {}).length,
          systemSettings: Object.keys(dbData.systemSettings || {}).length
        }
      },
      data: dbData
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
    
    // 显示成功消息
    alert(`数据导出成功！\n\n统计信息：\n- 列车长信息：${exportData.metadata.counts.conductors} 条\n- 申请记录：${exportData.metadata.counts.applications} 条\n- 部门信息：${exportData.metadata.counts.departments} 条\n- 部门定员：${exportData.metadata.counts.departmentQuotas} 条\n- 系统设置：${exportData.metadata.counts.systemSettings} 条`);
    
    // 恢复按钮状态
    exportButton.innerHTML = originalText;
    exportButton.disabled = false;
    
  } catch (error) {
    console.error('导出数据失败:', error);
    alert(`导出数据失败：${error.message}`);
    
    // 恢复按钮状态
    const exportButton = document.getElementById('export-backup-btn');
    exportButton.innerHTML = '<i class="ri-download-line mr-2"></i> <span class="text-[15px]">导出备份数据</span>';
    exportButton.disabled = false;
  }
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