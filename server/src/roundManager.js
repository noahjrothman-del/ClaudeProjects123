// The claim-and-timer mechanic: any player can declare a move-count claim,
// which starts (or lowers/resets) a shared countdown. When it expires, the
// lowest claimant gets a grace period to submit a move sequence, which the
// server replays through the shared engine to verify. A failed or missed
// claim cascades to the next-lowest claimant.
import { DIRECTIONS, ROBOT_COLORS, generateBoard, isRobotOnTarget, replayMoveSequence } from 'ricochet-shared';
import { broadcastRoom, clearRoomTimers } from './rooms.js';

// Configurable via env so integration tests don't have to wait out a real
// 60-second countdown; production just uses the spec's defaults.
const COUNTDOWN_MS = Number(process.env.CLAIM_COUNTDOWN_MS) || 60000;
const GRACE_MS = Number(process.env.CLAIM_GRACE_MS) || 15000;

function lowestActiveClaim(round) {
  const active = round.claims.filter((c) => !c.eliminated);
  if (active.length === 0) return null;
  return active.reduce((min, c) => (c.moveCount < min.moveCount ? c : min), active[0]);
}

function isValidMoveList(moves) {
  return (
    Array.isArray(moves) &&
    moves.every((m) => m && ROBOT_COLORS.includes(m.color) && DIRECTIONS.includes(m.direction))
  );
}

export function declareClaim(io, room, playerId, playerName, moveCount) {
  const round = room.round;
  if (!round) return { ok: false, error: 'No active round' };
  if (round.phase === 'resolved') return { ok: false, error: 'Round already resolved' };
  if (round.phase === 'proving') return { ok: false, error: 'A solution is currently being demonstrated' };
  if (!Number.isInteger(moveCount) || moveCount < 1) {
    return { ok: false, error: 'Move count must be a positive integer' };
  }

  const leader = lowestActiveClaim(round);
  if (leader && moveCount >= leader.moveCount) {
    return { ok: false, error: `Must claim fewer than ${leader.moveCount} moves` };
  }

  const existing = round.claims.find((c) => c.playerId === playerId);
  if (existing) {
    existing.moveCount = moveCount;
    existing.eliminated = false;
  } else {
    round.claims.push({ playerId, name: playerName, moveCount, eliminated: false });
  }

  round.phase = 'countdown';
  round.countdownEndsAt = Date.now() + COUNTDOWN_MS;

  clearTimeout(room.timers.countdown);
  room.timers.countdown = setTimeout(() => beginProving(io, room), COUNTDOWN_MS);

  broadcastRoom(io, room);
  return { ok: true };
}

function beginProving(io, room) {
  const round = room.round;
  if (!round || round.phase !== 'countdown') return;
  const leader = lowestActiveClaim(round);
  if (!leader) {
    resolveRound(io, room, null);
    return;
  }
  round.phase = 'proving';
  round.provingPlayerId = leader.playerId;
  round.graceEndsAt = Date.now() + GRACE_MS;
  room.timers.grace = setTimeout(() => eliminateAndAdvance(io, room, leader.playerId), GRACE_MS);
  broadcastRoom(io, room);
}

function eliminateAndAdvance(io, room, playerId) {
  const round = room.round;
  if (!round || round.provingPlayerId !== playerId) return;
  const claim = round.claims.find((c) => c.playerId === playerId);
  if (claim) claim.eliminated = true;

  const next = lowestActiveClaim(round);
  if (!next) {
    resolveRound(io, room, null);
    return;
  }
  round.provingPlayerId = next.playerId;
  round.graceEndsAt = Date.now() + GRACE_MS;
  room.timers.grace = setTimeout(() => eliminateAndAdvance(io, room, next.playerId), GRACE_MS);
  broadcastRoom(io, room);
}

export function submitSolution(io, room, playerId, moves) {
  const round = room.round;
  if (!round) return { ok: false, error: 'No active round' };
  if (round.phase !== 'proving' || round.provingPlayerId !== playerId) {
    return { ok: false, error: 'Not your turn to submit' };
  }
  const claim = round.claims.find((c) => c.playerId === playerId);
  if (!claim) return { ok: false, error: 'No claim on record' };
  if (!isValidMoveList(moves)) {
    eliminateAndAdvance(io, room, playerId);
    return { ok: false, error: 'Malformed move list' };
  }

  clearTimeout(room.timers.grace);

  const board = generateBoard(room.layoutIndex);
  const replay = replayMoveSequence(board, round.robots, moves);
  const valid =
    replay.valid &&
    moves.length <= claim.moveCount &&
    isRobotOnTarget(replay.robots, round.target.color, round.target);

  if (valid) {
    resolveRound(io, room, { playerId, name: claim.name, moves, moveCount: moves.length });
    return { ok: true };
  }

  eliminateAndAdvance(io, room, playerId);
  return { ok: false, error: 'Solution did not reach the target within the claimed moves' };
}

function resolveRound(io, room, winner) {
  const round = room.round;
  clearRoomTimers(room);
  round.phase = 'resolved';
  round.result = winner;
  if (winner) {
    const player = room.players.get(winner.playerId);
    if (player) player.score += 1;
  }
  broadcastRoom(io, room);
}

// Called when a player disconnects mid-round: if they were mid-demonstration,
// immediately hand off to the next claimant instead of waiting out the full
// grace period; otherwise just strike their pending claim.
export function handlePlayerDisconnected(io, room, playerId) {
  const round = room.round;
  if (!round || round.phase === 'resolved') return;
  if (round.provingPlayerId === playerId) {
    eliminateAndAdvance(io, room, playerId);
    return;
  }
  const claim = round.claims.find((c) => c.playerId === playerId);
  if (claim) claim.eliminated = true;
}
