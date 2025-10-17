-- ====================================
-- 为 transactions 表添加 product_name 列
-- ====================================

-- 添加 product_name 列（如果不存在）
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);

-- 验证表结构
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
