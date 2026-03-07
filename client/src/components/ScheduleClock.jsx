import { useState } from 'react';

const COLORS = ['#4A90D9', '#5CB85C', '#E67E22', '#9B59B6', '#E74C3C', '#1ABC9C', '#F39C12', '#3498DB'];

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToAngle(minutes) {
  return -90 + (minutes / 1440) * 360;
}

function polar(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startMin, endMin) {
  const a1 = minToAngle(startMin);
  const a2 = minToAngle(endMin);
  const [sx, sy] = polar(cx, cy, r, a1);
  const [ex, ey] = polar(cx, cy, r, a2);
  const diff = a2 - a1;
  const large = diff > 180 ? 1 : 0;
  return `M${cx},${cy} L${sx},${sy} A${r},${r} 0 ${large},1 ${ex},${ey} Z`;
}

export default function ScheduleClock({ schedule }) {
  const [open, setOpen] = useState(false);

  if (schedule.length === 0) return null;

  const cx = 150, cy = 150, r = 110;

  const hourMarks = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="section">
      <div className="section-title clock-header" onClick={() => setOpen(!open)}>
        <span>시간표</span>
        <span className="clock-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <div style={{ textAlign: 'center' }}>
            <svg viewBox="0 0 300 300" width="260" height="260">
              <circle cx={cx} cy={cy} r={r} fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="2" />
              {schedule.map((item, i) => {
                const d = arcPath(cx, cy, r, timeToMin(item.startTime), timeToMin(item.endTime));
                return (
                  <path key={item.id} d={d} fill={COLORS[i % COLORS.length]} opacity="0.65" stroke="#fff" strokeWidth="1.5" />
                );
              })}
              {hourMarks.map(h => {
                const angle = minToAngle(h * 60);
                const [ix, iy] = polar(cx, cy, r - 4, angle);
                const [ox, oy] = polar(cx, cy, r + 4, angle);
                return (
                  <line key={`tick-${h}`} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#CCC" strokeWidth="1.5" />
                );
              })}
              {hourMarks.map(h => {
                const angle = minToAngle(h * 60);
                const [tx, ty] = polar(cx, cy, r + 16, angle);
                return (
                  <text key={`label-${h}`} x={tx} y={ty + 4} textAnchor="middle" fontSize="10" fill="#AAA">{h}</text>
                );
              })}
            </svg>
          </div>
          <div className="clock-legend">
            {schedule.map((item, i) => (
              <span key={item.id} className="clock-legend-item">
                <span className="clock-legend-color" style={{ background: COLORS[i % COLORS.length] }} />
                {item.text}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
