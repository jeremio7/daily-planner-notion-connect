const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 인증 미들웨어 적용
router.use(authMiddleware);

function getDataPath(userId) {
  return path.join(__dirname, `../../data/planner_${userId}.json`);
}

function readData(userId) {
  const dataPath = getDataPath(userId);
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, '{}', 'utf-8');
  }
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

function writeData(userId, data) {
  fs.writeFileSync(getDataPath(userId), JSON.stringify(data, null, 2), 'utf-8');
}

function getDateData(userId, date) {
  const data = readData(userId);
  if (!data[date]) {
    data[date] = { todos: [], schedule: [], deleted: [] };
    writeData(userId, data);
  }
  if (!data[date].deleted) {
    data[date].deleted = [];
    writeData(userId, data);
  }
  return data[date];
}

// GET /api/planner/:date
router.get('/:date', (req, res) => {
  const { date } = req.params;
  const dateData = getDateData(req.userId, date);
  res.json(dateData);
});

// POST /api/planner/:date/todos
router.post('/:date/todos', (req, res) => {
  const { date } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: '할일 텍스트를 입력해주세요.' });
  }
  if (text.length > 100) {
    return res.status(400).json({ error: '할일은 100자 이내로 입력해주세요.' });
  }

  const data = readData(req.userId);
  if (!data[date]) data[date] = { todos: [], schedule: [], deleted: [] };

  const todo = { id: uuidv4(), text: text.trim() };
  data[date].todos.push(todo);
  writeData(req.userId, data);

  res.status(201).json(todo);
});

// DELETE /api/planner/:date/todos/:id
router.delete('/:date/todos/:id', (req, res) => {
  const { date, id } = req.params;
  const data = readData(req.userId);

  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const idx = data[date].todos.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });

  data[date].todos.splice(idx, 1);
  writeData(req.userId, data);

  res.json({ success: true });
});

// POST /api/planner/:date/schedule
router.post('/:date/schedule', (req, res) => {
  const { date } = req.params;
  const { todoId, startTime, endTime } = req.body;

  if (!todoId || !startTime || !endTime) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
  }
  if (startTime >= endTime) {
    return res.status(400).json({ error: '종료시간은 시작시간보다 뒤여야 합니다.' });
  }

  const data = readData(req.userId);
  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const todoIdx = data[date].todos.findIndex(t => t.id === todoId);
  if (todoIdx === -1) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });

  const todo = data[date].todos[todoIdx];
  const scheduleItem = {
    id: uuidv4(),
    todoId: todo.id,
    text: todo.text,
    startTime,
    endTime,
    done: false,
  };

  // 할일 목록에서 제거
  data[date].todos.splice(todoIdx, 1);
  // 계획표에 추가
  data[date].schedule.push(scheduleItem);
  // 시작시간 기준 정렬
  data[date].schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  writeData(req.userId, data);

  res.status(201).json(data[date]);
});

// PATCH /api/planner/:date/schedule/:id
router.patch('/:date/schedule/:id', (req, res) => {
  const { date, id } = req.params;
  const { done, rating, startTime, endTime } = req.body;

  const data = readData(req.userId);
  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const item = data[date].schedule.find(s => s.id === id);
  if (!item) return res.status(404).json({ error: '계획을 찾을 수 없습니다.' });

  if (done !== undefined) item.done = done;
  if (rating !== undefined) item.rating = rating;
  if (startTime !== undefined && endTime !== undefined) {
    if (startTime >= endTime) return res.status(400).json({ error: '종료시간은 시작시간보다 뒤여야 합니다.' });
    item.startTime = startTime;
    item.endTime = endTime;
    data[date].schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  writeData(req.userId, data);

  res.json(data[date]);
});

// DELETE /api/planner/:date/schedule/:id
router.delete('/:date/schedule/:id', (req, res) => {
  const { date, id } = req.params;
  const data = readData(req.userId);

  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const idx = data[date].schedule.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: '계획을 찾을 수 없습니다.' });

  const removed = data[date].schedule.splice(idx, 1)[0];
  // 삭제항목으로 이동
  if (!data[date].deleted) data[date].deleted = [];
  data[date].deleted.push({ id: removed.id, text: removed.text, startTime: removed.startTime, endTime: removed.endTime });
  writeData(req.userId, data);

  res.json(data[date]);
});

