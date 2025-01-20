<template>
    <div class="private-chat">
        <div class="chat-header">
            <div class="user-info">
                <el-avatar :size="32" :style="{ backgroundColor: getAvatarColor(targetUser.username) }">
                    {{ targetUser.username.charAt(0).toUpperCase() }}
                </el-avatar>
                <div class="user-status">
                    <span class="username">{{ targetUser.username }}</span>
                    <span class="status">
                        <span class="status-dot" :class="{ 'online': targetUser.status === '在线' }"></span>
                        {{ targetUser.status }}
                    </span>
                </div>
            </div>
            <el-button type="text" @click="closeChat">
                <el-icon>
                    <Close />
                </el-icon>
            </el-button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
            <div v-for="(msg, index) in chatMessages" :key="index" class="message"
                :class="{ 'my-message': msg.from === currentUsername }">
                <div class="message-header">
                    <span class="username">{{ msg.from }}</span>
                    <span class="time">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div class="message-content">
                    <template v-if="msg.type === 'text'">
                        {{ msg.content }}
                    </template>
                    <template v-else-if="msg.type === 'image'">
                        <img :src="msg.content" class="message-image" @click="openImageViewer(msg.content)" />
                    </template>
                    <template v-else-if="msg.type === 'file'">
                        <div class="file-message">
                            <div class="file-info">
                                <el-icon>
                                    <Document />
                                </el-icon>
                                <span class="file-name" :title="getFileName(msg.content)">
                                    {{ getFileName(msg.content) }}
                                </span>
                            </div>
                            <el-button type="primary" link @click="downloadFile(msg.content)">
                                下载文件
                            </el-button>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <div class="chat-input">
            <el-input v-model="messageText" type="textarea" rows="3" placeholder="输入消息..."
                @keyup.enter.exact="sendMessage" />
            <div class="input-actions">
                <el-upload class="upload-area" :action="uploadUrl" :show-file-list="false"
                    :before-upload="handleBeforeUpload" :on-success="handleUploadSuccess" :on-error="handleUploadError"
                    :multiple="false" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt">
                    <el-button type="primary" plain>
                        <el-icon>
                            <Plus />
                        </el-icon>
                        上传文件
                    </el-button>
                </el-upload>
                <el-button type="primary" @click="sendMessage">发送</el-button>
            </div>
        </div>

        <!-- 图片预览 -->
        <el-image-viewer v-if="showImageViewer" :url-list="[previewImage]" @close="closeImageViewer" />
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Close, Plus, Document } from '@element-plus/icons-vue';
import socket from '../socket';

const props = defineProps({
    currentUsername: String,
    targetUser: Object
});

const emit = defineEmits(['close']);

const chatMessages = ref([]);
const messageText = ref('');
const messagesContainer = ref(null);
const showImageViewer = ref(false);
const previewImage = ref('');
const uploadUrl = 'http://localhost:8888/upload';

// 获取历史消息
const getPrivateHistory = () => {
    console.log('Getting private history for:', {
        user1: props.currentUsername,
        user2: props.targetUser.username
    });
    socket.emit('getPrivateHistory', {
        user1: props.currentUsername,
        user2: props.targetUser.username
    });
};

// 发送消息
const sendMessage = async () => {
    if (!messageText.value.trim()) return;

    const message = {
        from: props.currentUsername,
        to: props.targetUser.username,
        content: messageText.value.trim(),
        type: 'text',
        timestamp: new Date()
    };

    console.log('Sending message:', message);
    socket.emit('privateMessage', message);

    // 直接添加到本地消息列表
    chatMessages.value.push(message);
    scrollToBottom();

    messageText.value = '';
};

// 滚动到底部
const scrollToBottom = async () => {
    await nextTick();
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

onMounted(() => {
    console.log('PrivateChat mounted');
    getPrivateHistory();

    // 移除可能存在的旧监听器
    socket.off('privateMessage');
    socket.off('privateHistory');

    // 监听私聊消息
    socket.on('privateMessage', (message) => {
        console.log('Received private message:', message);
        // 只处理与当前聊天相关的消息
        if (
            (message.from === props.currentUsername && message.to === props.targetUser.username) ||
            (message.from === props.targetUser.username && message.to === props.currentUsername)
        ) {
            // 检查消息是否已存在
            const messageExists = chatMessages.value.some(
                msg =>
                    msg.from === message.from &&
                    msg.content === message.content &&
                    new Date(msg.timestamp).getTime() === new Date(message.timestamp).getTime()
            );

            if (!messageExists) {
                chatMessages.value.push(message);
                scrollToBottom();

                // 如果消息是从对方发来的，播放提示音
                if (message.from === props.targetUser.username) {
                    playMessageSound();
                }
            }
        }
    });

    // 监听历史消息
    socket.on('privateHistory', (messages) => {
        console.log('Received chat history:', messages);
        chatMessages.value = messages;
        scrollToBottom();
    });
});

// 播放消息提示音
const playMessageSound = () => {
    const audio = new Audio('/message.mp3'); // 需要添加提示音文件
    audio.play().catch(err => console.log('无法播放提示音:', err));
};

// 在组件卸载时移除事件监听
onUnmounted(() => {
    console.log('PrivateChat unmounted');
    socket.off('privateMessage');
    socket.off('privateHistory');
    socket.off('newMessageNotification');
});

// 处理文件上传前的验证
const handleBeforeUpload = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        ElMessage.error('文件大小不能超过10MB');
        return false;
    }

    // 显示上传进度提示
    ElMessage.info({
        message: '正在上传文件...',
        duration: 0
    });
    return true;
};

