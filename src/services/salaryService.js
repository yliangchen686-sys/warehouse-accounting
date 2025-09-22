import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';
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

      // 筛选该员工收款的交易
      const employeeTransactions = transactions.filter(t => t.collector === employeeName);

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
  async getAllEmployeesMonthlySalary(year, month) {
    try {
      // 获取所有在职员工
      const { data: employees } = await supabase
        .from('employees')
        .select('name')
        .eq('status', 'active')
        .eq('role', 'employee'); // 只计算员工工资，不包括商人

      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]')
        .filter(emp => emp.status === 'active' && emp.role === 'employee');

      const allEmployees = [...(employees || []), ...localEmployees];
      const uniqueEmployees = [...new Set(allEmployees.map(emp => emp.name))];

      // 计算每个员工的工资
      const salaryPromises = uniqueEmployees.map(employeeName => 
        this.calculateMonthlySalary(employeeName, year, month)
      );

      const salaries = await Promise.all(salaryPromises);
      
      // 按总工资排序
      salaries.sort((a, b) => b.totalSalary - a.totalSalary);

      return salaries;
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


