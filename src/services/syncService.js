import { supabase } from '../config/supabase';
import { authService } from './authService';

const LOCAL_KEYS = {
  employees: 'localEmployees',
  transactions: 'localTransactions',
  bindings: 'localCustomerBindings',
  transfers: 'localEmployeeTransfers',
  withdrawals: 'localMerchantWithdrawals',
  requests: 'localTransactionRequests'
};

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    console.warn(`读取本地数据失败 (${key}):`, e);
    return [];
  }
}

function writeLocal(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function transactionFingerprint(tx) {
  return [
    tx.type,
    tx.customer_name,
    tx.collector,
    Number(tx.quantity) || 0,
    Number(tx.gift_quantity) || 0,
    Number(tx.unit_price) || 0,
    Number(tx.total_amount) || 0,
    (tx.created_at || '').slice(0, 19)
  ].join('|');
}

class SyncService {
  constructor() {
    this._syncing = false;
    this._lastResult = null;
  }

  canSync() {
    return authService.isMerchant() || authService.isAdmin();
  }

  getSyncStatus() {
    const localEmployees = readLocal(LOCAL_KEYS.employees);
    const localTransactions = readLocal(LOCAL_KEYS.transactions);
    const localBindings = readLocal(LOCAL_KEYS.bindings);
    const localTransfers = readLocal(LOCAL_KEYS.transfers);
    const localWithdrawals = readLocal(LOCAL_KEYS.withdrawals);
    const localRequests = readLocal(LOCAL_KEYS.requests);

    const pending =
      localEmployees.length +
      localTransactions.length +
      localBindings.length +
      localTransfers.length +
      localWithdrawals.length +
      localRequests.length;

    return {
      localEmployeesCount: localEmployees.length,
      localTransactionsCount: localTransactions.length,
      localBindingsCount: localBindings.length,
      localTransfersCount: localTransfers.length,
      localWithdrawalsCount: localWithdrawals.length,
      localRequestsCount: localRequests.length,
      pendingCount: pending,
      needsSync: pending > 0,
      syncing: this._syncing,
      lastResult: this._lastResult
    };
  }

  async syncLocalEmployeesToDatabase() {
    const localEmployees = readLocal(LOCAL_KEYS.employees);
    if (localEmployees.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0, message: '没有本地员工数据需要同步' };
    }

    const remaining = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const results = [];

    for (const employee of localEmployees) {
      try {
        const { data: existing, error: lookupError } = await supabase
          .from('employees')
          .select('id')
          .eq('username', employee.username)
          .maybeSingle();

        if (lookupError) {
          remaining.push(employee);
          failed += 1;
          results.push({ employee: employee.name, status: 'failed', reason: lookupError.message });
          continue;
        }

        if (existing) {
          skipped += 1;
          results.push({ employee: employee.name, status: 'skipped', reason: '用户名已存在' });
          continue;
        }

        const { data, error } = await supabase
          .from('employees')
          .insert([{
            name: employee.name,
            username: employee.username,
            password: employee.password || 'employee123',
            role: employee.role || 'employee',
            status: employee.status || 'active'
          }])
          .select();

        if (error) {
          remaining.push(employee);
          failed += 1;
          results.push({ employee: employee.name, status: 'failed', reason: error.message });
        } else {
          synced += 1;
          results.push({ employee: employee.name, status: 'success', newId: data[0].id });
        }
      } catch (err) {
        remaining.push(employee);
        failed += 1;
        results.push({ employee: employee.name, status: 'error', reason: err.message });
      }
    }

    writeLocal(LOCAL_KEYS.employees, remaining);
    return { success: failed === 0, synced, failed, skipped, results };
  }

  async syncLocalTransactionsToDatabase() {
    const localTransactions = readLocal(LOCAL_KEYS.transactions);
    if (localTransactions.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0, message: '没有本地交易数据需要同步' };
    }

    // 拉取近期云端记录做去重，避免重复上传
    const { data: remoteRecent } = await supabase
      .from('transactions')
      .select('type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(2000);

    const remoteFingerprints = new Set((remoteRecent || []).map(transactionFingerprint));

    const remaining = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const results = [];

    for (const transaction of localTransactions) {
      const label = `${transaction.customer_name} - ${transaction.type}`;
      const fingerprint = transactionFingerprint(transaction);

      if (remoteFingerprints.has(fingerprint)) {
        skipped += 1;
        results.push({ transaction: label, status: 'skipped', reason: '云端已存在相同记录' });
        continue;
      }

      try {
        const payload = {
          type: transaction.type,
          customer_name: transaction.customer_name,
          collector: transaction.collector,
          quantity: Number(transaction.quantity) || 0,
          gift_quantity: Number(transaction.gift_quantity) || 0,
          unit_price: Number(transaction.unit_price) || 0,
          total_amount: Number(transaction.total_amount) || 0
        };

        if (transaction.product_name != null) {
          payload.product_name = transaction.product_name;
        }
        if (transaction.created_at) {
          payload.created_at = transaction.created_at;
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert([payload])
          .select();

        if (error) {
          remaining.push(transaction);
          failed += 1;
          results.push({ transaction: label, status: 'failed', reason: error.message });
        } else {
          synced += 1;
          remoteFingerprints.add(fingerprint);
          results.push({ transaction: label, status: 'success', newId: data[0].id });
        }
      } catch (err) {
        remaining.push(transaction);
        failed += 1;
        results.push({ transaction: label, status: 'error', reason: err.message });
      }
    }

    writeLocal(LOCAL_KEYS.transactions, remaining);
    return { success: failed === 0, synced, failed, skipped, results };
  }

  async syncLocalBindingsToDatabase() {
    const localBindings = readLocal(LOCAL_KEYS.bindings);
    if (localBindings.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0 };
    }

    const remaining = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const binding of localBindings) {
      try {
        const { data: existing } = await supabase
          .from('customer_bindings')
          .select('id')
          .eq('customer_name', binding.customer_name)
          .maybeSingle();

        if (existing) {
          skipped += 1;
          continue;
        }

        const { error } = await supabase
          .from('customer_bindings')
          .insert([{
            customer_name: binding.customer_name,
            employee_name: binding.employee_name,
            created_at: binding.created_at || new Date().toISOString()
          }]);

        if (error) {
          remaining.push(binding);
          failed += 1;
        } else {
          synced += 1;
        }
      } catch (err) {
        remaining.push(binding);
        failed += 1;
      }
    }

    writeLocal(LOCAL_KEYS.bindings, remaining);
    return { success: failed === 0, synced, failed, skipped };
  }

  async syncLocalTransfersToDatabase() {
    const localTransfers = readLocal(LOCAL_KEYS.transfers);
    if (localTransfers.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0 };
    }

    const { data: remoteRecent } = await supabase
      .from('employee_transfers')
      .select('employee_name, amount, transfer_date, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const remoteKeys = new Set(
      (remoteRecent || []).map((t) =>
        `${t.employee_name}|${Number(t.amount)}|${(t.transfer_date || t.created_at || '').slice(0, 19)}`
      )
    );

    const remaining = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const transfer of localTransfers) {
      const key = `${transfer.employee_name}|${Number(transfer.amount)}|${(transfer.transfer_date || transfer.created_at || '').slice(0, 19)}`;
      if (remoteKeys.has(key)) {
        skipped += 1;
        continue;
      }

      try {
        const { error } = await supabase
          .from('employee_transfers')
          .insert([{
            employee_name: transfer.employee_name,
            amount: Number(transfer.amount) || 0,
            transfer_date: transfer.transfer_date || transfer.created_at || new Date().toISOString(),
            note: transfer.note || '',
            created_at: transfer.created_at || new Date().toISOString()
          }]);

        if (error) {
          remaining.push(transfer);
          failed += 1;
        } else {
          synced += 1;
          remoteKeys.add(key);
        }
      } catch (err) {
        remaining.push(transfer);
        failed += 1;
      }
    }

    writeLocal(LOCAL_KEYS.transfers, remaining);
    return { success: failed === 0, synced, failed, skipped };
  }

  async syncLocalWithdrawalsToDatabase() {
    const localWithdrawals = readLocal(LOCAL_KEYS.withdrawals);
    if (localWithdrawals.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0 };
    }

    const { data: remoteRecent } = await supabase
      .from('merchant_withdrawals')
      .select('merchant_name, amount, withdrawal_date, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const remoteKeys = new Set(
      (remoteRecent || []).map((w) =>
        `${w.merchant_name}|${Number(w.amount)}|${(w.withdrawal_date || w.created_at || '').slice(0, 19)}`
      )
    );

    const remaining = [];
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const withdrawal of localWithdrawals) {
      const key = `${withdrawal.merchant_name}|${Number(withdrawal.amount)}|${(withdrawal.withdrawal_date || withdrawal.created_at || '').slice(0, 19)}`;
      if (remoteKeys.has(key)) {
        skipped += 1;
        continue;
      }

      try {
        const { error } = await supabase
          .from('merchant_withdrawals')
          .insert([{
            merchant_name: withdrawal.merchant_name,
            amount: Number(withdrawal.amount) || 0,
            withdrawal_date: withdrawal.withdrawal_date || withdrawal.created_at || new Date().toISOString(),
            note: withdrawal.note || '',
            created_at: withdrawal.created_at || new Date().toISOString()
          }]);

        if (error) {
          remaining.push(withdrawal);
          failed += 1;
        } else {
          synced += 1;
          remoteKeys.add(key);
        }
      } catch (err) {
        remaining.push(withdrawal);
        failed += 1;
      }
    }

    writeLocal(LOCAL_KEYS.withdrawals, remaining);
    return { success: failed === 0, synced, failed, skipped };
  }

  async syncLocalRequestsToDatabase() {
    const localRequests = readLocal(LOCAL_KEYS.requests);
    if (localRequests.length === 0) {
      return { success: true, synced: 0, failed: 0, skipped: 0 };
    }

    const remaining = [];
    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const request of localRequests) {
      // 已有正数云端 ID 的跳过；负数/临时 ID 才上传
      if (request.id && Number(request.id) > 0) {
        skipped += 1;
        continue;
      }

      try {
        const payload = {
          type: request.type,
          customer_name: request.customer_name,
          collector: request.collector,
          quantity: Number(request.quantity) || 0,
          gift_quantity: Number(request.gift_quantity) || 0,
          unit_price: Number(request.unit_price) || 0,
          total_amount: Number(request.total_amount) || 0,
          status: request.status || 'pending',
          applicant_name: request.applicant_name || null,
          notes: request.notes || null,
          created_at: request.created_at || new Date().toISOString()
        };

        const { error } = await supabase
          .from('transaction_requests')
          .insert([payload]);

        if (error) {
          remaining.push(request);
          failed += 1;
        } else {
          synced += 1;
        }
      } catch (err) {
        remaining.push(request);
        failed += 1;
      }
    }

    writeLocal(LOCAL_KEYS.requests, remaining);
    return { success: failed === 0, synced, failed, skipped };
  }

  /**
   * 将本机 localStorage 中的离线数据全部推送到 Supabase。
   * 成功或已存在的记录会从本地移除，避免下次重复合并。
   */
  async syncAll({ silent = false } = {}) {
    if (!this.canSync()) {
      throw new Error('只有商人或管理员可以同步数据');
    }

    if (this._syncing) {
      return { success: false, message: '同步正在进行中', skipped: true };
    }

    const status = this.getSyncStatus();
    if (!status.needsSync) {
      const empty = {
        success: true,
        message: '本地没有待同步数据',
        totalSynced: 0,
        totalFailed: 0,
        details: {}
      };
      this._lastResult = empty;
      return empty;
    }

    this._syncing = true;
    if (!silent) {
      console.log('[sync] 开始同步本地数据到 Supabase...', status);
    }

    try {
      // 先确认云端可达
      const { error: pingError } = await supabase.from('employees').select('id').limit(1);
      if (pingError) {
        throw new Error(`无法连接 Supabase: ${pingError.message}`);
      }

      const details = {
        employees: await this.syncLocalEmployeesToDatabase(),
        transactions: await this.syncLocalTransactionsToDatabase(),
        bindings: await this.syncLocalBindingsToDatabase(),
        transfers: await this.syncLocalTransfersToDatabase(),
        withdrawals: await this.syncLocalWithdrawalsToDatabase(),
        requests: await this.syncLocalRequestsToDatabase()
      };

      const totalSynced = Object.values(details).reduce((sum, d) => sum + (d.synced || 0), 0);
      const totalFailed = Object.values(details).reduce((sum, d) => sum + (d.failed || 0), 0);
      const totalSkipped = Object.values(details).reduce((sum, d) => sum + (d.skipped || 0), 0);

      const result = {
        success: totalFailed === 0,
        message: totalFailed === 0
          ? `同步完成：上传 ${totalSynced} 条，跳过 ${totalSkipped} 条`
          : `同步部分完成：成功 ${totalSynced}，失败 ${totalFailed}，跳过 ${totalSkipped}`,
        totalSynced,
        totalFailed,
        totalSkipped,
        details,
        remaining: this.getSyncStatus()
      };

      this._lastResult = result;
      if (!silent) {
        console.log('[sync] 同步结束', result);
      }
      return result;
    } finally {
      this._syncing = false;
    }
  }
}

export const syncService = new SyncService();
