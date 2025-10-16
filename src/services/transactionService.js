import { supabase } from '../config/supabase';
import { authService } from './authService';
import { withdrawalService } from './withdrawalService';
import { inventoryService } from './inventoryService';

class TransactionService {
  // 创建交易记录（仅商人或管理员可用）
  async createTransaction(transactionData) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以创建交易记录');
    }

    try {
      const transactionRecord = {
        type: transactionData.type,
        customer_name: transactionData.customerName,
        product_name: transactionData.productName,
        collector: transactionData.collector,
        quantity: parseFloat(transactionData.quantity) || 0,
        gift_quantity: parseFloat(transactionData.giftQuantity) || 0,
        unit_price: parseFloat(transactionData.unitPrice) || 0,
        total_amount: parseFloat(transactionData.totalAmount) || 0
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionRecord])
        .select();

      if (error) {
        console.warn('数据库插入失败，使用本地存储:', error);

        // 如果数据库插入失败，保存到本地存储
        const existingTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
        const nextId = -(existingTransactions.length + 1); // 使用负数 ID

        const localTransaction = {
          ...transactionRecord,
          id: nextId, // 使用负数 ID 标识本地交易
          created_at: new Date().toISOString()
        };

        // 保存到本地存储
        existingTransactions.push(localTransaction);
        localStorage.setItem('localTransactions', JSON.stringify(existingTransactions));

        return localTransaction;
      }

      // 自动更新库存
      if (data && data[0]) {
        try {
          await inventoryService.handleTransactionStock(
            {
              type: transactionData.type,
              productName: transactionData.productName,
              quantity: transactionData.quantity,
              giftQuantity: transactionData.giftQuantity
            },
            data[0].id
          );
        } catch (inventoryError) {
          console.error('库存更新失败:', inventoryError);
          // 库存更新失败不影响交易记录创建
        }
      }

      return data[0];
    } catch (error) {
      console.error('创建交易记录失败:', error);

      // 完全失败时，仍然尝试保存到本地
      const existingTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      const nextId = -(existingTransactions.length + 1); // 使用负数 ID

      const localTransaction = {
        type: transactionData.type,
        customer_name: transactionData.customerName,
        product_name: transactionData.productName,
        collector: transactionData.collector,
        quantity: parseFloat(transactionData.quantity) || 0,
        gift_quantity: parseFloat(transactionData.giftQuantity) || 0,
        unit_price: parseFloat(transactionData.unitPrice) || 0,
        total_amount: parseFloat(transactionData.totalAmount) || 0,
        id: nextId,
        created_at: new Date().toISOString()
      };

      const allTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      allTransactions.push(localTransaction);
      localStorage.setItem('localTransactions', JSON.stringify(allTransactions));

      return localTransaction;
    }
  }

  // 更新交易记录（仅商人或管理员可用）
  async updateTransaction(transactionId, updateData) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以更新交易记录');
    }

    try {
      const updates = {};
      if (updateData.type) updates.type = updateData.type;
      if (updateData.customerName) updates.customer_name = updateData.customerName;
      if (updateData.productName !== undefined) updates.product_name = updateData.productName;
      if (updateData.collector) updates.collector = updateData.collector;
      if (updateData.quantity !== undefined) updates.quantity = parseFloat(updateData.quantity) || 0;
      if (updateData.giftQuantity !== undefined) updates.gift_quantity = parseFloat(updateData.giftQuantity) || 0;
      if (updateData.unitPrice !== undefined) updates.unit_price = parseFloat(updateData.unitPrice) || 0;
      if (updateData.totalAmount !== undefined) updates.total_amount = parseFloat(updateData.totalAmount) || 0;

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('更新交易记录失败:', error);
      throw error;
    }
  }

  // 删除交易记录（仅商人或管理员可用）
  async deleteTransaction(transactionId) {
    if (!authService.isMerchant() && !authService.isAdmin()) {
      throw new Error('只有商人或管理员可以删除交易记录');
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('删除交易记录失败:', error);
      throw error;
    }
  }

  // 获取交易记录列表
  async getTransactions(filters = {}) {
    try {
      let transactions = [];

      // 尝试从数据库获取数据
      try {
        // 如果指定了 limit，直接查询
        if (filters.limit) {
          let query = supabase
            .from('transactions')
            .select('*');

          // 应用筛选条件
          if (filters.type) {
            query = query.eq('type', filters.type);
          }

          if (filters.customerName) {
            query = query.ilike('customer_name', `%${filters.customerName}%`);
          }

          if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
          }

          if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
          }

          query = query.order('created_at', { ascending: false });
          query = query.limit(filters.limit);

          const { data, error } = await query;
          if (!error && data) {
            transactions = data;
          }
        } else {
          // 如果没有指定 limit，使用分页获取所有数据
          let allData = [];
          let hasMore = true;
          let pageSize = 1000;
          let offset = 0;

          while (hasMore) {
            let query = supabase
              .from('transactions')
              .select('*');

            // 应用筛选条件
            if (filters.type) {
              query = query.eq('type', filters.type);
            }

            if (filters.customerName) {
              query = query.ilike('customer_name', `%${filters.customerName}%`);
            }

            if (filters.startDate) {
              query = query.gte('created_at', filters.startDate);
            }

            if (filters.endDate) {
              query = query.lte('created_at', filters.endDate);
            }

            query = query.order('created_at', { ascending: false });
            query = query.range(offset, offset + pageSize - 1);

            const { data, error } = await query;

            if (error) {
              console.error('分页查询错误:', error);
              break;
            }

            if (data && data.length > 0) {
              allData = allData.concat(data);
              offset += pageSize;
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }

          transactions = allData;
        }
      } catch (dbError) {
        console.warn('从数据库获取交易数据失败:', dbError);
      }

      // 获取本地存储的交易数据
      const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      
      // 合并数据库和本地数据
      const allTransactions = [...transactions, ...localTransactions];

      // 应用本地筛选条件
      let filteredTransactions = allTransactions;

      if (filters.type) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
      }

      if (filters.customerName) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.customer_name.toLowerCase().includes(filters.customerName.toLowerCase())
        );
      }

      if (filters.startDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.created_at) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.created_at) <= new Date(filters.endDate)
        );
      }

      // 按创建时间倒序排列
      filteredTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 限制返回数量
      if (filters.limit) {
        filteredTransactions = filteredTransactions.slice(0, filters.limit);
      }

      return filteredTransactions;
    } catch (error) {
      console.error('获取交易记录失败:', error);
      
      // 如果完全失败，至少返回本地数据
      const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
      return localTransactions;
    }
  }

  // 获取交易统计信息
  async getTransactionStats(filters = {}) {
    try {
      // 获取所有交易数据（包括数据库和本地存储）
      const allTransactions = await this.getTransactions(filters);

      // 计算统计信息
      const stats = {
        totalTransactions: allTransactions.length,
        totalAmount: 0,
        totalQuantity: 0,
        totalGiftQuantity: 0,
        currentStock: 0, // 新增库存字段
        typeStats: {
          purchase: { count: 0, amount: 0, quantity: 0 },
          sale: { count: 0, amount: 0, quantity: 0 },
          return: { count: 0, amount: 0, quantity: 0 },
          gift: { count: 0, amount: 0, quantity: 0 }
        }
      };

      allTransactions.forEach(transaction => {
        const quantity = parseFloat(transaction.quantity) || 0;
        const giftQuantity = parseFloat(transaction.gift_quantity) || 0;
        const totalAmount = parseFloat(transaction.total_amount) || 0;

        // 修改总金额计算逻辑：销售金额 - 回收金额
        switch (transaction.type) {
          case 'sale':     // 销售：增加总金额
            stats.totalAmount += totalAmount;
            break;
          case 'return':   // 回收：减少总金额
            stats.totalAmount -= totalAmount;
            break;
          case 'purchase': // 进货：不计入总金额
          case 'gift':     // 赠送：不计入总金额
          default:
            break;
        }

        // 总数量只计算销售数量
        if (transaction.type === 'sale') {
          stats.totalQuantity += quantity;
        }
        
        // 赠送数量只计算销售和赠送类型的赠送数量
        if (transaction.type === 'sale' || transaction.type === 'gift') {
          stats.totalGiftQuantity += giftQuantity;
        }

        const type = transaction.type;
        if (stats.typeStats[type]) {
          stats.typeStats[type].count++;
          stats.typeStats[type].amount += totalAmount;
          stats.typeStats[type].quantity += quantity;
        }

        // 计算库存：进货+回收-销售-赠送
        switch (type) {
          case 'purchase': // 进货：增加库存
            stats.currentStock += quantity;
            break;
          case 'return':   // 回收：增加库存
            stats.currentStock += quantity;
            break;
          case 'sale':     // 销售：减少库存（数量+赠送数量）
            stats.currentStock -= (quantity + giftQuantity);
            break;
          case 'gift':     // 赠送：减少库存（数量+赠送数量）
            stats.currentStock -= (quantity + giftQuantity);
            break;
        }
      });

      // 从净收入中扣除商人提现金额
      const totalWithdrawals = await withdrawalService.getTotalWithdrawals();
      stats.totalAmount -= totalWithdrawals; // 净收入 = 销售收款 - 回收收款 - 商人提现

      return stats;
    } catch (error) {
      console.error('获取交易统计失败:', error);
      
      // 如果完全失败，返回默认统计
      return {
        totalTransactions: 0,
        totalAmount: 0,
        totalQuantity: 0,
        totalGiftQuantity: 0,
        currentStock: 0,
        typeStats: {
          purchase: { count: 0, amount: 0, quantity: 0 },
          sale: { count: 0, amount: 0, quantity: 0 },
          return: { count: 0, amount: 0, quantity: 0 },
          gift: { count: 0, amount: 0, quantity: 0 }
        }
      };
    }
  }

  // 订阅实时交易记录更新
  subscribeToTransactions(callback) {
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }

  // 取消订阅
  unsubscribeFromTransactions(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

export const transactionService = new TransactionService();
