import { useState } from 'react';

export default function TodoInput({ todos, onAdd, onDelete, onComplete, isCompleted, schedule, deleted }) {
  const [text, setText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    // ""로 감싼 부분은 하나로, 나머지는 스페이스/콤마로 구분
    const items = [];
    const regex = /"([^"]+)"|([^\s,]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = (match[1] || match[2]).trim();
      if (value.length > 0) items.push(value);
    }
    items.forEach(item => onAdd(item.trim()));
    setText('');
  };

  // 중복 텍스트 찾기 (todos + schedule + deleted 전체에서)
  const allTexts = [
    ...todos.map(t => t.text),
    ...(schedule || []).map(s => s.text),
    ...(deleted || []).map(d => d.text),
  ];
  const textCount = {};
  allTexts.forEach(t => { textCount[t] = (textCount[t] || 0) + 1; });
  const duplicates = new Set(Object.keys(textCount).filter(k => textCount[k] > 1));

  const handleComplete = () => {
    if (todos.length === 0) return;
    onComplete();
  };

  return (
    <div className="section">
      <h2 className="section-title">할일목록</h2>
      {!isCompleted ? (
        <>
          <form className="todo-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="todo-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="할일을 입력하세요 (스페이스, 콤마로 구분)"
              maxLength={100}
            />
            <button type="submit" className="btn btn-add">추가</button>
          </form>
          <div className="todo-tags">
            {todos.map(todo => (
              <span key={todo.id} className={`tag ${duplicates.has(todo.text) ? 'tag-duplicate' : ''}`}>
                {todo.text}
                <button className="tag-delete" onClick={() => onDelete(todo.id)}>&times;</button>
              </span>
            ))}
            {todos.length === 0 && (
              <span className="empty-text">할일을 추가해주세요</span>
            )}
          </div>
          {todos.length > 0 && (
            <button className="btn btn-complete" onClick={handleComplete}>
              입력완료
            </button>
          )}
        </>
      ) : (
        <>
          <form className="todo-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="todo-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="할일을 입력하세요 (스페이스, 콤마로 구분)"
              maxLength={100}
            />
            <button type="submit" className="btn btn-add">추가</button>
          </form>
          <div className="todo-tags">
            {todos.map(todo => (
              <span key={todo.id} className={`tag ${duplicates.has(todo.text) ? 'tag-duplicate' : ''}`}>
                {todo.text}
                <button className="tag-delete" onClick={() => onDelete(todo.id)}>&times;</button>
              </span>
            ))}
            {todos.length === 0 && (
              <span className="empty-text">모든 할일이 타임라인에 배정되었습니다</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
