import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';
import dayjs from 'dayjs';

class CustomerGiftService {
  // 赠送规则配置
  GIFT_RULES = [
    { min: 0, max: 299, dailyGiftQuantity: 0, color: null, display: false },
    { min: 300, max: 999, dailyGiftQuantity: 1, color: 'blue', display: true },
    { min: 1000, max: 4999, dailyGiftQuantity: 2, color: 'blue', display: true },
    { min: 5000, max: Infinity, dailyGiftQuantity: 2, color: 'red', display: true }
  ];

  // 获取客户赠送规则
  getGiftRule(salesQuantity) {
    for (const rule of this.GIFT_RULES) {
      if (salesQuantity >= rule.min && salesQuantity <= rule.max) {
        return rule;
      }
    }
    return this.GIFT_RULES[0]; // 默认返回第一个规则
  }

  // 计算客户赠送到期时间
  calculateGiftEndDate(purchaseMonth) {
    // 购买月份的下个月月底到期
    return dayjs(purchaseMonth).add(1, 'month').endOf('month');
  }

  // 计算剩余赠送天数
  calculateRemainingDays(endDate) {
    const today = dayjs();
    const end = dayjs(endDate);
    const remainingDays = end.diff(today, 'day');
    return Math.max(0, remainingDays);
  }

  // 获取客户每日赠送数据
  async getCustomerGiftData() {
    try {
      const currentMonth = dayjs();
      const lastMonth = dayjs().subtract(1, 'month');

      // 获取本月和上月的销售交易记录
      const [currentMonthTransactions, lastMonthTransactions] = await Promise.all([
        this.getMonthlyTransactions(currentMonth),
        this.getMonthlyTransactions(lastMonth)
      ]);

      // 按客户分组统计
      const customerStats = {};

      // 统计本月销售
      currentMonthTransactions.forEach(transaction => {
        const customerName = transaction.customer_name;
        if (!customerStats[customerName]) {
          customerStats[customerName] = {
            customerName,
            currentMonthSales: 0,
            lastMonthSales: 0,
            currentMonthAmount: 0,
            lastMonthAmount: 0,
            currentMonthTransactions: 0,
            lastMonthTransactions: 0
          };
        }
        customerStats[customerName].currentMonthSales += parseFloat(transaction.quantity) || 0;
        customerStats[customerName].currentMonthAmount += parseFloat(transaction.total_amount) || 0;
        customerStats[customerName].currentMonthTransactions++;
      });

      // 统计上月销售
      lastMonthTransactions.forEach(transaction => {
        const customerName = transaction.customer_name;
        if (!customerStats[customerName]) {
          customerStats[customerName] = {
            customerName,
            currentMonthSales: 0,
            lastMonthSales: 0,
            currentMonthAmount: 0,
            lastMonthAmount: 0,
            currentMonthTransactions: 0,
            lastMonthTransactions: 0
          };
        }
        customerStats[customerName].lastMonthSales += parseFloat(transaction.quantity) || 0;
        customerStats[customerName].lastMonthAmount += parseFloat(transaction.total_amount) || 0;
        customerStats[customerName].lastMonthTransactions++;
      });

      // 计算赠送规则和剩余天数
      const customerGiftList = Object.values(customerStats)
        .map(customer => {
          // 判断赠送来源（本月购买优先，然后是上月购买）
          let giftSource = '';
          let giftEndDate = null;
          let dailyGiftQuantity = 0;
          let displayColor = '';

          if (customer.currentMonthSales >= 300) {
            // 本月购买达标，赠送到下月底
            const rule = this.getGiftRule(customer.currentMonthSales);
            dailyGiftQuantity = rule.dailyGiftQuantity;
            displayColor = rule.color;
            giftEndDate = this.calculateGiftEndDate(currentMonth);
            giftSource = '本月购买';
          } else if (customer.lastMonthSales >= 300) {
            // 上月购买达标，赠送到本月底
            const rule = this.getGiftRule(customer.lastMonthSales);
            dailyGiftQuantity = rule.dailyGiftQuantity;
            displayColor = rule.color;
            giftEndDate = currentMonth.endOf('month');
            giftSource = '上月购买';
          }

          const remainingDays = giftEndDate ? this.calculateRemainingDays(giftEndDate) : 0;
          const shouldDisplay = dailyGiftQuantity > 0 && remainingDays > 0;

          return {
            ...customer,
            dailyGiftQuantity,
            displayColor,
            giftSource,
            giftEndDate: giftEndDate?.toISOString(),
            remainingDays,
            shouldDisplay
          };
        })
        .filter(customer => customer.shouldDisplay)
        .sort((a, b) => {
          // 先按剩余天数排序（紧急的在前），再按销售数量排序
          if (a.remainingDays !== b.remainingDays) {
            return a.remainingDays - b.remainingDays;
          }
          return b.currentMonthSales + b.lastMonthSales - (a.currentMonthSales + a.lastMonthSales);
        });

      return customerGiftList;
    } catch (error) {
      console.error('获取客户赠送数据失败:', error);
      throw error;
    }
  }

