import { useMemo } from 'react';
import { ROBOT_COLORS } from 'ricochet-shared';
import Robot from './Robot.jsx';

function buildWallSegments(board) {
  const segments = [];
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const cell = board.walls[r][c];
      if (cell.N) segments.push({ x1: c, y1: r, x2: c + 1, y2: r, key: `h-${r}-${c}` });
      if (cell.W) segments.push({ x1: c, y1: r, x2: c, y2: r + 1, key: `v-${r}-${c}` });
    }
  }
  return segments;
}

export default function Board({ board, target, robots, trails, selectedRobot, onSelectRobot, onDragRobot }) {
  const cellPercent = 100 / board.size;
  const wallSegments = useMemo(() => buildWallSegments(board), [board]);
  const blockedCells = useMemo(() => [...board.blocked].map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col, key };
  }), [board.blocked]);

  return (
    <div className="board-frame">
      <div
        className="board"
        style={{ '--board-size': board.size, '--cell-pct': `${cellPercent}%` }}
      >
        <svg
          className="board-walls"
          viewBox={`0 0 ${board.size} ${board.size}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {blockedCells.map((b) => (
            <rect key={b.key} className="board-blocked" x={b.col} y={b.row} width={1} height={1} />
          ))}
          {wallSegments.map((seg) => (
            <line key={seg.key} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} className="board-wall" />
          ))}
        </svg>

        {board.targets.map((t) => (
          <div
            key={t.id}
            className={`target-marker target-marker--${t.color}${t.id === target.id ? ' target-marker--active' : ''}`}
            style={{
              top: `${t.row * cellPercent}%`,
              left: `${t.col * cellPercent}%`,
              width: `${cellPercent}%`,
              height: `${cellPercent}%`,
            }}
          >
            {t.id === target.id && <span className="target-marker__ring" />}
            <span className="target-marker__dot" />
          </div>
        ))}

        {trails.map((trail) => (
          <div key={trail.id} className="trail">
            {trail.cells.map((cell, i) => (
              <span
                key={i}
                className={`trail__cell trail__cell--${trail.color}`}
                style={{
                  top: `${cell.row * cellPercent}%`,
                  left: `${cell.col * cellPercent}%`,
                  width: `${cellPercent}%`,
                  height: `${cellPercent}%`,
                  animationDelay: `${i * 12}ms`,
                }}
              />
            ))}
          </div>
        ))}

        {ROBOT_COLORS.map((color) => (
          <Robot
            key={color}
            color={color}
            row={robots[color].row}
            col={robots[color].col}
            cellPercent={cellPercent}
            selected={selectedRobot === color}
            onSelect={onSelectRobot}
            onDrag={onDragRobot}
          />
        ))}
      </div>
    </div>
  );
}
