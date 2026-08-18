import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.json');

// تهيئة قاعدة البيانات
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ 
    users: [], 
    messages: [],
    contacts: {},    // userId -> [contactUserIds]
    favorites: {}    // userId -> [favoriteUserIds]
  }, null, 2));
}

const getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// ==================== User Functions ====================

export function findUser(username) {
  const db = getDB();
  return db.users.find(u => u.username === username);
}

export function findUserById(userId) {
  const db = getDB();
  return db.users.find(u => u.id === userId);
}

export function createUser(username, hashedPassword) {
  const db = getDB();
  if (findUser(username)) return null;
  
  const newUser = { 
    id: Date.now().toString(), 
    username, 
    password: hashedPassword,
    avatar: null,
    bio: '',
    createdAt: Date.now()
  };
  
  db.users.push(newUser);
  db.contacts[newUser.id] = [];
  db.favorites[newUser.id] = [];
  saveDB(db);
  return newUser;
}

export function updateUser(userId, updates) {
  const db = getDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  
  if (updates.username) {
    const existing = db.users.find(u => u.username === updates.username && u.id !== userId);
    if (existing) return null;
    db.users[userIndex].username = updates.username;
  }
  if (updates.avatar !== undefined) db.users[userIndex].avatar = updates.avatar;
  if (updates.bio !== undefined) db.users[userIndex].bio = updates.bio;
  
  saveDB(db);
  return db.users[userIndex];
}

export function getAllUsers(excludeId) {
  const db = getDB();
  return db.users
    .filter(u => u.id !== excludeId)
    .map(({ password, ...rest }) => rest);
}

// ==================== Message Functions ====================

export function addMessage(fromId, toId, type, content, duration = 0) {
  const db = getDB();
  const newMsg = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    fromId,
    toId,
    type,
    content,
    duration,
    timestamp: Date.now()
  };
  
  db.messages.push(newMsg);
  if (db.messages.length > 5000) {
    db.messages = db.messages.slice(-5000);
  }
  saveDB(db);
  return newMsg;
}

export function getMessagesBetween(user1Id, user2Id) {
  const db = getDB();
  return db.messages.filter(m => 
    (m.fromId === user1Id && m.toId === user2Id) || 
    (m.fromId === user2Id && m.toId === user1Id)
  ).sort((a, b) => a.timestamp - b.timestamp);
}

// ==================== Contacts & Favorites ====================

export function getContacts(userId) {
  const db = getDB();
  const contactIds = db.contacts[userId] || [];
  return db.users
    .filter(u => contactIds.includes(u.id))
    .map(({ password, ...rest }) => rest);
}

export function getFavorites(userId) {
  const db = getDB();
  const favIds = db.favorites[userId] || [];
  return db.users
    .filter(u => favIds.includes(u.id))
    .map(({ password, ...rest }) => rest);
}

export function addToContacts(userId, contactId) {
  const db = getDB();
  if (!db.contacts[userId]) db.contacts[userId] = [];
  if (!db.contacts[userId].includes(contactId)) {
    db.contacts[userId].push(contactId);
    saveDB(db);
  }
  return true;
}

export function removeFromContacts(userId, contactId) {
  const db = getDB();
  if (db.contacts[userId]) {
    db.contacts[userId] = db.contacts[userId].filter(id => id !== contactId);
    saveDB(db);
  }
  return true;
}

export function addToFavorites(userId, favId) {
  const db = getDB();
  if (!db.favorites[userId]) db.favorites[userId] = [];
  if (!db.favorites[userId].includes(favId)) {
    db.favorites[userId].push(favId);
    saveDB(db);
  }
  return true;
}

export function removeFromFavorites(userId, favId) {
  const db = getDB();
  if (db.favorites[userId]) {
    db.favorites[userId] = db.favorites[userId].filter(id => id !== favId);
    saveDB(db);
  }
  return true;
}

export function isInContacts(userId, contactId) {
  const db = getDB();
  return (db.contacts[userId] || []).includes(contactId);
}

export function isInFavorites(userId, favId) {
  const db = getDB();
  return (db.favorites[userId] || []).includes(favId);
}

export { dbPath };