  // 获取指定月份的销售交易记录
  async getMonthlyTransactions(month) {
    try {
      const startDate = month.startOf('month').toISOString();
      const endDate = month.endOf('month').toISOString();

      const transactions = await transactionService.getTransactions({
        startDate,
        endDate
      });

      // 只返回销售类型的交易
      return transactions.filter(t => t.type === 'sale');
    } catch (error) {
      console.error('获取月度交易记录失败:', error);
      return [];
    }
  }

  // 获取赠送统计汇总
  async getGiftSummary() {
    try {
      const customerGiftList = await this.getCustomerGiftData();
      
      const summary = {
        totalCustomers: customerGiftList.length,
        totalDailyGifts: customerGiftList.reduce((sum, customer) => sum + customer.dailyGiftQuantity, 0),
        totalCurrentMonthSales: customerGiftList.reduce((sum, customer) => sum + customer.currentMonthSales, 0),
        totalLastMonthSales: customerGiftList.reduce((sum, customer) => sum + customer.lastMonthSales, 0),
        totalCurrentMonthAmount: customerGiftList.reduce((sum, customer) => sum + customer.currentMonthAmount, 0),
        totalLastMonthAmount: customerGiftList.reduce((sum, customer) => sum + customer.lastMonthAmount, 0),
        urgentCustomers: customerGiftList.filter(c => c.remainingDays <= 3).length,
        tierStats: {
          tier1: customerGiftList.filter(c => {
            const totalSales = c.currentMonthSales + c.lastMonthSales;
            return totalSales >= 300 && totalSales <= 999;
          }).length,
          tier2: customerGiftList.filter(c => {
            const totalSales = c.currentMonthSales + c.lastMonthSales;
            return totalSales >= 1000 && totalSales <= 4999;
          }).length,
          tier3: customerGiftList.filter(c => {
            const totalSales = c.currentMonthSales + c.lastMonthSales;
            return totalSales >= 5000;
          }).length
        }
      };

      return summary;
    } catch (error) {
      console.error('获取赠送统计汇总失败:', error);
      throw error;
    }
  }

  // 批量生成赠送记录
  async generateGiftRecords(customerGiftList) {
    try {
      const giftRecords = [];
      
      customerGiftList.forEach(customer => {
        if (customer.dailyGiftQuantity > 0) {
          giftRecords.push({
            customer_name: customer.customerName,
            daily_gift_quantity: customer.dailyGiftQuantity,
            current_month_sales: customer.currentMonthSales,
            last_month_sales: customer.lastMonthSales,
            current_month_amount: customer.currentMonthAmount,
            last_month_amount: customer.lastMonthAmount,
            gift_source: customer.giftSource,
            gift_end_date: customer.giftEndDate,
            remaining_days: customer.remainingDays,
            created_at: new Date().toISOString()
          });
        }
      });

      // 尝试保存到数据库
      try {
        const { data, error } = await supabase
          .from('customer_gifts')
          .insert(giftRecords)
          .select();

        if (error) {
          console.warn('数据库保存赠送记录失败，使用本地存储:', error);
          // 保存到本地存储
          const localGifts = JSON.parse(localStorage.getItem('localCustomerGifts') || '[]');
          const localRecords = giftRecords.map((record, index) => ({
            ...record,
            id: -(localGifts.length + index + 1)
          }));
          localGifts.push(...localRecords);
          localStorage.setItem('localCustomerGifts', JSON.stringify(localGifts));
          return localRecords;
        }

        return data;
      } catch (dbError) {
        console.error('保存赠送记录失败:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('生成赠送记录失败:', error);
      throw error;
    }
  }

  // 获取赠送历史记录
  async getGiftHistory() {
    try {
      let gifts = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('customer_gifts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          gifts = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取赠送历史失败:', dbError);
      }

      // 获取本地存储的赠送记录
      const localGifts = JSON.parse(localStorage.getItem('localCustomerGifts') || '[]');
      
      // 合并数据
      const allGifts = [...gifts, ...localGifts];
      
      // 按时间排序
      allGifts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allGifts;
    } catch (error) {
      console.error('获取赠送历史失败:', error);
      const localGifts = JSON.parse(localStorage.getItem('localCustomerGifts') || '[]');
      return localGifts;
    }
  }
}

export const customerGiftService = new CustomerGiftService();
