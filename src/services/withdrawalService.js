import { supabase } from '../config/supabase';
import { authService } from './authService';

class WithdrawalService {
  // 商人/管理员提现
  async merchantWithdraw(withdrawalData) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以提现');
    }

    try {
      const withdrawalRecord = {
        merchant_name: withdrawalData.merchantName,
        amount: parseFloat(withdrawalData.amount),
        withdrawal_date: withdrawalData.withdrawalDate || new Date().toISOString(),
        note: withdrawalData.note || '',
        created_at: new Date().toISOString()
      };

      // 尝试保存到数据库
      const { data, error } = await supabase
        .from('merchant_withdrawals')
        .insert([withdrawalRecord])
        .select();

      if (error) {
        console.warn('数据库保存提现记录失败，使用本地存储:', error);
        // 保存到本地存储
        const localWithdrawals = JSON.parse(localStorage.getItem('localMerchantWithdrawals') || '[]');
        const localRecord = {
          ...withdrawalRecord,
          id: -(localWithdrawals.length + 1)
        };
        localWithdrawals.push(localRecord);
        localStorage.setItem('localMerchantWithdrawals', JSON.stringify(localWithdrawals));
        return localRecord;
      }

      return data[0];
    } catch (error) {
      console.error('提现记录失败:', error);
      throw error;
    }
  }

  // 获取商人提现记录
  async getMerchantWithdrawals() {
    try {
      let withdrawals = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('merchant_withdrawals')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          withdrawals = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取提现记录失败:', dbError);
      }

      // 获取本地存储的提现记录
      const localWithdrawals = JSON.parse(localStorage.getItem('localMerchantWithdrawals') || '[]');
      
      // 合并数据
      const allWithdrawals = [...withdrawals, ...localWithdrawals];
      
      // 按时间排序
      allWithdrawals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allWithdrawals;
    } catch (error) {
      console.error('获取提现记录失败:', error);
      const localWithdrawals = JSON.parse(localStorage.getItem('localMerchantWithdrawals') || '[]');
      return localWithdrawals;
    }
  }

  // 计算商人总提现金额
  async getTotalWithdrawals(merchantName = null) {
    try {
      const withdrawals = await this.getMerchantWithdrawals();

      if (merchantName) {
        // 计算特定商人的提现金额
        return withdrawals
          .filter(withdrawal => withdrawal.merchant_name === merchantName)
          .reduce((total, withdrawal) => {
            return total + (parseFloat(withdrawal.amount) || 0);
          }, 0);
      } else {
        // 计算所有商人的提现金额
        return withdrawals.reduce((total, withdrawal) => {
          return total + (parseFloat(withdrawal.amount) || 0);
        }, 0);
      }
    } catch (error) {
      console.error('计算总提现金额失败:', error);
      return 0;
    }
  }

  // 删除提现记录
  async deleteWithdrawal(id) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以删除提现记录');
    }

    try {
      // 尝试从数据库删除
      const { error } = await supabase
        .from('merchant_withdrawals')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('数据库删除提现记录失败，尝试从本地存储删除:', error);
        // 从本地存储删除
        const localWithdrawals = JSON.parse(localStorage.getItem('localMerchantWithdrawals') || '[]');
        const filteredWithdrawals = localWithdrawals.filter(w => w.id !== id);
        localStorage.setItem('localMerchantWithdrawals', JSON.stringify(filteredWithdrawals));
      }

      return true;
    } catch (error) {
      console.error('删除提现记录失败:', error);
      throw error;
    }
  }
}

export const withdrawalService = new WithdrawalService();


