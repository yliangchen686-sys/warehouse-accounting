-- 彻底清理并重建商人提现表

-- 1. 删除表（如果存在）
DROP TABLE IF EXISTS merchant_withdrawals CASCADE;

-- 2. 重新创建表
CREATE TABLE merchant_withdrawals (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    withdrawal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 启用 RLS
ALTER TABLE merchant_withdrawals ENABLE ROW LEVEL SECURITY;

-- 4. 创建新策略
CREATE POLICY "allow_all_merchant_withdrawals" ON merchant_withdrawals FOR ALL TO anon, authenticated USING (true);

-- 5. 创建索引
CREATE INDEX idx_merchant_withdrawals_merchant_name ON merchant_withdrawals(merchant_name);
CREATE INDEX idx_merchant_withdrawals_withdrawal_date ON merchant_withdrawals(withdrawal_date);
CREATE INDEX idx_merchant_withdrawals_created_at ON merchant_withdrawals(created_at);

-- 6. 验证表创建
SELECT table_name FROM information_schema.tables WHERE table_name = 'merchant_withdrawals';


