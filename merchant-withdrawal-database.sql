-- 商人提现功能数据库表

-- 创建商人提现记录表
CREATE TABLE IF NOT EXISTS merchant_withdrawals (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    withdrawal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE merchant_withdrawals ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "merchant_withdrawals_policy" ON merchant_withdrawals FOR ALL TO anon, authenticated USING (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_merchant_name ON merchant_withdrawals(merchant_name);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_withdrawal_date ON merchant_withdrawals(withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_created_at ON merchant_withdrawals(created_at);


