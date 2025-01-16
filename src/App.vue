<template>
  <div class="chat-container">
    <el-container v-if="isLoggedIn">
      <el-aside width="200px">
        <div class="user-list">
          <h3>在线用户</h3>
          <ul>
            <li v-for="user in users" :key="user">{{ user }}</li>
          </ul>
        </div>
      </el-aside>
      <el-main>
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
                <img :src="msg.message" class="message-image" />
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
        <div class="input-area">
          <el-input v-model="newMessage" placeholder="输入消息..." @keyup.enter="sendMessage">
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
      </el-main>
    </el-container>
    <div v-else class="login-container">
      <el-input v-model="username" placeholder="请输入用户名" @keyup.enter="login">
        <template #append>
          <el-button @click="login">加入聊天</el-button>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { io } from 'socket.io-client';
import { ElMessage } from 'element-plus';
import { Document, Upload, ChatRound } from '@element-plus/icons-vue';

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

const handleUploadSuccess = (response) => {
  try {
    socket.emit('message', {
      message: `http://localhost:8888${response.path}`,
      type: response.path.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'file'
    });
  } catch (error) {
    ElMessage.error('文件上传失败：' + error.message);
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
</script>

<style scoped>
.chat-container {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.el-container {
  width: 1000px;
  height: 90vh;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.el-aside {
  background: #2d3436;
  color: white;
  border-right: 1px solid #dcdfe6;
}

.login-container {
  max-width: 400px;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chat-messages {
  height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 20px;
  background: #f0f2f5;
}

.message {
  margin-bottom: 20px;
  max-width: 65%;
  display: flex;
  flex-direction: column;
}

.my-message {
  margin-left: auto;
  align-items: flex-end;
}

.message-header {
  margin-bottom: 4px;
  font-size: 13px;
  color: #666;
  padding: 0 10px;
}

.message-content {
  background: white;
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.4;
  position: relative;
}

.my-message .message-content {
  background: #0084ff;
  color: white;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image:hover {
  transform: scale(1.02);
}

.file-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0084ff;
  text-decoration: none;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.file-link:hover {
  background: #eef2f7;
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

.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #eee;
}

:deep(.el-input__wrapper) {
  border-radius: 20px;
}

:deep(.el-input__inner) {
  height: 40px;
}

:deep(.el-button) {
  border-radius: 20px;
  height: 40px;
}

:deep(.el-upload) {
  display: block;
}

:deep(.el-button-group) {
  display: flex;
}

/* 自定义滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

/* 消息动画 */
.message {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.emoji-container {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  padding: 8px;
}

.emoji-item {
  font-size: 24px;
  cursor: pointer;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background-color: #f5f7fa;
}
</style>