// 更新本地存储中的收款人名称
// 在浏览器控制台中运行此脚本

function updateLocalCollectorNames() {
  // 更新本地交易记录
  const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
  let updated = false;
  
  localTransactions.forEach(transaction => {
    if (transaction.collector === '系统管理员') {
      transaction.collector = '商人';
      updated = true;
    }
  });
  
  if (updated) {
    localStorage.setItem('localTransactions', JSON.stringify(localTransactions));
    console.log('本地交易记录中的收款人名称已更新');
  }

  // 更新本地员工转账记录
  const localTransfers = JSON.parse(localStorage.getItem('localEmployeeTransfers') || '[]');
  let transfersUpdated = false;
  
  localTransfers.forEach(transfer => {
    if (transfer.employee_name === '系统管理员') {
      transfer.employee_name = '商人';
      transfersUpdated = true;
    }
  });
  
  if (transfersUpdated) {
    localStorage.setItem('localEmployeeTransfers', JSON.stringify(localTransfers));
    console.log('本地转账记录中的员工名称已更新');
  }

  // 更新本地客户绑定记录
  const localBindings = JSON.parse(localStorage.getItem('localCustomerBindings') || '[]');
  let bindingsUpdated = false;
  
  localBindings.forEach(binding => {
    if (binding.employee_name === '系统管理员') {
      binding.employee_name = '商人';
      bindingsUpdated = true;
    }
  });
  
  if (bindingsUpdated) {
    localStorage.setItem('localCustomerBindings', JSON.stringify(localBindings));
    console.log('本地客户绑定记录中的员工名称已更新');
  }

  console.log('本地数据更新完成！请刷新页面查看效果。');
}

// 执行更新
updateLocalCollectorNames();


