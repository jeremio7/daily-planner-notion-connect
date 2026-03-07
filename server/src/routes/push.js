const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BPpXDfFy9HKFi4xDj5JI6XrWUGR2nkr23Ylrh8UMOVy7VDPKRbCVbjzR955RH54UXXlLB4TJGm2MPZU_R0nWTh4';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '1gzdz4ozf4UpaQ54jTpAUgCJ8CYAF-0-ZR7m1P7CZbg';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:jeremio7@gmail.com';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const SUBS_PATH = path.join(__dirname, '../../data/subscriptions.json');

function readSubs() {
  if (!fs.existsSync(SUBS_PATH)) fs.writeFileSync(SUBS_PATH, '{}', 'utf-8');
  return JSON.parse(fs.readFileSync(SUBS_PATH, 'utf-8'));
}

function writeSubs(data) {
  fs.writeFileSync(SUBS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

// POST /api/push/subscribe
router.post('/subscribe', authMiddleware, (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: '구독 정보가 없습니다.' });

  const subs = readSubs();
  if (!subs[req.userId]) subs[req.userId] = [];

  // 중복 방지
  const exists = subs[req.userId].some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs[req.userId].push(subscription);
    writeSubs(subs);
  }

  res.json({ success: true });
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', authMiddleware, (req, res) => {
  const { endpoint } = req.body;
  const subs = readSubs();
  if (subs[req.userId]) {
    subs[req.userId] = subs[req.userId].filter(s => s.endpoint !== endpoint);
    writeSubs(subs);
  }
  res.json({ success: true });
});

// 서버에서 푸시 보내기 (내부 호출용)
function sendPushToUser(userId, payload) {
  const subs = readSubs();
  const userSubs = subs[userId] || [];
  const failed = [];

  console.log(`[Push] Sending to ${userSubs.length} subscription(s) for user ${userId}`);
  const promises = userSubs.map(sub =>
    webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
      console.error(`[Push] Failed endpoint: ${sub.endpoint.slice(0, 60)}... Error: ${err.statusCode || err.message}`);
      failed.push(sub.endpoint);
    })
  );

  return Promise.all(promises).then(() => {
    // 실패한 구독 제거
    if (failed.length > 0) {
      subs[userId] = userSubs.filter(s => !failed.includes(s.endpoint));
      writeSubs(subs);
    }
  });
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
