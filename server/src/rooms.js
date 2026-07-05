// In-memory room management. No database — rooms live only as long as the
// process runs, which is fine for the "in-memory, no DB" spec.
import { generateBoard, getLayoutCount, pickRandomTarget, randomizeRobotPositions } from 'ricochet-shared';

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

export function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId: hostSocketId,
    layoutIndex: Math.floor(Math.random() * getLayoutCount()),
    players: new Map([[hostSocketId, makePlayer(hostSocketId, hostName)]]),
    round: null,
  };
  rooms.set(code, room);
  return room;
}

function makePlayer(id, name) {
  return { id, name };
}

export function getRoom(code) {
  if (!code) return undefined;
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return null;
  room.players.set(socketId, makePlayer(socketId, name));
  return room;
}

export function removePlayer(socketId) {
  for (const room of rooms.values()) {
    if (!room.players.has(socketId)) continue;
    room.players.delete(socketId);
    if (room.players.size === 0) {
      rooms.delete(room.code);
    } else if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
    }
    return room;
  }
  return null;
}

export function startRound(room) {
  const board = generateBoard(room.layoutIndex);
  const target = pickRandomTarget(board);
  const robots = randomizeRobotPositions(board, target);
  const roundNumber = (room.round?.roundNumber ?? 0) + 1;
  room.round = { roundNumber, target, robots };
  return room.round;
}

export function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    layoutIndex: room.layoutIndex,
    players: [...room.players.values()],
    round: room.round,
  };
}
