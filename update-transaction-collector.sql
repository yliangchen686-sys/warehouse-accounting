-- 更新交易记录中的收款人名称

-- 将交易记录中的"系统管理员"改为"商人"
UPDATE transactions 
SET collector = '商人' 
WHERE collector = '系统管理员';

-- 验证更新结果
SELECT DISTINCT collector FROM transactions ORDER BY collector;


