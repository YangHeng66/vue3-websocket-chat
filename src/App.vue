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
            <el-avatar :size="40" class="user-avatar" :style="{ backgroundColor: getAvatarColor(user) }">
              {{ user.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <span class="user-name">{{ user }}</span>
              <div class="user-status">
                <span class="status-dot"></span>
                在线
              </div>
            </div>
          </div>
        </div>
      </el-aside>
      <el-main class="chat-main" @dragover.prevent @dragleave.prevent @drop.prevent="handleDrop"
        :class="{ 'drag-over': isDragging }">
        <div v-show="isDragging" class="drag-overlay">
          <el-icon class="drag-icon">
            <Upload />
          </el-icon>
          <p>释放鼠标上传文件</p>
        </div>
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
import { ref, onMounted, nextTick, watch } from 'vue';
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

const isDragging = ref(false);

const handleDrop = async (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;

  if (files.length > 0) {
    const file = files[0];

    if (!beforeUpload(file)) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      ElMessage.info('正在上传文件...');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      const isImage = file.type.startsWith('image/');

      socket.emit('message', {
        message: `http://localhost:8888${data.path}`,
        type: isImage ? 'image' : 'file'
      });

      ElMessage.success(isImage ? '图片上传成功' : '文件上传成功');
    } catch (error) {
      ElMessage.error('文件上传失败：' + error.message);
    }
  }
};

const getAvatarColor = (username) => {
  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f1c40f',
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
  ];
  const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

onMounted(() => {
  // 使用 watch 监听 isLoggedIn 的变化
  watch(isLoggedIn, (newVal) => {
    if (newVal) {
      // 确保登录后才执行
      nextTick(() => {
        const mainEl = document.querySelector('.chat-main');
        if (mainEl) {
          mainEl.addEventListener('dragenter', (e) => {
            e.preventDefault();
            isDragging.value = true;
          });

          mainEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            const rect = mainEl.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              isDragging.value = false;
            }
          });
        }
      });
    }
  });
});
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
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 180px);
  background: #f8fafc;
}

.message {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  max-width: 80%;
  animation: slideIn 0.3s ease;
}

.my-message {
  margin-left: auto;
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
}

.username {
  font-weight: 500;
  color: #64748b;
}

.time {
  color: #94a3b8;
  font-size: 12px;
}

.message-content {
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  border: 1px solid #e2e8f0;
  word-break: break-word;
  line-height: 1.5;
}

.my-message .message-content {
  background: #3b82f6;
  color: white;
  border: none;
}

.my-message .username {
  color: #3b82f6;
}

.message .message-content:has(.username:contains('System')) {
  background: #f1f5f9;
  color: #64748b;
  font-style: italic;
  text-align: center;
  border: 1px dashed #cbd5e1;
  max-width: 400px;
  margin: 20px auto;
  padding: 10px 20px;
}

.file-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.my-message .file-link {
  background: rgba(255, 255, 255, 0.1);
}

.file-link:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.my-message .file-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  cursor: zoom-in;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.message-image:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
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
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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
  border-right: 1px solid #34495e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  background: #34495e;
  border-bottom: 1px solid #455d75;
}

.sidebar-header h3 {
  color: #ecf0f1;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.user-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.user-avatar {
  margin-right: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  color: #ecf0f1;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #95a5a6;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #2ecc71;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(46, 204, 113, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
  }
}

/* 优化滚动条 */
.user-list::-webkit-scrollbar {
  width: 4px;
}

.user-list::-webkit-scrollbar-thumb {
  background: #455d75;
  border-radius: 2px;
}

.user-list::-webkit-scrollbar-track {
  background: transparent;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .user-sidebar {
    width: 200px !important;
  }

  .user-item {
    padding: 8px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
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
  transition: all 0.3s ease;
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

.drag-over {
  border: 2px dashed #409EFF;
  background-color: rgba(64, 158, 255, 0.1);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
  animation: fadeIn 0.3s ease;
}

.drag-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
}

.drag-overlay p {
  font-size: 18px;
  color: #409EFF;
  margin: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* 消息动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 滚动条美化 */
.chat-messages::-webkit-scrollbar {
  width: 5px;
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
    padding: 15px;
  }

  .message {
    max-width: 90%;
  }

  .message-image {
    max-width: 250px;
  }

  .message-content {
    padding: 10px 14px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .chat-messages {
    background: #1e293b;
  }

  .message-content {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
  }

  .username {
    color: #94a3b8;
  }

  .time {
    color: #64748b;
  }

  .my-message .message-content {
    background: #2563eb;
  }

  .file-link {
    background: rgba(255, 255, 255, 0.05);
  }

  .file-link:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>