export default function DeletedItems({ deleted, onClear, onRestore }) {
  if (!deleted || deleted.length === 0) return null;

  return (
    <div className="section">
      <h2 className="section-title">삭제항목</h2>
      <div className="todo-tags">
        {deleted.map(item => (
          <span key={item.id} className="tag tag-deleted">
            {item.text}
            <button className="btn-restore" onClick={() => onRestore(item.id)}>변경</button>
            <button className="tag-delete" onClick={() => onClear(item.id)}>&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}
