-- 修复商人提现表策略

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "merchant_withdrawals_policy" ON merchant_withdrawals;

-- 重新创建策略
CREATE POLICY "merchant_withdrawals_all_access" ON merchant_withdrawals FOR ALL TO anon, authenticated USING (true);

-- 确保表存在并启用 RLS
CREATE TABLE IF NOT EXISTS merchant_withdrawals (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    withdrawal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE merchant_withdrawals ENABLE ROW LEVEL SECURITY;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_merchant_name ON merchant_withdrawals(merchant_name);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_withdrawal_date ON merchant_withdrawals(withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_created_at ON merchant_withdrawals(created_at);


