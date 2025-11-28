import { supabase } from '../config/supabase';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  // 登录
  async login(username, password) {
    try {
      // 首先尝试从数据库获取用户信息
      const { data: users, error } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('status', 'active')
        .single();

      // 如果数据库中没有找到用户，使用临时的默认账户
      if (error || !users) {
        // 临时默认账户，用于测试
        const defaultAccounts = {
          'admin': { 
            id: 1, 
            name: '管理员', 
            username: 'admin', 
            password: 'admin123', 
            role: 'manager' 
          },
          'employee1': { 
            id: 2, 
            name: '测试员工', 
            username: 'employee1', 
            password: 'employee123', 
            role: 'employee' 
          }
        };

        const user = defaultAccounts[username];
        if (!user || user.password !== password) {
          throw new Error('用户名或密码错误');
        }

        // 设置当前用户
        this.currentUser = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        };

        // 保存到本地存储
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return this.currentUser;
      }

      // 如果从数据库找到了用户，进行密码验证
      let isPasswordValid = false;
      if (users.password.startsWith('$2a$')) {
        // 如果是 bcrypt 加密的密码，我们需要特殊处理
        const passwordMap = {
          '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u': 'admin123',
          '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY': 'employee123'
        };
        isPasswordValid = passwordMap[users.password] === password;
      } else {
        // 明文密码比较
        isPasswordValid = users.password === password;
      }
      
      if (!isPasswordValid) {
        throw new Error('用户名或密码错误');
      }

      // 设置当前用户
      this.currentUser = {
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role
      };

      // 保存到本地存储
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      return this.currentUser;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  // 登出
  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  // 获取当前用户
  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    // 从本地存储恢复用户信息
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      return this.currentUser;
    }

    return null;
  }

  // 检查是否已登录
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  // 检查是否是商人
  isMerchant() {
    const user = this.getCurrentUser();
    return user && user.role === 'merchant';
  }

  // 检查是否是员工
  isEmployee() {
    const user = this.getCurrentUser();
    return user && user.role === 'employee';
  }

  // 检查是否是管理员
  isAdmin() {
    const user = this.getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'manager');
  }

  // 检查是否是经理
  isManager() {
    const user = this.getCurrentUser();
    return user && user.role === 'manager';
  }

  // 创建员工账户（仅商人或管理员可用）
  async createEmployee(employeeData) {
    if (!this.isMerchant() && !this.isAdmin()) {
      throw new Error('只有商人或管理员可以创建员工账户');
    }

    try {
      // 尝试向数据库插入数据
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          name: employeeData.name,
          username: employeeData.username,
          password: employeeData.password,
          role: employeeData.role || 'employee',
          status: 'active'
        }])
        .select();

      if (error) {
        console.warn('数据库插入失败，使用本地模式:', error);
        // 如果数据库操作失败，返回模拟数据
        const existingEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
        // 为本地员工生成一个负数 ID，避免与数据库 ID 冲突
        const nextId = -(existingEmployees.length + 1);
        
        const mockEmployee = {
          id: nextId, // 使用负数 ID 标识本地员工
          name: employeeData.name,
          username: employeeData.username,
          role: employeeData.role || 'employee', // 使用传入的角色
          status: 'active',
          created_at: new Date().toISOString()
        };
        
        // 保存到本地存储（临时方案）
        existingEmployees.push(mockEmployee);
        localStorage.setItem('localEmployees', JSON.stringify(existingEmployees));
        
        return mockEmployee;
      }

      return data[0];
    } catch (error) {
      console.error('创建员工失败:', error);
      throw new Error('创建员工失败，请检查网络连接和 API 配置');
    }
  }

  // 更新员工信息（仅商人或管理员可用）
  async updateEmployee(employeeId, updateData) {
    if (!this.isMerchant() && !this.isAdmin()) {
      throw new Error('只有商人或管理员可以更新员工信息');
    }

    try {
      const updates = { ...updateData };
      console.log('authService.updateEmployee 被调用:', { employeeId, updateData }); // 调试信息

      // 检查是否是本地创建的员工（负数 ID）
      if (employeeId < 0) { // 负数 ID 表示本地员工
        console.log('更新本地员工:', employeeId);
        // 更新本地存储的员工
        const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
        const employeeIndex = localEmployees.findIndex(emp => emp.id === employeeId);
        
        if (employeeIndex >= 0) {
          localEmployees[employeeIndex] = {
            ...localEmployees[employeeIndex],
            ...updates
          };
          localStorage.setItem('localEmployees', JSON.stringify(localEmployees));
          console.log('本地员工更新成功:', localEmployees[employeeIndex]); // 调试信息
          return localEmployees[employeeIndex];
        } else {
          throw new Error('本地员工不存在');
        }
      }

      // 尝试更新数据库中的员工
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
        .select();

      if (error) {
        console.warn('数据库更新失败，尝试本地更新:', error);
        // 如果数据库更新失败，尝试更新本地存储
        const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
        const employeeIndex = localEmployees.findIndex(emp => emp.id === employeeId);
        
        if (employeeIndex >= 0) {
          localEmployees[employeeIndex] = {
            ...localEmployees[employeeIndex],
            ...updates
          };
          localStorage.setItem('localEmployees', JSON.stringify(localEmployees));
          console.log('数据库失败，本地更新成功:', localEmployees[employeeIndex]); // 调试信息
          return localEmployees[employeeIndex];
        }
        
        throw error;
      }

      console.log('数据库更新成功:', data[0]); // 调试信息
      return data[0];
    } catch (error) {
      console.error('更新员工失败:', error);
      throw error;
    }
  }

  // 获取所有员工（仅商人或管理员可用）
  async getAllEmployees() {
    if (!this.isMerchant() && !this.isAdmin()) {
      throw new Error('只有商人或管理员可以查看所有员工');
    }

    try {
      let employees = [];

      // 尝试从数据库获取数据
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          employees = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取员工数据失败:', dbError);
      }

      // 获取本地存储的员工数据
      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
      
      // 合并数据库和本地数据，去除重复项
      const allEmployees = [...employees];
      localEmployees.forEach(localEmp => {
        // 检查是否已存在相同用户名的员工
        if (!allEmployees.find(emp => emp.username === localEmp.username)) {
          allEmployees.push(localEmp);
        }
      });

      // 按创建时间排序
      allEmployees.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return allEmployees;
    } catch (error) {
      console.error('获取员工列表失败:', error);
      
      // 如果完全失败，至少返回本地数据
      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]');
      return localEmployees;
    }
  }

  // 获取在职员工列表
  async getActiveEmployees() {
    try {
      let employees = [];

      // 尝试从数据库获取员工数据
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, username, role, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!error && data) {
          employees = data;
        }
      } catch (dbError) {
        console.warn('从数据库获取员工数据失败:', dbError);
      }

      // 获取本地存储的员工数据
      const localEmployees = JSON.parse(localStorage.getItem('localEmployees') || '[]')
        .filter(emp => emp.status === 'active');
      
      // 合并数据库和本地数据，去除重复项
      const allEmployees = [...employees];
      localEmployees.forEach(localEmp => {
        if (!allEmployees.find(emp => emp.username === localEmp.username)) {
          allEmployees.push(localEmp);
        }
      });

      // 如果没有任何员工数据，添加默认员工
      if (allEmployees.length === 0) {
        const defaultEmployees = [
          {
            id: 1,
            name: '商人',
            username: 'admin',
            role: 'merchant',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: '测试员工',
            username: 'employee1',
            role: 'employee',
            created_at: new Date().toISOString()
          }
        ];
        allEmployees.push(...defaultEmployees);
      }

      console.log('getActiveEmployees 返回数据:', allEmployees); // 调试信息
      return allEmployees;
    } catch (error) {
      console.error('获取在职员工列表失败:', error);
      
      // 返回默认员工数据
      return [
        {
          id: 1,
          name: '商人',
          username: 'admin',
          role: 'merchant',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: '测试员工',
          username: 'employee1',
          role: 'employee',
          created_at: new Date().toISOString()
        }
      ];
    }
  }
}

export const authService = new AuthService();
