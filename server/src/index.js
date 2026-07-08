import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {
  broadcastRoom,
  createRoom,
  findRoomBySocket,
  joinRoom,
  markDisconnected,
  rejoinRoom,
  serializeRoom,
  startRound,
} from './rooms.js';
import { declareClaim, handlePlayerDisconnected, submitSolution } from './roundManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
// Unset in a single-process deploy (client served from this same origin, so
// there's no cross-origin request to police). Explicit in local dev, where
// the Vite dev server runs on a different port.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173');

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// If a client build is present alongside this server (single-process deploy,
// e.g. Replit), serve it — same origin as the Socket.IO connection below.
const clientDistPath = path.join(__dirname, '../../client/dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

io.on('connection', (socket) => {
  socket.on('room:create', ({ name } = {}, ack) => {
    const room = createRoom(socket.id, name || 'Host');
    socket.join(room.code);
    ack?.({ ok: true, room: serializeRoom(room) });
  });

  socket.on('room:join', ({ code, name } = {}, ack) => {
    const room = joinRoom(code, socket.id, name || 'Player');
    if (!room) {
      ack?.({ ok: false, error: `Room "${code}" not found` });
      return;
    }
    socket.join(room.code);
    ack?.({ ok: true, room: serializeRoom(room) });
    broadcastRoom(io, room);
  });

  // Rejoining an existing room (e.g. after a page refresh) reuses the
  // player's prior seat/score instead of adding a new roster entry.
  socket.on('room:rejoin', ({ code, name } = {}, ack) => {
    const room = rejoinRoom(code, socket.id, name || 'Player');
    if (!room) {
      ack?.({ ok: false, error: `Room "${code}" not found` });
      return;
    }
    socket.join(room.code);
    ack?.({ ok: true, room: serializeRoom(room) });
    broadcastRoom(io, room);
  });

  socket.on('round:start', (_payload, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: 'Not in a room' });
      return;
    }
    if (room.hostId !== socket.id) {
      ack?.({ ok: false, error: 'Only the host can start a round' });
      return;
    }
    startRound(room);
    ack?.({ ok: true });
    broadcastRoom(io, room);
  });

  socket.on('claim:declare', ({ moveCount } = {}, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: 'Not in a room' });
      return;
    }
    const player = room.players.get(socket.id);
    const result = declareClaim(io, room, socket.id, player?.name || 'Player', moveCount);
    ack?.(result);
  });

  socket.on('claim:submit', ({ moves } = {}, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: 'Not in a room' });
      return;
    }
    const result = submitSolution(io, room, socket.id, moves);
    ack?.(result);
  });

  socket.on('disconnect', () => {
    const room = markDisconnected(socket.id);
    if (!room) return;
    handlePlayerDisconnected(io, room, socket.id);
    broadcastRoom(io, room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Ricochet Robots server listening on port ${PORT}`);
});
