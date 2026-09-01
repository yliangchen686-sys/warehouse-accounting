import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';
import { customerService } from './customerService';
import { authService } from './authService';
import dayjs from 'dayjs';

class SalaryService {
  // 工资计算常量
  BASE_SALARY = 3000; // 默认底薪
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

  resolveBaseSalary(value) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? this.BASE_SALARY : parsed;
  }

  // 获取所有员工的底薪映射
  async getEmployeeBaseSalaryMap() {
    const map = new Map();

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('name, base_salary')
        .eq('role', 'employee');

      if (!error && data) {
        data.forEach((employee) => {
          map.set(employee.name, this.resolveBaseSalary(employee.base_salary));
        });
      }
    } catch (dbError) {
      console.warn('从数据库获取员工底薪失败:', dbError);
    }

    const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
    localEmployees.forEach((employee) => {
      if (employee.role !== 'employee') {
        return;
      }
      map.set(
        employee.name,
        this.resolveBaseSalary(employee.base_salary ?? map.get(employee.name))
      );
    });

    return map;
  }

  async getEmployeeBaseSalary(employeeName) {
    const map = await this.getEmployeeBaseSalaryMap();
    return map.get(employeeName) ?? this.BASE_SALARY;
  }

  // 计算员工月工资
  async calculateMonthlySalary(employeeName, year, month, baseSalary = null) {
    try {
      const startDate = dayjs(`${year}-${month}-01`).startOf('month');
      const endDate = dayjs(`${year}-${month}-01`).endOf('month');

      const transactions = await transactionService.getTransactions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const customerBindings = await customerService.getAllCustomerBindings();
      const bindingsMap = {};
      customerBindings.forEach(binding => {
        bindingsMap[binding.customer_name] = binding.employee_name;
      });

      const employeeTransactions = transactions.filter(t => {
        const boundEmployee = bindingsMap[t.customer_name];
        return boundEmployee === employeeName;
      });

      let totalSalesQuantity = 0;

      employeeTransactions.forEach(transaction => {
        if (transaction.type === 'sale') {
          totalSalesQuantity += parseFloat(transaction.quantity) || 0;
        }
      });

      const resolvedBaseSalary = baseSalary != null
        ? this.resolveBaseSalary(baseSalary)
        : await this.getEmployeeBaseSalary(employeeName);
      const commission = this.calculateCommission(totalSalesQuantity);
      const bonus = this.calculateBonus(totalSalesQuantity);
      const totalSalary = resolvedBaseSalary + commission + bonus;

      return {
        employeeName,
        year,
        month,
        baseSalary: resolvedBaseSalary,
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

  calculateCommission(salesQuantity) {
    return Math.floor(salesQuantity * this.COMMISSION_RATE);
  }

  calculateBonus(salesQuantity) {
    for (const tier of this.BONUS_TIERS) {
      if (salesQuantity >= tier.min && salesQuantity <= tier.max) {
        return tier.bonus;
      }
    }
    return 0;
  }

  async getAllEmployeesMonthlySalary(year, month, beforeDate = null) {
    try {
      const monthEndDate = beforeDate || dayjs(`${year}-${month}-01`).endOf('month').toISOString();

      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, created_at, base_salary')
        .eq('status', 'active')
        .eq('role', 'employee')
        .lte('created_at', monthEndDate);

      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]')
        .filter(emp => {
          if (emp.status !== 'active' || emp.role !== 'employee') {
            return false;
          }
          if (emp.created_at) {
            const empCreatedAt = dayjs(emp.created_at);
            const monthEnd = dayjs(monthEndDate);
            return empCreatedAt.isBefore(monthEnd) || empCreatedAt.isSame(monthEnd, 'day');
          }
          return true;
        });

      const allEmployees = [...(employees || []), ...localEmployees];
      const employeeMap = new Map();
      allEmployees.forEach(emp => {
        if (!employeeMap.has(emp.name)) {
          employeeMap.set(emp.name, emp);
        }
      });
      const uniqueEmployees = Array.from(employeeMap.values());
      const baseSalaryMap = await this.getEmployeeBaseSalaryMap();

      const salaryPromises = uniqueEmployees.map(employee =>
        this.calculateMonthlySalary(
          employee.name,
          year,
          month,
          baseSalaryMap.get(employee.name) ?? this.BASE_SALARY
        ).then((salary) => ({
          ...salary,
          employeeId: employee.id
        }))
      );

      const salaries = await Promise.all(salaryPromises);
      salaries.sort((a, b) => b.totalSalary - a.totalSalary);

      return salaries;
    } catch (error) {
      console.error('获取所有员工工资失败:', error);
      throw error;
    }
  }

  async updateEmployeeBaseSalary(employeeName, baseSalary) {
    if (!authService.isAdmin()) {
      throw new Error('只有管理员可以调整底薪');
    }

    const amount = this.resolveBaseSalary(baseSalary);
    if (amount < 0) {
      throw new Error('底薪不能为负数');
    }

    let employeeId = null;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('name', employeeName)
        .eq('role', 'employee')
        .maybeSingle();

      if (!error && data) {
        employeeId = data.id;
      }
    } catch (dbError) {
      console.warn('查询员工失败:', dbError);
    }

    if (employeeId == null) {
      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
      const localEmployee = localEmployees.find(
        (employee) => employee.name === employeeName && employee.role === 'employee'
      );
      if (localEmployee) {
        employeeId = localEmployee.id;
      }
    }

    if (employeeId == null) {
      throw new Error('找不到该员工');
    }

    await authService.updateEmployee(employeeId, { base_salary: amount });

    return {
      employeeName,
      baseSalary: amount
    };
  }

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

      const { data, error } = await supabase
        .from('salary_records')
        .insert([salaryRecord])
        .select();

      if (error) {
        console.warn('数据库保存工资记录失败，使用本地存储:', error);
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

  async getSalaryRecords() {
    try {
      let records = [];

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

      const localRecords = JSON.parse(localStorage.getItem('localSalaryRecords') || '[]');
      const allRecords = [...records, ...localRecords];

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

  getBonusTiers() {
    return this.BONUS_TIERS.map(tier => ({
      range: tier.max === Infinity ? `> ${tier.min.toLocaleString()}` : `${tier.min.toLocaleString()} - ${tier.max.toLocaleString()}`,
      bonus: tier.bonus
    }));
  }
}

export const salaryService = new SalaryService();
