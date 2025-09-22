import { supabase } from '../config/supabase';
import { authService } from './authService';

class SyncService {
  // 同步本地员工数据到数据库
  async syncLocalEmployeesToDatabase() {
    if (!authService.isMerchant()) {
      throw new Error('只有商人可以同步数据');
    }

    try {
      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
      
      if (localEmployees.length === 0) {
        return { success: true, message: '没有本地员工数据需要同步' };
      }

      const syncResults = [];
      
      for (const employee of localEmployees) {
        try {
          // 检查数据库中是否已存在该用户名
          const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('username', employee.username)
            .single();

          if (existing) {
            syncResults.push({ 
              employee: employee.name, 
              status: 'skipped', 
              reason: '用户名已存在' 
            });
            continue;
          }

          // 插入到数据库
          const { data, error } = await supabase
            .from('employees')
            .insert([{
              name: employee.name,
              username: employee.username,
              password: employee.password || 'employee123',
              role: employee.role,
              status: employee.status
            }])
            .select();

          if (error) {
            syncResults.push({ 
              employee: employee.name, 
              status: 'failed', 
              reason: error.message 
            });
          } else {
            syncResults.push({ 
              employee: employee.name, 
              status: 'success', 
              newId: data[0].id 
            });
          }
        } catch (err) {
          syncResults.push({ 
            employee: employee.name, 
            status: 'error', 
            reason: err.message 
          });
        }
      }

      return { success: true, results: syncResults };
    } catch (error) {
      console.error('同步员工数据失败:', error);
      throw error;
    }
  }

  // 同步本地交易数据到数据库
  async syncLocalTransactionsToDatabase() {
    if (!authService.isMerchant()) {
      throw new Error('只有商人可以同步数据');
    }

    try {
      const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      
      if (localTransactions.length === 0) {
        return { success: true, message: '没有本地交易数据需要同步' };
      }

      const syncResults = [];
      
      for (const transaction of localTransactions) {
        try {
          const { data, error } = await supabase
            .from('transactions')
            .insert([{
              type: transaction.type,
              customer_name: transaction.customer_name,
              collector: transaction.collector,
              quantity: transaction.quantity,
              gift_quantity: transaction.gift_quantity,
              unit_price: transaction.unit_price,
              total_amount: transaction.total_amount
            }])
            .select();

          if (error) {
            syncResults.push({ 
              transaction: `${transaction.customer_name} - ${transaction.type}`, 
              status: 'failed', 
              reason: error.message 
            });
          } else {
            syncResults.push({ 
              transaction: `${transaction.customer_name} - ${transaction.type}`, 
              status: 'success', 
              newId: data[0].id 
            });
          }
        } catch (err) {
          syncResults.push({ 
            transaction: `${transaction.customer_name} - ${transaction.type}`, 
            status: 'error', 
            reason: err.message 
          });
        }
      }

      return { success: true, results: syncResults };
    } catch (error) {
      console.error('同步交易数据失败:', error);
      throw error;
    }
  }

  // 获取同步状态
  async getSyncStatus() {
    const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
    const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
    const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
    const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');

    return {
      localEmployeesCount: localEmployees.length,
      localTransactionsCount: localTransactions.length,
      localBindingsCount: localBindings.length,
      localTransfersCount: localTransfers.length,
      needsSync: localEmployees.length > 0 || localTransactions.length > 0 || 
                 localBindings.length > 0 || localTransfers.length > 0
    };
  }
}

export const syncService = new SyncService();
