// In-memory room management. No database — rooms live only as long as the
// process runs, which is fine for the "in-memory, no DB" spec.
import { generateBoard, pickRandomTarget, randomizeRobotPositions } from 'ricochet-shared';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, avoids ambiguity read aloud
const ROOM_CODE_LENGTH = 4;

const rooms = new Map(); // code -> room

function generateRoomCode() {
  let code;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function makePlayer(id, name) {
  return { id, name, score: 0, connected: true };
}

export function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId: hostSocketId,
    boardSeed: Math.floor(Math.random() * 2 ** 31),
    players: new Map([[hostSocketId, makePlayer(hostSocketId, hostName)]]),
    round: null,
    timers: {},
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  if (!code) return undefined;
  return rooms.get(code.toUpperCase());
}

export function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return undefined;
}

export function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return null;
  room.players.set(socketId, makePlayer(socketId, name));
  return room;
}

// A rejoin reuses an existing (possibly disconnected) player slot matched by
// name, preserving their score, instead of adding a new player — so a
// refreshed tab resumes the same seat rather than showing up as a stranger.
// Any live round references to the old socket id (as a claimant or the
// current prover) are re-keyed to the new socket id too.
export function rejoinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return null;

  const existingEntry = [...room.players.entries()].find(([, p]) => p.name === name);
  if (!existingEntry) {
    room.players.set(socketId, makePlayer(socketId, name));
    return room;
  }

  const [oldId, player] = existingEntry;
  if (oldId !== socketId) {
    room.players.delete(oldId);
    room.players.set(socketId, { ...player, id: socketId, connected: true });
    if (room.hostId === oldId) room.hostId = socketId;
    if (room.round) {
      if (room.round.provingPlayerId === oldId) room.round.provingPlayerId = socketId;
      for (const claim of room.round.claims) {
        if (claim.playerId === oldId) claim.playerId = socketId;
      }
    }
  } else {
    player.connected = true;
  }
  return room;
}

export function removePlayer(socketId) {
  for (const room of rooms.values()) {
    if (!room.players.has(socketId)) continue;
    room.players.delete(socketId);
    if (room.players.size === 0) {
      clearRoomTimers(room);
      rooms.delete(room.code);
    } else if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
    }
    return room;
  }
  return null;
}

// Keeps the player (and their score) in the roster, marked disconnected, so
// they can rejoin later via rejoinRoom. Reassigns host to a connected player
// if the host was the one who dropped. Returns the room if found.
export function markDisconnected(socketId) {
  const room = findRoomBySocket(socketId);
  if (!room) return null;
  const player = room.players.get(socketId);
  if (player) player.connected = false;

  if (room.hostId === socketId) {
    const nextHost = [...room.players.values()].find((p) => p.connected);
    if (nextHost) room.hostId = nextHost.id;
  }
  return room;
}

export function clearRoomTimers(room) {
  if (room.timers.countdown) clearTimeout(room.timers.countdown);
  if (room.timers.grace) clearTimeout(room.timers.grace);
  room.timers = {};
}

export function startRound(room) {
  clearRoomTimers(room);
  const board = generateBoard(room.boardSeed);
  const target = pickRandomTarget(board);
  const robots = randomizeRobotPositions(board, target);
  const roundNumber = (room.round?.roundNumber ?? 0) + 1;
  room.round = {
    roundNumber,
    target,
    robots,
    phase: 'open', // open -> countdown -> proving -> resolved
    claims: [],
    countdownEndsAt: null,
    provingPlayerId: null,
    graceEndsAt: null,
    result: null,
  };
  return room.round;
}

export function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    boardSeed: room.boardSeed,
    players: [...room.players.values()],
    round: room.round,
  };
}

export function broadcastRoom(io, room) {
  io.to(room.code).emit('room:update', serializeRoom(room));
}
