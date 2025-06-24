import { ref } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 统一的日期和月份选择 Composable
 * @returns 包含月份处理逻辑的对象
 */
export function useDateSelection() {
  const selectedMonth = ref('');
  const availableMonths = ref<string[]>([]);

  /**
   * 获取上个月的 'YYYY-MM' 字符串
   * @returns {string} 'YYYY-MM'
   */
  const getPreviousMonth = (): string => {
    const today = new Date();
    // 正确处理跨年份的情况（例如1月份）
    today.setMonth(today.getMonth() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  /**
   * 初始化月份选择
   * @param {string[]} allMonths - 所有可用的月份数组 (['2025-06', '2025-05', ...])
   */
  const initializeMonthSelection = (allMonths: string[]) => {
    availableMonths.value = allMonths;
    const targetMonth = getPreviousMonth();

    if (allMonths.includes(targetMonth)) {
      selectedMonth.value = targetMonth;
    } else if (allMonths.length > 0) {
      // availableMonths 必须是降序排列的
      selectedMonth.value = allMonths[0]; 
      ElMessage.info(`未找到上月（${targetMonth}）的数据，已自动选择最新月份：${selectedMonth.value}`);
    } else {
      selectedMonth.value = '';
    }
  };

  return {
    selectedMonth,
    availableMonths,
    initializeMonthSelection,
  };
} 