import { supabase } from '../config/supabase';
import { authService } from './authService';

class CustomerService {
  // 获取所有客户绑定关系
  async getAllCustomerBindings() {
    try {
      let bindings = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('customer_bindings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          bindings = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取客户绑定失败:', dbError);
      }

      // 获取本地存储的绑定关系
      const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
      
      // 合并数据库和本地数据，去除重复项
      const allBindings = [...bindings];
      localBindings.forEach(localBinding => {
        if (!allBindings.find(b => b.customer_name === localBinding.customer_name)) {
          allBindings.push(localBinding);
        }
      });

      return allBindings;
    } catch (error) {
      console.error('获取客户绑定失败:', error);
      const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
      return localBindings;
    }
  }

  // 绑定客户到员工
  async bindCustomerToEmployee(customerName, employeeName) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以绑定客户');
    }

    try {
      const bindingData = {
        customer_name: customerName,
        employee_name: employeeName,
        created_at: new Date().toISOString()
      };

      // 尝试保存到数据库
      const { data, error } = await supabase
        .from('customer_bindings')
        .insert([bindingData])
        .select();

      if (error) {
        console.warn('数据库保存客户绑定失败，使用本地存储:', error);
        // 保存到本地存储
        const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
        
        // 检查是否已存在绑定
        const existingIndex = localBindings.findIndex(b => b.customer_name === customerName);
        const localBinding = {
          ...bindingData,
          id: Date.now()
        };

        if (existingIndex >= 0) {
          localBindings[existingIndex] = localBinding;
        } else {
          localBindings.push(localBinding);
        }
        
        localStorage.setItem('localCustomerBindings', JSON.stringify(localBindings));
        return localBinding;
      }

      return data[0];
    } catch (error) {
      console.error('绑定客户失败:', error);
      throw error;
    }
  }

  // 获取客户绑定的员工
  async getCustomerEmployee(customerName) {
    try {
      const bindings = await this.getAllCustomerBindings();
      const binding = bindings.find(b => b.customer_name === customerName);
      return binding ? binding.employee_name : null;
    } catch (error) {
      console.error('获取客户绑定员工失败:', error);
      return null;
    }
  }

  // 获取员工绑定的客户列表
  async getEmployeeCustomers(employeeName) {
    try {
      const bindings = await this.getAllCustomerBindings();
      return bindings.filter(b => b.employee_name === employeeName);
    } catch (error) {
      console.error('获取员工客户列表失败:', error);
      return [];
    }
  }

  // 解除客户绑定
  async unbindCustomer(customerName) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以解除客户绑定');
    }

    try {
      // 尝试从数据库删除
      const { error } = await supabase
        .from('customer_bindings')
        .delete()
        .eq('customer_name', customerName);

      if (error) {
        console.warn('数据库删除绑定失败:', error);
      }

      // 从本地存储删除
      const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
      const updatedBindings = localBindings.filter(b => b.customer_name !== customerName);
      localStorage.setItem('localCustomerBindings', JSON.stringify(updatedBindings));

      return true;
    } catch (error) {
      console.error('解除客户绑定失败:', error);
      throw error;
    }
  }

  // 从交易记录中提取所有客户名称
  async getAllCustomerNames() {
    try {
      // 从交易记录中获取所有客户名称
      const { data: transactions } = await supabase
        .from('transactions')
        .select('customer_name');

      const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      const allTransactions = [...(transactions || []), ...localTransactions];

      // 提取唯一的客户名称
      const customerNames = [...new Set(allTransactions.map(t => t.customer_name))];
      return customerNames.filter(name => name && name.trim());
    } catch (error) {
      console.error('获取客户名称失败:', error);
      return [];
    }
  }
}

export const customerService = new CustomerService();


