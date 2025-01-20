<template>
    <div class="user-profile-card">
        <el-card>
            <template #header>
                <div class="card-header">
                    <el-avatar :size="64" :style="{ backgroundColor: getAvatarColor(user.username) }">
                        {{ user.username.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <h3>{{ user.username }}</h3>
                </div>
            </template>
            <div class="user-info">
                <div class="status-info">
                    <el-tag :type="user.status === '在线' ? 'success' : 'info'" size="small">
                        {{ user.status }}
                    </el-tag>
                    <span class="join-time">加入时间: {{ formatTime(user.joinTime) }}</span>
                </div>
                <div class="action-buttons" v-if="user.username !== currentUsername">
                    <el-button type="primary" size="small" @click="handleAddFriend" :disabled="isFriend">
                        {{ isFriend ? '已是好友' : '添加好友' }}
                    </el-button>
                    <el-button type="success" size="small" @click="handlePrivateChat">
                        私聊
                    </el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import socket from '../socket';

const props = defineProps({
    user: {
        type: Object,
        required: true
    },
    currentUsername: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['startPrivateChat']);

// 修改为从socket获取好友状态
const isFriend = ref(false);

// 获取好友状态
const checkFriendStatus = () => {
    socket.emit('checkFriendStatus', {
        from: props.currentUsername,
        to: props.user.username
    });
};

const handleAddFriend = () => {
    if (!isFriend.value) {
        socket.emit('sendFriendRequest', {
            from: props.currentUsername,
            to: props.user.username
        });
    }
};

// 在组件卸载时移除事件监听
onUnmounted(() => {
    socket.off('friendStatus');
    socket.off('friendRequestSent');
    socket.off('friendRequestError');
    socket.off('friendListUpdate');
});

// 修改事件监听的注册方式
onMounted(() => {
    checkFriendStatus();

    // 移除可能存在的旧监听器
    socket.off('friendStatus');
    socket.off('friendRequestSent');
    socket.off('friendRequestError');
    socket.off('friendListUpdate');

    socket.on('friendStatus', (status) => {
        isFriend.value = status;
    });

    socket.on('friendRequestSent', ({ to }) => {
        ElMessage.success(`已发送好友请求给 ${to}`);
    });

    socket.on('friendRequestError', (message) => {
        ElMessage.error(message);
    });

    socket.on('friendListUpdate', () => {
        checkFriendStatus(); // 重新检查好友状态
    });
});

const getAvatarColor = (username) => {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
};

const handlePrivateChat = () => {
    emit('startPrivateChat', {
        username: props.user.username,
        status: props.user.status
    });
};
</script>

<style scoped>
.user-profile-card {
    width: 300px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 16px;
}

.card-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
}

.user-info {
    margin-top: 16px;
}

.status-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.join-time {
    color: #666;
    font-size: 14px;
}

.action-buttons {
    display: flex;
    gap: 8px;
}
</style>