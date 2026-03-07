const express = require('express');
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function getDataPath(userId) {
  return path.join(__dirname, `../../data/planner_${userId}.json`);
}

function readData(userId) {
  const dataPath = getDataPath(userId);
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, '{}', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function writeData(userId, data) {
  fs.writeFileSync(getDataPath(userId), JSON.stringify(data, null, 2), 'utf-8');
}

// API 키: 환경변수 우선 (보안)
function getApiKey(req) {
  return process.env.NOTION_API_KEY || req.headers['x-notion-key'] || null;
}

function getNotionClient(req) {
  const apiKey = getApiKey(req);
  if (!apiKey) return null;
  return new Client({ auth: apiKey });
}

// DB ID: 클라이언트 선택 우선 (유연성)
function getDbId(req) {
  return req.headers['x-notion-db'] || req.body?.databaseId || process.env.NOTION_DB_ID || null;
}

// 기존 DB에 ID 속성이 없으면 자동 추가
async function ensureIdProperty(notion, databaseId) {
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    if (!db.properties['ID']) {
      await notion.databases.update({
        database_id: databaseId,
        properties: { 'ID': { rich_text: {} } },
      });
    }
  } catch {}
}

// GET /api/notion/env-status - 환경변수 설정 여부 확인
router.get('/env-status', (req, res) => {
  const hasKey = !!process.env.NOTION_API_KEY;
  const hasDb = !!process.env.NOTION_DB_ID;
  res.json({ hasKey, hasDb, autoConnected: hasKey && hasDb });
});

// POST /api/notion/connect - API 키 유효성 테스트
router.post('/connect', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API 키를 입력해주세요.' });
  }

  try {
    const notion = new Client({ auth: apiKey });
    const me = await notion.users.me({});
    res.json({ success: true, botName: me.name || 'Notion Bot' });
  } catch {
    res.status(400).json({ error: 'API 키가 유효하지 않습니다.' });
  }
});

// GET /api/notion/search-databases - 기존 DB 검색
router.get('/search-databases', async (req, res) => {
  const notion = getNotionClient(req);
  if (!notion) return res.status(400).json({ error: 'API 키가 없습니다.' });

  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'database' },
      page_size: 50,
    });

    const databases = response.results.map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || '제목 없음',
    }));

    res.json({ databases });
  } catch (err) {
    res.status(500).json({ error: 'DB 검색 실패: ' + err.message });
  }
});

// GET /api/notion/search-pages - 페이지 검색
router.get('/search-pages', async (req, res) => {
  const notion = getNotionClient(req);
  if (!notion) return res.status(400).json({ error: 'API 키가 없습니다.' });

  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 20,
    });

    const pages = response.results.map(page => ({
      id: page.id,
      title: page.properties?.title?.title?.[0]?.plain_text || '제목 없음',
    }));

    res.json({ pages });
  } catch (err) {
    res.status(500).json({ error: '페이지 검색 실패: ' + err.message });
  }
});

