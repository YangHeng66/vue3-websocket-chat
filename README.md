# Vue3 WebSocket 聊天室

基于 Vue3 和 WebSocket 的实时聊天应用，支持发送文本消息、表情、图片和文件。

## 目录结构

```
vue3-websocket-chat/
├── client/               # 前端 Vue 项目
│   ├── src/
│   │   ├── components/
│   │   ├── assets/
│   │   ├── App.vue      # 主组件
│   │   └── main.js      # 入口文件
│   ├── public/
│   └── package.json
└── server/              # 后端 Node.js 项目
    ├── uploads/         # 上传文件目录
    ├── server.js       # 服务器入口
    └── package.json
```

## 功能特点

- 💬 实时消息通信
- 😊 表情发送
- 📷 图片上传与预览
- 📁 文件上传与下载
- 👥 在线用户列表
- 🔔 用户加入/离开提醒

## 技术栈

- 前端：Vue 3 + Element Plus + Socket.io-client
- 后端：Node.js + Express + Socket.io + Multer

## 本地开发

1. 克隆项目
```bash
git clone https://github.com/YOUR_USERNAME/vue3-websocket-chat.git
cd vue3-websocket-chat
```

2. 安装依赖
```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

3. 启动服务
```bash
# 启动后端服务
cd server
npm start

# 新开终端，启动前端服务
cd client
npm run dev
```

4. 访问应用
打开浏览器访问 http://localhost:5173

## 注意事项

- 确保 Node.js 版本 >= 14
- 上传文件大小限制为 10MB
- 支持的图片格式：jpg、jpeg、png、gif

