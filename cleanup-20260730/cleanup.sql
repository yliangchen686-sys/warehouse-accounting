-- ============================================================
-- 2026-07-30 数据清理脚本
-- 生成: 2026-09-01T10:03:56.904Z
-- 规则: 删除 2026-07-30T00:00:00+07:00 之前的数据；保留余额/库存/净收入；明细从 7/30 重算
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
WHERE transaction_id IN (SELECT id FROM transactions WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00');

-- 2. 删除旧交易（15494 条）
DELETE FROM transactions WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';

-- 3. 删除旧转账/提现/调账
DELETE FROM employee_transfers WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';
DELETE FROM merchant_withdrawals WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';
DELETE FROM employee_balance_adjustments WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';

-- 4. 删除旧绑定/申请/赠送
DELETE FROM customer_bindings WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';
DELETE FROM transaction_requests WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';
DELETE FROM customer_gifts WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';

-- 5. 删除 7/30 前的工资/奖金池历史
DELETE FROM salary_records WHERE (year < 2026) OR (year = 2026 AND month < 7);
DELETE FROM bonus_pool_monthly WHERE (year < 2026) OR (year = 2026 AND month < 7);
DELETE FROM bonus_deduction_log WHERE created_at < TIMESTAMPTZ '2026-07-30T00:00:00+07:00';

-- 6. 期初库存: 进货 4686 件（不影响净收入）
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at)
VALUES ('purchase', '【期初结转】库存', '系统', 4686.00, 0, 0, 0, TIMESTAMPTZ '2026-07-30T00:00:00+07:00');

-- 7. 期初净收入: 销售 157843 元（quantity=0，不影响销售数量统计）
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at)
VALUES ('sale', '【期初结转】净收入', '系统', 0, 0, 0, 157843.00, TIMESTAMPTZ '2026-07-30T00:00:00+07:00');

-- 8. 期初员工余额调账（9 人）
INSERT INTO employee_balance_adjustments (employee_name, amount, note, operator_name, adjustment_date)
VALUES
  ('安柠', 26458.00, '2026-07-30 数据清理期初结转（清理前余额 27101）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('管理员', 1588.00, '2026-07-30 数据清理期初结转（清理前余额 23879）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('西瓜', 28954.00, '2026-07-30 数据清理期初结转（清理前余额 21762）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('小泵', 53756.00, '2026-07-30 数据清理期初结转（清理前余额 12531）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('小梦', 6480.00, '2026-07-30 数据清理期初结转（清理前余额 5572）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('君健', 32432.00, '2026-07-30 数据清理期初结转（清理前余额 3386）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('小靖', 3815.00, '2026-07-30 数据清理期初结转（清理前余额 2239）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('纯净', 2339.00, '2026-07-30 数据清理期初结转（清理前余额 1882）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00'),
  ('茶茶', 2021.00, '2026-07-30 数据清理期初结转（清理前余额 161）', '系统清理', TIMESTAMPTZ '2026-07-30T00:00:00+07:00');

COMMIT;

-- ========== 执行后验证 ==========
-- 待转账总额应 ≈ 99413
-- 库存应 ≈ 5845
-- 净收入应 ≈ 99413
-- 销售数量应 ≈ 29561，赠送数量应 ≈ 3251
