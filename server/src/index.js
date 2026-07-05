import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createRoom, getRoom, joinRoom, removePlayer, serializeRoom, startRound } from './rooms.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

function broadcastRoom(room) {
  io.to(room.code).emit('room:update', serializeRoom(room));
}

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
    broadcastRoom(room);
  });

  socket.on('round:start', (_payload, ack) => {
    const room = findRoomForSocket(socket);
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
    broadcastRoom(room);
  });

  socket.on('disconnect', () => {
    const room = removePlayer(socket.id);
    if (room) broadcastRoom(room);
  });
});

function findRoomForSocket(socket) {
  for (const code of socket.rooms) {
    const room = getRoom(code);
    if (room) return room;
  }
  return null;
}

httpServer.listen(PORT, () => {
  console.log(`Ricochet Robots server listening on port ${PORT}`);
});
