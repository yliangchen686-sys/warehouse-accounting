import { supabase } from '../config/supabase';
import { transactionService } from './transactionService';

class TransactionRequestService {
  // 创建交易申请
  async createRequest(requestData) {
    try {
      const requestRecord = {
        type: requestData.type,
        customer_name: requestData.customerName,
        collector: requestData.collector,
        quantity: parseFloat(requestData.quantity) || 0,
        gift_quantity: parseFloat(requestData.giftQuantity) || 0,
        unit_price: parseFloat(requestData.unitPrice) || 0,
        total_amount: parseFloat(requestData.totalAmount) || 0,
        applicant_name: requestData.applicantName,
        status: 'pending',
        notes: requestData.notes || null
      };

      const { data, error } = await supabase
        .from('transaction_requests')
        .insert([requestRecord])
        .select();

      if (error) {
        console.warn('数据库插入失败，使用本地存储:', error);
        
        // 如果数据库插入失败，保存到本地存储
        const existingRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
        const nextId = -(existingRequests.length + 1);

        const localRequest = {
          ...requestRecord,
          id: nextId,
          created_at: new Date().toISOString()
        };

        existingRequests.push(localRequest);
        localStorage.setItem('localTransactionRequests', JSON.stringify(existingRequests));

        return localRequest;
      }

      return data[0];
    } catch (error) {
      console.error('创建交易申请失败:', error);
      
      // 完全失败时，仍然尝试保存到本地
      const existingRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      const nextId = -(existingRequests.length + 1);

      const localRequest = {
        type: requestData.type,
        customer_name: requestData.customerName,
        collector: requestData.collector,
        quantity: parseFloat(requestData.quantity) || 0,
        gift_quantity: parseFloat(requestData.giftQuantity) || 0,
        unit_price: parseFloat(requestData.unitPrice) || 0,
        total_amount: parseFloat(requestData.totalAmount) || 0,
        applicant_name: requestData.applicantName,
        status: 'pending',
        notes: requestData.notes || null,
        id: nextId,
        created_at: new Date().toISOString()
      };

      existingRequests.push(localRequest);
      localStorage.setItem('localTransactionRequests', JSON.stringify(existingRequests));

      return localRequest;
    }
  }

  // 获取待审核申请（商人端）
  async getPendingRequests() {
    try {
      let requests = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('transaction_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (!error && data) {
          requests = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取待审核申请失败:', dbError);
      }

      // 获取本地存储的申请
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      const localPending = localRequests.filter(r => r.status === 'pending');

      // 合并数据，去除重复项
      const allRequests = [...requests];
      localPending.forEach(localRequest => {
        if (!allRequests.find(r => r.id === localRequest.id)) {
          allRequests.push(localRequest);
        }
      });

      return allRequests;
    } catch (error) {
      console.error('获取待审核申请失败:', error);
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      return localRequests.filter(r => r.status === 'pending');
    }
  }

  // 获取我的申请（员工端）
  async getMyRequests(employeeName) {
    try {
      let requests = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('transaction_requests')
          .select('*')
          .eq('applicant_name', employeeName)
          .order('created_at', { ascending: false });

        if (!error && data) {
          requests = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取我的申请失败:', dbError);
      }

      // 获取本地存储的申请
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      const localMyRequests = localRequests.filter(r => r.applicant_name === employeeName);

      // 合并数据，去除重复项
      const allRequests = [...requests];
      localMyRequests.forEach(localRequest => {
        if (!allRequests.find(r => r.id === localRequest.id)) {
          allRequests.push(localRequest);
        }
      });

      return allRequests;
    } catch (error) {
      console.error('获取我的申请失败:', error);
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      return localRequests.filter(r => r.applicant_name === employeeName);
    }
  }

