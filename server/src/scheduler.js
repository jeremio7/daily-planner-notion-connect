const fs = require('fs');
const path = require('path');
const { sendPushToUser } = require('./routes/push');

const SUBS_PATH = path.join(__dirname, '../data/subscriptions.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const notified = new Set(); // "userId:scheduleId:date:minutes" 중복 방지
const ALERT_MINUTES = [10, 5, 0]; // 10분전, 5분전, 정시 알림

function getUserTimezone(userId) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    const user = Object.values(users).find(u => u.id === userId);
    return user?.timezone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

function getEmailPrefix(userId) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    const entry = Object.entries(users).find(([, u]) => u.id === userId);
    if (!entry) return null;
    return entry[0].split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch {
    return null;
  }
}

function getNowInTimezone(timezone) {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: timezone });
  return new Date(str);
}

function getTodayStr(timezone) {
  const local = getNowInTimezone(timezone);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function checkSchedules() {
  // 구독자 목록 확인
  if (!fs.existsSync(SUBS_PATH)) return;
  const subs = JSON.parse(fs.readFileSync(SUBS_PATH, 'utf-8'));
  const userIds = Object.keys(subs).filter(id => subs[id].length > 0);
  if (userIds.length === 0) return;

  for (const userId of userIds) {
    // userId → emailPrefix 매핑 (planner 파일은 emailPrefix로 저장됨)
    const emailPrefix = getEmailPrefix(userId);
    if (!emailPrefix) continue;
    const plannerPath = path.join(__dirname, `../data/planner_${emailPrefix}.json`);
    if (!fs.existsSync(plannerPath)) continue;

    const timezone = getUserTimezone(userId);
    const today = getTodayStr(timezone);
    const localNow = getNowInTimezone(timezone);
    const nowMin = localNow.getHours() * 60 + localNow.getMinutes();

    const data = JSON.parse(fs.readFileSync(plannerPath, 'utf-8'));
    const dayData = data[today];
    if (!dayData || !dayData.schedule) continue;

    for (const item of dayData.schedule) {
      if (item.done) continue;
      const [h, m] = item.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const diff = startMin - nowMin;

      for (const alertMin of ALERT_MINUTES) {
        const key = `${userId}:${item.id}:${today}:${alertMin}`;
        if (diff === alertMin && !notified.has(key)) {
          notified.add(key);
          console.log(`[Push] ${timezone} | ${userId}: "${item.text}" at ${item.startTime} (${diff}min left)`);
          const body = alertMin === 0
            ? `지금 시작: ${item.text} (${item.startTime})`
            : `${diff}분 후: ${item.text} (${item.startTime})`;
          sendPushToUser(userId, {
            title: 'Daily Planner',
            body,
            icon: '/icons/icon-192.png',
          }).then(() => {
            console.log(`[Push] Sent successfully`);
          }).catch(err => {
            console.error(`[Push] Send failed:`, err.message);
          });
        }
      }
    }
  }
}

function startScheduler() {
  console.log('Push notification scheduler started (30s interval)');
  setInterval(checkSchedules, 30000);
  checkSchedules();
}

// 매일 자정(UTC)에 notified 초기화
setInterval(() => {
  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
    notified.clear();
  }
}, 60000);

module.exports = { startScheduler };
