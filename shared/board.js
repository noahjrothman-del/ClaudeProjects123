// Ricochet Robots — board data & generation.
// Pure, framework-free, deterministic. Shared between server and client.

export const BOARD_SIZE = 16;
export const ROBOT_COLORS = ['red', 'yellow', 'green', 'blue'];
export const DIRECTIONS = ['up', 'down', 'left', 'right'];

const OPPOSITE_SIDE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const SIDE_DELTA = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

export function cellKey(row, col) {
  return `${row},${col}`;
}

function createEmptyWalls(size) {
  const walls = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push({ N: false, S: false, E: false, W: false });
    }
    walls.push(row);
  }
  return walls;
}

function addWall(walls, row, col, side, size) {
  if (row < 0 || row >= size || col < 0 || col >= size) return;
  walls[row][col][side] = true;
  const [dr, dc] = SIDE_DELTA[side];
  const nr = row + dr;
  const nc = col + dc;
  if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
    walls[nr][nc][OPPOSITE_SIDE[side]] = true;
  }
}

// Center 2x2 blocked "hole" that no robot may enter, classic Ricochet Robots style.
function blockedCenterCells(size) {
  const mid = size / 2;
  const cells = new Set();
  for (const r of [mid - 1, mid]) {
    for (const c of [mid - 1, mid]) {
      cells.add(cellKey(r, c));
    }
  }
  return cells;
}

// A handful of fixed layouts (a "small rotation") rather than fully random walls
// every round. Each entry lists explicit wall segments plus target definitions
// (cell + color + an L-shaped wall pocket so the target is reachable/stoppable).
const LAYOUT_DEFS = [
  {
    // extra decorative walls scattered around the board, independent of targets
    extraWalls: [
      [2, 4, 'E'], [2, 9, 'S'], [4, 12, 'W'], [5, 2, 'S'],
      [7, 5, 'E'], [9, 10, 'N'], [11, 3, 'E'], [12, 8, 'N'],
      [13, 13, 'W'], [3, 1, 'S'], [6, 14, 'S'], [10, 1, 'N'],
    ],
    targets: [
      { row: 1, col: 1, color: 'red', walls: ['S', 'E'] },
      { row: 1, col: 6, color: 'blue', walls: ['S', 'W'] },
      { row: 1, col: 10, color: 'green', walls: ['S', 'E'] },
      { row: 1, col: 14, color: 'yellow', walls: ['S', 'W'] },
      { row: 3, col: 3, color: 'green', walls: ['N', 'E'] },
      { row: 3, col: 8, color: 'red', walls: ['S', 'W'] },
      { row: 4, col: 13, color: 'yellow', walls: ['N', 'W'] },
      { row: 5, col: 5, color: 'blue', walls: ['N', 'E'] },
      { row: 6, col: 10, color: 'red', walls: ['S', 'E'] },
      { row: 7, col: 2, color: 'yellow', walls: ['N', 'W'] },
      { row: 8, col: 13, color: 'blue', walls: ['S', 'E'] },
      { row: 9, col: 5, color: 'green', walls: ['S', 'W'] },
      { row: 10, col: 9, color: 'yellow', walls: ['N', 'E'] },
      { row: 11, col: 12, color: 'red', walls: ['N', 'W'] },
      { row: 12, col: 2, color: 'blue', walls: ['S', 'E'] },
      { row: 13, col: 6, color: 'green', walls: ['N', 'W'] },
      { row: 14, col: 10, color: 'red', walls: ['N', 'E'] },
      { row: 14, col: 14, color: 'blue', walls: ['N', 'W'] },
    ],
  },
  {
    extraWalls: [
      [1, 7, 'S'], [2, 2, 'E'], [3, 11, 'S'], [5, 14, 'W'],
      [6, 6, 'N'], [8, 1, 'S'], [9, 9, 'E'], [10, 13, 'N'],
      [11, 5, 'S'], [12, 11, 'W'], [13, 3, 'N'], [14, 8, 'S'],
    ],
    targets: [
      { row: 1, col: 3, color: 'yellow', walls: ['S', 'E'] },
      { row: 1, col: 12, color: 'red', walls: ['S', 'W'] },
      { row: 2, col: 9, color: 'blue', walls: ['N', 'E'] },
      { row: 3, col: 1, color: 'green', walls: ['S', 'E'] },
      { row: 4, col: 6, color: 'red', walls: ['N', 'W'] },
      { row: 4, col: 14, color: 'blue', walls: ['S', 'W'] },
      { row: 6, col: 3, color: 'yellow', walls: ['N', 'E'] },
      { row: 6, col: 11, color: 'green', walls: ['S', 'E'] },
      { row: 5, col: 9, color: 'blue', walls: ['S', 'W'] },
      { row: 9, col: 1, color: 'red', walls: ['S', 'E'] },
      { row: 9, col: 14, color: 'yellow', walls: ['N', 'W'] },
      { row: 10, col: 5, color: 'green', walls: ['N', 'E'] },
      { row: 11, col: 10, color: 'red', walls: ['S', 'W'] },
      { row: 12, col: 13, color: 'blue', walls: ['N', 'E'] },
      { row: 13, col: 2, color: 'green', walls: ['S', 'W'] },
      { row: 14, col: 7, color: 'yellow', walls: ['N', 'E'] },
      { row: 14, col: 12, color: 'red', walls: ['N', 'W'] },
    ],
  },
];

export function getLayoutCount() {
  return LAYOUT_DEFS.length;
}

export function generateBoard(layoutIndex = 0) {
  const size = BOARD_SIZE;
  const def = LAYOUT_DEFS[layoutIndex % LAYOUT_DEFS.length];
  const walls = createEmptyWalls(size);
  const blocked = blockedCenterCells(size);

  // Wall the center hole in on all sides so it behaves like a solid obstacle.
  const mid = size / 2;
  for (const r of [mid - 1, mid]) {
    for (const c of [mid - 1, mid]) {
      for (const side of ['N', 'S', 'E', 'W']) {
        const [dr, dc] = SIDE_DELTA[side];
        const nr = r + dr;
        const nc = c + dc;
        if (!blocked.has(cellKey(nr, nc))) {
          addWall(walls, r, c, side, size);
        }
      }
    }
  }

  for (const [row, col, side] of def.extraWalls) {
    addWall(walls, row, col, side, size);
  }

  const targets = def.targets.map((t, i) => {
    for (const side of t.walls) {
      addWall(walls, t.row, t.col, side, size);
    }
    return { id: i, row: t.row, col: t.col, color: t.color };
  });

  return { size, walls, blocked, targets, layoutIndex };
}

export function randomizeRobotPositions(board, excludeCell = null, rng = Math.random) {
  const occupied = new Set();
  if (excludeCell) occupied.add(cellKey(excludeCell.row, excludeCell.col));
  const robots = {};
  for (const color of ROBOT_COLORS) {
    let row, col, key;
    let attempts = 0;
    do {
      row = Math.floor(rng() * board.size);
      col = Math.floor(rng() * board.size);
      key = cellKey(row, col);
      attempts++;
    } while ((occupied.has(key) || board.blocked.has(key)) && attempts < 1000);
    occupied.add(key);
    robots[color] = { row, col };
  }
  return robots;
}

export function pickRandomTarget(board, rng = Math.random) {
  const idx = Math.floor(rng() * board.targets.length);
  return board.targets[idx];
}
