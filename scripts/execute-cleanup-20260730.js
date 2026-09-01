/**
 * 在 Supabase 执行 2026-07-30 数据清理（通过 REST API 分批删除/插入）
 */
const fs = require('fs');
const path = require('path');
const { getAdminClient } = require('./supabase-admin');

const CUTOFF = '2026-07-30T00:00:00+07:00';
const OPENING_MARKER = '【期初结转】';

const OPENING_ADJUSTMENTS = [
  ['安柠', 26458, 27101],
  ['管理员', 1588, 23879],
  ['西瓜', 28954, 21762],
  ['小泵', 53756, 12531],
  ['小梦', 6480, 5572],
  ['君健', 32432, 3386],
  ['小靖', 3815, 2239],
  ['纯净', 2339, 1882],
  ['茶茶', 2021, 161]
];

async function deleteBefore(supabase, table, dateCol = 'created_at') {
  let total = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .lt(dateCol, CUTOFF)
      .select('id');

    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log(`  跳过 ${table}（表不存在）`);
        return 0;
      }
      throw new Error(`${table} 删除失败: ${error.message}`);
    }
    const n = data?.length || 0;
    total += n;
    process.stdout.write(`  ${table}: 已删 ${total}\r`);
    if (n === 0) break;
    if (n < 500) continue;
  }
  console.log(`  ${table}: 共删除 ${total} 条`);
  return total;
}

async function deleteSalaryBeforeJuly2026(supabase) {
  const { data: old2026, error: e1 } = await supabase
    .from('salary_records')
    .delete()
    .eq('year', 2026)
    .lt('month', 7)
    .select('id');
  if (e1 && !e1.message.includes('Could not find')) throw e1;

  const { data: oldYear, error: e2 } = await supabase
    .from('salary_records')
    .delete()
    .lt('year', 2026)
    .select('id');
  if (e2 && !e2.message.includes('Could not find')) throw e2;

  const n = (old2026?.length || 0) + (oldYear?.length || 0);
  console.log(`  salary_records: 共删除 ${n} 条`);
}

async function deleteBonusMonthlyBeforeJuly2026(supabase) {
  for (const spec of [{ year: 2026, ltMonth: 7 }, { ltYear: 2026 }]) {
    let q = supabase.from('bonus_pool_monthly').delete().select('id');
    if (spec.year) q = q.eq('year', spec.year).lt('month', spec.ltMonth);
    if (spec.ltYear) q = q.lt('year', spec.ltYear);
    const { error } = await q;
    if (error && !error.message.includes('Could not find')) throw error;
  }
  console.log('  bonus_pool_monthly: 已清理 7/30 前记录');
}

async function ensureAdjustmentsTable(supabase) {
  const { error } = await supabase.from('employee_balance_adjustments').select('id').limit(1);
  if (!error) {
    console.log('  employee_balance_adjustments 表已存在');
    return;
  }

  const sqlPath = path.join(__dirname, '..', 'employee-balance-adjustment.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('  需要创建 employee_balance_adjustments 表...');

  const env = require('./supabase-admin').loadEnvLocal();
  const projectRef = env.SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    console.warn('  Management API 不可用，尝试直接插入（若表不存在将跳过调账）');
    return;
  }
  console.log('  employee_balance_adjustments 表已创建');
}

async function main() {
  const supabase = getAdminClient();
  console.log('=== 开始执行 2026-07-30 数据清理 ===');
  console.log('截止:', CUTOFF);

  console.log('\n[1/6] 删除 inventory_changes...');
  await deleteBefore(supabase, 'inventory_changes');

  console.log('\n[2/6] 删除旧明细...');
  await deleteBefore(supabase, 'transactions');
  await deleteBefore(supabase, 'employee_transfers');
  await deleteBefore(supabase, 'merchant_withdrawals');
  await deleteBefore(supabase, 'employee_balance_adjustments');
  await deleteBefore(supabase, 'customer_bindings');
  await deleteBefore(supabase, 'transaction_requests');
  await deleteBefore(supabase, 'customer_gifts');
  await deleteBefore(supabase, 'bonus_deduction_log');
  await deleteSalaryBeforeJuly2026(supabase);
  await deleteBonusMonthlyBeforeJuly2026(supabase);

  console.log('\n[3/6] 插入期初库存/净收入...');
  const { error: e1 } = await supabase.from('transactions').insert([{
    type: 'purchase',
    customer_name: `${OPENING_MARKER}库存`,
    collector: '系统',
    quantity: 4686,
    gift_quantity: 0,
    unit_price: 0,
    total_amount: 0,
    created_at: CUTOFF
  }]);
  if (e1) throw new Error('期初库存插入失败: ' + e1.message);

  const { error: e2 } = await supabase.from('transactions').insert([{
    type: 'sale',
    customer_name: `${OPENING_MARKER}净收入`,
    collector: '系统',
    quantity: 0,
    gift_quantity: 0,
    unit_price: 0,
    total_amount: 157843,
    created_at: CUTOFF
  }]);
  if (e2) throw new Error('期初净收入插入失败: ' + e2.message);
  console.log('  期初记录已插入');

  console.log('\n[4/6] 插入期初员工调账...');
  await ensureAdjustmentsTable(supabase);

  const adjRows = OPENING_ADJUSTMENTS.map(([name, amount, balanceBefore]) => ({
    employee_name: name,
    amount,
    note: `2026-07-30 数据清理期初结转（清理前余额 ${balanceBefore}）`,
    operator_name: '系统清理',
    adjustment_date: CUTOFF,
    created_at: CUTOFF
  }));

  const { error: e3 } = await supabase.from('employee_balance_adjustments').insert(adjRows);
  if (e3) {
    console.error('  调账插入失败:', e3.message);
    console.error('  请手动在 Supabase 执行 employee-balance-adjustment.sql 后重跑调账部分');
  } else {
    console.log(`  已插入 ${adjRows.length} 条调账记录`);
  }

  console.log('\n[5/6] 验证...');
  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { count: bindCount } = await supabase.from('customer_bindings').select('*', { count: 'exact', head: true });
  console.log(`  剩余交易: ${txCount}，剩余绑定: ${bindCount}`);

  console.log('\n=== 清理完成 ===');
}

main().catch((err) => {
  console.error('清理失败:', err);
  process.exit(1);
});
