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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (username) => {
        users.set(socket.id, username);
        console.log('User joined:', username);
        console.log('Current users:', Array.from(users.values()));

        io.emit('userJoined', {
            username: username,
            users: Array.from(users.values())
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
            users.delete(socket.id);
            console.log('User disconnected:', username);

            io.emit('userLeft', {
                username: username,
                users: Array.from(users.values())
            });
        }
    });

    // 确保文件上传目录存在
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

const PORT = 8888;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
