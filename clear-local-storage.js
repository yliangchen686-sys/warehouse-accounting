// 清理本地存储脚本
// 在浏览器控制台中运行此脚本来清理本地数据

// 清理员工本地存储
localStorage.removeItem('localEmployees');
console.log('已清理本地员工数据');

// 清理交易本地存储
localStorage.removeItem('localTransactions');
console.log('已清理本地交易数据');

// 清理客户绑定本地存储
localStorage.removeItem('localCustomerBindings');
console.log('已清理本地客户绑定数据');

// 清理转账记录本地存储
localStorage.removeItem('localEmployeeTransfers');
console.log('已清理本地转账记录');

// 保留用户登录状态
console.log('本地数据清理完成，请刷新页面重新加载数据');
console.log('用户登录状态已保留');


