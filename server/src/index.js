const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// 데이터 디렉토리 및 필수 파일 초기화
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '{}', 'utf-8');

const authRoutes = require('./routes/auth');
const plannerRoutes = require('./routes/planner');
const pushRoutes = require('./routes/push');
const notionRoutes = require('./routes/notion');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } }));

app.use('/api/auth', authRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/notion', notionRoutes);

// 프로덕션: 빌드된 프론트엔드 정적 파일 서빙
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  startScheduler();
});
