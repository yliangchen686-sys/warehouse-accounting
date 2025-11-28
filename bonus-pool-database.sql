-- 奖金池功能数据库表结构
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 创建奖金池扣款记录表
CREATE TABLE IF NOT EXISTS bonus_deduction_log (
    id SERIAL PRIMARY KEY,
    deduction_amount DECIMAL(12,2) NOT NULL,
    operator_id VARCHAR(100) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    remaining_balance DECIMAL(12,2) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为奖金池扣款表启用 RLS
ALTER TABLE bonus_deduction_log ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow all operations on bonus_deduction_log" ON bonus_deduction_log;

-- 创建奖金池扣款表的 RLS 策略（允许所有认证用户查看和插入）
CREATE POLICY "Allow all operations on bonus_deduction_log" 
ON bonus_deduction_log 
FOR ALL 
TO authenticated, anon 
USING (true);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_bonus_deduction_log_year_month ON bonus_deduction_log(year, month);
CREATE INDEX IF NOT EXISTS idx_bonus_deduction_log_created_at ON bonus_deduction_log(created_at);
CREATE INDEX IF NOT EXISTS idx_bonus_deduction_log_operator_id ON bonus_deduction_log(operator_id);

-- 添加表注释
COMMENT ON TABLE bonus_deduction_log IS '奖金池扣款记录表';
COMMENT ON COLUMN bonus_deduction_log.deduction_amount IS '扣除金额';
COMMENT ON COLUMN bonus_deduction_log.operator_id IS '操作人ID';
COMMENT ON COLUMN bonus_deduction_log.operator_name IS '操作人姓名';
COMMENT ON COLUMN bonus_deduction_log.remaining_balance IS '扣款后剩余奖金余额';
COMMENT ON COLUMN bonus_deduction_log.year IS '年份';
COMMENT ON COLUMN bonus_deduction_log.month IS '月份';

