# Vue3 WebSocket 聊天室

基于 Vue3 和 WebSocket 的实时聊天应用，支持发送文本消息、表情、图片和文件。

## 目录结构

```
vue3-websocket-chat/
               
├──├── src/                #前端 Vue 项目
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
### 消息类型
- 文本消息：支持表情输入
- 图片消息：支持预览和放大
- 文件消息：支持下载

### 用户功能
- 在线状态显示
- 用户头像显示
- 实时用户列表更新

### 界面特性
- 深色/浅色主题
- 响应式布局
- 动画过渡效果
- 消息时间戳显示
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
cd vue3-websocket-chat
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
cd vue3-websocket-chat
npm run dev
```

4. 访问应用
打开浏览器访问 http://localhost:5173

## ⚙️ 配置说明

### 文件上传
- 支持的图片格式：jpg、jpeg、png、gif
- 最大文件大小：10MB

### 服务器配置
- 默认端口：8888
- WebSocket 路径：ws://localhost:8888
- 上传文件路径：/uploads

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交改动：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Socket.io](https://socket.io/)