  // 获取所有申请（商人端审核历史）
  async getAllRequests() {
    try {
      let requests = [];

      // 尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('transaction_requests')
          .select('*')
          .in('status', ['approved', 'rejected'])
          .order('reviewed_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data) {
          requests = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取所有申请失败:', dbError);
      }

      // 获取本地存储的申请
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      const localReviewed = localRequests.filter(r => r.status === 'approved' || r.status === 'rejected');

      // 合并数据，去除重复项
      const allRequests = [...requests];
      localReviewed.forEach(localRequest => {
        if (!allRequests.find(r => r.id === localRequest.id)) {
          allRequests.push(localRequest);
        }
      });

      return allRequests;
    } catch (error) {
      console.error('获取所有申请失败:', error);
      const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
      return localRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
    }
  }

  // 审核通过并添加到交易记录
  async approveRequest(requestId, merchantName) {
    try {
      // 1. 获取申请记录
      let request = null;
      
      // 先尝试从数据库获取
      try {
        const { data, error } = await supabase
          .from('transaction_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (!error && data) {
          request = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取申请失败:', dbError);
      }

      // 如果数据库没有，从本地存储获取
      if (!request) {
        const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
        request = localRequests.find(r => r.id === requestId);
      }

      if (!request) {
        throw new Error('申请记录不存在');
      }

      if (request.status !== 'pending') {
        throw new Error('该申请已被处理');
      }

      // 2. 更新申请状态
      const updateData = {
        status: 'approved',
        reviewed_by: merchantName,
        reviewed_at: new Date().toISOString()
      };

      // 尝试更新数据库
      try {
        const { error: updateError } = await supabase
          .from('transaction_requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) {
          console.warn('数据库更新失败，使用本地存储:', updateError);
          // 更新本地存储
          const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
          const index = localRequests.findIndex(r => r.id === requestId);
          if (index !== -1) {
            localRequests[index] = { ...localRequests[index], ...updateData };
            localStorage.setItem('localTransactionRequests', JSON.stringify(localRequests));
          }
        }
      } catch (updateError) {
        console.error('更新申请状态失败:', updateError);
        // 更新本地存储
        const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
        const index = localRequests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          localRequests[index] = { ...localRequests[index], ...updateData };
          localStorage.setItem('localTransactionRequests', JSON.stringify(localRequests));
        }
      }

      // 3. 转换为正式交易记录
      await transactionService.createTransactionFromRequest(request);

      return { ...request, ...updateData };
    } catch (error) {
      console.error('审核通过申请失败:', error);
      throw error;
    }
  }

  // 拒绝申请
  async rejectRequest(requestId, merchantName) {
    try {
      const updateData = {
        status: 'rejected',
        reviewed_by: merchantName,
        reviewed_at: new Date().toISOString()
      };

      // 尝试更新数据库
      try {
        const { error } = await supabase
          .from('transaction_requests')
          .update(updateData)
          .eq('id', requestId);

        if (error) {
          console.warn('数据库更新失败，使用本地存储:', error);
          // 更新本地存储
          const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
          const index = localRequests.findIndex(r => r.id === requestId);
          if (index !== -1) {
            localRequests[index] = { ...localRequests[index], ...updateData };
            localStorage.setItem('localTransactionRequests', JSON.stringify(localRequests));
          }
        }
      } catch (updateError) {
        console.error('拒绝申请失败:', updateError);
        // 更新本地存储
        const localRequests = JSON.parse(localStorage.getItem('localTransactionRequests') || '[]');
        const index = localRequests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          localRequests[index] = { ...localRequests[index], ...updateData };
          localStorage.setItem('localTransactionRequests', JSON.stringify(localRequests));
        }
      }

      return updateData;
    } catch (error) {
      console.error('拒绝申请失败:', error);
      throw error;
    }
  }

  // 订阅实时更新
  subscribeToRequests(callback) {
    try {
      const subscription = supabase
        .channel('transaction_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transaction_requests'
          },
          (payload) => {
            console.log('交易申请实时更新:', payload);
            callback(payload);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      console.error('订阅交易申请更新失败:', error);
      return null;
    }
  }

  // 取消订阅
  unsubscribeFromRequests(subscription) {
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch (error) {
        console.error('取消订阅失败:', error);
      }
    }
  }
}

export const transactionRequestService = new TransactionRequestService();
