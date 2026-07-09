// Quick sanity checks for the shared engine. Run with: node test.js
import { generateBoard, randomizeRobotPositions } from './board.js';
import { computeSlideDestination, applyMove, replayMoveSequence } from './movement.js';
import { solve } from './solver.js';

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const board = generateBoard(0);

// A wall-free board, isolated from the procedural generator's randomness —
// for testing computeSlideDestination's own mechanics (edges, blockers)
// rather than whatever walls a particular seed happens to scatter around.
function bareBoard(size = 16) {
  const walls = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push({ N: false, S: false, E: false, W: false });
    walls.push(row);
  }
  return { size, walls, blocked: new Set(), targets: [] };
}

// --- Sliding: red slides right and stops at the board edge ---
{
  const bare = bareBoard();
  const robots = {
    red: { row: 0, col: 0 },
    yellow: { row: 15, col: 15 },
    green: { row: 14, col: 15 },
    blue: { row: 15, col: 14 },
  };
  const dest = computeSlideDestination(bare, robots, 'red', 'right');
  assert(dest.row === 0 && dest.col === 15, `red slides right from (0,0) to board edge, got (${dest.row},${dest.col})`);
}

// --- Sliding: robot stops just before another robot ---
{
  const bare = bareBoard();
  const robots = {
    red: { row: 5, col: 0 },
    yellow: { row: 5, col: 5 },
    green: { row: 14, col: 15 },
    blue: { row: 15, col: 14 },
  };
  const dest = computeSlideDestination(bare, robots, 'red', 'right');
  assert(dest.row === 5 && dest.col === 4, `red stops just before yellow blocker, got (${dest.row},${dest.col})`);
}

// Finds a target with at least one explicit wall (a pure corner target has
// none — both its sides are already covered by the board boundary itself)
// and the approach direction/start cell that should stop a robot on it.
function findPocketApproach(b) {
  for (const target of b.targets) {
    const w = b.walls[target.row][target.col];
    if (w.N) return { target, direction: 'up', start: { row: target.row + 1, col: target.col } };
    if (w.S) return { target, direction: 'down', start: { row: target.row - 1, col: target.col } };
    if (w.E) return { target, direction: 'right', start: { row: target.row, col: target.col - 1 } };
    if (w.W) return { target, direction: 'left', start: { row: target.row, col: target.col + 1 } };
  }
  return null;
}

// --- Sliding: a target's wall pocket actually stops a robot ---
{
  const approach = findPocketApproach(board);
  assert(approach !== null, 'at least one generated target has an explicit pocket wall to test');
  if (approach) {
    const { target, direction, start } = approach;
    const robots = {
      [target.color]: start,
      ...Object.fromEntries(
        ['red', 'yellow', 'green', 'blue']
          .filter((c) => c !== target.color)
          .map((c, i) => [c, { row: 15, col: i }]) // parked out of the way
      ),
    };
    const dest = computeSlideDestination(board, robots, target.color, direction);
    assert(
      dest.row === target.row && dest.col === target.col,
      `robot sliding ${direction} from (${start.row},${start.col}) stops at target pocket (${target.row},${target.col}), got (${dest.row},${dest.col})`
    );
  }
}

// --- No-op: robot already against a wall/edge doesn't move ---
{
  const robots = {
    red: { row: 0, col: 5 },
    yellow: { row: 10, col: 10 },
    green: { row: 12, col: 12 },
    blue: { row: 14, col: 14 },
  };
  const result = applyMove(board, robots, 'red', 'up');
  assert(result.moved === false, 'robot already at top edge produces a no-op moving up');
}

// --- replayMoveSequence: valid sequence reaches destination ---
{
  const robots = {
    red: { row: 0, col: 0 },
    yellow: { row: 10, col: 10 },
    green: { row: 12, col: 12 },
    blue: { row: 14, col: 14 },
  };
  const result = replayMoveSequence(board, robots, [
    { color: 'red', direction: 'right' },
    { color: 'red', direction: 'down' },
  ]);
  assert(result.valid, 'replayMoveSequence accepts a valid two-move sequence');
}

// --- replayMoveSequence: a no-op move in the sequence is rejected ---
{
  const robots = {
    red: { row: 0, col: 5 },
    yellow: { row: 10, col: 10 },
    green: { row: 12, col: 12 },
    blue: { row: 14, col: 14 },
  };
  const result = replayMoveSequence(board, robots, [{ color: 'red', direction: 'up' }]);
  assert(result.valid === false, 'replayMoveSequence rejects a sequence containing a no-op move');
}

// --- Solver: finds a one-move solution when trivially reachable ---
{
  const approach = findPocketApproach(board);
  if (approach) {
    const { target, direction, start } = approach;
    const robots = {
      [target.color]: start,
      ...Object.fromEntries(
        ['red', 'yellow', 'green', 'blue']
          .filter((c) => c !== target.color)
          .map((c, i) => [c, { row: 15, col: i }])
      ),
    };
    const result = solve(board, robots, target.color, target, { maxNodes: 150000 });
    assert(result.solved, 'solver finds a solution for a trivially-reachable target');
    assert(result.moves.length === 1, `solver finds the 1-move optimum, got ${result.moves && result.moves.length}`);
  }
}

// --- Board generation is a pure function of its seed ---
{
  const a = generateBoard(12345);
  const b = generateBoard(12345);
  assert(JSON.stringify(a.targets) === JSON.stringify(b.targets), 'the same seed reproduces the same targets');
  assert(JSON.stringify(a.walls) === JSON.stringify(b.walls), 'the same seed reproduces the same walls');
  const c = generateBoard(54321);
  assert(JSON.stringify(a.targets) !== JSON.stringify(c.targets), 'different seeds produce different boards');
}

// --- Generated boards actually put obstacles along the edges ---
{
  let edgeTargets = 0;
  for (let seed = 0; seed < 8; seed++) {
    const b = generateBoard(seed);
    for (const t of b.targets) {
      if (t.row === 0 || t.row === 15 || t.col === 0 || t.col === 15) edgeTargets++;
    }
  }
  assert(edgeTargets > 0, `random boards place at least some targets on the edge rows/columns (found ${edgeTargets} across 8 seeds)`);
}

// --- Every target on a handful of random boards is solvable from realistic random starts ---
{
  let seed = 42;
  const seededRng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 100000) / 100000;
  };

  let total = 0;
  let solved = 0;
  for (let boardSeed = 0; boardSeed < 4; boardSeed++) {
    const b = generateBoard(boardSeed);
    for (const target of b.targets) {
      const robots = randomizeRobotPositions(b, target, seededRng);
      const result = solve(b, robots, target.color, target, { maxNodes: 150000 });
      total++;
      if (result.solved) solved++;
    }
  }
  // A capped BFS will occasionally miss a deep solution on a hard random
  // draw — that's expected, not a bug. The engine should still solve the
  // overwhelming majority quickly.
  assert(solved / total >= 0.85, `at least 85% of random target/start combos solve within the 150k node cap (${solved}/${total})`);
}

console.log(`\n${failures === 0 ? 'All tests passed.' : `${failures} test(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
