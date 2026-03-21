-- 交易申请功能数据库脚本
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 1. 创建交易申请表
CREATE TABLE IF NOT EXISTS transaction_requests (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'gift', 'return')),  -- 交易类型：销售、赠送、回收
    customer_name VARCHAR(200) NOT NULL,  -- 客户名称
    collector VARCHAR(100) NOT NULL,    -- 收款员工
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 数量
    gift_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 赠送数量
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 单价
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 总金额
    applicant_name VARCHAR(100) NOT NULL,  -- 申请人（员工名）
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),  -- 状态：待审核、已通过、已拒绝
    reviewed_by VARCHAR(100),  -- 审核人（商人名）
    reviewed_at TIMESTAMP WITH TIME ZONE,  -- 审核时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 申请时间
    notes TEXT  -- 备注
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_transaction_requests_status ON transaction_requests(status);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_applicant ON transaction_requests(applicant_name);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_created_at ON transaction_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_reviewed_by ON transaction_requests(reviewed_by);

-- 3. 启用 RLS
ALTER TABLE transaction_requests ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "transaction_requests_select" ON transaction_requests;
DROP POLICY IF EXISTS "transaction_requests_insert" ON transaction_requests;
DROP POLICY IF EXISTS "transaction_requests_update" ON transaction_requests;

-- 所有用户可查询
CREATE POLICY "transaction_requests_select" ON transaction_requests 
    FOR SELECT TO anon, authenticated 
    USING (true);

-- 所有用户可插入申请
CREATE POLICY "transaction_requests_insert" ON transaction_requests 
    FOR INSERT TO anon, authenticated 
    WITH CHECK (true);

-- 所有用户可更新（用于审核）
CREATE POLICY "transaction_requests_update" ON transaction_requests 
    FOR UPDATE TO anon, authenticated 
    USING (true);

-- 5. 添加表注释
COMMENT ON TABLE transaction_requests IS '交易申请表，记录员工提交的交易申请';
COMMENT ON COLUMN transaction_requests.type IS '交易类型：sale=销售, gift=赠送, return=回收';
COMMENT ON COLUMN transaction_requests.status IS '申请状态：pending=待审核, approved=已通过, rejected=已拒绝';
COMMENT ON COLUMN transaction_requests.applicant_name IS '申请人（员工名）';
COMMENT ON COLUMN transaction_requests.reviewed_by IS '审核人（商人名）';
