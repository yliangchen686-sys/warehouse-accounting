/**
 * 创建 employee_balance_adjustments 表并插入期初调账
 * 需要 .env.local 中配置 DATABASE_URL（Supabase → Settings → Database → Connection string）
 */
const fs = require('fs');
const path = require('path');

const CUTOFF = '2026-07-30T00:00:00+07:00';
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

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
  });
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const { getAdminClient } = require('./supabase-admin');
  const supabase = getAdminClient();

  const { data: existing } = await supabase.from('employee_balance_adjustments').select('id').limit(1);
  if (!existing && !env.DATABASE_URL) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'employee-balance-adjustment.sql'), 'utf8');
    console.error('employee_balance_adjustments 表不存在，且未配置 DATABASE_URL');
    console.error('请在 Supabase → Settings → Database 复制 Connection string 到 .env.local：');
    console.error('DATABASE_URL=postgresql://postgres.[ref]:[password]@...');
    console.error('\n或在 Supabase SQL Editor 手动执行 employee-balance-adjustment.sql');
    process.exit(1);
  }

  if (!existing && env.DATABASE_URL) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '..', 'employee-balance-adjustment.sql'), 'utf8');
    await client.query(sql);
    await client.end();
    console.log('employee_balance_adjustments 表已创建');
  }

  const { count } = await supabase.from('employee_balance_adjustments').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log(`已有 ${count} 条调账记录，跳过插入`);
    return;
  }

  const rows = OPENING_ADJUSTMENTS.map(([name, amount, balanceBefore]) => ({
    employee_name: name,
    amount,
    note: `2026-07-30 数据清理期初结转（清理前余额 ${balanceBefore}）`,
    operator_name: '系统清理',
    adjustment_date: CUTOFF,
    created_at: CUTOFF
  }));

  const { error } = await supabase.from('employee_balance_adjustments').insert(rows);
  if (error) throw error;
  console.log(`已插入 ${rows.length} 条期初调账`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
