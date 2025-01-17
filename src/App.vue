<template>
  <div class="chat-container">
    <el-container v-if="isLoggedIn">
      <el-aside width="240px" class="user-sidebar">
        <div class="sidebar-header">
          <h3>
            <el-icon>
              <UserFilled />
            </el-icon>
            在线用户 ({{ users.length }})
          </h3>
        </div>
        <div class="user-list">
          <div v-for="user in users" :key="user" class="user-item">
            <el-avatar :size="32" class="user-avatar">
              {{ user.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <span class="user-name">{{ user }}</span>
              <span class="user-status">在线</span>
            </div>
          </div>
        </div>
      </el-aside>
      <el-main class="chat-main">
        <div class="chat-messages" ref="messagesContainer">
          <div v-for="(msg, index) in messages" :key="index" class="message"
            :class="{ 'my-message': msg.username === username }">
            <div class="message-header">
              <span class="username">{{ msg.username }}</span>
              <span class="time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-content">
              <template v-if="msg.type === 'text'">
                {{ msg.message }}
              </template>
              <template v-else-if="msg.type === 'image'">
                <img :src="msg.message" class="message-image" @click="openImageViewer(msg.message)" />
              </template>
              <template v-else-if="msg.type === 'file'">
                <a :href="msg.message" target="_blank" class="file-link">
                  <el-icon>
                    <Document />
                  </el-icon>
                  下载文件
                </a>
              </template>
            </div>
          </div>
        </div>
        <div class="input-wrapper">
          <div class="input-area">
            <el-input v-model="newMessage" placeholder="输入消息..." @keyup.enter="sendMessage" @paste="handlePaste">
              <template #append>
                <el-button-group>
                  <el-button @click="sendMessage">发送</el-button>
                  <el-popover placement="top" :width="300" trigger="click">
                    <template #reference>
                      <el-button>
                        <el-icon>
                          <ChatRound />
                        </el-icon>
                      </el-button>
                    </template>
                    <div class="emoji-container">
                      <div v-for="emoji in emojis" :key="emoji" class="emoji-item" @click="insertEmoji(emoji)">
                        {{ emoji }}
                      </div>
                    </div>
                  </el-popover>
                  <el-upload class="upload-button" :action="uploadUrl" :show-file-list="false"
                    :on-success="handleUploadSuccess" :on-error="handleUploadError" :before-upload="beforeUpload">
                    <el-button>
                      <el-icon>
                        <Upload />
                      </el-icon>
                    </el-button>
                  </el-upload>
                </el-button-group>
              </template>
            </el-input>
          </div>
        </div>
      </el-main>
    </el-container>
    <div v-else class="login-container">
      <div class="login-box">
        <div class="login-header">
          <el-icon class="login-icon">
            <ChatRound />
          </el-icon>
          <h2 class="login-title">Vue3 聊天室</h2>
          <p class="login-subtitle">加入聊天，开始交谈</p>
        </div>
        <el-input v-model="username" placeholder="请输入用户名" class="login-input" :prefix-icon="UserFilled"
          @keyup.enter="login">
          <template #append>
            <el-button type="primary" @click="login">
              <el-icon>
                <Position />
              </el-icon>
              加入聊天
            </el-button>
          </template>
        </el-input>
      </div>
    </div>
    <el-image-viewer v-if="showImageViewer" :url-list="[previewImage]" @close="closeImageViewer" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { io } from 'socket.io-client';
import { ElMessage } from 'element-plus';
import { Document, Upload, ChatRound, UserFilled, Position } from '@element-plus/icons-vue';

const socket = io('http://localhost:8888');
const username = ref('');
const isLoggedIn = ref(false);
const users = ref([]);
const messages = ref([]);
const newMessage = ref('');
const messagesContainer = ref(null);
const uploadUrl = 'http://localhost:8888/upload';

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠'
]

const insertEmoji = (emoji) => {
  newMessage.value += emoji
}

const login = () => {
  if (username.value.trim()) {
    isLoggedIn.value = true;
    socket.emit('join', username.value);
  }
};

const sendMessage = () => {
  if (newMessage.value.trim()) {
    socket.emit('message', {
      message: newMessage.value,
      type: 'text'
    });
    newMessage.value = '';
  }
};

const handleUploadSuccess = async (response) => {
  try {
    const isImage = response.path.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    socket.emit('message', {
      message: `http://localhost:8888${response.path}`,
      type: isImage ? 'image' : 'file'
    });

    ElMessage.success(isImage ? '图片发送成功' : '文件发送成功');
  } catch (error) {
    ElMessage.error('发送失败：' + error.message);
  }
};

const handleUploadError = (error) => {
  ElMessage.error('文件上传失败：' + error.message);
};

const beforeUpload = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB');
    return false;
  }
  return true;
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

socket.on('message', (msg) => {
  messages.value.push(msg);
  scrollToBottom();
});

socket.on('userJoined', (data) => {
  users.value = data.users;
  messages.value.push({
    username: 'System',
    message: `${data.username} 加入了聊天室`,
    type: 'text',
    timestamp: new Date()
  });
  scrollToBottom();
});

socket.on('userLeft', (data) => {
  users.value = data.users;
  messages.value.push({
    username: 'System',
    message: `${data.username} 离开了聊天室`,
    type: 'text',
    timestamp: new Date()
  });
  scrollToBottom();
});

const showImageViewer = ref(false);
const previewImage = ref('');

const openImageViewer = (imageUrl) => {
  previewImage.value = imageUrl;
  showImageViewer.value = true;
};

const closeImageViewer = () => {
  showImageViewer.value = false;
  previewImage.value = '';
};

