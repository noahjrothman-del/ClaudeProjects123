import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket = null;

// A single lazily-created socket shared across the app, so remounting
// components (or React Strict Mode's double-mount) doesn't open duplicate
// connections.
export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true });
  }
  return socket;
}
