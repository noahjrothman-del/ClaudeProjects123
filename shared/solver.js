// Ricochet Robots — BFS solver over robot-position states.
// Pure, deterministic, framework-free.

import { ROBOT_COLORS, DIRECTIONS } from './board.js';
import { computeSlideDestination } from './movement.js';

const DEFAULT_MAX_NODES = 150000;

function serializeRobots(robots) {
  let key = '';
  for (const color of ROBOT_COLORS) {
    const p = robots[color];
    key += p.row * 16 + p.col + '|';
  }
  return key;
}

// Finds the minimal move sequence for `targetColor` to reach `target` (a
// {row, col} cell), searching over states of all 4 robots' positions (moving
// any robot counts as a move — bouncing blockers off other robots is legal).
// Returns { solved, moves, nodesExplored, truncated } where `moves` is a list
// of { color, direction } in order, or null if unsolved.
export function solve(board, startRobots, targetColor, target, options = {}) {
  const maxNodes = options.maxNodes || DEFAULT_MAX_NODES;

  if (startRobots[targetColor].row === target.row && startRobots[targetColor].col === target.col) {
    return { solved: true, moves: [], nodesExplored: 0, truncated: false };
  }

  const startKey = serializeRobots(startRobots);
  const visited = new Set([startKey]);

  // BFS queue of { robots, moves }, using an index pointer instead of
  // Array.shift() to avoid O(n) dequeues at 150k-node scale.
  let queue = [{ robots: startRobots, moves: [] }];
  let head = 0;
  let nodes = 0;

  while (head < queue.length) {
    const { robots, moves } = queue[head++];

    for (const color of ROBOT_COLORS) {
      for (const direction of DIRECTIONS) {
        const dest = computeSlideDestination(board, robots, color, direction);
        if (dest.row === robots[color].row && dest.col === robots[color].col) {
          continue; // no-op, not a legal move
        }

        const newRobots = { ...robots, [color]: dest };
        const key = serializeRobots(newRobots);
        if (visited.has(key)) continue;

        const newMoves = moves.concat([{ color, direction }]);

        if (color === targetColor && dest.row === target.row && dest.col === target.col) {
          return { solved: true, moves: newMoves, nodesExplored: nodes + 1, truncated: false };
        }

        visited.add(key);
        nodes++;
        if (nodes >= maxNodes) {
          return { solved: false, moves: null, nodesExplored: nodes, truncated: true };
        }

        queue.push({ robots: newRobots, moves: newMoves });
      }
    }
  }

  return { solved: false, moves: null, nodesExplored: nodes, truncated: false };
}
