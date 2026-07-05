import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, generateBoard, getPathCells } from 'ricochet-shared';

const TRAIL_FADE_MS = 320;
const REPLAY_STEP_MS = 550;

function clonePositions(robots) {
  const copy = {};
  for (const color of Object.keys(robots)) copy[color] = { ...robots[color] };
  return copy;
}

// Each player experiments with moves privately on their own client (per the
// spec, individual moves aren't broadcast). This hook holds that private
// move state for the current round, resetting whenever a new round starts,
// and separately drives the synced animated replay once the server posts a
// winning solution for everyone to watch.
export function useRoundBoard(layoutIndex, round) {
  const board = generateBoard(layoutIndex);
  const roundKey = round?.roundNumber ?? 0;

  const [robots, setRobots] = useState(() => (round ? clonePositions(round.robots) : null));
  const [history, setHistory] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [trails, setTrails] = useState([]);
  const trailTimeouts = useRef(new Set());

  const [replay, setReplay] = useState({ active: false, robots: null, stepIndex: 0 });
  const lastReplayedRoundRef = useRef(null);

  useEffect(() => {
    setRobots(round ? clonePositions(round.robots) : null);
    setHistory([]);
    setSelectedRobot(null);
    setTrails([]);
    setReplay({ active: false, robots: null, stepIndex: 0 });
  }, [roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Kick off the synced replay exactly once per round, as soon as the server
  // posts a result with a winning move list.
  useEffect(() => {
    if (!round?.result?.moves || lastReplayedRoundRef.current === roundKey) return;
    lastReplayedRoundRef.current = roundKey;
    setReplay({ active: true, robots: clonePositions(round.robots), stepIndex: 0 });
  }, [round, roundKey]);

  useEffect(() => {
    if (!replay.active) return undefined;
    const moves = round?.result?.moves;
    if (!moves || replay.stepIndex >= moves.length) return undefined;
    const timer = setTimeout(() => {
      const nextMove = moves[replay.stepIndex];
      setReplay((prev) => {
        const result = applyMove(board, prev.robots, nextMove.color, nextMove.direction);
        spawnTrail(nextMove.color, result.from, result.to);
        return { ...prev, robots: result.robots, stepIndex: prev.stepIndex + 1 };
      });
    }, REPLAY_STEP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay.active, replay.stepIndex, round]);

  const move = useCallback((color, direction) => {
    if (!color || !robots) return;
    const result = applyMove(board, robots, color, direction);
    if (!result.moved) return;
    spawnTrail(color, result.from, result.to);
    setRobots(result.robots);
    setHistory((prev) => [...prev, { color, direction, from: result.from, to: result.to }]);
  }, [board, robots, spawnTrail]);

  const moveSelected = useCallback((direction) => {
    if (!selectedRobot) return;
    move(selectedRobot, direction);
  }, [selectedRobot, move]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    spawnTrail(last.color, last.to, last.from);
    setRobots((prev) => ({ ...prev, [last.color]: last.from }));
    setSelectedRobot(last.color);
    setHistory((prev) => prev.slice(0, -1));
  }, [history, spawnTrail]);

  const reset = useCallback(() => {
    if (!round) return;
    setRobots(clonePositions(round.robots));
    setHistory([]);
    setSelectedRobot(null);
    setTrails([]);
  }, [round]);

  return {
    board,
    robots: replay.active ? replay.robots : robots,
    history,
    selectedRobot,
    trails,
    isReplaying: replay.active,
    selectRobot: setSelectedRobot,
    move: moveSelected,
    moveRobot: move,
    undo,
    reset,
  };
}
