// Ricochet Robots — board data & generation.
// Pure, framework-free, deterministic. Shared between server and client.

export const BOARD_SIZE = 16;
export const ROBOT_COLORS = ['red', 'yellow', 'green', 'blue'];
export const DIRECTIONS = ['up', 'down', 'left', 'right'];

const OPPOSITE_SIDE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const SIDE_DELTA = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

const TARGET_COUNT = 17;
const EXTRA_WALL_COUNT = 14;
const MIN_TARGET_SPACING = 2; // Chebyshev distance, keeps target pockets from crowding each other

export function cellKey(row, col) {
  return `${row},${col}`;
}

// Small, fast, seeded PRNG (mulberry32) so a board is a pure function of its
// seed — the server can send clients a single integer and both sides
// reconstruct an identical board, without shipping the whole layout over the
// wire.
function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function wallInCenterHole(walls, blocked, size) {
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
}

// A cell touching the board boundary gets that boundary for free as a
// "wall" on that side (a robot sliding into the edge already stops there),
// so only the *other* axis needs an explicit wall — and a corner cell needs
// none at all. This is what puts real obstacles right up against the edges
// instead of only in the middle of the board.
function pickPocketSides(row, col, size, rng) {
  const sides = [];
  if (row !== 0 && row !== size - 1) sides.push(rng() < 0.5 ? 'N' : 'S');
  if (col !== 0 && col !== size - 1) sides.push(rng() < 0.5 ? 'E' : 'W');
  return sides;
}

// Sides not already implied by the boundary, for decorative walls (so we
// never add a redundant, invisible-in-effect wall right on the edge).
function meaningfulSides(row, col, size) {
  const sides = [];
  if (row !== 0) sides.push('N');
  if (row !== size - 1) sides.push('S');
  if (col !== 0) sides.push('W');
  if (col !== size - 1) sides.push('E');
  return sides;
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

function assignColors(count, rng) {
  const colors = [];
  while (colors.length < count) colors.push(...ROBOT_COLORS);
  colors.length = count;
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors;
}

function pickTargetCell(size, blocked, placed, rng) {
  let best = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    const key = cellKey(row, col);
    if (blocked.has(key)) continue;
    if (placed.some((t) => t.row === row && t.col === col)) continue;
    const tooClose = placed.some((t) => chebyshevDistance(t, { row, col }) < MIN_TARGET_SPACING);
    if (!tooClose) return { row, col };
    if (!best) best = { row, col }; // fallback if spacing can't be satisfied after many tries
  }
  return best;
}

// Procedurally generates a full board (walls + targets) from a single
// integer seed — the same seed always reproduces the same board, so the
// server only needs to broadcast the seed for every client to render an
// identical layout.
export function generateBoard(seed = Math.floor(Math.random() * 2 ** 31)) {
  const size = BOARD_SIZE;
  const rng = createRng(seed);
  const walls = createEmptyWalls(size);
  const blocked = blockedCenterCells(size);
  wallInCenterHole(walls, blocked, size);

  const placed = [];
  for (let i = 0; i < TARGET_COUNT; i++) {
    const cell = pickTargetCell(size, blocked, placed, rng);
    if (!cell) break;
    placed.push(cell);
    for (const side of pickPocketSides(cell.row, cell.col, size, rng)) {
      addWall(walls, cell.row, cell.col, side, size);
    }
  }

  const colors = assignColors(placed.length, rng);
  const targets = placed.map((cell, i) => ({ id: i, row: cell.row, col: cell.col, color: colors[i] }));

  const targetKeys = new Set(targets.map((t) => cellKey(t.row, t.col)));
  for (let i = 0; i < EXTRA_WALL_COUNT; i++) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    const key = cellKey(row, col);
    if (blocked.has(key) || targetKeys.has(key)) continue;
    const sides = meaningfulSides(row, col, size);
    const side = sides[Math.floor(rng() * sides.length)];
    addWall(walls, row, col, side, size);
  }

  return { size, walls, blocked, targets, seed };
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
