# Vue3 WebSocket 聊天室

基于 Vue3 和 WebSocket 的现代化实时聊天应用，支持多种消息类型和丰富的交互功能。

## ✨ 功能特点

### 💬 消息功能
- 实时消息通信
- 支持文本、表情、图片、文件等多种消息类型
- 消息时间戳显示
- 消息状态提示
- 支持图片复制粘贴发送
- 图片预览与放大功能

### 📷 图片处理
- 图片上传与预览
- 支持剪贴板图片直接粘贴
- 图片压缩与优化
- 图片预览放大功能
- 支持多种图片格式

### 📁 文件处理
- 文件上传与下载
- 文件类型识别
- 文件大小限制
- 上传进度显示

### 👥 用户功能
- 在线用户列表
- 用户状态显示
- 用户头像显示
- 加入/离开提醒
- 实时在线状态更新

### 🎨 界面特性
- 响应式布局设计
- 深色/浅色主题切换
- 流畅的动画过渡效果
- 优雅的界面交互
- 移动端适配

## 🛠 技术栈

### 前端
- Vue 3 - 渐进式 JavaScript 框架
- Element Plus - 现代化的 UI 组件库
- Socket.io-client - WebSocket 客户端
- Vite - 下一代前端构建工具

### 后端
- Node.js - JavaScript 运行时
- Express - Web 应用框架
- Socket.io - 实时双向通信
- Multer - 文件上传处理

## 📦 项目结构
bash
vue3-websocket-chat/
├── src/ # 前端源码
│ ├── components/ # 组件
│ ├── assets/ # 静态资源
│ ├── styles/ # 样式文件
│ ├── App.vue # 主组件
│ └── main.js # 入口文件
├── server/ # 后端源码
│ ├── uploads/ # 上传文件目录
│ └── server.js # 服务器入口
├── public/ # 静态文件
└── package.json # 项目配置

## 🚀 快速开始

### 环境要求
- Node.js >= 14
- npm >= 6

### 安装与运行
1. 克隆项目
bash
git clone https://github.com/YOUR_USERNAME/vue3-websocket-chat.git
cd vue3-websocket-chat

2. 安装依赖
bash
前端依赖
npm install
后端依赖
cd server && npm install

3. 启动服务
bash
后端服务
cd server && npm start
前端服务（新终端）
npm run dev

4. 访问应用
浏览器访问 http://localhost:5173

## ⚙️ 配置说明

### 文件上传配置
- 支持格式：jpg、jpeg、png、gif、webp
- 图片最大：10MB
- 文件最大：50MB
- 上传路径：/uploads

### 服务器配置
- 默认端口：8888
- WebSocket：ws://localhost:8888
- 静态文件：/uploads

### 图片处理配置
- 自动压缩：>1MB 的图片
- 预览尺寸：最大 300px
- 支持格式：主流图片格式
- 粘贴功能：支持剪贴板图片

## 📝 使用说明

### 图片发送
1. 点击上传按钮选择图片
2. 直接拖拽图片到输入框
3. 复制图片后直接粘贴
4. 点击图片可放大预览

### 文件处理
1. 支持拖拽上传
2. 显示上传进度
3. 支持取消上传
4. 提供下载链接

## 🤝 贡献指南

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 PR

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Socket.io](https://socket.io/)