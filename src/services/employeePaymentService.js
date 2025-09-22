import { supabase } from '../config/supabase';
import { authService } from './authService';
import { withdrawalService } from './withdrawalService';

class EmployeePaymentService {
  // 获取员工收款统计
  async getEmployeePaymentStats(employeeName = null, filters = {}) {
    try {
      // 获取所有交易记录
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*');

      // 如果数据库查询失败，尝试从本地存储获取
      let allTransactions = [];
      if (error || !transactions) {
        console.warn('从数据库获取交易记录失败，使用本地存储:', error);
        allTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      } else {
        // 合并数据库和本地存储的数据
        const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
        allTransactions = [...transactions, ...localTransactions];
      }

      // 应用日期筛选
      if (filters.startDate || filters.endDate) {
        allTransactions = allTransactions.filter(transaction => {
          const transactionDate = new Date(transaction.created_at);
          if (filters.startDate && transactionDate < new Date(filters.startDate)) return false;
          if (filters.endDate && transactionDate > new Date(filters.endDate)) return false;
          return true;
        });
      }

      // 如果指定了员工名称，只统计该员工的收款
      if (employeeName) {
        allTransactions = allTransactions.filter(t => t.collector === employeeName);
      }

      // 按员工分组统计收款
      const employeeStats = {};
      
      allTransactions.forEach(transaction => {
        const collector = transaction.collector;
        const amount = parseFloat(transaction.total_amount) || 0;
        const type = transaction.type;
        
        if (!employeeStats[collector]) {
          employeeStats[collector] = {
            employeeName: collector,
            totalAmount: 0,
            transactionCount: 0,
            transactions: []
          };
        }
        
        // 修改收款计算逻辑：销售收款 - 回收金额
        if (type === 'sale') {
          // 销售：增加收款金额
          employeeStats[collector].totalAmount += amount;
        } else if (type === 'return') {
          // 回收：减少收款金额
          employeeStats[collector].totalAmount -= amount;
        }
        // 进货和赠送不计入员工收款
        
        employeeStats[collector].transactionCount++;
        employeeStats[collector].transactions.push(transaction);
      });

      // 获取员工转账记录
      const transfers = await this.getEmployeeTransfers();
      
      // 获取商人的提现金额
      const totalWithdrawals = await withdrawalService.getTotalWithdrawals();

      // 计算每个员工的实际余额（收款总额 - 已转账金额）
      Object.keys(employeeStats).forEach(employeeName => {
        const employeeTransfers = transfers.filter(t => t.employee_name === employeeName);
        const totalTransferred = employeeTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        employeeStats[employeeName].totalTransferred = totalTransferred;
        
        // 特殊处理商人的收款计算
        if (employeeName === '商人' || employeeName === '系统管理员') {
          // 商人收款 = 销售收款 + 员工转账收款 - 回收收款
          const allEmployeeTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          employeeStats[employeeName].totalAmount += allEmployeeTransfers; // 加上所有员工转账
          
          // 计算商人的提现金额
          employeeStats[employeeName].totalWithdrawn = totalWithdrawals;
          employeeStats[employeeName].currentBalance = employeeStats[employeeName].totalAmount - totalWithdrawals;
          employeeStats[employeeName].totalTransferred = 0; // 商人不需要转账
        } else {
          // 普通员工的余额计算
          employeeStats[employeeName].currentBalance = employeeStats[employeeName].totalAmount - totalTransferred;
          employeeStats[employeeName].totalWithdrawn = 0; // 员工不能提现
        }
        
        employeeStats[employeeName].transfers = employeeTransfers;
      });

      return employeeName ? employeeStats[employeeName] : employeeStats;
    } catch (error) {
      console.error('获取员工收款统计失败:', error);
      throw error;
    }
  }

  // 员工向商人转账
  async transferToMerchant(transferData) {
    if (!authService.isMerchant()) {
      throw new Error('只有商人可以记录转账');
    }

    try {
      const transferRecord = {
        employee_name: transferData.employeeName,
        amount: parseFloat(transferData.amount),
        transfer_date: transferData.transferDate || new Date().toISOString(),
        note: transferData.note || '',
        created_at: new Date().toISOString()
      };

      // 尝试保存到数据库
      const { data, error } = await supabase
        .from('employee_transfers')
        .insert([transferRecord])
        .select();

      if (error) {
        console.warn('数据库保存转账记录失败，使用本地存储:', error);
        // 保存到本地存储
        const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');
        const localRecord = {
          ...transferRecord,
          id: Date.now()
        };
        localTransfers.push(localRecord);
        localStorage.setItem('localEmployeeTransfers', JSON.stringify(localTransfers));
        return localRecord;
      }

      return data[0];
    } catch (error) {
      console.error('转账记录失败:', error);
      throw error;
    }
  }

  // 获取员工转账记录
  async getEmployeeTransfers() {
    try {
      let transfers = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('employee_transfers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          transfers = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取转账记录失败:', dbError);
      }

      // 获取本地存储的转账记录
      const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');
      
      // 合并数据
      const allTransfers = [...transfers, ...localTransfers];
      
      // 按时间排序
      allTransfers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allTransfers;
    } catch (error) {
      console.error('获取转账记录失败:', error);
      const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');
      return localTransfers;
    }
  }

  // 获取所有员工的收款汇总
  async getAllEmployeesSummary() {
    try {
      const stats = await this.getEmployeePaymentStats();
      
      // 转换为数组格式，方便表格显示
      const summary = Object.values(stats).map(employee => ({
        employeeName: employee.employeeName,
        totalAmount: employee.totalAmount,
        totalTransferred: employee.totalTransferred || 0,
        totalWithdrawn: employee.totalWithdrawn || 0, // 添加提现金额
        currentBalance: employee.currentBalance || employee.totalAmount,
        transactionCount: employee.transactionCount
      }));

      // 按当前余额排序
      summary.sort((a, b) => b.currentBalance - a.currentBalance);

      return summary;
    } catch (error) {
      console.error('获取员工收款汇总失败:', error);
      throw error;
    }
  }
}

export const employeePaymentService = new EmployeePaymentService();
