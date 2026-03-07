import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DateSelector({ currentDate, goPrev, goNext, goToday, notifyActive, onToggleNotification }) {
  const formatted = format(currentDate, 'yyyy년 M월 d일 (EEE)', { locale: ko });

  return (
    <div className="date-selector">
      <button className="date-btn" onClick={goPrev}>&#9664;</button>
      <span className="date-text">{formatted}</span>
      <button className="date-btn" onClick={goNext}>&#9654;</button>
      <button className="today-btn" onClick={goToday}>오늘</button>
      <button
        className={notifyActive ? 'btn-notify active' : 'btn-notify'}
        onClick={onToggleNotification}
      >
        {notifyActive ? '알림ON' : '알림OFF'}
      </button>
    </div>
  );
}
