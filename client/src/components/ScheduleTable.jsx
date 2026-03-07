import { useState, useEffect, useRef, useCallback } from 'react';
import WheelPicker from './WheelPicker';

function fireConfetti() {
  const canvas = document.getElementById('confetti-overlay');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const colors = ['#F1C40F', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C'];
  const particles = Array.from({ length: 60 }, () => ({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.7) * 12,
    size: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 10,
    life: 1,
  }));

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.vx *= 0.99;
      p.life -= 0.015;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive) {
      frame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  animate();
}

function getOverlapSet(schedule) {
  const overlapping = new Set();
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      const a = schedule[i];
      const b = schedule[j];
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

function StarRating({ rating, onRate, disabled }) {
  const [hovered, setHovered] = useState(0);
  const [open, setOpen] = useState(false);

  if (!open && !rating) {
    return (
      <span className={`star-rating-box ${disabled ? 'star-disabled' : ''}`} onClick={() => !disabled && setOpen(true)}>
      </span>
    );
  }

  if (disabled && !rating) {
    return <span className="star-rating-box star-disabled" />;
  }

  return (
    <span className={`star-rating ${disabled ? 'star-disabled' : ''}`} onMouseLeave={() => !disabled && setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= (hovered || rating) ? 'star-filled' : 'star-empty'}`}
          onMouseEnter={() => !disabled && setHovered(star)}
          onClick={() => {
            if (disabled) return;
            const newRating = star === rating ? 0 : star;
            onRate(newRating);
            if (newRating === 0) setOpen(false);
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const EDITOR_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const EDITOR_MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function snapMinute(m) {
  const num = parseInt(m, 10);
  const snapped = Math.round(num / 5) * 5;
  return String(snapped >= 60 ? 55 : snapped).padStart(2, '0');
}

function TimeEditor({ startTime, endTime, onSave, onCancel }) {
  const [sH, sM] = startTime.split(':');
  const [eH, eM] = endTime.split(':');
  const [sh, setSh] = useState(sH);
  const [sm, setSm] = useState(snapMinute(sM));
  const [eh, setEh] = useState(eH);
  const [em, setEm] = useState(snapMinute(eM));

  const handleSave = () => {
    const newStart = `${sh}:${sm}`;
    const newEnd = `${eh}:${em}`;
    if (newStart >= newEnd) return;
    onSave(newStart, newEnd);
  };

  return (
    <div className="time-editor">
      <div className="time-editor-wheels">
        <div className="time-wheel-group-sm">
          <WheelPicker items={EDITOR_HOURS} value={sh} onChange={setSh} />
          <span className="wheel-colon-sm">:</span>
          <WheelPicker items={EDITOR_MINS} value={sm} onChange={setSm} />
        </div>
        <span className="wheel-sep-sm">~</span>
        <div className="time-wheel-group-sm">
          <WheelPicker items={EDITOR_HOURS} value={eh} onChange={setEh} />
          <span className="wheel-colon-sm">:</span>
          <WheelPicker items={EDITOR_MINS} value={em} onChange={setEm} />
        </div>
      </div>
      <div className="time-editor-btns">
        <button className="btn-time-save" onClick={handleSave}>저장</button>
        <button className="btn-time-cancel" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

export default function ScheduleTable({ schedule, onToggleDone, onDelete, onRate, onSwap, onUpdateTime }) {
  const overlapping = getOverlapSet(schedule);
  const [now, setNow] = useState(getCurrentTime);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(getCurrentTime()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
    <canvas id="confetti-overlay" className="confetti-overlay" />
    <div className="section">
      <div className="section-title schedule-header">
        <span>계획표</span>
        {schedule.length > 0 && (
          <span className="schedule-stats">
            <span>총 {schedule.length}</span>
            <span className="stat-done">완료 {schedule.filter(s => s.done).length}</span>
            <span className="stat-undone">미완료 {schedule.filter(s => !s.done && s.endTime <= now).length}</span>
          </span>
        )}
      </div>
      {schedule.length === 0 ? (
        <p className="empty-text">배정된 계획이 없습니다</p>
      ) : (
        <table className="schedule-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>할일</th>
              <th className="actions-header">
                <span className="header-check">완료</span>
                <span className="header-rating">완성도</span>
                <span className="header-delete"></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(item => {
              const isOverlap = overlapping.has(item.id);
              const isPast = item.endTime <= now;
              const rowClass = [
                item.done ? 'done-row' : '',
                isOverlap ? 'overlap-row' : '',
                isPast && !item.done ? 'past-row' : '',
                dragOverId === item.id ? 'drag-over-row' : '',
              ].filter(Boolean).join(' ');

              return (
                <tr
                  key={item.id}
                  className={rowClass}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => {
                    if (dragId && dragId !== item.id) onSwap(dragId, item.id);
                    setDragId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                >
                  <td className={`time-cell ${isOverlap ? 'overlap-time' : ''}`}>
                    {editingId === item.id ? (
                      <TimeEditor
                        startTime={item.startTime}
                        endTime={item.endTime}
                        onSave={(s, e) => { onUpdateTime(item.id, s, e); setEditingId(null); }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <span className="time-clickable" onClick={() => setEditingId(item.id)}>
                        {item.startTime} - {item.endTime}
                      </span>
                    )}
                  </td>
                  <td className={`text-cell ${item.done ? 'done-text' : ''}`}>
                    {item.text}
                  </td>
                  <td className="actions-cell">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        if (!item.done) fireConfetti();
                        onToggleDone(item.id, !item.done);
                      }}
                    />
                    <StarRating
                      rating={item.rating || 0}
                      onRate={(rating) => onRate(item.id, rating)}
                      disabled={!item.done}
                    />
                    <button
                      className="btn-delete-schedule"
                      onClick={() => onDelete(item.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
    </>
  );
}
