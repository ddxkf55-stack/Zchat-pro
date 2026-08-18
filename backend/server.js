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

// ============================================
// إعدادات الأمان - مهم جداً
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_change_me_in_production_12345';
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// إنشاء مجلدات التخزين تلقائياً
const uploadsDir = path.join(__dirname, 'uploads');
const stickersDir = path.join(__dirname, 'stickers');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

if (!fs.existsSync(stickersDir)) {
  fs.mkdirSync(stickersDir, { recursive: true });
  console.log('📁 Created stickers directory');
}

// ============================================
// إعداد Express
// ============================================
const app = express();
const server = http.createServer(app);

// ============================================
// Health Check Routes (مهمة لـ Railway و Render)
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Chat API is running!',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      auth: '/api/auth'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    message: 'Server is healthy ✅',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// CORS - محسّن للإنتاج
// ============================================
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://zchat-pro-frontend.vercel.app', // استبدل برابط Frontend الحقيقي
    /.railway\.app$/, // يقبل جميع نطاقات Railway
    /.vercel\.app$/,  // يقبل جميع نطاقات Vercel
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ملفات ثابتة
app.use('/uploads', express.static(uploadsDir));
app.use('/stickers', express.static(stickersDir));

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// API لجلب الرسائل المحفوظة
app.get('/api/messages/:userId', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const messages = getMessagesBetween(decoded.id, req.params.userId);
    res.json(messages);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ============================================
// Socket.io - إدارة الاتصالات الفورية
// ============================================
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const onlineUsers = new Map(); // userId -> { socketId, username, connectedAt }
const activeCalls = new Map(); // userId -> { to }

// Middleware للتحقق من التوكن في Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    console.log('⚠️ Socket connection attempt without token');
    return next(new Error('unauthorized: no token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    socket.tokenData = decoded;
    next();
  } catch (error) {
    console.error('❌ Socket Auth Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('unauthorized: token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('unauthorized: invalid signature'));
    }
    next(new Error('unauthorized: ' + error.message));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.username} (ID: ${socket.userId}, Socket: ${socket.id})`);
  
  // تسجيل المستخدم كمتصل
  onlineUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    connectedAt: Date.now()
  });
  
  // الانضمام إلى غرفة خاصة بالمستخدم
  socket.join(`user_${socket.userId}`);
  
  // إرسال قائمة المتصلين للجميع
  io.emit('users:online', Array.from(onlineUsers.keys()));
  
  // إرسال تأكيد الاتصال للمستخدم نفسه
  socket.emit('connected', { 
    userId: socket.userId, 
    username: socket.username,
    onlineUsers: Array.from(onlineUsers.keys())
  });

  // ==========================================
  // 1. الرسائل النصية + حفظ + رد تلقائي
  // ==========================================
  socket.on('message:send', (data) => {
    const { to, content, type = 'text', duration = 0 } = data;
    
    if (!to || !content) {
      console.log('⚠️ Invalid message data:', data);
      return;
    }

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

    // إرسال للمستقبل
    io.to(`user_${to}`).emit('message:new', messageData);
    
    // تأكيد الاستلام للمرسل
    socket.emit('message:ack', { id: messageData.id, status: 'sent' });
    
    console.log(`📨 Message from ${socket.username} to user ${to}`);

    // رد تلقائي بعد 1-2.5 ثانية
    setTimeout(() => {
      const replies = [
        'مرحباً! كيف حالك؟',
        'شكراً لرسالتك',
        'سأرد عليك قريباً',
        'تمام، فهمت',
        'حسناً 👍',
        'أهلاً وسهلاً',
        'ممتاز!',
        'سأفكر في الأمر',
        'رائع!',
        'أتفق معك'
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

  // ==========================================
  // 2. الرسائل الصوتية + حفظ
  // ==========================================
  socket.on('voice:send', (data) => {
    const { to, url, duration } = data;
    
    if (!to || !url) {
      console.log('️ Invalid voice message data:', data);
      return;
    }

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
    console.log(`️ Voice message from ${socket.username} to user ${to}`);
  });

  // ==========================================
  // 3. الستيكرز + حفظ
  // ==========================================
  socket.on('sticker:send', (data) => {
    const { to, sticker } = data;
    
    if (!to || !sticker) {
      console.log('⚠️ Invalid sticker data:', data);
      return;
    }

    const savedMsg = addMessage(socket.userId, to, 'sticker', sticker, 0);
    
    const stickerData = {
      id: savedMsg.id,
      from: socket.userId,
      fromUsername: socket.username,
      to,
      type: 'sticker',
      sticker,
      timestamp: savedMsg.timestamp
    };

    io.to(`user_${to}`).emit('sticker:new', stickerData);
    console.log(`🎨 Sticker from ${socket.username} to user ${to}`);
  });

  // ==========================================
  // 4. مؤشر الكتابة (Typing Indicator)
  // ==========================================
  socket.on('typing:start', ({ to }) => {
    if (to) {
      socket.to(`user_${to}`).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        typing: true
      });
    }
  });
  
  socket.on('typing:stop', ({ to }) => {
    if (to) {
      socket.to(`user_${to}`).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        typing: false
      });
    }
  });

  // ==========================================
  // 5. المكالمات الصوتية (WebRTC Signaling)
  // ==========================================
  socket.on('call:initiate', ({ to, offer }) => {
    if (!to || !offer) {
      console.log('⚠️ Invalid call data');
      return;
    }
    
    activeCalls.set(socket.userId, { to });
    console.log(`📞 Call initiated from ${socket.username} to user ${to}`);
    io.to(`user_${to}`).emit('call:incoming', {
      from: socket.userId,
      fromUsername: socket.username,
      offer
    });
  });
  
  socket.on('call:answer', ({ to, answer }) => {
    if (!to || !answer) return;
    activeCalls.set(socket.userId, { to });
    console.log(`📞 Call answered by ${socket.username}`);
    io.to(`user_${to}`).emit('call:answered', { 
      from: socket.userId,
      answer 
    });
  });
  
  socket.on('call:ice', ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(`user_${to}`).emit('call:ice', { 
      from: socket.userId,
      candidate 
    });
  });
  
  socket.on('call:end', ({ to }) => {
    if (!to) return;
    activeCalls.delete(socket.userId);
    activeCalls.delete(to);
    console.log(`📞 Call ended by ${socket.username}`);
    io.to(`user_${to}`).emit('call:ended', { from: socket.userId });
  });

  // ==========================================
  // 6. الإشعارات
  // ==========================================
  socket.on('notify', ({ to, title, body }) => {
    if (!to) return;
    io.to(`user_${to}`).emit('notification', { 
      title: title || 'رسالة جديدة',
      body: body || '',
      from: socket.username,
      fromId: socket.userId
    });
  });

  // ==========================================
  // 7. طلب حالة الاتصال
  // ==========================================
  socket.on('get:online', () => {
    socket.emit('users:online', Array.from(onlineUsers.keys()));
  });

  // ==========================================
  // 8. عند قطع الاتصال - إنهاء المكالمة تلقائياً
  // ==========================================
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.username} (Reason: ${reason})`);
    
    // إنهاء المكالمة النشطة
    const call = activeCalls.get(socket.userId);
    if (call) {
      io.to(`user_${call.to}`).emit('call:ended', { from: socket.userId });
      activeCalls.delete(socket.userId);
      activeCalls.delete(call.to);
      console.log(`📞 Call ended due to disconnect of ${socket.username}`);
    }
    
    // البحث عن من كان يتصل بهذا المستخدم
    for (const [uid, callData] of activeCalls.entries()) {
      if (callData.to === socket.userId) {
        io.to(`user_${uid}`).emit('call:ended', { from: socket.userId });
        activeCalls.delete(uid);
        console.log(`📞 Call to ${socket.username} ended`);
      }
    }
    
    onlineUsers.delete(socket.userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
    io.emit('user:offline', { userId: socket.userId });
  });

  // معالجة الأخطاء
  socket.on('error', (error) => {
    console.error(`⚠️ Socket error for ${socket.username}:`, error.message);
  });
});

// ============================================
// تشغيل الخادم
// ============================================
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║          🚀 Chat Server Started Successfully! 🚀        ║');
  console.log('║                                                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Server URL:    http://localhost:${PORT}              ║`);
  console.log(`║  📁 Uploads:       ${uploadsDir}                        ║`);
  console.log(`║  📁 Stickers:      ${stickersDir}                       ║`);
  console.log(`║  🔑 JWT Secret:    ${JWT_SECRET.substring(0, 10)}...    ║`);
  console.log(`║  🌍 Environment:   ${process.env.NODE_ENV || 'development'}              ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('✅ Waiting for connections...');
  console.log('');
});

// معالجة إغلاق الخادم بشكل نظيف
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (reason, promise) => {
  console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
