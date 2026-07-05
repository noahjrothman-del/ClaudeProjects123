import { useRef } from 'react';

const DRAG_THRESHOLD = 18;

const ICONS = {
  red: (
    <circle cx="12" cy="12" r="5" />
  ),
  yellow: (
    <polygon points="12,6 18,17 6,17" />
  ),
  green: (
    <rect x="7" y="7" width="10" height="10" />
  ),
  blue: (
    <polygon points="12,5 19,12 12,19 5,12" />
  ),
};

export default function Robot({ color, row, col, cellPercent, selected, onSelect, onDrag }) {
  const dragState = useRef(null);

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startY: event.clientY, dragged: false };
    onSelect(color);
  };

  const handlePointerMove = (event) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragState.current.dragged = true;
    }
  };

  const handlePointerUp = (event) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    if (dragState.current.dragged) {
      const direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? 'right' : 'left'
          : dy > 0 ? 'down' : 'up';
      onDrag(color, direction);
    }
    dragState.current = null;
  };

  return (
    <button
      type="button"
      className={`robot robot--${color}${selected ? ' robot--selected' : ''}`}
      style={{
        top: `${row * cellPercent}%`,
        left: `${col * cellPercent}%`,
        width: `${cellPercent}%`,
        height: `${cellPercent}%`,
      }}
      aria-label={`${color} robot, row ${row + 1}, column ${col + 1}${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => onSelect(color)}
    >
      <span className="robot__body">
        <svg className="robot__icon" viewBox="0 0 24 24" aria-hidden="true">
          {ICONS[color]}
        </svg>
      </span>
    </button>
  );
}
