import { supabase } from '../config/supabase';

class InventoryService {
  // 获取所有库存
  async getAllInventory() {
    try {
      let inventory = [];

      // 尝试从数据库获取库存数据
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .order('product_name', { ascending: true });

        if (!error && data) {
          inventory = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取库存数据失败:', dbError);
      }

      // 获取本地存储的库存数据
      const localInventory = JSON.parse(localStorage.getItem('localInventory') || '[]');
      
      // 合并数据库和本地数据，去除重复项
      const allInventory = [...inventory];
      localInventory.forEach(localItem => {
        if (!allInventory.find(item => item.product_name === localItem.product_name)) {
          allInventory.push(localItem);
        }
      });

      return allInventory;
    } catch (error) {
      console.error('获取库存失败:', error);
      
      // 如果完全失败，至少返回本地数据
      const localInventory = JSON.parse(localStorage.getItem('localInventory') || '[]');
      return localInventory;
    }
  }

  // 更新库存
  async updateStock(productName, quantityChange, changeType, transactionId = null) {
    try {
      // 尝试使用数据库函数更新库存
      try {
        const { data, error } = await supabase
          .rpc('update_inventory_stock', {
            p_product_name: productName,
            p_quantity_change: Math.abs(quantityChange),
            p_change_type: changeType,
            p_transaction_id: transactionId
          });

        if (!error && data && data.length > 0) {
          return {
            oldStock: data[0].old_stock,
            newStock: data[0].new_stock
          };
        }
      } catch (dbError) {
        console.warn('数据库库存更新失败，使用本地存储:', dbError);
      }

      // 如果数据库操作失败，使用本地存储
      return this.updateLocalStock(productName, quantityChange, changeType);
    } catch (error) {
      console.error('更新库存失败:', error);
      return this.updateLocalStock(productName, quantityChange, changeType);
    }
  }

  // 本地库存更新
  updateLocalStock(productName, quantityChange, changeType) {
    const localInventory = JSON.parse(localStorage.getItem('localInventory') || '[]');
    
    let existingItem = localInventory.find(item => item.product_name === productName);
    let oldStock = 0;
    let newStock = 0;

    if (existingItem) {
      oldStock = existingItem.current_stock;
    } else {
      // 创建新商品
      existingItem = {
        id: Date.now(),
        product_name: productName,
        current_stock: 0,
        unit: '件',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localInventory.push(existingItem);
    }

    // 计算新库存
    if (changeType === 'increase') {
      newStock = oldStock + Math.abs(quantityChange);
    } else {
      newStock = Math.max(0, oldStock - Math.abs(quantityChange));
    }

    existingItem.current_stock = newStock;
    existingItem.updated_at = new Date().toISOString();

    // 保存到本地存储
    localStorage.setItem('localInventory', JSON.stringify(localInventory));

    // 记录库存变动
    this.recordLocalStockChange(productName, quantityChange, changeType, oldStock, newStock);

    return { oldStock, newStock };
  }

  // 记录本地库存变动
  recordLocalStockChange(productName, quantityChange, changeType, oldStock, newStock) {
    const localChanges = JSON.parse(localStorage.getItem('localInventoryChanges') || '[]');
    
    const change = {
      id: Date.now(),
      product_name: productName,
      change_type: changeType,
      quantity_change: Math.abs(quantityChange),
      stock_before: oldStock,
      stock_after: newStock,
      created_at: new Date().toISOString()
    };

    localChanges.push(change);
    localStorage.setItem('localInventoryChanges', JSON.stringify(localChanges));
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
  async handleTransactionStock(transactionData) {
    const { type, productName, quantity, giftQuantity } = transactionData;
    
    if (!productName) {
      console.warn('没有商品名称，跳过库存更新');
      return;
    }

    const changeType = this.getStockChangeType(type);
    let totalQuantity = parseFloat(quantity) || 0;

    // 对于销售和赠送，还要考虑赠送数量
    if (type === 'sale' || type === 'gift') {
      totalQuantity += parseFloat(giftQuantity) || 0;
    }

    if (totalQuantity > 0) {
      const result = await this.updateStock(productName, totalQuantity, changeType);
      console.log(`库存更新: ${productName} ${changeType === 'increase' ? '+' : '-'}${totalQuantity}, 库存: ${result.oldStock} → ${result.newStock}`);
      return result;
    }
  }

  // 获取库存变动历史
  async getInventoryChanges() {
    try {
      let changes = [];

      // 尝试从数据库获取变动记录
      try {
        const { data, error } = await supabase
          .from('inventory_changes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          changes = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取库存变动记录失败:', dbError);
      }

      // 获取本地存储的变动记录
      const localChanges = JSON.parse(localStorage.getItem('localInventoryChanges') || '[]');
      
      // 合并数据
      const allChanges = [...changes, ...localChanges];
      
      // 按时间排序
      allChanges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allChanges;
    } catch (error) {
      console.error('获取库存变动记录失败:', error);
      const localChanges = JSON.parse(localStorage.getItem('localInventoryChanges') || '[]');
      return localChanges;
    }
  }
}

export const inventoryService = new InventoryService();


