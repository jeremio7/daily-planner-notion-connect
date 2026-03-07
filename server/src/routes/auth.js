const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const USERS_PATH = path.join(__dirname, '../../data/users.json');

// JWT 시크릿: 환경변수 우선, 없으면 랜덤 생성 (서버 재시작 시 토큰 무효화됨)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET 환경변수 미설정. 랜덤 키 사용 중 (서버 재시작 시 모든 세션 만료)');
}

// 로그인 시도 제한 (브루트포스 방지)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15분

function checkLoginLimit(email) {
  const record = loginAttempts.get(email);
  if (!record) return true;
  if (Date.now() - record.lastAttempt > LOCK_TIME) {
    loginAttempts.delete(email);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordLoginAttempt(email, success) {
  if (success) {
    loginAttempts.delete(email);
    return;
  }
  const record = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  loginAttempts.set(email, record);
}

function readUsers() {
  const raw = fs.readFileSync(USERS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { password, name, timezone } = req.body;
  let { email } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  }

  email = normalizeEmail(email);

  if (password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
  }

  if (email.length > 100) {
    return res.status(400).json({ error: '이메일은 100자 이내로 입력해주세요.' });
  }

  const users = readUsers();
  if (users[email]) {
    return res.status(409).json({ error: '이미 등록된 이메일입니다.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  const displayName = name ? name.trim().slice(0, 30) : email.split('@')[0];

  users[email] = {
    id: userId,
    email,
    name: displayName,
    password: hashedPassword,
    timezone: timezone || 'Asia/Seoul',
    createdAt: new Date().toISOString(),
  };
  writeUsers(users);

  // 이메일 prefix 기반 planner 데이터 파일 생성 (없을 때만)
  const emailPrefix = email.split('@')[0];
  const plannerPath = path.join(__dirname, `../../data/planner_${emailPrefix}.json`);
  if (!fs.existsSync(plannerPath)) {
    fs.writeFileSync(plannerPath, '{}', 'utf-8');
  }

  const token = jwt.sign({ userId, email, name: displayName }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: userId, email, name: displayName } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  let { email, password, timezone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  }

  email = normalizeEmail(email);

  if (!checkLoginLimit(email)) {
    return res.status(429).json({ error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' });
  }

  const users = readUsers();
  const user = users[email];
  if (!user) {
    recordLoginAttempt(email, false);
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    recordLoginAttempt(email, false);
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  recordLoginAttempt(email, true);
  if (timezone) {
    user.timezone = timezone;
    writeUsers(users);
  }
  const token = jwt.sign({ userId: user.id, email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email, name: user.name } });
});

// GET /api/auth/me - 토큰으로 사용자 정보 확인
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const user = users[decoded.email];
    if (!user) return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json({ user: { id: user.id, email: decoded.email, name: user.name } });
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
