import { io } from 'socket.io-client';

// Local dev runs the server on a separate port; a production build with no
// VITE_SERVER_URL set assumes a single-process deploy (e.g. Replit) where
// the server serves this same build, so connecting to the page's own origin
// is correct without any env var configuration.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

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
