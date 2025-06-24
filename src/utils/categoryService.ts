export class CategoryService {
  constructor(private database: any) {}

  /** 获取映射的类别 */
  getMappedCategory(description: string): string | null {
    if (!description || !this.database?.categoryMappings?.itemMappings) return null
    return this.database.categoryMappings.itemMappings[description] || null
  }

  /** 保存映射 */
  saveMapping(description: string, category: string) {
    if (!description || !category) return
    if (!this.database.categoryMappings) {
      this.database.categoryMappings = { itemMappings: {} }
    }
    this.database.categoryMappings.itemMappings[description] = category
  }
} 