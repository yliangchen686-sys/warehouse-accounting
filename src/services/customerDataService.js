import { supabase } from '../config/supabase';

class CustomerDataService {
  // 批量上传手机号码（自动去重）
  async uploadPhoneNumbers(phoneNumbers, uploadedBy) {
    try {
      // 前端去重
      const uniquePhones = [...new Set(phoneNumbers)];
      
      // 过滤空值并标准化
      const validPhones = uniquePhones
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      if (validPhones.length === 0) {
        return { success: 0, duplicates: 0, total: 0 };
      }
      
      // 先查询数据库中已存在的手机号码（避免重复插入）
      // 分批查询，每次查询最多 100 条（避免 IN 查询参数过多）
      const existingPhones = new Set();
      const queryBatchSize = 100;
      
      for (let i = 0; i < validPhones.length; i += queryBatchSize) {
        const batch = validPhones.slice(i, i + queryBatchSize);
        
        const { data, error } = await supabase
          .from('customer_pool')
          .select('customer_phone')
          .in('customer_phone', batch);
        
        if (error) {
          console.warn(`查询第 ${Math.floor(i / queryBatchSize) + 1} 批已存在手机号码失败:`, error);
          // 继续处理下一批，不中断
          continue;
        }
        
        if (data && data.length > 0) {
          data.forEach(item => existingPhones.add(item.customer_phone));
        }
      }
      
      // 过滤掉已存在的手机号码
      const newPhones = validPhones.filter(phone => !existingPhones.has(phone));
      const duplicates = validPhones.length - newPhones.length;
      
      if (newPhones.length === 0) {
        return { 
          success: 0, 
          duplicates, 
          total: validPhones.length 
        };
      }
      
      // 批量插入新手机号码（每批 1000 条，避免单次插入过多）
      let successCount = 0;
      const batchSize = 1000;
      
      for (let i = 0; i < newPhones.length; i += batchSize) {
        const batch = newPhones.slice(i, i + batchSize);
        const insertData = batch.map(phone => ({
          customer_phone: phone,
          uploaded_by: uploadedBy,
          status: 'pending'
        }));
        
        const { error: insertError } = await supabase
          .from('customer_pool')
          .insert(insertData);
        
        if (insertError) {
          console.error(`批量插入第 ${Math.floor(i / batchSize) + 1} 批失败:`, insertError);
          // 如果批量插入失败，尝试逐条插入（降级方案）
          for (const phone of batch) {
            const { error: singleError } = await supabase
              .from('customer_pool')
              .insert({
                customer_phone: phone,
                uploaded_by: uploadedBy,
                status: 'pending'
              });
            
            if (!singleError) {
              successCount++;
            } else {
              // 如果是重复错误，不计入成功，但也不计入重复（因为已经在前面过滤了）
              if (singleError.code !== '23505' && 
                  !singleError.message?.includes('duplicate') &&
                  !singleError.message?.includes('unique')) {
                console.warn(`插入手机号码 ${phone} 失败:`, singleError);
              }
            }
          }
        } else {
          successCount += batch.length;
        }
      }
      
      return { 
        success: successCount, 
        duplicates, 
        total: validPhones.length 
      };
    } catch (error) {
      console.error('上传手机号码失败:', error);
      throw error;
    }
  }
  
  // 获取客户数据
  async getCustomerData(employeeName) {
    try {
      const { data, error } = await supabase.rpc('assign_customer_to_employee', {
        p_employee_name: employeeName
      });
      
      if (error) {
        console.error('获取客户数据失败:', error);
        throw error;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('获取客户数据失败:', error);
      throw error;
    }
  }
  
  // 获取客户池统计
  async getPoolStats() {
    try {
      // 使用 count 查询，分别获取 pending 和 assigned 的数量
      // 使用 head: true 只获取计数，不获取实际数据，避免 1000 条限制
      const [pendingResult, assignedResult, totalResult] = await Promise.all([
        supabase
          .from('customer_pool')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('customer_pool')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'assigned'),
        supabase
          .from('customer_pool')
          .select('*', { count: 'exact', head: true })
      ]);
      
      // 检查错误
      if (pendingResult.error) {
        console.error('获取待分配统计失败:', pendingResult.error);
        // 如果是表不存在的错误，给出友好提示
        if (pendingResult.error.message?.includes('does not exist') || 
            pendingResult.error.code === 'PGRST116' ||
            pendingResult.error.message?.includes('relation') ||
            pendingResult.error.message?.includes('不存在')) {
          throw new Error('客户池表不存在，请先在 Supabase 中执行 customer-pool-database-v2.sql 脚本');
        }
        throw pendingResult.error;
      }
      
      if (assignedResult.error) {
        console.error('获取已分配统计失败:', assignedResult.error);
        if (assignedResult.error.message?.includes('does not exist') || 
            assignedResult.error.code === 'PGRST116' ||
            assignedResult.error.message?.includes('relation') ||
            assignedResult.error.message?.includes('不存在')) {
          throw new Error('客户池表不存在，请先在 Supabase 中执行 customer-pool-database-v2.sql 脚本');
        }
        throw assignedResult.error;
      }
      
      if (totalResult.error) {
        console.error('获取总计统计失败:', totalResult.error);
        if (totalResult.error.message?.includes('does not exist') || 
            totalResult.error.code === 'PGRST116' ||
            totalResult.error.message?.includes('relation') ||
            totalResult.error.message?.includes('不存在')) {
          throw new Error('客户池表不存在，请先在 Supabase 中执行 customer-pool-database-v2.sql 脚本');
        }
        throw totalResult.error;
      }
      
      // 从 count 字段获取数量
      const pending = pendingResult.count || 0;
      const assigned = assignedResult.count || 0;
      const total = totalResult.count || 0;
      
      return {
        pending,
        assigned,
        total
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 如果是我们自定义的错误，直接抛出
      if (error.message?.includes('客户池表不存在')) {
        throw error;
      }
      // 其他错误，包装一下
      throw new Error(error.message || '获取统计信息失败，请检查数据库连接和表结构');
    }
  }
  
  // 重置所有客户（可选）
  async resetAllCustomers() {
    try {
      const { data, error } = await supabase.rpc('reset_all_customers');
      if (error) {
        console.error('重置客户失败:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('重置客户失败:', error);
      throw error;
    }
  }
}

export const customerDataService = new CustomerDataService();
