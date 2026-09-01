/**
 * 精确复刻 employeePaymentService 余额计算，生成对账表
 */
const fs = require('fs');
const path = require('path');
const { getAdminClient } = require('./supabase-admin');

const CUTOFF = '2026-07-30T00:00:00+07:00';
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

async function fetchAll(supabase, table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(offset, offset + 999);
    if (error) {
      if (error.message.includes('Could not find the table')) return [];
      throw error;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

function buildStats(transactions, transfers, withdrawals, adjustments) {
  const employeeStats = {};

  transactions.forEach((transaction) => {
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
    const isMerchant = employeeName === '商人' || (employeeName && !isAdmin && totalWithdrawn > 0);

    if (isAdmin) {
      const salesAmount = employeeStats[employeeName].totalAmount;
      const totalIncome = salesAmount + allTransferTotal;
      employeeStats[employeeName].totalAmount = totalIncome;
      employeeStats[employeeName].totalWithdrawn = totalWithdrawn;
      employeeStats[employeeName].currentBalance = totalIncome - totalWithdrawn + totalAdjustments;
      employeeStats[employeeName].totalTransferred = 0;
      employeeStats[employeeName].totalAdjustments = totalAdjustments;
    } else if (isMerchant) {
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
  transactions.forEach((tx) => {
    const qty = parseFloat(tx.quantity) || 0;
    const gq = parseFloat(tx.gift_quantity) || 0;
    if (tx.type === 'sale') { salesQty += qty; giftQty += gq; }
    else if (tx.type === 'gift') giftQty += gq;
  });
  return { salesQty, giftQty };
}

async function main() {
  const supabase = getAdminClient();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const [transactions, transfers, withdrawals, adjustments] = await Promise.all([
    fetchAll(supabase, 'transactions'),
    fetchAll(supabase, 'employee_transfers'),
    fetchAll(supabase, 'merchant_withdrawals'),
    fetchAll(supabase, 'employee_balance_adjustments')
  ]);

  const txAfter = transactions.filter((t) => isOnOrAfterCutoff(t.created_at));
  const transferAfter = transfers.filter((t) => isOnOrAfterCutoff(t.created_at));
  const withdrawalAfter = withdrawals.filter((w) => isOnOrAfterCutoff(w.created_at));
  const adjAfter = adjustments.filter((a) => isOnOrAfterCutoff(a.created_at || a.adjustment_date));

  const statsBefore = buildStats(transactions, transfers, withdrawals, adjustments);
  const statsAfter = buildStats(txAfter, transferAfter, withdrawalAfter, adjAfter);

  const reconciliation = [];
  Object.keys(statsBefore).forEach((name) => {
    const before = statsBefore[name];
    const after = statsAfter[name] || { totalAmount: 0, totalTransferred: 0, totalWithdrawn: 0, totalAdjustments: 0, currentBalance: 0 };
    const openingAdj = before.currentBalance - (after.currentBalance || 0);
    if (Math.abs(before.currentBalance) < 0.005 && Math.abs(openingAdj) < 0.005) return;

    reconciliation.push({
      employeeName: name,
      balanceBefore: r2(before.currentBalance),
      netSince: r2(after.totalAmount),
      transferSince: r2(after.totalTransferred || 0),
      withdrawSince: r2(after.totalWithdrawn || 0),
      adjSince: r2(after.totalAdjustments || 0),
      openingAdjustment: r2(openingAdj),
      balanceAfter: r2(before.currentBalance)
    });
  });

  reconciliation.sort((a, b) => b.balanceBefore - a.balanceBefore);

  const totalBalance = r2(reconciliation.reduce((s, r) => s + r.balanceBefore, 0));
  const stockAfterDelete = calcStock(txAfter);
  const openingPurchaseQty = TARGET_STOCK - stockAfterDelete;
  const netIncomeAfterDelete = calcNetIncome(txAfter, withdrawalAfter);
  const openingSaleAmount = TARGET_NET_INCOME - netIncomeAfterDelete;
  const qty = calcSalesGiftQty(txAfter);

  const summary = {
    cutoff: CUTOFF,
    totalBalanceUI: totalBalance,
    targetBalance: TARGET_NET_INCOME,
    balanceMatch: Math.abs(totalBalance - TARGET_NET_INCOME) < 1,
    deleteCounts: {
      transactions: transactions.filter((t) => isBeforeCutoff(t.created_at)).length,
      transfers: transfers.filter((t) => isBeforeCutoff(t.created_at)).length,
      withdrawals: withdrawals.filter((w) => isBeforeCutoff(w.created_at)).length,
      bindings: '见 SQL',
    },
    stock: { afterDelete: stockAfterDelete, openingPurchaseQty, target: TARGET_STOCK },
    netIncome: { afterDelete: r2(netIncomeAfterDelete), openingSaleAmount: r2(openingSaleAmount), target: TARGET_NET_INCOME },
    salesQtyAfter: qty.salesQty,
    giftQtyAfter: qty.giftQty
  };

  const csv = ['\uFEFF员工姓名,清理前待转账余额,7月30起净收款,7月30起已转账,7月30起已提现,7月30起已有调账,期初调账金额,清理后待转账余额',
    ...reconciliation.map((r) => [r.employeeName, r.balanceBefore, r.netSince, r.transferSince, r.withdrawSince, r.adjSince, r.openingAdjustment, r.balanceAfter].join(','))
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'reconciliation.csv'), csv, 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  const negative = reconciliation.filter((r) => r.openingAdjustment < 0);
  console.log(JSON.stringify(summary, null, 2));
  console.log('员工数:', reconciliation.length, '总待转账:', totalBalance);
  if (negative.length) console.log('负调账需特殊处理:', negative.map((r) => r.employeeName));
}

function r2(n) { return Math.round(n * 100) / 100; }

main().catch(console.error);