// POST /api/planner/:date/schedule/swap - 두 항목의 시간 교환
router.post('/:date/schedule/swap', (req, res) => {
  const { date } = req.params;
  const { dragId, dropId } = req.body;

  if (!dragId || !dropId) return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });

  const data = readData(req.userId);
  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const dragItem = data[date].schedule.find(s => s.id === dragId);
  const dropItem = data[date].schedule.find(s => s.id === dropId);
  if (!dragItem || !dropItem) return res.status(404).json({ error: '계획을 찾을 수 없습니다.' });

  // 시간 교환
  const tmpStart = dragItem.startTime;
  const tmpEnd = dragItem.endTime;
  dragItem.startTime = dropItem.startTime;
  dragItem.endTime = dropItem.endTime;
  dropItem.startTime = tmpStart;
  dropItem.endTime = tmpEnd;

  // 시간순 재정렬
  data[date].schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  writeData(req.userId, data);

  res.json(data[date]);
});

// POST /api/planner/:date/schedule/auto - 빈 시간에 자동 배치
router.post('/:date/schedule/auto', (req, res) => {
  const { date } = req.params;
  const { slotMinutes } = req.body; // 한 슬롯 길이 (기본 60분)
  const slot = slotMinutes || 60;

  const data = readData(req.userId);
  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });
  if (data[date].todos.length === 0) return res.status(400).json({ error: '배정할 할일이 없습니다.' });

  // 기존 스케줄에서 사용 중인 시간 블록 (분 단위)
  const busy = data[date].schedule.map(s => ({
    start: timeToMin(s.startTime),
    end: timeToMin(s.endTime),
  }));
  busy.sort((a, b) => a.start - b.start);

  // 하루 범위: 06:00 ~ 23:00
  const dayStart = 6 * 60;
  const dayEnd = 23 * 60;

  // 빈 슬롯 찾기
  const freeSlots = [];
  let cursor = dayStart;
  for (const block of busy) {
    if (cursor < block.start) {
      freeSlots.push({ start: cursor, end: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < dayEnd) {
    freeSlots.push({ start: cursor, end: dayEnd });
  }

  // 할일들을 빈 슬롯에 배치
  const todosToAssign = [...data[date].todos];
  const assigned = [];

  for (const free of freeSlots) {
    let pos = free.start;
    while (pos + slot <= free.end && todosToAssign.length > 0) {
      const todo = todosToAssign.shift();
      const startTime = minToTime(pos);
      const endTime = minToTime(pos + slot);
      const scheduleItem = {
        id: uuidv4(),
        todoId: todo.id,
        text: todo.text,
        startTime,
        endTime,
        done: false,
      };
      data[date].schedule.push(scheduleItem);
      assigned.push(todo.id);
      pos += slot;
    }
    if (todosToAssign.length === 0) break;
  }

  // 배정된 할일을 todos에서 제거
  data[date].todos = data[date].todos.filter(t => !assigned.includes(t.id));
  // 시간순 정렬
  data[date].schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  writeData(req.userId, data);

  res.json(data[date]);
});

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(m) {
  const h = String(Math.floor(m / 60)).padStart(2, '0');
  const min = String(m % 60).padStart(2, '0');
  return `${h}:${min}`;
}

// GET /api/planner/:date/week - 주간 통계 (7일치 한번에)
router.get('/:date/week', (req, res) => {
  const { date } = req.params;
  const parts = date.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(parts[0], parts[1] - 1, parts[2] + mondayOffset);

  const data = readData(req.userId);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayData = data[dateStr] || { schedule: [] };
    days.push({
      date: dateStr,
      schedule: dayData.schedule || [],
    });
  }
  res.json(days);
});

// DELETE /api/planner/:date/deleted
router.delete('/:date/deleted', (req, res) => {
  const { date } = req.params;
  const data = readData(req.userId);

  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  data[date].deleted = [];
  writeData(req.userId, data);

  res.json(data[date]);
});

// POST /api/planner/:date/deleted/:id/restore - 개별 삭제항목을 할일목록으로 복원
router.post('/:date/deleted/:id/restore', (req, res) => {
  const { date, id } = req.params;
  const data = readData(req.userId);

  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const idx = (data[date].deleted || []).findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });

  const item = data[date].deleted.splice(idx, 1)[0];
  data[date].todos.push({ id: item.id, text: item.text });
  writeData(req.userId, data);

  res.json(data[date]);
});

// DELETE /api/planner/:date/deleted/:id - 개별 삭제항목 완전 제거
router.delete('/:date/deleted/:id', (req, res) => {
  const { date, id } = req.params;
  const data = readData(req.userId);

  if (!data[date]) return res.status(404).json({ error: '날짜를 찾을 수 없습니다.' });

  const idx = (data[date].deleted || []).findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });

  data[date].deleted.splice(idx, 1);
  writeData(req.userId, data);

  res.json(data[date]);
});

module.exports = router;
