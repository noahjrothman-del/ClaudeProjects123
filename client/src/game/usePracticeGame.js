import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyMove,
  generateBoard,
  getPathCells,
  isRobotOnTarget,
  pickRandomTarget,
  randomizeRobotPositions,
} from 'ricochet-shared';
import { useSolver } from './useSolver.js';

export const TRAIL_FADE_MS = 320;
const HINT_STEP_MS = 700;

function clonePositions(robots) {
  const copy = {};
  for (const color of Object.keys(robots)) copy[color] = { ...robots[color] };
  return copy;
}

function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

function generatePuzzle(boardSeed) {
  const board = generateBoard(boardSeed);
  const target = pickRandomTarget(board);
  const robots = randomizeRobotPositions(board, target);
  return { board, target, robots };
}

export function usePracticeGame() {
  const [boardSeed, setBoardSeed] = useState(randomSeed);
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(boardSeed));
  const { board, target } = puzzle;

  const [initialRobots, setInitialRobots] = useState(() => clonePositions(puzzle.robots));
  const [robots, setRobots] = useState(() => clonePositions(puzzle.robots));
  const [history, setHistory] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [trails, setTrails] = useState([]);
  const trailTimeouts = useRef(new Set());

  const [hint, setHint] = useState({
    status: 'idle', // idle | loading | ready | unsolved
    moves: null,
    stepIndex: 0,
    playing: false,
    previewRobots: null,
  });
  const solveAsync = useSolver();

  const solved = isRobotOnTarget(robots, target.color, target);

  const spawnTrail = useCallback((color, from, to) => {
    const path = getPathCells(from, to);
    const id = `${color}-${Date.now()}-${Math.random()}`;
    setTrails((prev) => [...prev, { id, color, cells: path }]);
    const timeoutId = setTimeout(() => {
      setTrails((prev) => prev.filter((t) => t.id !== id));
      trailTimeouts.current.delete(timeoutId);
    }, TRAIL_FADE_MS);
    trailTimeouts.current.add(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      for (const id of trailTimeouts.current) clearTimeout(id);
      trailTimeouts.current.clear();
    };
  }, []);

  const closeHint = useCallback(() => {
    setHint({ status: 'idle', moves: null, stepIndex: 0, playing: false, previewRobots: null });
  }, []);

  const resetToPuzzle = useCallback((nextPuzzle) => {
    setPuzzle(nextPuzzle);
    setInitialRobots(clonePositions(nextPuzzle.robots));
    setRobots(clonePositions(nextPuzzle.robots));
    setHistory([]);
    setSelectedRobot(null);
    setTrails([]);
    closeHint();
  }, [closeHint]);

  const newPuzzle = useCallback(() => {
    const nextSeed = randomSeed();
    setBoardSeed(nextSeed);
    resetToPuzzle(generatePuzzle(nextSeed));
  }, [resetToPuzzle]);

  const reset = useCallback(() => {
    setRobots(clonePositions(initialRobots));
    setHistory([]);
    setSelectedRobot(null);
    setTrails([]);
    closeHint();
  }, [initialRobots, closeHint]);

  const selectRobot = useCallback((color) => {
    setSelectedRobot((prev) => (prev === color ? prev : color));
  }, []);

  // These handlers read `robots`/`history`/`hint` from closure rather than via
  // the setState functional-update form, because that form's updater must stay
  // pure — React (Strict Mode) invokes it twice in dev to check for exactly
  // this, and any side effect (spawnTrail, a nested setState) inside it would
  // double-fire.
  const move = useCallback((color, direction) => {
    if (!color) return;
    const result = applyMove(board, robots, color, direction);
    if (!result.moved) return;
    spawnTrail(color, result.from, result.to);
    setRobots(result.robots);
    setHistory((prevHistory) => [...prevHistory, { color, direction, from: result.from, to: result.to }]);
  }, [board, robots, spawnTrail]);

  const moveSelected = useCallback((direction) => {
    if (!selectedRobot) return;
    move(selectedRobot, direction);
  }, [selectedRobot, move]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    spawnTrail(last.color, last.to, last.from);
    setRobots((prevRobots) => ({ ...prevRobots, [last.color]: last.from }));
    setSelectedRobot(last.color);
    setHistory((prevHistory) => prevHistory.slice(0, -1));
  }, [history, spawnTrail]);

  const requestHint = useCallback(async () => {
    setHint({ status: 'loading', moves: null, stepIndex: 0, playing: false, previewRobots: clonePositions(initialRobots) });
    const result = await solveAsync(board, initialRobots, target.color, target);
    if (result.solved) {
      setHint({
        status: 'ready',
        moves: result.moves,
        stepIndex: 0,
        playing: false,
        previewRobots: clonePositions(initialRobots),
      });
    } else {
      setHint({ status: 'unsolved', moves: null, stepIndex: 0, playing: false, previewRobots: null });
    }
  }, [board, initialRobots, target, solveAsync]);

  const hintStepForward = useCallback(() => {
    if (!hint.moves || hint.stepIndex >= hint.moves.length) return;
    const nextMove = hint.moves[hint.stepIndex];
    const result = applyMove(board, hint.previewRobots, nextMove.color, nextMove.direction);
    spawnTrail(nextMove.color, result.from, result.to);
    setHint((prev) => ({ ...prev, previewRobots: result.robots, stepIndex: prev.stepIndex + 1 }));
  }, [board, hint, spawnTrail]);

  const hintStepBack = useCallback(() => {
    if (hint.stepIndex <= 0) return;
    const prevMoveIndex = hint.stepIndex - 1;
    const prevMove = hint.moves[prevMoveIndex];
    spawnTrail(prevMove.color, prevMove.to, prevMove.from);
    const previewRobots = computePreviewUpTo(board, initialRobots, hint.moves, prevMoveIndex);
    setHint((prev) => ({ ...prev, previewRobots, stepIndex: prevMoveIndex }));
  }, [board, hint, initialRobots, spawnTrail]);

  const hintPlay = useCallback(() => {
    setHint((prev) => ({ ...prev, playing: true }));
  }, []);

  const hintPause = useCallback(() => {
    setHint((prev) => ({ ...prev, playing: false }));
  }, []);

  useEffect(() => {
    if (!hint.playing) return undefined;
    if (!hint.moves || hint.stepIndex >= hint.moves.length) {
      setHint((prev) => ({ ...prev, playing: false }));
      return undefined;
    }
    const timer = setTimeout(() => {
      hintStepForward();
    }, HINT_STEP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint.playing, hint.stepIndex, hint.moves]);

  const displayedRobots = hint.status === 'ready' || hint.status === 'loading' ? (hint.previewRobots ?? robots) : robots;

  return {
    board,
    target,
    robots: displayedRobots,
    actualRobots: robots,
    initialRobots,
    history,
    selectedRobot,
    trails,
    solved,
    moveCount: history.length,
    hint,
    boardSeed,

    selectRobot,
    move: moveSelected,
    moveRobot: move,
    undo,
    reset,
    newPuzzle,
    requestHint,
    closeHint,
    hintPlay,
    hintPause,
    hintStepForward,
    hintStepBack,
  };
}

// Rewinding by one step from a mid-replay state is exact only for the robot
// that just moved; recomputing from the start keeps every robot consistent.
function computePreviewUpTo(board, initialRobots, moves, count) {
  let robots = clonePositions(initialRobots);
  for (let i = 0; i < count; i++) {
    const { color, direction } = moves[i];
    robots = applyMove(board, robots, color, direction).robots;
  }
  return robots;
}
