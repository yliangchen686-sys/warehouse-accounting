import { supabase } from '../config/supabase';

class InventoryService {
  // 获取所有库存
  async getAllInventory() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取库存失败:', error);
      throw error;
    }
  }

  // 更新库存
  async updateStock(productName, quantityChange, changeType, transactionId = null) {
    try {
      const { data, error } = await supabase
        .rpc('update_inventory_stock', {
          p_product_name: productName,
          p_quantity_change: Math.abs(quantityChange),
          p_change_type: changeType,
          p_transaction_id: transactionId
        });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('库存更新失败：未返回数据');
      }

      return {
        oldStock: data[0].old_stock,
        newStock: data[0].new_stock
      };
    } catch (error) {
      console.error('更新库存失败:', error);
      throw error;
    }
  }


  // 根据交易类型判断库存变动类型
  getStockChangeType(transactionType) {
    switch (transactionType) {
      case 'purchase': // 进货 - 增加库存
      case 'return':   // 回收 - 增加库存
        return 'increase';
      case 'sale':     // 销售 - 减少库存
      case 'gift':     // 赠送 - 减少库存
        return 'decrease';
      default:
        return 'increase';
    }
  }

  // 处理交易对库存的影响
  async handleTransactionStock(transactionData, transactionId = null) {
    const { type, productName, quantity, giftQuantity } = transactionData;

    if (!productName) {
      console.warn('没有商品名称，跳过库存更新');
      return null;
    }

    const changeType = this.getStockChangeType(type);
    let totalQuantity = parseFloat(quantity) || 0;

    // 对于销售和赠送，还要考虑赠送数量
    if (type === 'sale' || type === 'gift') {
      totalQuantity += parseFloat(giftQuantity) || 0;
    }

    if (totalQuantity > 0) {
      const result = await this.updateStock(productName, totalQuantity, changeType, transactionId);
      console.log(`库存更新: ${productName} ${changeType === 'increase' ? '+' : '-'}${totalQuantity}, 库存: ${result.oldStock} → ${result.newStock}`);
      return result;
    }

    return null;
  }

  // 获取库存变动历史
  async getInventoryChanges() {
    try {
      const { data, error } = await supabase
        .from('inventory_changes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取库存变动记录失败:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();


