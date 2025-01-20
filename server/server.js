const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 在文件顶部添加文件类型检查
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'));
    }
};

// 更新 multer 配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        // 确保上传目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成安全的文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// 在文件上传配置之后添加文件信息存储
const fileInfoMap = new Map(); // 存储文件信息

// 修改文件上传处理
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }

        const fileInfo = {
            filename: req.file.originalname,
            path: `/uploads/${req.file.filename}`,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        // 存储文件信息
        fileInfoMap.set(req.file.filename, fileInfo);

        res.json(fileInfo);
    } catch (error) {
        console.error('文件上传错误:', error);
        res.status(500).json({ error: '文件上传失败' });
    }
});

// 添加文件下载路由
app.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const fileInfo = fileInfoMap.get(filename);

        if (!fileInfo) {
            return res.status(404).json({ error: '文件不存在' });
        }

        // 设置文件下载的响应头
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileInfo.filename)}`);
        res.setHeader('Content-Type', fileInfo.mimetype);

        // 发送文件
        res.sendFile(path.join(__dirname, 'uploads', filename));
    } catch (error) {
        console.error('文件下载错误:', error);
        res.status(500).json({ error: '文件下载失败' });
    }
});

// 添加数据存储
const users = new Map(); // socket.id -> username
const friendships = new Map(); // 存储好友关系
const friendRequests = new Map(); // 存储好友请求
const privateMessages = new Map(); // 存储私聊消息
const userSocketMap = new Map(); // username -> socket[]
const onlineUsers = new Set(); // 在线用户集合

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('login', (username) => {
        // 存储用户连接信息
        users.set(socket.id, username);
        onlineUsers.add(username);

        // 更新用户的socket连接
        const userSockets = userSocketMap.get(username) || [];
        userSockets.push(socket);
        userSocketMap.set(username, userSockets);

        console.log(`User ${username} connected, socket: ${socket.id}`);

        // 广播用户列表更新
        io.emit('userList', Array.from(onlineUsers));
        io.emit('userJoined', {
            username: username,
            users: Array.from(onlineUsers)
        });
    });

    socket.on('message', (data) => {
        io.emit('message', {
            username: users.get(socket.id),
            message: data.message,
            type: data.type,
            timestamp: new Date()
        });
    });
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            // 从用户的socket列表中移除当前socket
            const userSockets = userSocketMap.get(username) || [];
            const updatedSockets = userSockets.filter(s => s.id !== socket.id);

            if (updatedSockets.length > 0) {
                userSocketMap.set(username, updatedSockets);
            } else {
                userSocketMap.delete(username);
                onlineUsers.delete(username);
                users.delete(socket.id);

                // 广播用户离线消息
                io.emit('userLeft', {
                    username: username,
                    users: Array.from(onlineUsers)
                });
            }
            console.log(`User ${username} disconnected from socket ${socket.id}`);
        }
    });

    // 检查好友状态
    socket.on('checkFriendStatus', ({ from, to }) => {
        const fromFriends = friendships.get(from) || [];
        socket.emit('friendStatus', fromFriends.includes(to));
    });

    // 处理发送好友请求
    socket.on('sendFriendRequest', ({ from, to }) => {
        const requests = friendRequests.get(to) || [];

        // 检查是否已经是好友
        const fromFriends = friendships.get(from) || [];
        if (fromFriends.includes(to)) {
            socket.emit('friendRequestError', '已经是好友了');
            return;
        }

        // 检查是否已经发送过请求
        const existingRequest = requests.find(r => r.from === from);
        if (existingRequest) {
            socket.emit('friendRequestError', '已经发送过好友请求');
            return;
        }

        const request = {
            id: Date.now(),
            from,
            to,
            username: from,
            timestamp: new Date()
        };

        requests.push(request);
        friendRequests.set(to, requests);

        // 查找目标用户的所有socket连接
        const targetSockets = Array.from(io.sockets.sockets.values()).filter(
            s => users.get(s.id) === to
        );

        // 通知所有目标用户的连接
        targetSockets.forEach(socket => {
            socket.emit('friendRequest', request);
            socket.emit('friendRequests', requests);
        });

        // 发送成功回执
        socket.emit('friendRequestSent', { to });
    });

    // 获取好友请求列表
    socket.on('getFriendRequests', (username) => {
        console.log('Getting friend requests for:', username);
        const requests = friendRequests.get(username) || [];
        socket.emit('friendRequests', requests);
    });

    // 处理拒绝好友请求
    socket.on('rejectFriendRequest', ({ requestId, from, to }) => {
        const requests = friendRequests.get(to) || [];
        const updatedRequests = requests.filter(r => r.id !== requestId);
        friendRequests.set(to, updatedRequests);

        // 通知发送者
        const fromSocket = Array.from(io.sockets.sockets).find(
            ([_, s]) => users.get(s.id) === from
        );
        if (fromSocket) {
            io.to(fromSocket[0]).emit('friendRequestRejected', { by: to });
        }
    });

    // 获取好友列表
    socket.on('getFriendList', (username) => {
        console.log('Getting friend list for:', username);
        const friends = friendships.get(username) || [];
        const friendList = friends.map(friend => ({
            username: friend,
            status: Array.from(users.values()).includes(friend) ? '在线' : '离线',
            joinTime: new Date()
        }));
        socket.emit('friendList', friendList);
    });

    // 处理私聊消息
    socket.on('privateMessage', (message) => {
        console.log('Received private message:', message);
        const { from, to, content, type } = message;
        const chatId = [from, to].sort().join('-');
        const messages = privateMessages.get(chatId) || [];

        const newMessage = {
            ...message,
            timestamp: new Date()
        };

        messages.push(newMessage);
        privateMessages.set(chatId, messages);

        // 发送给接收者
        const targetSockets = userSocketMap.get(to) || [];
        console.log(`Found ${targetSockets.length} sockets for user ${to}`);

        targetSockets.forEach(s => {
            console.log(`Sending message to socket ${s.id}`);
            s.emit('privateMessage', newMessage);
        });

        // 不再向发送者发送消息回执
        // socket.emit('privateMessage', newMessage);
    });

    // 获取私聊历史
    socket.on('getPrivateHistory', ({ user1, user2 }) => {
        const chatId = [user1, user2].sort().join('-');
        const messages = privateMessages.get(chatId) || [];
        console.log('Sending chat history:', { chatId, messageCount: messages.length });
        socket.emit('privateHistory', messages);
    });

    // 处理接受好友请求
    socket.on('acceptFriendRequest', ({ requestId, from, to }) => {
        console.log('Accepting friend request:', { requestId, from, to });

        // 从请求列表中移除
        const requests = friendRequests.get(to) || [];
        const updatedRequests = requests.filter(r => r.id !== requestId);
        friendRequests.set(to, updatedRequests);

        // 添加好友关系
        const fromFriends = friendships.get(from) || [];
        const toFriends = friendships.get(to) || [];

        if (!fromFriends.includes(to)) {
            fromFriends.push(to);
            friendships.set(from, fromFriends);
        }

        if (!toFriends.includes(from)) {
            toFriends.push(from);
            friendships.set(to, toFriends);
        }

        // 构建好友信息对象
        const fromFriendList = fromFriends.map(friend => ({
            username: friend,
            status: Array.from(users.values()).includes(friend) ? '在线' : '离线',
            joinTime: new Date()
        }));

        const toFriendList = toFriends.map(friend => ({
            username: friend,
            status: Array.from(users.values()).includes(friend) ? '在线' : '离线',
            joinTime: new Date()
        }));

        // 立即更新接收者的状态
        socket.emit('friendListUpdate', toFriendList);
        socket.emit('friendRequests', updatedRequests);

        // 查找并通知发送者的所有连接
        const fromSockets = Array.from(io.sockets.sockets.values()).filter(
            s => users.get(s.id) === from
        );

        fromSockets.forEach(s => {
            s.emit('friendRequestAccepted', { friend: to });
            s.emit('friendListUpdate', fromFriendList);
        });

        // 查找并通知接收者的其他连接
        const toSockets = Array.from(io.sockets.sockets.values()).filter(
            s => users.get(s.id) === to && s.id !== socket.id
        );

        toSockets.forEach(s => {
            s.emit('friendListUpdate', toFriendList);
            s.emit('friendRequests', updatedRequests);
        });
    });

    // 获取在线用户列表
    socket.on('getOnlineUsers', () => {
        socket.emit('userList', Array.from(onlineUsers));
    });
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// 添加安全措施
// 用户身份认证(JWT)
// XSS防护
// 敏感词过滤
// 文件上传类型检查
// 接口访问频率限制

const PORT = 8888;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
