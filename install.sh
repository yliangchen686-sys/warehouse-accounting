#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo -e "   仓储记账系统 - 自动安装脚本"
echo -e "========================================${NC}"
echo

# 检查 Node.js 是否安装
echo -e "${BLUE}[1/5] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 16+ 版本${NC}"
    echo -e "${YELLOW}   下载地址: https://nodejs.org/${NC}"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 环境检查通过 ($NODE_VERSION)${NC}"
fi

# 检查 npm 是否可用
echo
echo -e "${BLUE}[2/5] 检查 npm 包管理器...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 不可用${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm 可用 ($NPM_VERSION)${NC}"
fi

# 安装项目依赖
echo
echo -e "${BLUE}[3/5] 安装项目依赖...${NC}"
echo -e "${YELLOW}这可能需要几分钟时间，请耐心等待...${NC}"
if npm install; then
    echo -e "${GREEN}✅ 依赖安装成功${NC}"
else
    echo -e "${RED}❌ 依赖安装失败${NC}"
    exit 1
fi

# 检查 electron 是否需要额外安装
echo
echo -e "${BLUE}[4/5] 检查 Electron...${NC}"
if [ ! -d "node_modules/electron" ]; then
    echo -e "${YELLOW}正在安装 Electron...${NC}"
    npm install electron --save-dev
fi
echo -e "${GREEN}✅ Electron 准备就绪${NC}"

# 提示配置 Supabase
echo
echo -e "${BLUE}[5/5] 配置提醒...${NC}"
echo
echo -e "${YELLOW}⚠️  重要提醒：${NC}"
echo -e "${YELLOW}   1. 请在 Supabase 创建新项目${NC}"
echo -e "${YELLOW}   2. 在 SQL 编辑器中运行 database-setup.sql 脚本${NC}"
echo -e "${YELLOW}   3. 修改 src/config/supabase.js 中的配置信息${NC}"
echo -e "${YELLOW}   4. 替换 YOUR_SUPABASE_URL 和 YOUR_SUPABASE_ANON_KEY${NC}"
echo

# 创建启动脚本
echo -e "${BLUE}创建启动脚本...${NC}"

# 开发模式启动脚本
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "启动开发模式..."
echo "启动 React 开发服务器..."
npm start &
REACT_PID=$!

echo "等待 React 服务器启动..."
sleep 10

echo "启动 Electron 应用..."
npm run electron &
ELECTRON_PID=$!

echo "应用已启动！"
echo "React PID: $REACT_PID"
echo "Electron PID: $ELECTRON_PID"
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $REACT_PID $ELECTRON_PID 2>/dev/null; exit" INT
wait
EOF

# 商人端启动脚本
cat > start-merchant.sh << 'EOF'
#!/bin/bash
echo "启动商人端..."
npm run electron-dev
EOF

# 员工端启动脚本
cat > start-employee.sh << 'EOF'
#!/bin/bash
echo "启动员工端..."
export REACT_APP_ROLE=employee
npm run electron-dev
EOF

# 设置执行权限
chmod +x start-dev.sh
chmod +x start-merchant.sh
chmod +x start-employee.sh

echo -e "${GREEN}✅ 启动脚本已创建${NC}"

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${BLUE}📋 下一步操作：${NC}"
echo -e "${YELLOW}   1. 配置 Supabase（详见 README.md）${NC}"
echo -e "${YELLOW}   2. 运行 ./start-dev.sh 启动开发模式${NC}"
echo -e "${YELLOW}   3. 或运行 npm run electron-dev 启动应用${NC}"
echo
echo -e "${BLUE}📖 详细说明请查看 README.md 文件${NC}"
echo -e "${BLUE}🔑 默认管理员账户: admin / admin123${NC}"
echo


