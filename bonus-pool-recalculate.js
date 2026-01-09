// 奖金池数据修复脚本
// 用于重新计算所有历史月份的奖金池数据并保存到缓存表
// 在浏览器控制台运行此脚本，或集成到管理界面

import { bonusPoolService } from './src/services/bonusPoolService';

/**
 * 重新计算所有历史月份的奖金池数据
 * 首次使用优化版本时，需要运行此函数来初始化缓存表
 */
async function recalculateAllBonusPools() {
  try {
    console.log('开始重新计算所有历史月份的奖金池数据...');
    const result = await bonusPoolService.recalculateAllMonthlyBonusPools();
    console.log('重新计算完成！累计奖金池总额:', result);
    alert('数据修复完成！累计奖金池总额: ' + result.toFixed(2));
    return result;
  } catch (error) {
    console.error('重新计算失败:', error);
    alert('重新计算失败: ' + error.message);
    throw error;
  }
}

// 如果在浏览器控制台运行，可以直接调用
if (typeof window !== 'undefined') {
  window.recalculateAllBonusPools = recalculateAllBonusPools;
}

export { recalculateAllBonusPools };
