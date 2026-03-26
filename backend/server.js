require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection (Atlas cloud)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Create backend/.env with your Atlas connection string.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('MongoDB Atlas connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    if (err.code === 8000 || err.message?.includes('bad auth') || err.message?.includes('authentication failed')) {
      console.error('');
      console.error('Atlas authentication failed. Fix:');
      console.error('  1. Atlas Dashboard → Database Access → find user "gita" → Edit → Reset Password');
      console.error('  2. Update backend/.env with the new password in MONGODB_URI');
      console.error('  3. If password has @ # : / ? etc., URL-encode them (e.g. @ → %40)');
    } else {
      console.error('Check your Atlas connection string in backend/.env');
    }
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TravelBlog API Server',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      posts: {
        getAll: 'GET /api/posts',
        getById: 'GET /api/posts/:id',
        create: 'POST /api/posts (requires authentication)',
        update: 'PUT /api/posts/:id (requires authentication)',
        delete: 'DELETE /api/posts/:id (requires authentication)'
      }
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error'
  });
});

// --- Socket.IO ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'travelblog-api',
      audience: 'travelblog-client'
    });

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (${socket.userId})`);
  onlineUsers.set(socket.userId, socket.id);
  io.emit('onlineUsers', Array.from(onlineUsers.keys()));

  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, text } = data;
      if (!receiverId || !text || !text.trim()) return;

      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        text: text.trim()
      });

      const populated = {
        _id: message._id,
        sender: socket.userId,
        receiver: receiverId,
        text: message.text,
        read: message.read,
        createdAt: message.createdAt
      };

      socket.emit('newMessage', populated);

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', populated);
      }
    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('messageError', { message: 'Failed to send message' });
    }
  });

  socket.on('markAsRead', async (data) => {
    try {
      const { senderId } = data;
      await Message.updateMany(
        { sender: senderId, receiver: socket.userId, read: false },
        { read: true }
      );

      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesRead', { readBy: socket.userId });
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  });

  socket.on('typing', (data) => {
    const { receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', { userId: socket.userId });
    }
  });

  socket.on('stopTyping', (data) => {
    const { receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userStopTyping', { userId: socket.userId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.username}`);
    onlineUsers.delete(socket.userId);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, io };
