export {
  BOARD_SIZE,
  ROBOT_COLORS,
  DIRECTIONS,
  cellKey,
  generateBoard,
  randomizeRobotPositions,
  pickRandomTarget,
} from './board.js';

export {
  computeSlideDestination,
  getPathCells,
  applyMove,
  replayMoveSequence,
  isRobotOnTarget,
} from './movement.js';

export { solve } from './solver.js';
