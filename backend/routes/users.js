import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { auth } from '../middleware/auth.js';
import { 
  getAllUsers, findUserById, updateUser,
  getContacts, getFavorites,
  addToContacts, removeFromContacts,
  addToFavorites, removeFromFavorites,
  isInContacts, isInFavorites
} from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// جميع المستخدمين
router.get('/', auth, (req, res) => {
  const users = getAllUsers(req.user.id);
  res.json(users);
});

// جهات الاتصال
router.get('/contacts', auth, (req, res) => {
  const contacts = getContacts(req.user.id);
  res.json(contacts);
});

// المفضلة
router.get('/favorites', auth, (req, res) => {
  const favorites = getFavorites(req.user.id);
  res.json(favorites);
});

// إضافة لجهات الاتصال
router.post('/contacts/:userId', auth, (req, res) => {
  addToContacts(req.user.id, req.params.userId);
  res.json({ success: true });
});

// حذف من جهات الاتصال
router.delete('/contacts/:userId', auth, (req, res) => {
  removeFromContacts(req.user.id, req.params.userId);
  res.json({ success: true });
});

// إضافة للمفضلة
router.post('/favorites/:userId', auth, (req, res) => {
  addToFavorites(req.user.id, req.params.userId);
  res.json({ success: true });
});

// حذف من المفضلة
router.delete('/favorites/:userId', auth, (req, res) => {
  removeFromFavorites(req.user.id, req.params.userId);
  res.json({ success: true });
});

// التحقق من الحالة
router.get('/status/:userId', auth, (req, res) => {
  res.json({
    inContacts: isInContacts(req.user.id, req.params.userId),
    inFavorites: isInFavorites(req.user.id, req.params.userId)
  });
});

// رفع صوت
router.post('/upload/voice', auth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// رفع صورة بروفايل
router.post('/upload/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  const updated = updateUser(req.user.id, { avatar: avatarUrl });
  if (updated) {
    const { password, ...userData } = updated;
    res.json({ success: true, avatar: avatarUrl, user: userData });
  } else {
    res.status(500).json({ error: 'Failed' });
  }
});

// تعديل البروفايل
router.put('/profile', auth, (req, res) => {
  const { username, bio } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (bio !== undefined) updates.bio = bio;
  const updated = updateUser(req.user.id, updates);
  if (updated) {
    const { password, ...userData } = updated;
    res.json({ success: true, user: userData });
  } else {
    res.status(400).json({ error: 'Failed' });
  }
});

// جلب البروفايل
router.get('/profile', auth, (req, res) => {
  const user = findUserById(req.user.id);
  if (user) {
    const { password, ...userData } = user;
    res.json(userData);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;