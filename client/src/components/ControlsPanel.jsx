const ARROWS = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export default function ControlsPanel({ selectedRobot, onMove }) {
  return (
    <div className="controls-panel">
      <div className="controls-panel__status">
        {selectedRobot ? (
          <>
            <span className={`swatch swatch--${selectedRobot}`} />
            <span>{selectedRobot} selected</span>
          </>
        ) : (
          <span className="controls-panel__hint">Select a robot to move it</span>
        )}
      </div>
      <div className="dpad" role="group" aria-label="Move selected robot">
        <button
          type="button"
          className="dpad__btn dpad__btn--up"
          disabled={!selectedRobot}
          onClick={() => onMove('up')}
          aria-label="Move up"
        >
          {ARROWS.up}
        </button>
        <button
          type="button"
          className="dpad__btn dpad__btn--left"
          disabled={!selectedRobot}
          onClick={() => onMove('left')}
          aria-label="Move left"
        >
          {ARROWS.left}
        </button>
        <button
          type="button"
          className="dpad__btn dpad__btn--right"
          disabled={!selectedRobot}
          onClick={() => onMove('right')}
          aria-label="Move right"
        >
          {ARROWS.right}
        </button>
        <button
          type="button"
          className="dpad__btn dpad__btn--down"
          disabled={!selectedRobot}
          onClick={() => onMove('down')}
          aria-label="Move down"
        >
          {ARROWS.down}
        </button>
      </div>
    </div>
  );
}
