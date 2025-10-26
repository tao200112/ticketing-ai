#!/bin/bash

echo "🚀 启动开发环境..."

# 检查 Node.js 版本
node_version=$(node -v)
echo "📦 Node.js 版本: $node_version"

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend && npm install && cd ..

# 检查环境变量
echo "🔧 检查环境变量..."
if [ ! -f .env.local ]; then
    echo "⚠️  未找到 .env.local 文件，请复制 env.example 并配置"
    cp env.example .env.local
    echo "✅ 已创建 .env.local 文件，请编辑配置"
fi

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend && npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动前端服务
echo "🔧 启动前端服务..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "✅ 开发环境已启动"
echo "🌐 前端: http://localhost:3000"
echo "🔧 后端: http://localhost:3001"
echo "📊 健康检查: http://localhost:3001/health"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
