import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function WeeklyStats({ currentDate }) {
  const [open, setOpen] = useState(false);
  const [weekData, setWeekData] = useState([]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  useEffect(() => {
    if (!open) return;
    const fetchWeek = async () => {
      try {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const res = await axios.get(`/api/planner/${dateStr}/week`);
        const days = res.data.map(d => {
          const date = new Date(d.date + 'T00:00:00');
          const schedule = d.schedule || [];
          const rated = schedule.filter(s => s.rating);
          return {
            date: d.date,
            label: format(date, 'M/d(E)', { locale: ko }),
            total: schedule.length,
            done: schedule.filter(s => s.done).length,
            avgRating: rated.length > 0
              ? (rated.reduce((sum, s) => sum + s.rating, 0) / rated.length).toFixed(1)
              : '-',
          };
        });
        setWeekData(days);
      } catch {
        setWeekData([]);
      }
    };
    fetchWeek();
  }, [open, format(weekStart, 'yyyy-MM-dd')]);

  const todayStr = format(currentDate, 'yyyy-MM-dd');
  const totalAll = weekData.reduce((s, d) => s + d.total, 0);
  const doneAll = weekData.reduce((s, d) => s + d.done, 0);

  return (
    <div className="section">
      <div className="section-title clock-header" onClick={() => setOpen(!open)}>
        <span>주간 통계</span>
        <span className="clock-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <table className="weekly-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>계획</th>
                <th>완료</th>
                <th>달성률</th>
                <th>평균 별점</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map(d => {
                const rate = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                const isToday = d.date === todayStr;
                return (
                  <tr key={d.date} className={isToday ? 'weekly-today' : ''}>
                    <td className="weekly-day">{d.label}</td>
                    <td>{d.total}</td>
                    <td>{d.done}</td>
                    <td>
                      <div className="weekly-bar-wrap">
                        <div className="weekly-bar" style={{ width: `${rate}%` }} />
                        <span className="weekly-rate">{rate}%</span>
                      </div>
                    </td>
                    <td className="weekly-star">{d.avgRating !== '-' ? `★ ${d.avgRating}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="weekly-summary">
            총 {totalAll}개 계획 / {doneAll}개 완료 ({totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0}%)
          </div>
        </>
      )}
    </div>
  );
}
