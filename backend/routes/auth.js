import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUser, createUser } from '../db.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'super_secret_change_me_in_production_12345';

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'missing fields' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'username too short' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'password too short' });
  }

  const existing = findUser(username);
  if (existing) {
    return res.status(409).json({ error: 'username taken' });
  }

  const hash = await bcrypt.hash(password, 10);
  const newUser = createUser(username, hash);

  if (!newUser) {
    return res.status(500).json({ error: 'Failed to create user' });
  }

  const token = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: newUser.id, username: newUser.username } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = findUser(username);
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

export default router;