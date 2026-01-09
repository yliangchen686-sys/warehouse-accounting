-- 奖金池优化：月度缓存表
-- 用于存储每月奖金池计算结果，避免每次重新计算所有历史数据
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 创建月度奖金池缓存表
CREATE TABLE IF NOT EXISTS bonus_pool_monthly (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    return_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    fixed_cost DECIMAL(12,2) NOT NULL DEFAULT 30000,
    net_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    monthly_bonus_pool DECIMAL(12,2) NOT NULL DEFAULT 0,
    cumulative_bonus_pool DECIMAL(12,2) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month)
);

-- 为月度奖金池表启用 RLS
ALTER TABLE bonus_pool_monthly ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow all operations on bonus_pool_monthly" ON bonus_pool_monthly;

-- 创建月度奖金池表的 RLS 策略（允许所有认证用户查看和插入）
CREATE POLICY "Allow all operations on bonus_pool_monthly" 
ON bonus_pool_monthly 
FOR ALL 
TO authenticated, anon 
USING (true);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_bonus_pool_monthly_year_month ON bonus_pool_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_bonus_pool_monthly_updated_at ON bonus_pool_monthly(updated_at);

-- 添加表注释
COMMENT ON TABLE bonus_pool_monthly IS '月度奖金池缓存表，存储每月计算结果';
COMMENT ON COLUMN bonus_pool_monthly.year IS '年份';
COMMENT ON COLUMN bonus_pool_monthly.month IS '月份';
COMMENT ON COLUMN bonus_pool_monthly.sales_amount IS '当月销售额';
COMMENT ON COLUMN bonus_pool_monthly.return_amount IS '当月回收金额';
COMMENT ON COLUMN bonus_pool_monthly.total_salary IS '当月工资总额';
COMMENT ON COLUMN bonus_pool_monthly.fixed_cost IS '固定成本';
COMMENT ON COLUMN bonus_pool_monthly.net_profit IS '当月净利润';
COMMENT ON COLUMN bonus_pool_monthly.monthly_bonus_pool IS '当月奖金池（净利润×1%）';
COMMENT ON COLUMN bonus_pool_monthly.cumulative_bonus_pool IS '累计奖金池（到该月为止的总和）';

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_bonus_pool_monthly_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_bonus_pool_monthly_updated_at ON bonus_pool_monthly;
CREATE TRIGGER trigger_update_bonus_pool_monthly_updated_at
    BEFORE UPDATE ON bonus_pool_monthly
    FOR EACH ROW
    EXECUTE FUNCTION update_bonus_pool_monthly_updated_at();