const handlePaste = async (event) => {
  const items = event.clipboardData.items;

  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault();

      const file = item.getAsFile();
      const formData = new FormData();
      formData.append('file', file);

      try {
        ElMessage.info('正在上传图片...');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('上传失败');
        }

        const data = await response.json();

        socket.emit('message', {
          message: `http://localhost:8888${data.path}`,
          type: 'image'
        });

        ElMessage.success('图片发送成功');
      } catch (error) {
        ElMessage.error('图片上传失败：' + error.message);
      }

      break;
    }
  }
};
</script>

<style scoped>
.chat-container {
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.el-container {
  width: 1200px;
  height: 90vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.el-aside {
  background: #2d3436;
  color: white;
  border-right: 1px solid #dcdfe6;
}

.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  animation: fadeInUp 0.6s ease;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
}

.login-title {
  font-size: 24px;
  color: #2c3e50;
  margin: 0 0 8px;
  font-weight: 600;
}

.login-subtitle {
  font-size: 14px;
  color: #606266;
  margin: 0;
  opacity: 0.8;
}

.login-input {
  margin-top: 20px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-input__inner) {
  height: 44px;
}

:deep(.el-button) {
  height: 44px;
  padding: 0 24px;
  font-weight: 500;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加响应式样式 */
@media screen and (max-width: 480px) {
  .login-box {
    margin: 20px;
    padding: 30px;
  }

  .login-title {
    font-size: 20px;
  }

  .login-icon {
    font-size: 40px;
  }
}

/* 添加悬停效果 */
:deep(.el-button) {
  transition: transform 0.2s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-2px);
}

/* 添加输入框聚焦效果 */
:deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 1px #409EFF !important;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fff;
}

.message {
  margin-bottom: 20px;
  max-width: 80%;
  animation: fadeIn 0.3s ease;
}

.my-message {
  margin-left: auto;
}

.message-header {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #94a3b8;
}

.message-content {
  padding: 12px 16px;
  background: #f1f5f9;
  border-radius: 12px;
  position: relative;
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.my-message .message-content {
  background: #3b82f6;
  color: white;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.message-image:hover {
  transform: scale(1.02);
}

.file-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  text-decoration: none;
  padding: 10px 16px;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.my-message .file-link {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.file-link:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
}

.my-message .file-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:focus-within) {
  border-color: #3b82f6;
}

:deep(.el-input__inner) {
  height: 44px;
  padding: 0 16px;
}

:deep(.el-button-group) {
  margin-left: 8px;
}

:deep(.el-button) {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
}

.emoji-container {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  padding: 12px;
}

.emoji-item {
  font-size: 24px;
  cursor: pointer;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.emoji-item:hover {
  background: #f1f5f9;
  transform: scale(1.1);
}

.user-list {
  padding: 20px;
}

.user-list h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #dcdfe6;
  padding-bottom: 10px;
  border-bottom: 1px solid #34495e;
}

.user-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.user-list li {
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-list li:hover {
  background: #34495e;
}

.user-sidebar {
  background: #2c3e50;
  color: #fff;
  border-right: 1px solid #34495e;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #34495e;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ecf0f1;
}

.user-list {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-item:hover {
  background: #34495e;
  transform: translateX(4px);
}

.user-avatar {
  background: #3498db;
  color: white;
  font-weight: bold;
}

.user-info {
  margin-left: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  color: #ecf0f1;
  margin-bottom: 2px;
}

.user-status {
  font-size: 12px;
  color: #2ecc71;
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-status::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #2ecc71;
  border-radius: 50%;
}

/* 自定义滚动条 */
.user-list::-webkit-scrollbar {
  width: 4px;
}

.user-list::-webkit-scrollbar-thumb {
  background: #34495e;
  border-radius: 2px;
}

.user-list::-webkit-scrollbar-track {
  background: transparent;
}

/* 动画效果 */
.user-item {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 系统消息样式 */
.message .message-content:has(.username:contains('System')) {
  background: #f1f5f9;
  color: #64748b;
  font-style: italic;
  text-align: center;
  border: 1px dashed #cbd5e1;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .el-container {
    width: 100%;
    height: 100vh;
    border-radius: 0;
  }

  .message {
    max-width: 90%;
  }

  .message-image {
    max-width: 250px;
  }
}

/* 主聊天区域布局 */
.chat-main {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: #f8f9fa;
}

/* 消息区域样式 */
.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fff;
  margin-bottom: 80px;
  /* 为固定的输入区域留出空间 */
}

/* 输入区域固定定位 */
.input-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

/* 优化输入框样式 */
:deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:focus-within) {
  border-color: #3b82f6;
}

/* 确保内容不会被输入框遮挡 */
.el-main {
  overflow-y: hidden;
}

/* 优化滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .chat-messages {
    margin-bottom: 70px;
  }

  .input-area {
    padding: 12px;
  }
}

/* 自定义图片预览样式 */
:deep(.el-image-viewer__wrapper) {
  background-color: rgba(0, 0, 0, 0.8);
}

:deep(.el-image-viewer__close) {
  color: #fff;
  font-size: 32px;
}

:deep(.el-image-viewer__actions) {
  opacity: 0.9;
  padding: 15px;
}

:deep(.el-image-viewer__canvas) {
  user-select: none;
}

:deep(.el-image-viewer__prev, .el-image-viewer__next) {
  width: 50px;
  height: 50px;
  font-size: 24px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

:deep(.el-image-viewer__prev:hover, .el-image-viewer__next:hover) {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 添加上传相关样式 */
.upload-progress {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 优化图片显示样式 */
.message-image {
  cursor: zoom-in;
  transition: transform 0.2s ease;
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
}

.message-image:hover {
  transform: scale(1.02);
}
</style>