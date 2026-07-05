// Runs the BFS solver off the main thread so a hard puzzle can't freeze the UI.
import { solve } from 'ricochet-shared';

self.onmessage = (event) => {
  const { requestId, board, robots, targetColor, target, maxNodes } = event.data;
  const result = solve(board, robots, targetColor, target, { maxNodes });
  self.postMessage({ requestId, result });
};
