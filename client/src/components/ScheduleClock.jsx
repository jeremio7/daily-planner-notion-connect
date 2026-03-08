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

function RatingBarChart({ schedule }) {
  const n = schedule.length;
  if (n === 0) return null;

  const padT = 8;           // top padding for "5" label
  const chartH = 130;       // chart area height
  const labelH = 32;        // space for labels below
  const yAxisW = 20;        // y-axis label width
  const padR = 4;           // right padding
  const barGap = 8;         // gap between bars
  const maxRating = 5;

  const totalW = 280;       // SVG total width
  const barAreaW = totalW - yAxisW - padR;
  const barW = Math.min(32, (barAreaW - barGap * (n - 1)) / n);
  const barStep = barAreaW / n;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${padT + chartH + labelH}`}
      width="100%"
      style={{ maxWidth: 360 }}
      className="rating-bar-svg"
    >
      {/* Y-axis grid lines & labels */}
      {[0, 1, 2, 3, 4, 5].map(v => {
        const y = padT + chartH - (v / maxRating) * chartH;
        return (
          <g key={`y-${v}`}>
            <line x1={yAxisW} y1={y} x2={totalW - padR} y2={y} stroke="#E0E0E0" strokeWidth="0.5" strokeDasharray={v === 0 ? 'none' : '3,3'} />
            <text x={yAxisW - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#AAA">{v}</text>
          </g>
        );
      })}
      {/* Axes */}
      <line x1={yAxisW} y1={padT} x2={yAxisW} y2={padT + chartH} stroke="#CCC" strokeWidth="1" />
      <line x1={yAxisW} y1={padT + chartH} x2={totalW - padR} y2={padT + chartH} stroke="#CCC" strokeWidth="1" />
      {/* Bars */}
      {schedule.map((item, i) => {
        const rating = item.rating || 0;
        const barH = (rating / maxRating) * chartH;
        const x = yAxisW + barStep * i + (barStep - barW) / 2;
        const y = padT + chartH - barH;
        return (
          <g key={item.id}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} rx={3} fill={COLORS[i % COLORS.length]} opacity="0.75" />
            <text x={x + barW / 2} y={padT + chartH + 13} textAnchor="middle" fontSize="9" fill="#666">{item.text}</text>
            <text x={x + barW / 2} y={padT + chartH + 24} textAnchor="middle" fontSize="7.5" fill="#AAA">{item.startTime}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ScheduleClock({ schedule }) {
  const [open, setOpen] = useState(false);

  if (schedule.length === 0) return null;

  const cx = 150, cy = 150, r = 110;
  const hourMarks = [0, 3, 6, 9, 12, 15, 18, 21];

  const total = schedule.length;
  const done = schedule.filter(s => s.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="section">
      <div className="section-title clock-header" onClick={() => setOpen(!open)}>
        <span>시간표 & 완성도</span>
        <span className="clock-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <div className="clock-and-progress">
            <div className="clock-chart">
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
            <div className="completion-panel">
              <div className="completion-summary">
                <span className="completion-pct">{pct}%</span>
                <span className="completion-label">{done}/{total} 완료</span>
              </div>
              <RatingBarChart schedule={schedule} />
            </div>
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