const handleUploadSuccess = (response) => {
    // 关闭上传提示
    ElMessage.closeAll();

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(response.filename);
    const message = {
        from: props.currentUsername,
        to: props.targetUser.username,
        content: `http://localhost:8888${response.path}`,
        filename: response.filename, // 原始文件名
        originalName: response.filename, // 保存原始文件名
        type: isImage ? 'image' : 'file',
        timestamp: new Date()
    };

    // 立即添加到本地消息列表
    chatMessages.value.push(message);
    scrollToBottom();

    // 发送给服务器
    socket.emit('privateMessage', message);
    ElMessage.success(isImage ? '图片发送成功' : '文件发送成功');
};

const handleUploadError = (error) => {
    ElMessage.closeAll();
    ElMessage.error('文件上传失败：' + (error.message || '未知错误'));
};

const getFileName = (url) => {
    try {
        // 从消息中获取原始文件名
        const message = chatMessages.value.find(msg => msg.content === url);
        if (message && message.originalName) {
            return message.originalName;
        }
        // 如果没有原始文件名，则从 URL 中提取
        return decodeURIComponent(url.split('/').pop());
    } catch (e) {
        return url.split('/').pop();
    }
};

const closeChat = () => {
    emit('close');
};

const getAvatarColor = (username) => {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
};

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
};

const openImageViewer = (imageUrl) => {
    previewImage.value = imageUrl;
    showImageViewer.value = true;
};

const closeImageViewer = () => {
    showImageViewer.value = false;
    previewImage.value = '';
};

const downloadFile = (url) => {
    try {
        const filename = url.split('/').pop();
        // 创建下载链接
        const downloadUrl = `http://localhost:8888/download/${filename}`;

        // 创建一个隐藏的 a 标签用于下载
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        ElMessage.error('文件下载失败：' + error.message);
    }
};
</script>

<style scoped>
.private-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-status {
    display: flex;
    flex-direction: column;
}

.username {
    font-weight: 500;
    color: #1e293b;
}

.status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #64748b;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
}

.status-dot.online {
    background: #22c55e;
}

.chat-messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f8fafc;
}

.message {
    margin-bottom: 16px;
    max-width: 80%;
}

.my-message {
    margin-left: auto;

    .message-content {
        background: #60a5fa;
        color: #fff;
    }

    .message-header {
        text-align: right;
    }
}

.message-header {
    margin-bottom: 4px;
    font-size: 12px;
    color: #64748b;
}

.message-content {
    padding: 8px 12px;
    background: #f1f5f9;
    border-radius: 8px;
    word-break: break-word;
}

.message-image {
    max-width: 200px;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.message-image:hover {
    transform: scale(1.05);
}

.chat-input {
    padding: 16px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

.input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
}

.upload-area {
    display: inline-block;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
    width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
    background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
    .private-chat {
        background: #1e293b;
    }

    .chat-header {
        background: #0f172a;
        border-color: #334155;
    }

    .username {
        color: #e2e8f0;
    }

    .chat-messages {
        background: #1e293b;
    }

    .message-content {
        background: #334155;
        color: #e2e8f0;
    }

    .my-message .message-content {
        background: #2563eb;
    }

    .chat-input {
        background: #0f172a;
        border-color: #334155;
    }

    .file-message {
        background: #334155;
    }

    .file-message:hover {
        background: #475569;
    }

    .file-name {
        color: #e2e8f0;
    }
}

/* 添加文件消息样式 */
.file-message {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f1f5f9;
    border-radius: 4px;
    margin: 4px 0;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.file-message:hover {
    background: #e2e8f0;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    /* 防止文件名溢出 */
}

.file-name {
    font-size: 14px;
    color: #1e293b;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>