// POST /api/notion/create-database - DB 생성
router.post('/create-database', async (req, res) => {
  const notion = getNotionClient(req);
  if (!notion) return res.status(400).json({ error: 'API 키가 없습니다.' });

  const { pageId } = req.body;
  try {
    const database = await notion.databases.create({
      parent: { type: 'page_id', page_id: pageId },
      title: [{ type: 'text', text: { content: 'Daily Planner' } }],
      properties: {
        '할일': { title: {} },
        'ID': { rich_text: {} },
        '날짜': { date: {} },
        '시작시간': { rich_text: {} },
        '종료시간': { rich_text: {} },
        '완료': { checkbox: {} },
        '별점': { number: {} },
      },
    });

    res.json({ success: true, databaseId: database.id, message: 'Daily Planner 데이터베이스가 생성되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: 'DB 생성 실패: ' + err.message });
  }
});

// POST /api/notion/export - 내보내기 (인증 필요 - ID 기반)
router.post('/export', authMiddleware, async (req, res) => {
  const notion = getNotionClient(req);
  const databaseId = getDbId(req);
  if (!notion || !databaseId) {
    return res.status(400).json({ error: 'Notion 연결 정보가 없습니다.' });
  }
  await ensureIdProperty(notion, databaseId);

  const { date, todos, schedule, mode } = req.body;
  const userName = req.userName;
  try {
    const results = { created: 0, errors: [] };

    // mode: 'replace' → 해당 ID의 기존 항목만 삭제 후 새로 추가
    if (mode === 'replace') {
      const existing = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            { property: '날짜', date: { equals: date } },
            { property: 'ID', rich_text: { equals: userName } },
          ],
        },
      });
      for (const page of existing.results) {
        await notion.pages.update({ page_id: page.id, archived: true });
      }
    }

    // 할일 내보내기
    for (const todo of (todos || [])) {
      try {
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            '할일': { title: [{ text: { content: todo.text } }] },
            'ID': { rich_text: [{ text: { content: userName } }] },
            '날짜': { date: { start: date } },
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push(`"${todo.text}": ${err.message}`);
      }
    }

    // 계획 내보내기
    for (const item of (schedule || [])) {
      try {
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            '할일': { title: [{ text: { content: item.text } }] },
            'ID': { rich_text: [{ text: { content: userName } }] },
            '날짜': { date: { start: date } },
            '시작시간': { rich_text: [{ text: { content: item.startTime } }] },
            '종료시간': { rich_text: [{ text: { content: item.endTime } }] },
            '완료': { checkbox: !!item.done },
            '별점': { number: item.rating || 0 },
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push(`"${item.text}": ${err.message}`);
      }
    }

    res.json({ success: true, message: `${results.created}개 항목을 Notion에 내보냈습니다.`, errors: results.errors });
  } catch (err) {
    res.status(500).json({ error: '내보내기 실패: ' + err.message });
  }
});

// POST /api/notion/import - 가져오기 (인증 필요 - planner 저장)
router.post('/import', authMiddleware, async (req, res) => {
  const notion = getNotionClient(req);
  const databaseId = getDbId(req);
  if (!notion || !databaseId) {
    return res.status(400).json({ error: 'Notion 연결 정보가 없습니다.' });
  }
  await ensureIdProperty(notion, databaseId);

  const { date } = req.body;
  const userName = req.userName;
  try {
    // ID 필터로 먼저 시도, 결과 없으면 날짜만으로 재시도
    let response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          { property: '날짜', date: { equals: date } },
          { property: 'ID', rich_text: { equals: userName } },
        ],
      },
      sorts: [{ property: '시작시간', direction: 'ascending' }],
    });
    if (response.results.length === 0) {
      response = await notion.databases.query({
        database_id: databaseId,
        filter: { property: '날짜', date: { equals: date } },
        sorts: [{ property: '시작시간', direction: 'ascending' }],
      });
    }

    const todos = [];
    const schedule = [];

    for (const page of response.results) {
      const props = page.properties;
      const text = props['할일']?.title?.[0]?.plain_text || '';
      const startTime = props['시작시간']?.rich_text?.[0]?.plain_text || '';
      const endTime = props['종료시간']?.rich_text?.[0]?.plain_text || '';
      const done = props['완료']?.checkbox || false;
      const rating = props['별점']?.number || 0;
      if (!text) continue;

      if (!startTime && !endTime) {
        todos.push({ id: uuidv4(), text });
      } else {
        schedule.push({ id: uuidv4(), text, startTime, endTime, done, rating });
      }
    }

    // planner 저장소에 저장
    const data = readData(req.emailPrefix);
    data[date] = { todos, schedule, deleted: [] };
    writeData(req.emailPrefix, data);

    res.json({
      success: true, date, todos, schedule,
      message: `할일 ${todos.length}개, 계획 ${schedule.length}개를 가져왔습니다.`,
    });
  } catch (err) {
    res.status(500).json({ error: '가져오기 실패: ' + err.message });
  }
});

module.exports = router;
