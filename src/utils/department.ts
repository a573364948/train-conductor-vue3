/**
 * 部门分类工具函数
 */

/**
 * 确定部门所属的类别（高铁/动车/普速）
 * @param department 部门名称
 * @param departmentCategories 部门分类配置
 * @returns 部门类别
 */
export function determineCategory(
  department: string, 
  departmentCategories: Record<string, string> = {}
): '高铁' | '动车' | '普速' | '其他' {
  if (!department) return '其他'
  
  // 首先检查是否有手动设置的类别映射
  if (departmentCategories[department]) {
    const category = departmentCategories[department]
    if (['高铁', '动车', '普速', '其他'].includes(category)) {
      return category as '高铁' | '动车' | '普速' | '其他'
    }
  }
  
  // 否则根据名称自动推断
  if (department.includes('高铁')) return '高铁'
  if (department.includes('动车')) return '动车'
  if (department.includes('普速') || 
      department.includes('普客') || 
      department.includes('特快') || 
      department.includes('普通')) return '普速'
  
  // 默认归类为普速（用户要求）
  return '普速'
}

/**
 * 获取指定类别的所有部门
 * @param category 类别名称
 * @param allDepartments 所有部门列表
 * @param departmentCategories 部门分类配置
 * @returns 该类别的部门列表
 */
export function getDepartmentsByCategory(
  category: '高铁' | '动车' | '普速' | '其他',
  allDepartments: string[],
  departmentCategories: Record<string, string> = {}
): string[] {
  return allDepartments.filter(dept => 
    determineCategory(dept, departmentCategories) === category
  )
}

/**
 * 获取所有可用的部门类别
 * @param allDepartments 所有部门列表
 * @param departmentCategories 部门分类配置
 * @returns 所有存在的类别列表
 */
export function getAllCategories(
  allDepartments: string[],
  departmentCategories: Record<string, string> = {}
): Array<'高铁' | '动车' | '普速' | '其他'> {
  const categories = new Set<'高铁' | '动车' | '普速' | '其他'>()
  
  allDepartments.forEach(dept => {
    const category = determineCategory(dept, departmentCategories)
    categories.add(category)
  })
  
  return Array.from(categories).sort()
} 