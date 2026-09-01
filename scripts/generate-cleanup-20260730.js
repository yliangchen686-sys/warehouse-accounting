/**
 * 2026-07-30 数据清理：生成对账表 + SQL（精确复刻 employeePaymentService 逻辑）
 * 用法: node scripts/generate-cleanup-20260730.js
 */
const fs = require('fs');
const path = require('path');
const { getAdminClient } = require('./supabase-admin');

const CUTOFF = '2026-07-30T00:00:00+07:00';
const OPENING_MARKER = '【期初结转】';
const TARGET_STOCK = 5845;
const TARGET_NET_INCOME = 99413;
const OUTPUT_DIR = path.join(__dirname, '..', 'cleanup-20260730');

function normalizeName(name) {
  if (name == null || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

function isBeforeCutoff(dateStr) {
  return new Date(dateStr) < new Date(CUTOFF);
}

function isOnOrAfterCutoff(dateStr) {
  return new Date(dateStr) >= new Date(CUTOFF);
}

function isOpeningTransaction(tx) {
  return (tx.customer_name || '').includes(OPENING_MARKER);
}

async function fetchAll(supabase, table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(offset, offset + 999);
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.warn(`表 ${table} 不存在，跳过`);
        return [];
      }
      throw error;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

function buildEmployeeStats(transactions, transfers, withdrawals, adjustments) {
  const employeeStats = {};
  const businessTx = transactions.filter((tx) => !isOpeningTransaction(tx));

  businessTx.forEach((transaction) => {
    const key = normalizeName(transaction.collector) || transaction.collector;
    const amount = parseFloat(transaction.total_amount) || 0;
    if (!employeeStats[key]) {
      employeeStats[key] = { employeeName: key, totalAmount: 0, transactionCount: 0 };
    }
    if (transaction.type === 'sale') employeeStats[key].totalAmount += amount;
    else if (transaction.type === 'return') employeeStats[key].totalAmount -= amount;
    employeeStats[key].transactionCount += 1;
  });

  const allTransferTotal = transfers.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  Object.keys(employeeStats).forEach((employeeName) => {
    const normName = normalizeName(employeeName);
    const employeeTransfers = transfers.filter((t) => normalizeName(t.employee_name) === normName);
    const totalTransferred = employeeTransfers.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const employeeWithdrawals = withdrawals.filter((w) => normalizeName(w.merchant_name) === normName);
    const totalWithdrawn = employeeWithdrawals.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
    const employeeAdjustments = adjustments.filter((a) => normalizeName(a.employee_name) === normName);
    const totalAdjustments = employeeAdjustments.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

    const isAdmin = employeeName === '管理员' || employeeName === '系统管理员';
    const isMerchantRole = employeeName === '商人' || (employeeName && !isAdmin && totalWithdrawn > 0);

    if (isAdmin) {
      const salesAmount = employeeStats[employeeName].totalAmount;
      const totalIncome = salesAmount + allTransferTotal;
      employeeStats[employeeName].totalAmount = totalIncome;
      employeeStats[employeeName].totalWithdrawn = totalWithdrawn;
      employeeStats[employeeName].currentBalance = totalIncome - totalWithdrawn + totalAdjustments;
      employeeStats[employeeName].totalTransferred = 0;
      employeeStats[employeeName].totalAdjustments = totalAdjustments;
    } else if (isMerchantRole) {
      const salesAmount = employeeStats[employeeName].totalAmount;
      employeeStats[employeeName].totalTransferred = totalTransferred;
      employeeStats[employeeName].totalWithdrawn = totalWithdrawn;
      employeeStats[employeeName].totalAdjustments = totalAdjustments;
      employeeStats[employeeName].currentBalance = salesAmount - totalTransferred - totalWithdrawn + totalAdjustments;
    } else {
      const originalAmount = employeeStats[employeeName].totalAmount;
      employeeStats[employeeName].totalTransferred = totalTransferred;
      employeeStats[employeeName].totalAdjustments = totalAdjustments;
      employeeStats[employeeName].currentBalance = originalAmount - totalTransferred + totalAdjustments;
      employeeStats[employeeName].totalWithdrawn = 0;
    }
  });

  return employeeStats;
}

function calcStock(transactions) {
  let stock = 0;
  transactions.forEach((tx) => {
    const qty = parseFloat(tx.quantity) || 0;
    const giftQty = parseFloat(tx.gift_quantity) || 0;
    if (tx.type === 'purchase' || tx.type === 'return') stock += qty;
    if (tx.type === 'sale' || tx.type === 'gift') stock -= qty + giftQty;
  });
  return stock;
}

function calcNetIncome(transactions, withdrawals) {
  let net = 0;
  transactions.forEach((tx) => {
    const amount = parseFloat(tx.total_amount) || 0;
    if (tx.type === 'sale') net += amount;
    if (tx.type === 'return') net -= amount;
  });
  net -= withdrawals.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
  return net;
}

function calcSalesGiftQty(transactions) {
  let salesQty = 0;
  let giftQty = 0;
  transactions.filter((tx) => !isOpeningTransaction(tx)).forEach((tx) => {
    const qty = parseFloat(tx.quantity) || 0;
    const gq = parseFloat(tx.gift_quantity) || 0;
    if (tx.type === 'sale') { salesQty += qty; giftQty += gq; }
    else if (tx.type === 'gift') giftQty += gq;
  });
  return { salesQty, giftQty };
}

function r2(n) { return Math.round(n * 100) / 100; }

function generateSql(reconciliation, summary) {
  const adjRows = reconciliation
    .filter((r) => r.openingAdjustment >= 0.01)
    .map((r) => `  ('${r.employeeName.replace(/'/g, "''")}', ${r.openingAdjustment.toFixed(2)}, '2026-07-30 数据清理期初结转（清理前余额 ${r.balanceBefore}）', '系统清理', TIMESTAMPTZ '${CUTOFF}')`)
    .join(',\n');

  return `-- ============================================================
-- 2026-07-30 数据清理脚本
-- 生成: ${new Date().toISOString()}
-- 规则: 删除 ${CUTOFF} 之前的数据；保留余额/库存/净收入；明细从 7/30 重算
-- ⚠️ 执行前必须备份！建议整段在 Supabase SQL Editor 一次执行
-- ⚠️ 需配合应用 v1.0.18（期初结转标记 + 清空本地缓存）
-- ============================================================

BEGIN;

-- 0. 确保余额调整表存在
CREATE TABLE IF NOT EXISTS employee_balance_adjustments (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    operator_name VARCHAR(100),
    adjustment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE employee_balance_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_balance_adjustments_all_access" ON employee_balance_adjustments;
CREATE POLICY "employee_balance_adjustments_all_access" ON employee_balance_adjustments FOR ALL TO anon, authenticated USING (true);

-- 1. 删除 inventory_changes（如有 FK）
DELETE FROM inventory_changes
WHERE transaction_id IN (SELECT id FROM transactions WHERE created_at < TIMESTAMPTZ '${CUTOFF}');

-- 2. 删除旧交易（${summary.deleteCounts.transactions} 条）
DELETE FROM transactions WHERE created_at < TIMESTAMPTZ '${CUTOFF}';

-- 3. 删除旧转账/提现/调账
DELETE FROM employee_transfers WHERE created_at < TIMESTAMPTZ '${CUTOFF}';
DELETE FROM merchant_withdrawals WHERE created_at < TIMESTAMPTZ '${CUTOFF}';
DELETE FROM employee_balance_adjustments WHERE created_at < TIMESTAMPTZ '${CUTOFF}';

-- 4. 删除旧绑定/申请/赠送
DELETE FROM customer_bindings WHERE created_at < TIMESTAMPTZ '${CUTOFF}';
DELETE FROM transaction_requests WHERE created_at < TIMESTAMPTZ '${CUTOFF}';
DELETE FROM customer_gifts WHERE created_at < TIMESTAMPTZ '${CUTOFF}';

-- 5. 删除 7/30 前的工资/奖金池历史
DELETE FROM salary_records WHERE (year < 2026) OR (year = 2026 AND month < 7);
DELETE FROM bonus_pool_monthly WHERE (year < 2026) OR (year = 2026 AND month < 7);
DELETE FROM bonus_deduction_log WHERE created_at < TIMESTAMPTZ '${CUTOFF}';

-- 6. 期初库存: 进货 ${summary.stock.openingPurchaseQty} 件（不影响净收入）
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at)
VALUES ('purchase', '${OPENING_MARKER}库存', '系统', ${summary.stock.openingPurchaseQty.toFixed(2)}, 0, 0, 0, TIMESTAMPTZ '${CUTOFF}');

-- 7. 期初净收入: 销售 ${summary.netIncome.openingSaleAmount} 元（quantity=0，不影响销售数量统计）
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at)
VALUES ('sale', '${OPENING_MARKER}净收入', '系统', 0, 0, 0, ${summary.netIncome.openingSaleAmount.toFixed(2)}, TIMESTAMPTZ '${CUTOFF}');

-- 8. 期初员工余额调账（${reconciliation.filter((r) => r.openingAdjustment >= 0.01).length} 人）
INSERT INTO employee_balance_adjustments (employee_name, amount, note, operator_name, adjustment_date)
VALUES
${adjRows};

COMMIT;

-- ========== 执行后验证 ==========
-- 待转账总额应 ≈ ${TARGET_NET_INCOME}
-- 库存应 ≈ ${TARGET_STOCK}
-- 净收入应 ≈ ${TARGET_NET_INCOME}
-- 销售数量应 ≈ ${summary.salesQtyAfter}，赠送数量应 ≈ ${summary.giftQtyAfter}
`;
}

async function main() {
  const supabase = getAdminClient();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const [transactions, transfers, withdrawals, adjustments, bindings, requests, gifts, bonusDeductions] = await Promise.all([
    fetchAll(supabase, 'transactions'),
    fetchAll(supabase, 'employee_transfers'),
    fetchAll(supabase, 'merchant_withdrawals'),
    fetchAll(supabase, 'employee_balance_adjustments'),
    fetchAll(supabase, 'customer_bindings'),
    fetchAll(supabase, 'transaction_requests'),
    fetchAll(supabase, 'customer_gifts'),
    fetchAll(supabase, 'bonus_deduction_log')
  ]);

  const txAfter = transactions.filter((t) => isOnOrAfterCutoff(t.created_at));
  const transferAfter = transfers.filter((t) => isOnOrAfterCutoff(t.created_at));
  const withdrawalAfter = withdrawals.filter((w) => isOnOrAfterCutoff(w.created_at));
  const adjAfter = adjustments.filter((a) => isOnOrAfterCutoff(a.created_at || a.adjustment_date));

  const statsBefore = buildEmployeeStats(transactions, transfers, withdrawals, adjustments);
  const statsAfter = buildEmployeeStats(txAfter, transferAfter, withdrawalAfter, adjAfter);

  const reconciliation = Object.keys(statsBefore).map((name) => {
    const before = statsBefore[name];
    const after = statsAfter[name] || { totalAmount: 0, totalTransferred: 0, totalWithdrawn: 0, totalAdjustments: 0, currentBalance: 0 };
    return {
      employeeName: name,
      balanceBefore: r2(before.currentBalance),
      netSince: r2(after.totalAmount),
      transferSince: r2(after.totalTransferred || 0),
      withdrawSince: r2(after.totalWithdrawn || 0),
      adjSince: r2(after.totalAdjustments || 0),
      openingAdjustment: r2(before.currentBalance - after.currentBalance),
      balanceAfter: r2(before.currentBalance)
    };
  }).filter((r) => Math.abs(r.balanceBefore) >= 0.01 || Math.abs(r.openingAdjustment) >= 0.01)
    .sort((a, b) => b.balanceBefore - a.balanceBefore);

  const totalBalance = r2(reconciliation.reduce((s, r) => s + r.balanceBefore, 0));
  const stockAfterDelete = calcStock(txAfter);
  const openingPurchaseQty = TARGET_STOCK - stockAfterDelete;
  const netIncomeAfterDelete = calcNetIncome(txAfter, withdrawalAfter);
  const openingSaleAmount = TARGET_NET_INCOME - netIncomeAfterDelete;
  const qty = calcSalesGiftQty(txAfter);

  const summary = {
    cutoff: CUTOFF,
    totalBalanceBefore: totalBalance,
    targetBalance: TARGET_NET_INCOME,
    balanceMatch: Math.abs(totalBalance - TARGET_NET_INCOME) < 1,
    deleteCounts: {
      transactions: transactions.filter((t) => isBeforeCutoff(t.created_at)).length,
      transactionsKeep: txAfter.length,
      transfers: transfers.filter((t) => isBeforeCutoff(t.created_at)).length,
      withdrawals: withdrawals.filter((w) => isBeforeCutoff(w.created_at)).length,
      bindings: bindings.filter((b) => isBeforeCutoff(b.created_at)).length,
      bindingsKeep: bindings.filter((b) => isOnOrAfterCutoff(b.created_at)).length,
      requests: requests.filter((r) => isBeforeCutoff(r.created_at)).length,
      gifts: gifts.filter((g) => isBeforeCutoff(g.created_at)).length,
      bonusDeductions: bonusDeductions.filter((d) => isBeforeCutoff(d.created_at)).length
    },
    stock: { before: calcStock(transactions), afterDelete: stockAfterDelete, openingPurchaseQty, target: TARGET_STOCK },
    netIncome: { before: r2(calcNetIncome(transactions, withdrawals)), afterDelete: r2(netIncomeAfterDelete), openingSaleAmount: r2(openingSaleAmount), target: TARGET_NET_INCOME },
    salesQtyAfter: qty.salesQty,
    giftQtyAfter: qty.giftQty,
    employeeCount: reconciliation.length
  };

  const csv = ['\uFEFF员工姓名,清理前待转账余额,7月30起净收款,7月30起已转账,7月30起已提现,7月30起已有调账,期初调账金额,清理后待转账余额',
    ...reconciliation.map((r) => [r.employeeName, r.balanceBefore, r.netSince, r.transferSince, r.withdrawSince, r.adjSince, r.openingAdjustment, r.balanceAfter].join(','))
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'reconciliation.csv'), csv, 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'cleanup.sql'), generateSql(reconciliation, summary), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n文件已生成到 ${OUTPUT_DIR}`);
  if (!summary.balanceMatch) console.warn('⚠️ 总余额与目标不一致，请检查');
}

main().catch((err) => { console.error(err); process.exit(1); });
