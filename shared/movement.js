// Ricochet Robots — sliding movement physics. Pure, deterministic.

import { ROBOT_COLORS, cellKey } from './board.js';

const EXIT_SIDE = { up: 'N', down: 'S', left: 'W', right: 'E' };
const DIR_DELTA = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

// Computes the resting cell for `color` sliding `direction` given walls,
// board bounds, blocked cells, and other robots' positions.
export function computeSlideDestination(board, robots, color, direction) {
  const { size, walls, blocked } = board;
  const exitSide = EXIT_SIDE[direction];
  const [dr, dc] = DIR_DELTA[direction];

  const otherPositions = new Set();
  for (const c of ROBOT_COLORS) {
    if (c === color) continue;
    otherPositions.add(cellKey(robots[c].row, robots[c].col));
  }

  let { row, col } = robots[color];

  while (true) {
    if (walls[row][col][exitSide]) break;
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    if (blocked.has(cellKey(nr, nc))) break;
    if (otherPositions.has(cellKey(nr, nc))) break;
    row = nr;
    col = nc;
  }

  return { row, col };
}

// Returns the list of cells (excluding the start, including the end) a robot
// passes through when sliding from `from` to `to`. Useful for animation trails.
export function getPathCells(from, to) {
  const path = [];
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  let row = from.row;
  let col = from.col;
  while (row !== to.row || col !== to.col) {
    row += dr;
    col += dc;
    path.push({ row, col });
  }
  return path;
}

// Applies a move to a robots map, returning { robots, moved, from, to } without
// mutating the input. `moved` is false for no-ops (per the rules, a no-op is
// not a countable move).
export function applyMove(board, robots, color, direction) {
  const from = robots[color];
  const to = computeSlideDestination(board, robots, color, direction);
  if (to.row === from.row && to.col === from.col) {
    return { robots, moved: false, from, to };
  }
  return {
    robots: { ...robots, [color]: to },
    moved: true,
    from,
    to,
  };
}

// Replays a sequence of {color, direction} moves from a starting robots map.
// Throws if any move in the sequence is a no-op (an illegal/invalid claim).
export function replayMoveSequence(board, startRobots, moves) {
  let robots = startRobots;
  const steps = [];
  for (const { color, direction } of moves) {
    const result = applyMove(board, robots, color, direction);
    if (!result.moved) {
      return { valid: false, robots, steps };
    }
    robots = result.robots;
    steps.push({ color, direction, from: result.from, to: result.to });
  }
  return { valid: true, robots, steps };
}

export function isRobotOnTarget(robots, color, target) {
  const pos = robots[color];
  return pos.row === target.row && pos.col === target.col;
}
