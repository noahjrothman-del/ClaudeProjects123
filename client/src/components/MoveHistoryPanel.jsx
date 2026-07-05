const ARROW_LABEL = { up: '↑', down: '↓', left: '←', right: '→' };

export default function MoveHistoryPanel({ history, moveCount, onUndo, onReset }) {
  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <h2>Moves <span className="mono">({moveCount})</span></h2>
        <div className="history-panel__actions">
          <button type="button" onClick={onUndo} disabled={history.length === 0}>
            Undo
          </button>
          <button type="button" onClick={onReset} disabled={history.length === 0}>
            Reset
          </button>
        </div>
      </div>
      <ol className="history-panel__list">
        {history.length === 0 && <li className="history-panel__empty">No moves yet</li>}
        {history.map((move, i) => (
          <li key={i} className={`history-panel__item history-panel__item--${move.color}`}>
            <span className="mono">{i + 1}.</span>{' '}
            <span className={`swatch swatch--${move.color}`} />
            {move.color} {ARROW_LABEL[move.direction]} {move.direction}
          </li>
        ))}
      </ol>
    </div>
  );
}
