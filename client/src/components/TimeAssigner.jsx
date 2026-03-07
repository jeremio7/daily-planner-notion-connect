import { useState } from 'react';
import WheelPicker from './WheelPicker';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export default function TimeAssigner({ todos, onAssign, onAutoAssign }) {
  const [startH, setStartH] = useState('08');
  const [startM, setStartM] = useState('00');
  const [endH, setEndH] = useState('09');
  const [endM, setEndM] = useState('00');
  const [selectedTodoId, setSelectedTodoId] = useState('');

  const startTime = `${startH}:${startM}`;
  const endTime = `${endH}:${endM}`;

  const handleAssign = () => {
    if (!selectedTodoId) return;
    if (startTime >= endTime) return;
    onAssign(selectedTodoId, startTime, endTime);
    setSelectedTodoId('');
  };

  return (
    <div className="section">
      <h2 className="section-title">시간입력</h2>
      <div className="time-assigner">
        <div className="time-wheel-row">
          <div className="time-wheel-group">
            <WheelPicker items={HOURS} value={startH} onChange={setStartH} />
            <span className="wheel-colon">:</span>
            <WheelPicker items={MINUTES} value={startM} onChange={setStartM} />
          </div>
          <span className="wheel-separator">~</span>
          <div className="time-wheel-group">
            <WheelPicker items={HOURS} value={endH} onChange={setEndH} />
            <span className="wheel-colon">:</span>
            <WheelPicker items={MINUTES} value={endM} onChange={setEndM} />
          </div>
        </div>
        <select
          className="todo-select"
          value={selectedTodoId}
          onChange={e => setSelectedTodoId(e.target.value)}
        >
          <option value="">할일 선택</option>
          {todos.map(todo => (
            <option key={todo.id} value={todo.id}>{todo.text}</option>
          ))}
        </select>
        <button
          className="btn btn-assign"
          onClick={handleAssign}
          disabled={!selectedTodoId || startTime >= endTime}
        >
          완료
        </button>
      </div>
      {todos.length > 0 && (
        <button
          className="btn btn-auto"
          onClick={() => onAutoAssign(60)}
        >
          자동 배정
        </button>
      )}
    </div>
  );
}
