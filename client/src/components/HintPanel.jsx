const ARROW_LABEL = { up: '↑', down: '↓', left: '←', right: '→' };

export default function HintPanel({ hint, onRequest, onClose, onPlay, onPause, onStepForward, onStepBack }) {
  if (hint.status === 'idle') {
    return (
      <div className="hint-panel">
        <button type="button" className="hint-panel__cta" onClick={onRequest}>
          Show best solution
        </button>
      </div>
    );
  }

  if (hint.status === 'loading') {
    return (
      <div className="hint-panel">
        <p className="hint-panel__loading">Searching for the optimal solution…</p>
      </div>
    );
  }

  if (hint.status === 'unsolved') {
    return (
      <div className="hint-panel">
        <p className="hint-panel__loading">No solution found within the search budget.</p>
        <button type="button" onClick={onRequest}>Try again</button>
        <button type="button" onClick={onClose}>Dismiss</button>
      </div>
    );
  }

  const atStart = hint.stepIndex <= 0;
  const atEnd = hint.stepIndex >= hint.moves.length;

  return (
    <div className="hint-panel hint-panel--replay">
      <div className="hint-panel__header">
        <h2>Best solution <span className="mono">({hint.moves.length} moves)</span></h2>
        <button type="button" className="hint-panel__close" onClick={onClose} aria-label="Close solution replay">
          ×
        </button>
      </div>
      <ol className="hint-panel__list">
        {hint.moves.map((move, i) => (
          <li
            key={i}
            className={`history-panel__item history-panel__item--${move.color}${i < hint.stepIndex ? ' hint-panel__item--done' : ''}${i === hint.stepIndex ? ' hint-panel__item--current' : ''}`}
          >
            <span className="mono">{i + 1}.</span>{' '}
            <span className={`swatch swatch--${move.color}`} />
            {move.color} {ARROW_LABEL[move.direction]} {move.direction}
          </li>
        ))}
      </ol>
      <div className="hint-panel__transport">
        <button type="button" onClick={onStepBack} disabled={atStart} aria-label="Previous step">
          ⏮
        </button>
        {hint.playing ? (
          <button type="button" onClick={onPause} aria-label="Pause replay">⏸ Pause</button>
        ) : (
          <button type="button" onClick={onPlay} disabled={atEnd} aria-label="Play replay">▶ Play</button>
        )}
        <button type="button" onClick={onStepForward} disabled={atEnd} aria-label="Next step">
          ⏭
        </button>
      </div>
    </div>
  );
}
