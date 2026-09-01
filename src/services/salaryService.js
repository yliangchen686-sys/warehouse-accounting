import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';
import { customerService } from './customerService';
import { authService } from './authService';
import dayjs from 'dayjs';

class SalaryService {
  // 工资计算常量
  BASE_SALARY = 3000; // 固定底薪
  COMMISSION_RATE = 0.7; // 提成率：每件0.7元

  // 奖金阶梯
  BONUS_TIERS = [
    { min: 0, max: 1000, bonus: 0 },
    { min: 1001, max: 3000, bonus: 500 },
    { min: 3001, max: 5000, bonus: 1000 },
    { min: 5001, max: 7000, bonus: 2000 },
    { min: 7001, max: 20000, bonus: 5000 },
    { min: 20001, max: Infinity, bonus: 10000 }
  ];

  // 计算员工月工资
  async calculateMonthlySalary(employeeName, year, month) {
    try {
      // 获取指定月份的交易数据
      const startDate = dayjs(`${year}-${month}-01`).startOf('month');
      const endDate = dayjs(`${year}-${month}-01`).endOf('month');

      const transactions = await transactionService.getTransactions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // 获取所有客户绑定关系
      const customerBindings = await customerService.getAllCustomerBindings();
      const bindingsMap = {};
      customerBindings.forEach(binding => {
        bindingsMap[binding.customer_name] = binding.employee_name;
      });

      // 筛选该员工绑定客户的交易（按绑定人统计，而不是收款人）
      const employeeTransactions = transactions.filter(t => {
        const boundEmployee = bindingsMap[t.customer_name];
        return boundEmployee === employeeName;
      });

      // 计算销售数量（只计算销售类型，不包括赠送数量）
      let totalSalesQuantity = 0;

      employeeTransactions.forEach(transaction => {
        if (transaction.type === 'sale') {
          // 销售数量 = 实际销售数量（不包括赠送数量）
          totalSalesQuantity += parseFloat(transaction.quantity) || 0;
        }
      });

      // 计算各项工资组成
      const baseSalary = this.BASE_SALARY;
      const commission = this.calculateCommission(totalSalesQuantity);
      const bonus = this.calculateBonus(totalSalesQuantity);
      const totalSalary = baseSalary + commission + bonus;

      return {
        employeeName,
        year,
        month,
        baseSalary,
        totalSalesQuantity,
        commission,
        bonus,
        totalSalary,
        transactionCount: employeeTransactions.length,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('计算员工工资失败:', error);
      throw error;
    }
  }

  // 计算提成
  calculateCommission(salesQuantity) {
    return Math.floor(salesQuantity * this.COMMISSION_RATE);
  }

  // 计算奖金
  calculateBonus(salesQuantity) {
    for (const tier of this.BONUS_TIERS) {
      if (salesQuantity >= tier.min && salesQuantity <= tier.max) {
        return tier.bonus;
      }
    }
    return 0;
  }

  // 获取所有员工的月工资
  // beforeDate: 只计算在此日期之前（包括该日期）创建的员工工资
  async getAllEmployeesMonthlySalary(year, month, beforeDate = null) {
    try {
      // 计算该月的结束时间（用于过滤新增员工）
      const monthEndDate = beforeDate || dayjs(`${year}-${month}-01`).endOf('month').toISOString();

      // 获取所有在职员工，且创建时间在该月结束之前
      const { data: employees } = await supabase
        .from('employees')
        .select('name, created_at')
        .eq('status', 'active')
        .eq('role', 'employee') // 只计算员工工资，不包括商人
        .lte('created_at', monthEndDate); // 只获取在该月结束之前创建的员工

      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]')
        .filter(emp => {
          if (emp.status !== 'active' || emp.role !== 'employee') {
            return false;
          }
          // 检查本地员工的创建时间
          if (emp.created_at) {
            const empCreatedAt = dayjs(emp.created_at);
            const monthEnd = dayjs(monthEndDate);
            return empCreatedAt.isBefore(monthEnd) || empCreatedAt.isSame(monthEnd, 'day');
          }
          // 如果没有创建时间，默认认为是在该月之前创建的（兼容旧数据）
          return true;
        });

      // 合并数据库和本地员工，去重
      const allEmployees = [...(employees || []), ...localEmployees];
      const employeeMap = new Map();
      allEmployees.forEach(emp => {
        if (!employeeMap.has(emp.name)) {
          employeeMap.set(emp.name, emp);
        }
      });
      const uniqueEmployees = Array.from(employeeMap.values());

      // 计算每个员工的工资
      const salaryPromises = uniqueEmployees.map(employee => 
        this.calculateMonthlySalary(employee.name, year, month)
      );

      const salaries = await Promise.all(salaryPromises);

      // 合并当月手动调整
      const adjustments = await this.getSalaryAdjustments(year, month);
      const adjustmentMap = {};
      adjustments.forEach((item) => {
        const name = item.employee_name ?? item.employeeName;
        adjustmentMap[name] = (adjustmentMap[name] || 0) + (parseFloat(item.adjustment_amount ?? item.amount) || 0);
      });

      const salariesWithAdjustments = salaries.map((salary) => {
        const adjustmentAmount = adjustmentMap[salary.employeeName] || 0;
        return {
          ...salary,
          calculatedTotalSalary: salary.totalSalary,
          adjustmentAmount,
          totalSalary: salary.totalSalary + adjustmentAmount
        };
      });
      
      // 按总工资排序
      salariesWithAdjustments.sort((a, b) => b.totalSalary - a.totalSalary);

      return salariesWithAdjustments;
    } catch (error) {
      console.error('获取所有员工工资失败:', error);
      throw error;
    }
  }

