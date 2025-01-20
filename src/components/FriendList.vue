<template>
    <div class="friend-list">
        <div class="friend-header">
            <h3>
                <el-icon>
                    <UserFilled />
                </el-icon>
                好友列表 ({{ friends.length }})
            </h3>
            <el-button type="primary" size="small" @click="showFriendRequests">
                好友请求
                <el-badge v-if="friendRequests.length" :value="friendRequests.length" />
            </el-button>
        </div>

        <el-scrollbar height="calc(100vh - 200px)">
            <div class="friend-items">
                <div v-for="friend in friends" :key="friend.username" class="friend-item"
                    @click="showUserProfile(friend)">
                    <el-avatar :size="40" :style="{ backgroundColor: getAvatarColor(friend.username) }">
                        {{ friend.username.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div class="friend-info">
                        <span class="friend-name">{{ friend.username }}</span>
                        <div class="friend-status">
                            <span class="status-dot" :class="{ 'online': friend.status === '在线' }"></span>
                            {{ friend.status }}
                        </div>
                    </div>
                </div>
            </div>
        </el-scrollbar>

        <!-- 好友请求对话框 -->
        <el-dialog v-model="showRequests" title="好友请求" width="400px">
            <div v-if="friendRequests.length" class="friend-requests">
                <div v-for="request in friendRequests" :key="request.id" class="request-item">
                    <div class="request-info">
                        <el-avatar :size="32" :style="{ backgroundColor: getAvatarColor(request.username) }">
                            {{ request.username.charAt(0).toUpperCase() }}
                        </el-avatar>
                        <span>{{ request.username }}</span>
                    </div>
                    <div class="request-actions">
                        <el-button type="primary" size="small" @click="handleAcceptRequest(request)">
                            接受
                        </el-button>
                        <el-button type="danger" size="small" @click="handleRejectRequest(request)">
                            拒绝
                        </el-button>
                    </div>
                </div>
            </div>
            <div v-else class="no-requests">
                暂无好友请求
            </div>
        </el-dialog>

        <!-- 用户资料卡片弹窗 -->
        <el-dialog v-model="showProfile" width="360px" :title="`用户资料`">
            <user-profile v-if="selectedFriend" :user="selectedFriend" :current-username="currentUsername"
                @start-private-chat="handleStartPrivateChat" />
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';
import UserProfile from './UserProfile.vue';
import socket from '../socket';

const props = defineProps({
    currentUsername: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['startPrivateChat']);

const friends = ref([]);
const friendRequests = ref([]);
const showRequests = ref(false);
const showProfile = ref(false);
const selectedFriend = ref(null);

const getAvatarColor = (username) => {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f',
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
};

const showFriendRequests = () => {
    showRequests.value = true;
};

const showUserProfile = (friend) => {
    selectedFriend.value = friend;
    showProfile.value = true;
};

const handleAcceptRequest = (request) => {
    socket.emit('acceptFriendRequest', {
        requestId: request.id,
        from: request.from,
        to: props.currentUsername
    });
    // 立即从本地列表中移除该请求
    friendRequests.value = friendRequests.value.filter(r => r.id !== request.id);
    ElMessage.success(`已接受 ${request.from} 的好友请求`);
    // 如果没有更多请求，关闭对话框
    if (friendRequests.value.length === 0) {
        showRequests.value = false;
    }
};

const handleRejectRequest = (request) => {
    socket.emit('rejectFriendRequest', {
        requestId: request.id,
        from: request.from,
        to: props.currentUsername
    });
    friendRequests.value = friendRequests.value.filter(r => r.id !== request.id);
    ElMessage.info(`已拒绝 ${request.from} 的好友请求`);
};

const handleStartPrivateChat = (friend) => {
    emit('startPrivateChat', friend);
    showProfile.value = false;
};

// 获取好友列表
const getFriendList = () => {
    socket.emit('getFriendList', props.currentUsername);
};

// 获取好友请求
const getFriendRequests = () => {
    socket.emit('getFriendRequests', props.currentUsername);
};

// 修改事件监听的注册方式
onMounted(() => {
    getFriendList();
    getFriendRequests();

    // 移除可能存在的旧监听器
    socket.off('friendList');
    socket.off('friendListUpdate');
    socket.off('friendRequests');
    socket.off('friendRequest');
    socket.off('friendRequestAccepted');
    socket.off('friendRequestError');
    socket.off('friendRequestSent');
    socket.off('friendRequestRejected');

    // 监听好友列表更新
    socket.on('friendListUpdate', (list) => {
        console.log('Friend list updated:', list);
        friends.value = list;
    });

    socket.on('friendList', (list) => {
        console.log('Received friend list:', list);
        friends.value = list;
    });

    socket.on('friendRequests', (requests) => {
        console.log('Received friend requests:', requests);
        friendRequests.value = requests;
        // 如果没有好友请求了，自动关闭对话框
        if (requests.length === 0) {
            showRequests.value = false;
        }
    });

    socket.on('friendRequest', (request) => {
        getFriendRequests(); // 重新获取完整的请求列表
        ElMessage.info(`收到来自 ${request.from} 的好友请求`);
    });

    socket.on('friendRequestAccepted', ({ friend }) => {
        ElMessage.success(`${friend} 接受了你的好友请求`);
        getFriendList(); // 立即刷新好友列表
    });

    socket.on('friendRequestError', (message) => {
        ElMessage.error(message);
    });

    socket.on('friendRequestSent', ({ to }) => {
        ElMessage.success(`已发送好友请求给 ${to}`);
    });

    socket.on('friendRequestRejected', ({ by }) => {
        ElMessage.info(`${by} 拒绝了你的好友请求`);
    });
});

// 在组件卸载时移除事件监听
onUnmounted(() => {
    socket.off('friendList');
    socket.off('friendListUpdate');
    socket.off('friendRequests');
    socket.off('friendRequest');
    socket.off('friendRequestAccepted');
    socket.off('friendRequestError');
    socket.off('friendRequestSent');
    socket.off('friendRequestRejected');
});
</script>

<style scoped>
.friend-list {
    height: 100%;
}

.friend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #dcdfe6;
}

.friend-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
}

.friend-items {
    padding: 8px;
}

.friend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s;
}

.friend-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.friend-info {
    flex: 1;
}

.friend-name {
    display: block;
    color: #fff;
    font-weight: 500;
    margin-bottom: 4px;
}

.friend-status {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
    font-size: 12px;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #94a3b8;
}

.status-dot.online {
    background-color: #22c55e;
}

.friend-requests {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.request-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-radius: 8px;
    background-color: #f8fafc;
}

.request-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.request-actions {
    display: flex;
    gap: 8px;
}

.no-requests {
    text-align: center;
    color: #64748b;
    padding: 20px;
}
</style>