import { supabase } from '../config/supabase';
import { authService } from './authService';
import { withdrawalService } from './withdrawalService';

/**
 * 规范化员工名：去除首尾空格、全角转半角，用于转账/提现记录匹配
 * 解决 "小梦" 与 "小梦 " 或全角空格等导致匹配不到的问题
 */
function normalizeEmployeeName(name) {
  if (name == null || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')           // 连续空格压成单个
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)); // 全角转半角
}

/**
 * 从转账/提现记录中取员工名字段（兼容 snake_case 与 camelCase）
 */
function getTransferEmployeeName(record) {
  return record.employee_name ?? record.employeeName ?? '';
}
function getWithdrawalMerchantName(record) {
  return record.merchant_name ?? record.merchantName ?? '';
}

class EmployeePaymentService {
  // 获取员工收款统计
  async getEmployeePaymentStats(employeeName = null, filters = {}) {
    try {
      // 获取所有交易记录（使用分页避免 1000 条限制）
      let allTransactions = [];
      let hasMore = true;
      let pageSize = 1000;
      let offset = 0;

      while (hasMore) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.warn('从数据库获取交易记录失败，使用本地存储:', error);
          allTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
          hasMore = false;
        } else if (data && data.length > 0) {
          allTransactions = allTransactions.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // 合并数据库和本地存储的数据
      const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      allTransactions = [...allTransactions, ...localTransactions];

      // 应用日期筛选
      if (filters.startDate || filters.endDate) {
        allTransactions = allTransactions.filter(transaction => {
          const transactionDate = new Date(transaction.created_at);
          if (filters.startDate && transactionDate < new Date(filters.startDate)) return false;
          if (filters.endDate && transactionDate > new Date(filters.endDate)) return false;
          return true;
        });
      }

      // 如果指定了员工名称，只统计该员工的收款（按规范化名字匹配）
      if (employeeName) {
        const norm = normalizeEmployeeName(employeeName);
        allTransactions = allTransactions.filter(t => normalizeEmployeeName(t.collector) === norm);
      }

      // 按员工分组统计收款（按收款人统计）
      // 使用规范化名字作为 key，避免 "小梦"/"小梦 " 等拆成两个人导致转账匹配不到
      const employeeStats = {};

      allTransactions.forEach(transaction => {
        const collector = transaction.collector;
        const key = normalizeEmployeeName(collector) || collector;
        const amount = parseFloat(transaction.total_amount) || 0;
        const type = transaction.type;

        if (!employeeStats[key]) {
          employeeStats[key] = {
            employeeName: key,
            totalAmount: 0,
            transactionCount: 0,
            transactions: []
          };
        }

        // 修改收款计算逻辑：销售收款 - 回收金额
        if (type === 'sale') {
          employeeStats[key].totalAmount += amount;
        } else if (type === 'return') {
          employeeStats[key].totalAmount -= amount;
        }

        employeeStats[key].transactionCount++;
        employeeStats[key].transactions.push(transaction);
      });

      // 获取员工转账记录
      const transfers = await this.getEmployeeTransfers();
      
      // 获取所有提现记录
      const allWithdrawals = await withdrawalService.getMerchantWithdrawals();

      // 计算每个员工的实际余额（收款总额 - 已转账金额）
      // 使用规范化名字匹配，避免 "小梦" 与 "小梦 " 等导致匹配不到
      Object.keys(employeeStats).forEach(employeeName => {
        const normName = normalizeEmployeeName(employeeName);
        const employeeTransfers = transfers.filter(t => normalizeEmployeeName(getTransferEmployeeName(t)) === normName);
        const totalTransferred = employeeTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        // 计算该员工的提现金额（同样用规范化匹配）
        const employeeWithdrawals = allWithdrawals.filter(w => normalizeEmployeeName(getWithdrawalMerchantName(w)) === normName);
        const totalWithdrawn = employeeWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
        
        // 获取员工角色信息来判断是否为管理员或商人
        const isAdmin = employeeName === '管理员' || employeeName === '系统管理员';
        const isMerchant = employeeName === '商人' || (employeeName && employeeName !== '管理员' && employeeName !== '系统管理员' && totalWithdrawn > 0);
        
        // 特殊处理管理员和商人的收款计算
        if (isAdmin || isMerchant) {
          if (isAdmin) {
            // 管理员：当前余额 = 销售收款 + 员工转账收款 + 商人转账收款 - 回收金额 - 提现金额
            const allEmployeeTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const salesAmount = employeeStats[employeeName].totalAmount; // 销售收款 - 回收金额
            const totalIncome = salesAmount + allEmployeeTransfers; // 总收入
            
            employeeStats[employeeName].totalAmount = totalIncome;
            employeeStats[employeeName].totalWithdrawn = totalWithdrawn;
            employeeStats[employeeName].currentBalance = totalIncome - totalWithdrawn;
            employeeStats[employeeName].totalTransferred = 0; // 管理员不需要转账
            
            console.log(`管理员 ${employeeName} 余额计算:`, {
              salesAmount,
              allEmployeeTransfers,
              totalIncome,
              totalWithdrawn,
              currentBalance: totalIncome - totalWithdrawn
            });
          } else if (isMerchant) {
            // 商人：当前余额 = 销售收款 - 回收金额 - 转账金额 - 提现金额
            const salesAmount = employeeStats[employeeName].totalAmount; // 销售收款 - 回收金额
            const currentBalance = salesAmount - totalTransferred - totalWithdrawn;
            
            console.log(`商人 ${employeeName} 余额计算:`, {
              salesAmount,
              totalTransferred,
              totalWithdrawn,
              currentBalance
            });
            
            // 设置商人的转账金额、提现金额和余额
            employeeStats[employeeName].totalTransferred = totalTransferred;
            employeeStats[employeeName].totalWithdrawn = totalWithdrawn;
            employeeStats[employeeName].currentBalance = currentBalance;
          }
        } else {
          // 普通员工的余额计算 - 转账后余额应该减少
          const originalAmount = employeeStats[employeeName].totalAmount;
          const currentBalance = originalAmount - totalTransferred;
          
          console.log(`员工 ${employeeName} 余额计算:`, {
            originalAmount,
            totalTransferred,
            currentBalance
          });
          
          employeeStats[employeeName].totalTransferred = totalTransferred;
          employeeStats[employeeName].currentBalance = currentBalance;
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

  // 员工向管理员转账
  async transferToMerchant(transferData) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以记录转账');
    }

    try {
      const transferRecord = {
        employee_name: normalizeEmployeeName(transferData.employeeName ?? ''),
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

      // 获取员工角色信息
      const { data: employees } = await supabase
        .from('employees')
        .select('name, role');

      const employeeRoles = {};
      if (employees) {
        employees.forEach(emp => {
          employeeRoles[emp.name] = emp.role;
        });
      }

      // 转换为数组格式，方便表格显示
      const summary = Object.values(stats).map(employee => ({
        employeeName: employee.employeeName,
        totalAmount: employee.totalAmount,
        totalTransferred: employee.totalTransferred || 0,
        totalWithdrawn: employee.totalWithdrawn || 0, // 添加提现金额
        currentBalance: employee.currentBalance || employee.totalAmount,
        transactionCount: employee.transactionCount,
        role: employeeRoles[employee.employeeName] || 'employee' // 添加角色信息
      }));

      // 按当前余额排序
      summary.sort((a, b) => b.currentBalance - a.currentBalance);

      return summary;
    } catch (error) {
      console.error('获取员工收款汇总失败:', error);
      throw error;
    }
  }

  // 删除转账记录
  async deleteTransfer(id) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以删除转账记录');
    }

    try {
      // 尝试从数据库删除
      const { error } = await supabase
        .from('employee_transfers')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('数据库删除转账记录失败，尝试从本地存储删除:', error);
        // 从本地存储删除
        const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');
        const filteredTransfers = localTransfers.filter(t => t.id !== id);
        localStorage.setItem('localEmployeeTransfers', JSON.stringify(filteredTransfers));
      }

      return true;
    } catch (error) {
      console.error('删除转账记录失败:', error);
      throw error;
    }
  }
}

export const employeePaymentService = new EmployeePaymentService();
