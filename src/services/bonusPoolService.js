import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';
import { salaryService } from './salaryService';
import dayjs from 'dayjs';

class BonusPoolService {
  // 固定成本
  FIXED_COST = 30000;
  // 奖金池比例
  BONUS_POOL_RATE = 0.01; // 1%

  // 计算当月奖金池数据（支持累积）
  async calculateBonusPool(year = null, month = null) {
    try {
      const currentDate = dayjs();
      const targetYear = year || currentDate.year();
      const targetMonth = month || currentDate.month() + 1;

      // 获取当月开始和结束时间
      const startDate = dayjs(`${targetYear}-${targetMonth}-01`).startOf('month');
      const endDate = dayjs(`${targetYear}-${targetMonth}-01`).endOf('month');

      // 获取当月所有交易
      const transactions = await transactionService.getTransactions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // 计算当月销售金额（sale类型的total_amount总和）
      let salesAmount = 0;
      transactions.forEach(transaction => {
        if (transaction.type === 'sale') {
          salesAmount += parseFloat(transaction.total_amount) || 0;
        }
      });

      // 计算当月回收金额（return类型的total_amount总和）
      let returnAmount = 0;
      transactions.forEach(transaction => {
        if (transaction.type === 'return') {
          returnAmount += parseFloat(transaction.total_amount) || 0;
        }
      });

      // 计算当月工资总额
      const allSalaries = await salaryService.getAllEmployeesMonthlySalary(targetYear, targetMonth);
      const totalSalary = allSalaries.reduce((sum, salary) => {
        return sum + (parseFloat(salary.totalSalary) || 0);
      }, 0);

      // 计算当月净利润
      const netProfit = salesAmount - returnAmount - totalSalary - this.FIXED_COST;

      // 计算当月奖金池
      const monthlyBonusPool = netProfit * this.BONUS_POOL_RATE;

      // 计算累计奖金池：获取所有历史月份的奖金池总和
      const cumulativeBonusPool = await this.calculateCumulativeBonusPool();

      // 获取所有历史扣款记录（不分年月）
      const allDeductions = await this.getAllDeductions();
      const totalDeductions = allDeductions.reduce((sum, deduction) => {
        return sum + (parseFloat(deduction.deduction_amount) || 0);
      }, 0);

      // 计算当前奖金池余额（累计奖金池 - 累计已扣款）
      const currentBalance = cumulativeBonusPool - totalDeductions;

      return {
        year: targetYear,
        month: targetMonth,
        salesAmount,
        returnAmount,
        totalSalary,
        fixedCost: this.FIXED_COST,
        netProfit,
        bonusPool: monthlyBonusPool, // 当月奖金池
        cumulativeBonusPool, // 累计奖金池
        totalDeductions, // 累计已扣款
        currentBalance, // 累计余额
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('计算奖金池失败:', error);
      throw error;
    }
  }

  // 计算累计奖金池（所有历史月份的总和）
  async calculateCumulativeBonusPool() {
    try {
      // 获取所有交易记录（不限制日期）
      const allTransactions = await transactionService.getTransactions();

      // 按年月分组计算
      const monthlyData = {};
      
      allTransactions.forEach(transaction => {
        const transactionDate = dayjs(transaction.created_at);
        const year = transactionDate.year();
        const month = transactionDate.month() + 1;
        const key = `${year}-${month}`;

        if (!monthlyData[key]) {
          monthlyData[key] = {
            year,
            month,
            salesAmount: 0,
            returnAmount: 0,
            transactions: []
          };
        }

        monthlyData[key].transactions.push(transaction);
      });

      // 计算每个月的奖金池
      let cumulativeBonusPool = 0;

      // 获取所有已计算的月份
      const months = Object.keys(monthlyData).sort();

      for (const key of months) {
        const monthData = monthlyData[key];
        
        // 计算该月的销售金额和回收金额
        let salesAmount = 0;
        let returnAmount = 0;

        monthData.transactions.forEach(transaction => {
          if (transaction.type === 'sale') {
            salesAmount += parseFloat(transaction.total_amount) || 0;
          } else if (transaction.type === 'return') {
            returnAmount += parseFloat(transaction.total_amount) || 0;
          }
        });

        // 计算该月的工资总额
        const allSalaries = await salaryService.getAllEmployeesMonthlySalary(
          monthData.year,
          monthData.month
        );
        const totalSalary = allSalaries.reduce((sum, salary) => {
          return sum + (parseFloat(salary.totalSalary) || 0);
        }, 0);

        // 计算该月净利润
        const netProfit = salesAmount - returnAmount - totalSalary - this.FIXED_COST;

        // 计算该月奖金池并累加
        const monthlyBonusPool = netProfit * this.BONUS_POOL_RATE;
        cumulativeBonusPool += monthlyBonusPool;
      }

      return cumulativeBonusPool;
    } catch (error) {
      console.error('计算累计奖金池失败:', error);
      // 如果计算失败，返回0
      return 0;
    }
  }

  // 执行扣款
  async deductBonus(amount, operatorId, operatorName) {
    try {
      if (!amount || amount <= 0) {
        throw new Error('扣款金额必须大于0');
      }

      // 获取当前累计奖金池数据
      const bonusPoolData = await this.calculateBonusPool();

      // 检查余额是否足够
      if (bonusPoolData.currentBalance < amount) {
        throw new Error(`奖金池余额不足，当前余额：${bonusPoolData.currentBalance.toFixed(2)}元`);
      }

      // 计算扣款后余额
      const remainingBalance = bonusPoolData.currentBalance - amount;

      // 创建扣款记录
      const deductionRecord = {
        deduction_amount: parseFloat(amount),
        operator_id: operatorId,
        operator_name: operatorName,
        remaining_balance: remainingBalance,
        year: bonusPoolData.year,
        month: bonusPoolData.month,
        created_at: new Date().toISOString()
      };

      // 尝试保存到数据库
      try {
        const { data, error } = await supabase
          .from('bonus_deduction_log')
          .insert([deductionRecord])
          .select();

        if (error) {
          throw error;
        }

        return data[0];
      } catch (dbError) {
        console.warn('数据库保存扣款记录失败，使用本地存储:', dbError);
        
        // 保存到本地存储
        const localDeductions = JSON.parse(localStorage.getItem('localBonusDeductions') || '[]');
        const localDeduction = {
          ...deductionRecord,
          id: Date.now()
        };
        localDeductions.push(localDeduction);
        localStorage.setItem('localBonusDeductions', JSON.stringify(localDeductions));
        
        return localDeduction;
      }
    } catch (error) {
      console.error('执行扣款失败:', error);
      throw error;
    }
  }

  // 获取扣款记录
  async getDeductions(year = null, month = null) {
    try {
      let deductions = [];

      // 如果指定了年月，只获取该年月的记录
      if (year && month) {
        try {
          const { data, error } = await supabase
            .from('bonus_deduction_log')
            .select('*')
            .eq('year', year)
            .eq('month', month)
            .order('created_at', { ascending: false });

          if (!error && data) {
            deductions = data;
          }
        } catch (dbError) {
          console.warn('从数据库获取扣款记录失败:', dbError);
        }
      } else {
        // 获取所有记录
        try {
          const { data, error } = await supabase
            .from('bonus_deduction_log')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            deductions = data;
          }
        } catch (dbError) {
          console.warn('从数据库获取扣款记录失败:', dbError);
        }
      }

      // 获取本地存储的记录
      const localDeductions = JSON.parse(localStorage.getItem('localBonusDeductions') || '[]');
      
      // 如果指定了年月，筛选本地记录
      let filteredLocalDeductions = localDeductions;
      if (year && month) {
        filteredLocalDeductions = localDeductions.filter(d => {
          // 优先使用year和month字段，如果没有则从created_at解析
          if (d.year && d.month) {
            return d.year === year && d.month === month;
          } else {
            const recordDate = dayjs(d.created_at);
            return recordDate.year() === year && recordDate.month() + 1 === month;
          }
        });
      }

      // 合并数据
      const allDeductions = [...deductions, ...filteredLocalDeductions];
      
      // 按创建时间排序
      allDeductions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allDeductions;
    } catch (error) {
      console.error('获取扣款记录失败:', error);
      const localDeductions = JSON.parse(localStorage.getItem('localBonusDeductions') || '[]');
      return localDeductions;
    }
  }

  // 获取所有扣款记录（不分年月）
  async getAllDeductions() {
    return await this.getDeductions();
  }
}

export const bonusPoolService = new BonusPoolService();

