import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { addMessage, getMessagesBetween } from './db.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_change_me_in_production_12345';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, 'uploads');
const stickersDir = path.join(__dirname, 'stickers');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(stickersDir)) fs.mkdirSync(stickersDir, { recursive: true });

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/stickers', express.static(stickersDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// API لجلب الرسائل المحفوظة
app.get('/api/messages/:userId', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const messages = getMessagesBetween(decoded.id, req.params.userId);
    res.json(messages);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Socket.io
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

const onlineUsers = new Map();
const activeCalls = new Map(); // userId -> { to, pc }

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ ${socket.username} connected`);
  onlineUsers.set(socket.userId, { socketId: socket.id, username: socket.username });
  socket.join(`user_${socket.userId}`);
  io.emit('users:online', Array.from(onlineUsers.keys()));

  // 1. رسالة نصية + حفظ + رد تلقائي
  socket.on('message:send', (data) => {
    const { to, content, type = 'text', duration = 0 } = data;
    
    // حفظ في قاعدة البيانات
    const savedMsg = addMessage(socket.userId, to, type, content, duration);
    
    const messageData = {
      id: savedMsg.id,
      from: socket.userId,
      fromUsername: socket.username,
      to,
      type,
      content,
      duration,
      timestamp: savedMsg.timestamp
    };

    io.to(`user_${to}`).emit('message:new', messageData);
    socket.emit('message:ack', { id: messageData.id });

    // رد تلقائي بعد 1-2 ثانية
    setTimeout(() => {
      const replies = [
        'مرحباً! كيف حالك؟',
        'شكراً لرسالتك',
        'سأرد عليك قريباً',
        'تمام، فهمت',
        'حسناً ',
        'أهلاً وسهلاً',
        'ممتاز!',
        'سأفكر في الأمر'
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyMsg = addMessage(to, socket.userId, 'text', randomReply, 0);
      
      io.to(`user_${socket.userId}`).emit('message:new', {
        id: replyMsg.id,
        from: to,
        fromUsername: onlineUsers.get(to)?.username || 'مستخدم',
        to: socket.userId,
        type: 'text',
        content: randomReply,
        timestamp: replyMsg.timestamp
      });
    }, 1000 + Math.random() * 1500);
  });

  // 2. رسالة صوتية + حفظ
  socket.on('voice:send', (data) => {
    const { to, url, duration } = data;
    const savedMsg = addMessage(socket.userId, to, 'voice', url, duration);
    
    const voiceData = {
      id: savedMsg.id,
      from: socket.userId,
      fromUsername: socket.username,
      to,
      type: 'voice',
      url,
      duration,
      timestamp: savedMsg.timestamp
    };

    io.to(`user_${to}`).emit('voice:new', voiceData);
  });

  // 3. ستيكر
  socket.on('sticker:send', (data) => {
    const { to, sticker } = data;
    const savedMsg = addMessage(socket.userId, to, 'sticker', sticker, 0);
    
    io.to(`user_${to}`).emit('sticker:new', {
      id: savedMsg.id,
      from: socket.userId,
      fromUsername: socket.username,
      to,
      type: 'sticker',
      sticker,
      timestamp: savedMsg.timestamp
    });
  });

  // 4. Typing
  socket.on('typing:start', ({ to }) => {
    socket.to(`user_${to}`).emit('typing:update', { userId: socket.userId, username: socket.username, typing: true });
  });
  socket.on('typing:stop', ({ to }) => {
    socket.to(`user_${to}`).emit('typing:update', { userId: socket.userId, typing: false });
  });

  // 5. مكالمات
  socket.on('call:initiate', ({ to, offer }) => {
    activeCalls.set(socket.userId, { to });
    io.to(`user_${to}`).emit('call:incoming', { from: socket.userId, fromUsername: socket.username, offer });
  });
  
  socket.on('call:answer', ({ to, answer }) => {
    activeCalls.set(socket.userId, { to });
    io.to(`user_${to}`).emit('call:answered', { from: socket.userId, answer });
  });
  
  socket.on('call:ice', ({ to, candidate }) => {
    io.to(`user_${to}`).emit('call:ice', { from: socket.userId, candidate });
  });
  
  socket.on('call:end', ({ to }) => {
    activeCalls.delete(socket.userId);
    activeCalls.delete(to);
    io.to(`user_${to}`).emit('call:ended', { from: socket.userId });
  });

  // 6. إشعارات
  socket.on('notify', ({ to, title, body }) => {
    io.to(`user_${to}`).emit('notification', { title, body, from: socket.username });
  });

  // 7. عند قطع الاتصال - إنهاء المكالمة تلقائياً
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.username} disconnected`);
    
    // إنهاء المكالمة النشطة
    const call = activeCalls.get(socket.userId);
    if (call) {
      io.to(`user_${call.to}`).emit('call:ended', { from: socket.userId });
      activeCalls.delete(socket.userId);
      activeCalls.delete(call.to);
    }
    
    // البحث عن من كان يتصل به هذا المستخدم
    for (const [uid, callData] of activeCalls.entries()) {
      if (callData.to === socket.userId) {
        io.to(`user_${uid}`).emit('call:ended', { from: socket.userId });
        activeCalls.delete(uid);
      }
    }
    
    onlineUsers.delete(socket.userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});