  // 保存工资记录
  async saveSalaryRecord(salaryData) {
    try {
      const salaryRecord = {
        employee_name: salaryData.employeeName,
        year: salaryData.year,
        month: salaryData.month,
        base_salary: salaryData.baseSalary,
        sales_quantity: salaryData.totalSalesQuantity,
        commission: salaryData.commission,
        bonus: salaryData.bonus,
        total_salary: salaryData.totalSalary,
        transaction_count: salaryData.transactionCount,
        created_at: new Date().toISOString()
      };

      // 尝试保存到数据库
      const { data, error } = await supabase
        .from('salary_records')
        .insert([salaryRecord])
        .select();

      if (error) {
        console.warn('数据库保存工资记录失败，使用本地存储:', error);
        // 保存到本地存储
        const localRecords = JSON.parse(localStorage.getItem('localSalaryRecords') || '[]');
        const localRecord = {
          ...salaryRecord,
          id: Date.now()
        };
        localRecords.push(localRecord);
        localStorage.setItem('localSalaryRecords', JSON.stringify(localRecords));
        return localRecord;
      }

      return data[0];
    } catch (error) {
      console.error('保存工资记录失败:', error);
      throw error;
    }
  }

  // 获取工资调整记录
  async getSalaryAdjustments(year = null, month = null) {
    try {
      let adjustments = [];

      try {
        let query = supabase
          .from('salary_adjustments')
          .select('*')
          .order('created_at', { ascending: false });

        if (year != null) {
          query = query.eq('year', year);
        }
        if (month != null) {
          query = query.eq('month', month);
        }

        const { data, error } = await query;
        if (!error && data) {
          adjustments = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取工资调整记录失败:', dbError);
      }

      let localAdjustments = JSON.parse(localStorage.getItem('localSalaryAdjustments') || '[]');
      if (year != null) {
        localAdjustments = localAdjustments.filter((item) => item.year === year);
      }
      if (month != null) {
        localAdjustments = localAdjustments.filter((item) => item.month === month);
      }

      const allAdjustments = [...adjustments, ...localAdjustments];
      allAdjustments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return allAdjustments;
    } catch (error) {
      console.error('获取工资调整记录失败:', error);
      return JSON.parse(localStorage.getItem('localSalaryAdjustments') || '[]');
    }
  }

  // 手动调整工资（仅管理员）
  async addSalaryAdjustment(adjustmentData) {
    if (!authService.isAdmin()) {
      throw new Error('只有管理员可以调整工资');
    }

    const amount = parseFloat(adjustmentData.amount);
    if (Number.isNaN(amount) || amount === 0) {
      throw new Error('调整金额不能为0');
    }

    const record = {
      employee_name: adjustmentData.employeeName,
      year: adjustmentData.year,
      month: adjustmentData.month,
      adjustment_amount: amount,
      note: adjustmentData.note || '',
      operator_name: adjustmentData.operatorName || '',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('salary_adjustments')
        .insert([record])
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (dbError) {
      console.warn('数据库保存工资调整失败，使用本地存储:', dbError);
      const localAdjustments = JSON.parse(localStorage.getItem('localSalaryAdjustments') || '[]');
      const localRecord = { ...record, id: Date.now() };
      localAdjustments.push(localRecord);
      localStorage.setItem('localSalaryAdjustments', JSON.stringify(localAdjustments));
      return localRecord;
    }
  }

  // 删除工资调整记录（仅管理员）
  async deleteSalaryAdjustment(id) {
    if (!authService.isAdmin()) {
      throw new Error('只有管理员可以删除工资调整记录');
    }

    try {
      const { error } = await supabase
        .from('salary_adjustments')
        .delete()
        .eq('id', id);

      if (error) {
        const localAdjustments = JSON.parse(localStorage.getItem('localSalaryAdjustments') || '[]');
        const filtered = localAdjustments.filter((item) => item.id !== id);
        localStorage.setItem('localSalaryAdjustments', JSON.stringify(filtered));
      }

      return true;
    } catch (error) {
      console.error('删除工资调整记录失败:', error);
      throw error;
    }
  }

  // 获取工资记录历史
  async getSalaryRecords() {
    try {
      let records = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('salary_records')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (!error && data) {
          records = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取工资记录失败:', dbError);
      }

      // 获取本地存储的记录
      const localRecords = JSON.parse(localStorage.getItem('localSalaryRecords') || '[]');
      
      // 合并数据
      const allRecords = [...records, ...localRecords];
      
      // 按年月排序
      allRecords.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      return allRecords;
    } catch (error) {
      console.error('获取工资记录失败:', error);
      const localRecords = JSON.parse(localStorage.getItem('localSalaryRecords') || '[]');
      return localRecords;
    }
  }

  // 获取奖金阶梯信息（用于界面显示）
  getBonusTiers() {
    return this.BONUS_TIERS.map(tier => ({
      range: tier.max === Infinity ? `> ${tier.min.toLocaleString()}` : `${tier.min.toLocaleString()} - ${tier.max.toLocaleString()}`,
      bonus: tier.bonus
    }));
  }
}

export const salaryService = new SalaryService();


